import {
  FloorPartition,
  PlanRoom,
  FloorOpening,
  UnderfloorHeatingLoop,
  RoutePoint,
  ROOM_PRESETS,
  RoomType
} from "../../types/architecturalTypes";

// Snapping helper
export function snapVal(val: number, step: number = 0.25): number {
  return Math.round(val / step) * step;
}

// Result of snapping an opening (door / window) to a wall
export interface WallSnapResult {
  snapped: boolean;
  wallType: "partition" | "outer_top" | "outer_bottom" | "outer_left" | "outer_right";
  wallId: string;
  wallLabel: string;
  xMeters: number;
  yMeters: number;
  orientation: "horizontal" | "vertical";
  rotation: number;
  thicknessMeters: number;
  distance: number;
}

/**
 * Finds the nearest partition or outer wall for magnetic snapping.
 * Snaps the opening directly ONTO the wall's centerline, sets proper orientation,
 * and clamps its coordinates along the wall's length.
 */
export function findMagneticWallSnap(
  rawX: number,
  rawY: number,
  openingWidth: number,
  partitions: FloorPartition[],
  currentFloor: number,
  W: number,
  H: number,
  outerWallThick: number = 0.35,
  snapThresholdMeters: number = 0.40
): WallSnapResult | null {
  const candidates: WallSnapResult[] = [];

  // 1. Partitions on the current floor
  partitions.forEach((p) => {
    if (p.floorLevel !== currentFloor) return;
    const isVert = p.orientation === "vertical" || Math.abs(p.x1 - p.x2) < 0.05;
    const thick = p.thicknessMeters || 0.12;

    if (isVert) {
      const px = p.x1;
      const minY = Math.min(p.y1, p.y2);
      const maxY = Math.max(p.y1, p.y2);
      const dist = Math.abs(rawX - px);

      const inSpan = rawY + openingWidth >= minY - 0.25 && rawY <= maxY + 0.25;
      if (dist <= snapThresholdMeters && inSpan) {
        const clampedY = Math.round(Math.max(minY, Math.min(maxY - openingWidth, rawY)) * 100) / 100;
        candidates.push({
          snapped: true,
          wallType: "partition",
          wallId: p.id,
          wallLabel: p.label || `Перегородка X=${px}м`,
          xMeters: px,
          yMeters: clampedY,
          orientation: "vertical",
          rotation: 90,
          thicknessMeters: thick,
          distance: dist
        });
      }
    } else {
      // Horizontal partition
      const py = p.y1;
      const minX = Math.min(p.x1, p.x2);
      const maxX = Math.max(p.x1, p.x2);
      const dist = Math.abs(rawY - py);

      const inSpan = rawX + openingWidth >= minX - 0.25 && rawX <= maxX + 0.25;
      if (dist <= snapThresholdMeters && inSpan) {
        const clampedX = Math.round(Math.max(minX, Math.min(maxX - openingWidth, rawX)) * 100) / 100;
        candidates.push({
          snapped: true,
          wallType: "partition",
          wallId: p.id,
          wallLabel: p.label || `Перегородка Y=${py}м`,
          xMeters: clampedX,
          yMeters: py,
          orientation: "horizontal",
          rotation: 0,
          thicknessMeters: thick,
          distance: dist
        });
      }
    }
  });

  // 2. Outer envelope walls
  // Top outer wall (y = 0)
  const distTop = Math.abs(rawY);
  if (distTop <= snapThresholdMeters && rawX >= -0.2 && rawX <= W + 0.2) {
    const clampedX = Math.round(Math.max(0.1, Math.min(W - openingWidth - 0.1, rawX)) * 100) / 100;
    candidates.push({
      snapped: true,
      wallType: "outer_top",
      wallId: "outer_top",
      wallLabel: "Северная стена (фасад)",
      xMeters: clampedX,
      yMeters: 0,
      orientation: "horizontal",
      rotation: 0,
      thicknessMeters: outerWallThick,
      distance: distTop
    });
  }

  // Bottom outer wall (y = H)
  const distBottom = Math.abs(rawY - H);
  if (distBottom <= snapThresholdMeters && rawX >= -0.2 && rawX <= W + 0.2) {
    const clampedX = Math.round(Math.max(0.1, Math.min(W - openingWidth - 0.1, rawX)) * 100) / 100;
    candidates.push({
      snapped: true,
      wallType: "outer_bottom",
      wallId: "outer_bottom",
      wallLabel: "Южная стена (фасад)",
      xMeters: clampedX,
      yMeters: H,
      orientation: "horizontal",
      rotation: 180,
      thicknessMeters: outerWallThick,
      distance: distBottom
    });
  }

  // Left outer wall (x = 0)
  const distLeft = Math.abs(rawX);
  if (distLeft <= snapThresholdMeters && rawY >= -0.2 && rawY <= H + 0.2) {
    const clampedY = Math.round(Math.max(0.1, Math.min(H - openingWidth - 0.1, rawY)) * 100) / 100;
    candidates.push({
      snapped: true,
      wallType: "outer_left",
      wallId: "outer_left",
      wallLabel: "Западная стена (фасад)",
      xMeters: 0,
      yMeters: clampedY,
      orientation: "vertical",
      rotation: 90,
      thicknessMeters: outerWallThick,
      distance: distLeft
    });
  }

  // Right outer wall (x = W)
  const distRight = Math.abs(rawX - W);
  if (distRight <= snapThresholdMeters && rawY >= -0.2 && rawY <= H + 0.2) {
    const clampedY = Math.round(Math.max(0.1, Math.min(H - openingWidth - 0.1, rawY)) * 100) / 100;
    candidates.push({
      snapped: true,
      wallType: "outer_right",
      wallId: "outer_right",
      wallLabel: "Восточная стена (фасад)",
      xMeters: W,
      yMeters: clampedY,
      orientation: "vertical",
      rotation: 270,
      thicknessMeters: outerWallThick,
      distance: distRight
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}

export interface WallSegment {
  s: number;
  e: number;
}

/**
 * Calculates the solid wall segments after carving out all openings (doors, windows).
 * Where openings exist, a true gap (aperture/проём) is created.
 */
export function getWallSegmentsWithOpenings(
  wallStart: number,
  wallEnd: number,
  openings: Array<{ start: number; end: number }>
): WallSegment[] {
  const minW = Math.min(wallStart, wallEnd);
  const maxW = Math.max(wallStart, wallEnd);

  // Normalize, clamp and sort openings
  const cleanOpenings = openings
    .map((o) => ({
      start: Math.max(minW, Math.min(maxW, Math.min(o.start, o.end))),
      end: Math.max(minW, Math.min(maxW, Math.max(o.start, o.end)))
    }))
    .filter((o) => o.end - o.start > 0.05)
    .sort((a, b) => a.start - b.start);

  if (cleanOpenings.length === 0) {
    return [{ s: minW, e: maxW }];
  }

  // Merge overlapping openings
  const merged: Array<{ start: number; end: number }> = [];
  let cur = { ...cleanOpenings[0] };
  for (let i = 1; i < cleanOpenings.length; i++) {
    const next = cleanOpenings[i];
    if (next.start <= cur.end) {
      cur.end = Math.max(cur.end, next.end);
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }
  merged.push(cur);

  // Form solid segments between openings
  const segments: WallSegment[] = [];
  let currentPos = minW;

  for (const op of merged) {
    if (op.start - currentPos > 0.04) {
      segments.push({ s: currentPos, e: op.start });
    }
    currentPos = Math.max(currentPos, op.end);
  }

  if (maxW - currentPos > 0.04) {
    segments.push({ s: currentPos, e: maxW });
  }

  return segments;
}

/**
 * Finds all openings belonging to or intersecting a given partition.
 */
export function getOpeningsOnPartition(
  p: FloorPartition,
  openings: FloorOpening[]
): Array<{ opening: FloorOpening; start: number; end: number }> {
  const isVert = p.orientation === "vertical" || Math.abs(p.x1 - p.x2) < 0.05;
  const result: Array<{ opening: FloorOpening; start: number; end: number }> = [];

  openings.forEach((op) => {
    if (op.floorLevel !== p.floorLevel) return;

    if (op.wallId === p.id) {
      // Explicit attachment
      if (isVert) {
        result.push({ opening: op, start: op.yMeters, end: op.yMeters + op.widthMeters });
      } else {
        result.push({ opening: op, start: op.xMeters, end: op.xMeters + op.widthMeters });
      }
      return;
    }

    // Geometric check
    if (isVert) {
      const px = p.x1;
      const minY = Math.min(p.y1, p.y2);
      const maxY = Math.max(p.y1, p.y2);
      if (Math.abs(op.xMeters - px) < 0.22) {
        const opStart = op.yMeters;
        const opEnd = op.yMeters + op.widthMeters;
        if (opEnd > minY + 0.02 && opStart < maxY - 0.02) {
          result.push({ opening: op, start: opStart, end: opEnd });
        }
      }
    } else {
      const py = p.y1;
      const minX = Math.min(p.x1, p.x2);
      const maxX = Math.max(p.x1, p.x2);
      if (Math.abs(op.yMeters - py) < 0.22) {
        const opStart = op.xMeters;
        const opEnd = op.xMeters + op.widthMeters;
        if (opEnd > minX + 0.02 && opStart < maxX - 0.02) {
          result.push({ opening: op, start: opStart, end: opEnd });
        }
      }
    }
  });

  return result;
}

/**
 * Finds all openings on a given outer wall side (top, bottom, left, right).
 */
export function getOpeningsOnOuterWall(
  side: "top" | "bottom" | "left" | "right",
  openings: FloorOpening[],
  currentFloor: number,
  W: number,
  H: number
): Array<{ opening: FloorOpening; start: number; end: number }> {
  const result: Array<{ opening: FloorOpening; start: number; end: number }> = [];

  openings.forEach((op) => {
    if (op.floorLevel !== currentFloor) return;

    if (side === "top") {
      if (op.wallId === "outer_top" || Math.abs(op.yMeters) < 0.22) {
        result.push({ opening: op, start: op.xMeters, end: op.xMeters + op.widthMeters });
      }
    } else if (side === "bottom") {
      if (op.wallId === "outer_bottom" || Math.abs(op.yMeters - H) < 0.22) {
        result.push({ opening: op, start: op.xMeters, end: op.xMeters + op.widthMeters });
      }
    } else if (side === "left") {
      if (op.wallId === "outer_left" || Math.abs(op.xMeters) < 0.22) {
        result.push({ opening: op, start: op.yMeters, end: op.yMeters + op.widthMeters });
      }
    } else if (side === "right") {
      if (op.wallId === "outer_right" || Math.abs(op.xMeters - W) < 0.22) {
        result.push({ opening: op, start: op.yMeters, end: op.yMeters + op.widthMeters });
      }
    }
  });

  return result;
}

// Auto-detect rectangular rooms formed by perimeter and partitions
export function autoGenerateRoomsFromPartitions(
  W: number,
  H: number,
  partitions: FloorPartition[],
  currentFloor: number
): PlanRoom[] {
  // Collect vertical lines (including borders x=0, x=W)
  const vLines = new Set<number>([0, W]);
  // Collect horizontal lines (including borders y=0, y=H)
  const hLines = new Set<number>([0, H]);

  partitions.forEach((p) => {
    if (p.floorLevel !== currentFloor) return;
    if (p.orientation === "vertical" || Math.abs(p.x1 - p.x2) < 0.05) {
      const x = Math.round(p.x1 * 10) / 10;
      if (x > 0 && x < W) vLines.add(x);
    } else if (p.orientation === "horizontal" || Math.abs(p.y1 - p.y2) < 0.05) {
      const y = Math.round(p.y1 * 10) / 10;
      if (y > 0 && y < H) hLines.add(y);
    }
  });

  const sortedX = Array.from(vLines).sort((a, b) => a - b);
  const sortedY = Array.from(hLines).sort((a, b) => a - b);

  const rooms: PlanRoom[] = [];
  let index = 1;

  for (let i = 0; i < sortedX.length - 1; i++) {
    for (let j = 0; j < sortedY.length - 1; j++) {
      const x = sortedX[i];
      const nextX = sortedX[i + 1];
      const y = sortedY[j];
      const nextY = sortedY[j + 1];

      const rw = Math.round((nextX - x) * 100) / 100;
      const rh = Math.round((nextY - y) * 100) / 100;
      if (rw < 0.8 || rh < 0.8) continue; // Skip tiny slivers

      // Assign realistic default room preset based on size & position
      const area = rw * rh;
      let roomType: RoomType = "living_room";
      let name = `Помещение ${index}`;
      let color = "#fef3c7";
      let finish = "Ламинат 33 класс";

      if (area >= 18) {
        roomType = "living_room";
        name = "Гостиная / Зал";
        color = "#fef3c7";
        finish = "Паркетная доска";
      } else if (area >= 10 && area < 18 && y === 0) {
        roomType = "kitchen";
        name = "Кухня-столовая";
        color = "#fed7aa";
        finish = "Керамогранит";
      } else if (area >= 10) {
        roomType = "bedroom";
        name = `Спальня ${index > 1 ? index - 1 : ""}`.trim();
        color = "#e0e7ff";
        finish = "Ламинат 33 класс";
      } else if (area >= 4 && area < 10) {
        roomType = "bathroom";
        name = "Санузел / Ванная";
        color = "#bae6fd";
        finish = "Керамогранит антискользящий";
      } else if (area >= 2 && area < 4) {
        roomType = "boiler_room";
        name = "Котельная / Тех.помещение";
        color = "#fecdd3";
        finish = "Керамогранит технический";
      } else {
        roomType = "closet";
        name = "Гардеробная / Кладовая";
        color = "#fce7f3";
        finish = "Ламинат";
      }

      rooms.push({
        id: `room_${Date.now()}_${index}`,
        name,
        type: roomType,
        xMeters: x,
        yMeters: y,
        wMeters: rw,
        hMeters: rh,
        floorLevel: currentFloor,
        color,
        floorFinish: finish,
        ceilingHeight: 2.8
      });
      index++;
    }
  }

  return rooms;
}

/**
 * Generates continuous 2D coordinates (in meters) for an underfloor heating pipe coil.
 * Guarantees zero self-intersections, constant pipe pitch (stepM), and realistic CAD layout.
 */
export function generateUnderfloorHeatingPoints(loop: UnderfloorHeatingLoop): Array<{ x: number; y: number }> {
  const wallOffsetM = Math.max(0.04, loop.wallOffsetMm / 1000);
  const stepM = Math.max(0.08, loop.stepMm / 1000);

  const left = loop.xMeters + wallOffsetM;
  const top = loop.yMeters + wallOffsetM;
  const w = loop.wMeters - 2 * wallOffsetM;
  const h = loop.hMeters - 2 * wallOffsetM;

  if (w <= stepM * 1.2 || h <= stepM * 1.2) {
    return [];
  }

  if (loop.pattern === "snake") {
    // Meander / Snake pattern (змейка)
    const points: Array<{ x: number; y: number }> = [];
    const numRows = Math.floor(h / stepM);
    let goingRight = true;

    for (let row = 0; row <= numRows; row++) {
      const curY = top + row * stepM;
      const startX = goingRight ? left : left + w;
      const endX = goingRight ? left + w : left;
      points.push({ x: startX, y: curY });
      points.push({ x: endX, y: curY });
      goingRight = !goingRight;
    }
    return points;
  }

  // True Bifilar Spiral (Улитка) - concentric dual-spiral without intersections:
  // Supply starts at outer bottom-left (left, top + h), spirals clockwise inward on even tracks (0, 2, 4...).
  // Return starts at (left + stepM, top + h), spirals clockwise inward on odd tracks (1, 3, 5...).
  // In the center, they connect via a clean U-turn, and the reversed return path creates perfectly parallel, non-overlapping coil!
  const supply: Array<{ x: number; y: number }> = [];
  const ret: Array<{ x: number; y: number }> = [];

  let k = 0;
  while (true) {
    const Ls = left + 2 * k * stepM;
    const Rs = left + w - 2 * k * stepM;
    const Ts = top + 2 * k * stepM;
    const Bs = top + h - 2 * k * stepM;

    const Lr = left + (2 * k + 1) * stepM;
    const Rr = left + w - (2 * k + 1) * stepM;
    const Tr = top + (2 * k + 1) * stepM;
    const Br = top + h - (2 * k + 1) * stepM;

    // Boundary check for inner core
    if (
      Rs - Ls < 3.5 * stepM ||
      Bs - Ts < 3.5 * stepM ||
      Rr - Lr < 1.8 * stepM ||
      Br - Tr < 1.8 * stepM
    ) {
      break;
    }

    // Supply turn k (enters bottom-left, goes up, right, down, left)
    if (k === 0) {
      supply.push({ x: Ls, y: Bs });
    }
    supply.push({ x: Ls, y: Ts });
    supply.push({ x: Rs, y: Ts });
    supply.push({ x: Rs, y: Bs });
    supply.push({ x: Ls + 2 * stepM, y: Bs });

    // Return turn k (ordered from exit inwards)
    if (k === 0) {
      ret.push({ x: Lr, y: Bs });
    } else {
      ret.push({ x: Lr, y: Br + stepM });
    }
    ret.push({ x: Lr, y: Tr });
    ret.push({ x: Rr, y: Tr });
    ret.push({ x: Rr, y: Br });
    ret.push({ x: Lr + 2 * stepM, y: Br });

    k++;
  }

  if (k === 0 || supply.length === 0 || ret.length === 0) {
    // If room is too small for spiral, fallback to clean snake
    const points: Array<{ x: number; y: number }> = [];
    const numRows = Math.max(1, Math.floor(h / stepM));
    let goingRight = true;
    for (let row = 0; row <= numRows; row++) {
      const curY = top + row * (h / numRows);
      points.push({ x: goingRight ? left : left + w, y: curY });
      points.push({ x: goingRight ? left + w : left, y: curY });
      goingRight = !goingRight;
    }
    return points;
  }

  // Center connection: U-turn bridge connecting innermost supply to innermost return
  const lastSup = supply[supply.length - 1];
  const lastRet = ret[ret.length - 1];
  const centerBridge: Array<{ x: number; y: number }> = [
    { x: lastSup.x, y: lastRet.y },
    { x: lastRet.x, y: lastRet.y }
  ];

  // Reverse return path so it winds outwards from center to exit
  const retReversed = [...ret].reverse();
  const allPoints: Array<{ x: number; y: number }> = [
    ...supply,
    ...centerBridge,
    ...retReversed
  ];

  // Clean consecutive duplicate points and zero-length segments
  const cleaned: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < allPoints.length; i++) {
    const pt = allPoints[i];
    if (cleaned.length === 0) {
      cleaned.push(pt);
    } else {
      const prev = cleaned[cleaned.length - 1];
      if (Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.005) {
        cleaned.push(pt);
      }
    }
  }

  return cleaned;
}

/**
 * Generates an SVG path string for underfloor heating pipes with real physical step (stepMm)
 * and wall offset (wallOffsetMm).
 */
export function generateUnderfloorHeatingSvg(
  loop: UnderfloorHeatingLoop,
  pixelsPerMeter: number,
  canvasPadding: number
): { pathD: string; lengthMeters: number; points: Array<{ x: number; y: number }> } {
  const points = generateUnderfloorHeatingPoints(loop);

  if (points.length < 2) {
    return { pathD: "", lengthMeters: 0, points: [] };
  }

  // Convert to screen px
  const toPxX = (mX: number) => canvasPadding + mX * pixelsPerMeter;
  const toPxY = (mY: number) => canvasPadding + mY * pixelsPerMeter;

  // Build smooth path with rounded fillet corners for realistic PEX pipe appearance
  const cornerRadiusPx = Math.min(10, Math.max(3, (loop.stepMm / 1000) * pixelsPerMeter * 0.45));
  let d = `M ${toPxX(points[0].x)} ${toPxY(points[0].y)}`;
  let totalLength = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = i < points.length - 1 ? points[i + 1] : null;

    const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    totalLength += segLen;

    if (!next) {
      d += ` L ${toPxX(curr.x)} ${toPxY(curr.y)}`;
    } else {
      const segLenNext = Math.hypot(next.x - curr.x, next.y - curr.y);
      const effectiveR = Math.min(
        cornerRadiusPx / pixelsPerMeter,
        segLen * 0.45,
        segLenNext * 0.45
      );

      if (effectiveR * pixelsPerMeter < 2) {
        d += ` L ${toPxX(curr.x)} ${toPxY(curr.y)}`;
      } else {
        const vx1 = (curr.x - prev.x) / segLen;
        const vy1 = (curr.y - prev.y) / segLen;
        const vx2 = (next.x - curr.x) / segLenNext;
        const vy2 = (next.y - curr.y) / segLenNext;

        const startFilletX = curr.x - vx1 * effectiveR;
        const startFilletY = curr.y - vy1 * effectiveR;
        const endFilletX = curr.x + vx2 * effectiveR;
        const endFilletY = curr.y + vy2 * effectiveR;

        d += ` L ${toPxX(startFilletX)} ${toPxY(startFilletY)}`;
        d += ` Q ${toPxX(curr.x)} ${toPxY(curr.y)} ${toPxX(endFilletX)} ${toPxY(endFilletY)}`;
      }
    }
  }

  // Include 4 meters of manifold connections
  const totalLengthMeters = Math.round((totalLength + 4.0) * 10) / 10;
  return { pathD: d, lengthMeters: totalLengthMeters, points };
}

/**
 * Calculates real-world route length in meters
 */
export function calculateRouteLength(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Axonometric 3D projection helper.
 * Projects 3D point (x, y, z in meters) to 2D canvas (px, py in pixels).
 */
export function project3DToAxonometric(
  x: number,
  y: number,
  z: number,
  scale: number,
  originX: number,
  originY: number,
  yawDeg: number = 45,
  pitchDeg: number = 30
): { px: number; py: number } {
  const yawRad = (yawDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;

  // Orbit rotation around Z axis
  const rx = x * Math.cos(yawRad) - y * Math.sin(yawRad);
  const ry = x * Math.sin(yawRad) + y * Math.cos(yawRad);

  // Isometric pitch projection
  const px = originX + rx * scale;
  const py = originY + (ry * Math.sin(pitchRad) - z * Math.cos(pitchRad)) * scale;

  return { px, py };
}

