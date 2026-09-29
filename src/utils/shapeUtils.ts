export interface VertexMeters {
  x: number;
  y: number;
}

export type BuildingShapeType = "rect" | "l_shape" | "u_shape" | "t_shape" | "circle" | "polygon";
export type CutCornerOrientation = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

export type FenceMaterialType = "wood" | "dpk" | "brick" | "concrete" | "metal";
export type GateType = "none" | "wicket" | "gate_swing" | "gate_sliding";

export interface FenceMaterialConfig {
  id: FenceMaterialType;
  label: string;
  emoji: string;
  hexColor: string;
  secondaryHex: string;
  strokeWidth: number;
  desc: string;
}

export const FENCE_MATERIALS: FenceMaterialConfig[] = [
  { id: "wood", label: "Дерево (Штакетник)", emoji: "🪵", hexColor: "#78350f", secondaryHex: "#a16207", strokeWidth: 2, desc: "Экологичный натуральный деревянный штакетник" },
  { id: "dpk", label: "ДПК (Композит)", emoji: "🟫", hexColor: "#334155", secondaryHex: "#475569", strokeWidth: 2.2, desc: "Долговечный древесно-полимерный композит" },
  { id: "brick", label: "Кирпич с ковкой", emoji: "🧱", hexColor: "#9a3412", secondaryHex: "#b45309", strokeWidth: 3, desc: "Основательный кирпичный забор с коваными элементами" },
  { id: "concrete", label: "Бетон (Еврозабор)", emoji: "🪨", hexColor: "#64748b", secondaryHex: "#475569", strokeWidth: 2.8, desc: "Фактурные железобетонные секционные плиты" },
  { id: "metal", label: "Металл (Профнастил)", emoji: "⚙️", hexColor: "#1e293b", secondaryHex: "#0f172a", strokeWidth: 2, desc: "Прочный профилированный оцинкованный металл" }
];

export interface GatePresetConfig {
  id: GateType;
  label: string;
  emoji: string;
  defaultWMeters: number;
  defaultHMeters: number;
  desc: string;
}

export const GATE_PRESETS: GatePresetConfig[] = [
  { id: "wicket", label: "Калитка", emoji: "🚪", defaultWMeters: 1.2, defaultHMeters: 0.8, desc: "Одностворчатая входная калитка с замком и ручкой" },
  { id: "gate_swing", label: "Ворота распашные", emoji: "🚪🚪", defaultWMeters: 4.0, defaultHMeters: 1.0, desc: "Двустворчатые распашные воротные секции" },
  { id: "gate_sliding", label: "Ворота откатные", emoji: "🚪➡️", defaultWMeters: 4.5, defaultHMeters: 1.0, desc: "Консольные сдвижные откатные ворота с направляющей" }
];

export function getFenceColor(mat?: FenceMaterialType): string {
  switch (mat) {
    case "wood": return "#78350f";
    case "dpk": return "#334155";
    case "brick": return "#9a3412";
    case "concrete": return "#64748b";
    case "metal": return "#1e293b";
    default: return "#544338";
  }
}

export function getFenceHeight(mat?: FenceMaterialType): number {
  switch (mat) {
    case "wood": return 1.8;
    case "dpk": return 2.0;
    case "brick": return 2.2;
    case "concrete": return 2.0;
    case "metal": return 1.8;
    default: return 1.8;
  }
}

export interface PlanogramBuildingShapeProps {
  wMeters?: number;
  hMeters?: number;
  shapeType?: BuildingShapeType;
  cutCorner?: CutCornerOrientation;
  wingWidthPct?: number; // % width of wing/cutout (default ~50)
  wingDepthPct?: number; // % depth of wing/cutout (default ~50)
  customVertices?: VertexMeters[];
}

export const SHAPE_PRESETS: Array<{
  type: BuildingShapeType;
  label: string;
  emoji: string;
  desc: string;
}> = [
  { type: "rect", label: "Прямоугольник", emoji: "█", desc: "Классическая прямоугольная форма" },
  { type: "l_shape", label: "Г-образный (L)", emoji: "🗄️", desc: "Дом с пристройкой или L-крылом" },
  { type: "u_shape", label: "П-образный (U)", emoji: "🏰", desc: "Дом с внутренним двором / патио" },
  { type: "t_shape", label: "Т-образный (T)", emoji: "🏛️", desc: "Строение с центральным эркером" },
  { type: "circle", label: "Круг / Овал", emoji: "⭕", desc: "Ротонда, купол, круглый бассейн" },
  { type: "polygon", label: "Многоугольник", emoji: "📐", desc: "Произвольная форма по вершинам" }
];

/**
 * Calculates 2D vertices in meters relative to bottom-left corner (0,0) of the bounding box (wMeters, hMeters).
 */
export function getBuildingVerticesMeters(b: PlanogramBuildingShapeProps): VertexMeters[] {
  const w = Math.max(0.5, b.wMeters || 4);
  const h = Math.max(0.5, b.hMeters || 4);
  const shape = b.shapeType || "rect";

  if (shape === "rect") {
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h }
    ];
  }

  if (shape === "circle") {
    const points: VertexMeters[] = [];
    const segments = 32;
    const rx = w / 2;
    const ry = h / 2;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      points.push({
        x: rx + rx * Math.cos(angle),
        y: ry + ry * Math.sin(angle)
      });
    }
    return points;
  }

  if (shape === "polygon") {
    if (b.customVertices && b.customVertices.length >= 3) {
      return b.customVertices.map(v => ({
        x: Math.max(0, Math.min(w, v.x)),
        y: Math.max(0, Math.min(h, v.y))
      }));
    }
    // Default polygon fallback if customVertices not provided: pentagon
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h * 0.7 },
      { x: w / 2, y: h },
      { x: 0, y: h * 0.7 }
    ];
  }

  const wingW = (b.wingWidthPct ?? 50) / 100;
  const wingD = (b.wingDepthPct ?? 50) / 100;
  const cw = w * wingW;
  const ch = h * wingD;
  const corner = b.cutCorner || "ne";

  if (shape === "l_shape") {
    switch (corner) {
      case "nw":
        return [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: cw, y: h },
          { x: cw, y: h - ch },
          { x: 0, y: h - ch }
        ];
      case "se":
        return [
          { x: 0, y: ch },
          { x: w - cw, y: ch },
          { x: w - cw, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h },
          { x: 0, y: h }
        ];
      case "sw":
        return [
          { x: 0, y: 0 },
          { x: cw, y: 0 },
          { x: cw, y: ch },
          { x: w, y: ch },
          { x: w, y: h },
          { x: 0, y: h }
        ];
      case "ne":
      default:
        return [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: w, y: h - ch },
          { x: w - cw, y: h - ch },
          { x: w - cw, y: h },
          { x: 0, y: h }
        ];
    }
  }

  if (shape === "u_shape") {
    const sideW = Math.min(w * 0.45, cw > 0 ? cw : w * 0.3);
    if (corner === "s") {
      return [
        { x: 0, y: ch },
        { x: sideW, y: ch },
        { x: sideW, y: 0 },
        { x: w - sideW, y: 0 },
        { x: w - sideW, y: ch },
        { x: w, y: ch },
        { x: w, y: h },
        { x: 0, y: h }
      ];
    }
    // Default top cutout "n"
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: w - sideW, y: h },
      { x: w - sideW, y: h - ch },
      { x: sideW, y: h - ch },
      { x: sideW, y: h },
      { x: 0, y: h }
    ];
  }

  if (shape === "t_shape") {
    const projW = Math.min(w * 0.9, cw > 0 ? cw : w * 0.4);
    const leftX = (w - projW) / 2;
    const rightX = leftX + projW;
    return [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h - ch },
      { x: rightX, y: h - ch },
      { x: rightX, y: h },
      { x: leftX, y: h },
      { x: leftX, y: h - ch },
      { x: 0, y: h - ch }
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ];
}

/**
 * Returns SVG percentage points string (e.g. "0,100 100,100 ...") for rendering inside a bounding box SVG (0..100, 0..100)
 */
export function getBuildingPolygonPointsPct(b: PlanogramBuildingShapeProps): string {
  const w = Math.max(0.5, b.wMeters || 4);
  const h = Math.max(0.5, b.hMeters || 4);
  const vertices = getBuildingVerticesMeters(b);

  return vertices.map(v => {
    const xPct = Math.min(100, Math.max(0, (v.x / w) * 100));
    const yPct = Math.min(100, Math.max(0, 100 - (v.y / h) * 100)); // Invert Y for SVG coordinates
    return `${xPct.toFixed(2)},${yPct.toFixed(2)}`;
  }).join(" ");
}

/**
 * Computes exact building floor surface area in m² using Shoelace algorithm.
 */
export function calculateBuildingAreaMeters(b: PlanogramBuildingShapeProps): number {
  const w = Math.max(0.5, b.wMeters || 4);
  const h = Math.max(0.5, b.hMeters || 4);
  const shape = b.shapeType || "rect";

  if (shape === "circle") {
    return Math.round(Math.PI * (w / 2) * (h / 2) * 10) / 10;
  }

  const vertices = getBuildingVerticesMeters(b);
  if (vertices.length < 3) return Math.round(w * h * 10) / 10;

  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    sum += vertices[i].x * vertices[j].y;
    sum -= vertices[j].x * vertices[i].y;
  }

  const area = Math.abs(sum) / 2;
  return Math.round(area * 10) / 10;
}
