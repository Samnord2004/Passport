import React, { useState } from "react";
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Layers,
  Eye,
  EyeOff,
  Flame,
  Zap,
  Droplets,
  Wind,
  Home,
  Compass
} from "lucide-react";
import {
  BuildingFloorPlan,
  PlanRoom,
  FloorPartition,
  FloorOpening,
  FloorPlanElement,
  EngineeringRoute,
  UnderfloorHeatingLoop,
  EngineeringLayerVisibility,
  ELEMENT_CATALOG
} from "../../types/architecturalTypes";
import {
  project3DToAxonometric,
  generateUnderfloorHeatingSvg,
  generateUnderfloorHeatingPoints,
  calculateRouteLength
} from "./floorPlanUtils";

interface FloorPlanAxonometryProps {
  W: number;
  H: number;
  outerWallThickness: number;
  floorPlan: BuildingFloorPlan;
  currentFloor: number;
  layerVisibility: EngineeringLayerVisibility;
  onToggleLayer: (layer: keyof EngineeringLayerVisibility) => void;
  onSetSoloLayer: (layer: keyof EngineeringLayerVisibility | "all") => void;
  onClose?: () => void;
}

export const FloorPlanAxonometry: React.FC<FloorPlanAxonometryProps> = ({
  W,
  H,
  outerWallThickness,
  floorPlan,
  currentFloor,
  layerVisibility,
  onToggleLayer,
  onSetSoloLayer,
  onClose
}) => {
  // Camera angles
  const [yawDeg, setYawDeg] = useState<number>(45); // 0..360 deg
  const [pitchDeg, setPitchDeg] = useState<number>(32); // 15..60 deg
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [showWallTransparency, setShowWallTransparency] = useState<boolean>(true);
  const [selectedSystem, setSelectedSystem] = useState<"all" | "heating" | "electric" | "plumbing" | "ventilation">("all");

  const canvasWidth = 1000;
  const canvasHeight = 720;
  const originX = canvasWidth / 2;
  const originY = canvasHeight / 2 + 100;

  // Base scale in pixels per meter
  const baseScale = Math.min(canvasWidth / (W * 1.8), canvasHeight / (H * 1.8)) * zoomScale;
  const floorHeightM = floorPlan.floors.find((f) => f.level === currentFloor)?.heightMeters || 2.8;

  // Projection helper for this view
  const proj = (x: number, y: number, z: number) => {
    // Center model at (W/2, H/2)
    const cx = x - W / 2;
    const cy = y - H / 2;
    return project3DToAxonometric(cx, cy, z, baseScale, originX, originY, yawDeg, pitchDeg);
  };

  // Filter current floor items
  const rooms = floorPlan.rooms.filter((r) => r.floorLevel === currentFloor);
  const partitions = (floorPlan.partitions || []).filter((p) => p.floorLevel === currentFloor);
  const openings = (floorPlan.openings || []).filter((o) => o.floorLevel === currentFloor);
  const elements = floorPlan.elements.filter((e) => e.floorLevel === currentFloor);
  const routes = (floorPlan.routes || []).filter((r) => r.floorLevel === currentFloor);
  const heatingLoops = (floorPlan.heatingLoops || []).filter((h) => h.floorLevel === currentFloor);

  // Quick calculations for statistics
  const totalFloorHeatingLength = heatingLoops.reduce((sum, loop) => {
    const { lengthMeters } = generateUnderfloorHeatingSvg(loop, 1, 0);
    return sum + (loop.pipeLengthMeters || lengthMeters || 0);
  }, 0);

  const totalCableLength = routes
    .filter((r) => r.system === "electric")
    .reduce((sum, r) => sum + calculateRouteLength(r.points), 0);

  const totalWaterPipeLength = routes
    .filter((r) => r.system === "plumbing_cold" || r.system === "plumbing_hot" || r.system === "sewer")
    .reduce((sum, r) => sum + calculateRouteLength(r.points), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050811] text-neutral-200 select-none overflow-hidden">
      {/* Top Toolbar: View Angle Presets & Layer Controls */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/80 flex flex-wrap items-center justify-between gap-3">
        {/* Layer Visibility Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] font-mono font-black uppercase text-neutral-400 flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Слои схемы:</span>
          </span>

          <button
            type="button"
            onClick={() => onToggleLayer("architecture")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              layerVisibility.architecture
                ? "bg-sky-500/20 border-sky-500/50 text-sky-300 font-black"
                : "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-60"
            }`}
          >
            <span>🏛️</span>
            <span>Стены 3D</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("heating")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              layerVisibility.heating
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 font-black"
                : "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-60"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Тёплый пол и Отопление</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("electric")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              layerVisibility.electric
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-black"
                : "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-60"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Электрика и Распредкоробки</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("plumbing")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              layerVisibility.plumbing
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-black"
                : "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-60"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Водопровод и Канализация</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer("furniture")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              layerVisibility.furniture
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-black"
                : "bg-neutral-900 border-neutral-800 text-neutral-500 opacity-60"
            }`}
          >
            <span>🛋️</span>
            <span>Мебель</span>
          </button>
        </div>

        {/* Camera Rotation & Controls */}
        <div className="flex items-center gap-2">
          {/* Angle Presets */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg text-[11px] font-mono">
            <button
              type="button"
              onClick={() => {
                setYawDeg(45);
                setPitchDeg(32);
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Юго-западный угол"
            >
              ЮЗ 45°
            </button>
            <button
              type="button"
              onClick={() => {
                setYawDeg(135);
                setPitchDeg(32);
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Юго-восточный угол"
            >
              ЮВ 135°
            </button>
            <button
              type="button"
              onClick={() => {
                setYawDeg(225);
                setPitchDeg(32);
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Северо-восточный угол"
            >
              СВ 225°
            </button>
            <button
              type="button"
              onClick={() => {
                setYawDeg(315);
                setPitchDeg(32);
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Северо-западный угол"
            >
              СЗ 315°
            </button>
          </div>

          {/* Orbit slider */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-lg text-xs">
            <RotateCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[10px] text-neutral-400">Вращение:</span>
            <input
              type="range"
              min="0"
              max="360"
              value={yawDeg}
              onChange={(e) => setYawDeg(parseInt(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono font-bold text-[10px] text-amber-300 w-8">{yawDeg}°</span>
          </div>

          {/* Wall Transparency Toggle */}
          <button
            type="button"
            onClick={() => setShowWallTransparency((v) => !v)}
            className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              showWallTransparency
                ? "bg-neutral-800 border-neutral-700 text-white"
                : "bg-neutral-900 border-neutral-800 text-neutral-500"
            }`}
            title="Прозрачные стены для осмотра трасс внутри"
          >
            {showWallTransparency ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[10px]">Стены на просвет</span>
          </button>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.6, Math.round((z - 0.15) * 100) / 100))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-[10px] text-amber-400 px-1">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Axonometric Canvas */}
      <div className="flex-1 relative flex items-center justify-center overflow-auto p-4">
        <svg
          width={canvasWidth}
          height={canvasHeight}
          className="block overflow-visible drop-shadow-2xl"
        >
          <defs>
            {/* Floor Slab Grid Pattern in isometric plane */}
            <radialGradient id="slabGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0b0f19" stopOpacity="0.4" />
            </radialGradient>
            {/* Conduit glow filter */}
            <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f59e0b" floodOpacity="0.6" />
            </filter>
            <filter id="pipeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
            <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* 1. FOUNDATION SLAB (ПЛИТА ПОЛА Z=0) */}
          {(() => {
            const p00 = proj(0, 0, 0);
            const p10 = proj(W, 0, 0);
            const p11 = proj(W, H, 0);
            const p01 = proj(0, H, 0);
            const pFloorPoints = `${p00.px},${p00.py} ${p10.px},${p10.py} ${p11.px},${p11.py} ${p01.px},${p01.py}`;

            return (
              <g className="pointer-events-none">
                {/* Slab thickness drop below z=0 */}
                {(() => {
                  const b00 = proj(0, 0, -0.3);
                  const b10 = proj(W, 0, -0.3);
                  const b11 = proj(W, H, -0.3);
                  const b01 = proj(0, H, -0.3);
                  return (
                    <polygon
                      points={`${p10.px},${p10.py} ${b10.px},${b10.py} ${b11.px},${b11.py} ${p11.px},${p11.py}`}
                      fill="#0f172a"
                      stroke="#1e293b"
                      strokeWidth={1}
                    />
                  );
                })()}

                {/* Main floor surface */}
                <polygon
                  points={pFloorPoints}
                  fill="url(#slabGlow)"
                  stroke="#334155"
                  strokeWidth={1.5}
                />

                {/* Meter grid lines on the slab */}
                {Array.from({ length: Math.ceil(W) + 1 }).map((_, i) => {
                  const s = proj(i, 0, 0);
                  const e = proj(i, H, 0);
                  return (
                    <line
                      key={`slab_gx_${i}`}
                      x1={s.px}
                      y1={s.py}
                      x2={e.px}
                      y2={e.py}
                      stroke="rgba(56, 189, 248, 0.08)"
                      strokeWidth={1}
                    />
                  );
                })}
                {Array.from({ length: Math.ceil(H) + 1 }).map((_, j) => {
                  const s = proj(0, j, 0);
                  const e = proj(W, j, 0);
                  return (
                    <line
                      key={`slab_gy_${j}`}
                      x1={s.px}
                      y1={s.py}
                      x2={e.px}
                      y2={e.py}
                      stroke="rgba(56, 189, 248, 0.08)"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>
            );
          })()}

          {/* 2. ROOM ZONES OUTLINES (ПОМЕЩЕНИЯ НА ПОЛУ) */}
          {rooms.map((room) => {
            const r00 = proj(room.xMeters, room.yMeters, 0.01);
            const r10 = proj(room.xMeters + room.wMeters, room.yMeters, 0.01);
            const r11 = proj(room.xMeters + room.wMeters, room.yMeters + room.hMeters, 0.01);
            const r01 = proj(room.xMeters, room.yMeters + room.hMeters, 0.01);
            const pts = `${r00.px},${r00.py} ${r10.px},${r10.py} ${r11.px},${r11.py} ${r01.px},${r01.py}`;
            const center = proj(room.xMeters + room.wMeters / 2, room.yMeters + room.hMeters / 2, 0.02);

            return (
              <g key={room.id} className="pointer-events-none">
                <polygon
                  points={pts}
                  fill={room.color || "#fef3c7"}
                  fillOpacity={0.12}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
                <text
                  x={center.px}
                  y={center.py}
                  textAnchor="middle"
                  className="font-bold text-[10px] fill-white/80 drop-shadow select-none pointer-events-none"
                >
                  {room.name}
                </text>
              </g>
            );
          })}

          {/* 3. UNDERFLOOR HEATING LOOPS (ПЕТЛИ ТЕПЛОГО ПОЛА Z=0.05м) */}
          {layerVisibility.heating &&
            heatingLoops.map((loop) => {
              const wallOffsetM = loop.wallOffsetMm / 1000;
              const stepM = loop.stepMm / 1000;
              const left = loop.xMeters + wallOffsetM;
              const top = loop.yMeters + wallOffsetM;
              const w = loop.wMeters - 2 * wallOffsetM;
              const h = loop.hMeters - 2 * wallOffsetM;
              if (w <= stepM * 0.8 || h <= stepM * 0.8) return null;

              const isEdge = loop.zoneType === "edge_window";
              const loopColor = loop.color || (isEdge ? "#dc2626" : "#ef4444");

              // Generate array of accurate 3D points for underfloor heating pipe
              const pathPoints = generateUnderfloorHeatingPoints(loop);
              if (pathPoints.length < 2) return null;

              // Project pipe path to axonometry
              let pipeD = "";
              pathPoints.forEach((p, idx) => {
                const pr = proj(p.x, p.y, 0.05); // lies on floor slab
                if (idx === 0) pipeD += `M ${pr.px} ${pr.py}`;
                else pipeD += ` L ${pr.px} ${pr.py}`;
              });

              const center = proj(loop.xMeters + loop.wMeters / 2, loop.yMeters + loop.hMeters / 2, 0.08);

              return (
                <g key={loop.id}>
                  {/* Bounding box of the loop with offset indicator */}
                  {(() => {
                    const b00 = proj(left, top, 0.04);
                    const b10 = proj(left + w, top, 0.04);
                    const b11 = proj(left + w, top + h, 0.04);
                    const b01 = proj(left, top + h, 0.04);
                    return (
                      <polygon
                        points={`${b00.px},${b00.py} ${b10.px},${b10.py} ${b11.px},${b11.py} ${b01.px},${b01.py}`}
                        fill={loopColor}
                        fillOpacity={isEdge ? 0.12 : 0.06}
                        stroke={loopColor}
                        strokeWidth={isEdge ? 1.8 : 1}
                        strokeDasharray={isEdge ? "6 2" : "4 2"}
                      />
                    );
                  })()}

                  {/* Red/Orange PEX Heating pipe coils */}
                  <path
                    d={pipeD}
                    fill="none"
                    stroke={loopColor}
                    strokeWidth={isEdge ? 3.2 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#pipeGlow)"
                  />

                  {/* Badge with pipe step and length */}
                  <g transform={`translate(${center.px}, ${center.py})`}>
                    <rect
                      x={isEdge ? -55 : -46}
                      y={-9}
                      width={isEdge ? 110 : 92}
                      height={18}
                      rx={4}
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={loopColor}
                      strokeWidth={1.2}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      className="font-mono text-[8px] font-bold fill-rose-300"
                    >
                      {isEdge ? "🔥 " : ""}{loop.name} ({loop.stepMm}мм)
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 4. PLUMBING PIPELINES & RISERS (ТРУБОПРОВОДЫ ХВС/ГВС/КАНАЛИЗАЦИИ) */}
          {layerVisibility.plumbing &&
            routes
              .filter((r) => r.system.startsWith("plumbing") || r.system === "sewer")
              .map((route) => {
                let d = "";
                route.points.forEach((pt, idx) => {
                  const z = pt.z || (route.system === "sewer" ? 0.08 : route.system === "plumbing_hot" ? 0.25 : 0.18);
                  const pr = proj(pt.x, pt.y, z);
                  if (idx === 0) d += `M ${pr.px} ${pr.py}`;
                  else d += ` L ${pr.px} ${pr.py}`;
                });

                const isCold = route.system === "plumbing_cold";
                const isHot = route.system === "plumbing_hot";
                const isSewer = route.system === "sewer";
                const strokeColor = isCold ? "#0284c7" : isHot ? "#ef4444" : "#475569";
                const strokeW = isSewer ? 5 : 3;

                return (
                  <g key={route.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isCold ? "url(#waterGlow)" : undefined}
                    />
                    {/* Points / Fittings */}
                    {route.points.map((pt, idx) => {
                      const z = pt.z || (isSewer ? 0.08 : isHot ? 0.25 : 0.18);
                      const pr = proj(pt.x, pt.y, z);
                      return (
                        <circle
                          key={`pt_${idx}`}
                          cx={pr.px}
                          cy={pr.py}
                          r={strokeW + 1}
                          fill={strokeColor}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </g>
                );
              })}

          {/* 5. ELECTRICAL CABLING ROUTES & JUNCTION BOXES (ЭЛЕКТРИКА: ТРАССЫ ПОД ПОТОЛКОМ Z=2.5м И ОПУСКИ) */}
          {layerVisibility.electric && (
            <g>
              {/* Wiring cable routes */}
              {routes
                .filter((r) => r.system === "electric")
                .map((route) => {
                  let d = "";
                  route.points.forEach((pt, idx) => {
                    const z = pt.z || 2.5; // Ceiling routing at 2.5m
                    const pr = proj(pt.x, pt.y, z);
                    if (idx === 0) d += `M ${pr.px} ${pr.py}`;
                    else d += ` L ${pr.px} ${pr.py}`;
                  });

                  return (
                    <g key={route.id}>
                      {/* Ceiling cable line */}
                      <path
                        d={d}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#wireGlow)"
                      />

                      {/* Vertical drops down to sockets or switches */}
                      {route.points.map((pt, idx) => {
                        const topPr = proj(pt.x, pt.y, pt.z || 2.5);
                        const bottomPr = proj(pt.x, pt.y, 0.3); // down to socket
                        return (
                          <line
                            key={`drop_${idx}`}
                            x1={topPr.px}
                            y1={topPr.py}
                            x2={bottomPr.px}
                            y2={bottomPr.py}
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            strokeDasharray="3 2"
                            opacity={0.8}
                          />
                        );
                      })}
                    </g>
                  );
                })}
            </g>
          )}

          {/* 6. EQUIPMENT & APPLIANCES IN 3D ELEVATION */}
          {elements.map((el) => {
            const catItem = ELEMENT_CATALOG.find((c) => c.type === el.type);
            const isElectric = catItem?.category === "electric";
            const isPlumbing = catItem?.category === "plumbing";
            const isHeating = catItem?.category === "heating";
            const isHvac = catItem?.category === "hvac";
            const isFurniture = catItem?.category === "furniture";

            // Check layer visibility
            if (isElectric && !layerVisibility.electric) return null;
            if (isPlumbing && !layerVisibility.plumbing) return null;
            if (isHeating && !layerVisibility.heating) return null;
            if (isHvac && !layerVisibility.ventilation) return null;
            if (isFurniture && !layerVisibility.furniture) return null;

            // Height Z offset based on element type
            let zMeters = 0.1;
            let iconZ = 0.2;
            if (
              el.type === "socket_single" ||
              el.type === "socket_double" ||
              el.type === "socket_wet" ||
              el.type === "socket_internet" ||
              el.type === "socket_tv" ||
              el.type === "socket_usb"
            ) {
              zMeters = 0.3; // 30cm from floor
              iconZ = 0.35;
            } else if (el.type === "socket_380v") {
              zMeters = 0.15; // Plinth level
              iconZ = 0.2;
            } else if (el.type === "switch_light") {
              zMeters = 0.9; // 90cm from floor
              iconZ = 0.95;
            } else if (el.type === "junction_box") {
              zMeters = 2.45; // 2.45m under ceiling
              iconZ = 2.5;
            } else if (el.type === "light_ceiling") {
              zMeters = 2.75; // Ceiling
              iconZ = 2.75;
            } else if (el.type === "electric_panel") {
              zMeters = 1.4; // eye level
              iconZ = 1.4;
            } else if (el.type === "radiator") {
              zMeters = 0.3; // standard window sill height
              iconZ = 0.55;
            } else if (el.type === "radiator_low") {
              zMeters = 0.12; // low floor standing feet
              iconZ = 0.22;
            } else if (el.type === "convector_floor") {
              zMeters = 0.02; // in-floor trench level
              iconZ = 0.06;
            } else if (el.type === "convector_wall") {
              zMeters = 0.35;
              iconZ = 0.55;
            } else if (el.type === "fan_heater") {
              zMeters = 2.3; // overhead / above door or window
              iconZ = 2.4;
            } else if (el.type === "towel_dryer") {
              zMeters = 1.1; // bathroom wall
              iconZ = 1.25;
            } else if (el.type === "heating_boiler") {
              zMeters = 0.8;
              iconZ = 1.1;
            } else if (el.type === "floor_heating_manifold") {
              zMeters = 0.45;
              iconZ = 0.6;
            } else if (el.type === "central_vacuum") {
              zMeters = 0.7; // Wall mounted canister
              iconZ = 0.9;
            } else if (el.type === "vacuum_inlet") {
              zMeters = 0.3; // Wall socket
              iconZ = 0.35;
            } else if (el.type === "robot_vacuum_dock") {
              zMeters = 0.05; // Floor niche
              iconZ = 0.1;
            } else if (el.type === "humidifier_pump") {
              zMeters = 0.4;
              iconZ = 0.55;
            } else if (el.type === "humidifier_nozzle") {
              zMeters = 2.5; // High mist nozzle
              iconZ = 2.55;
            } else if (el.type === "vent_diffuser_supply" || el.type === "vent_diffuser_exhaust" || el.type === "vent_grille_linear") {
              zMeters = 2.7; // Ceiling diffusers
              iconZ = 2.75;
            } else if (el.type === "vent_penetration") {
              zMeters = 2.4; // Wall sleeve
              iconZ = 2.45;
            }

            const pBase = proj(el.xMeters + el.wMeters / 2, el.yMeters + el.hMeters / 2, 0);
            const pElevated = proj(el.xMeters + el.wMeters / 2, el.yMeters + el.hMeters / 2, zMeters);

            return (
              <g key={el.id} className="cursor-pointer group">
                {/* Vertical drop stem line if elevated */}
                {zMeters > 0.2 && (
                  <line
                    x1={pBase.px}
                    y1={pBase.py}
                    x2={pElevated.px}
                    y2={pElevated.py}
                    stroke={catItem?.color || "#ffffff"}
                    strokeWidth={1.2}
                    strokeDasharray="2 2"
                    opacity={0.7}
                  />
                )}

                {/* 3D Element Cube or Badge */}
                <g transform={`translate(${pElevated.px}, ${pElevated.py})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={el.type === "junction_box" ? 11 : 9}
                    fill={catItem?.color || "#64748b"}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="shadow-lg"
                  />
                  <text x={0} y={4} textAnchor="middle" className="text-[10px] select-none pointer-events-none">
                    {catItem?.emoji || "📦"}
                  </text>
                  {/* Label on hover or prominent */}
                  <text
                    x={0}
                    y={-12}
                    textAnchor="middle"
                    className="font-mono text-[8px] font-bold fill-white drop-shadow select-none pointer-events-none opacity-80"
                  >
                    h={zMeters}м
                  </text>
                </g>
              </g>
            );
          })}

          {/* 7. VOLUMETRIC 3D WALLS & PARTITIONS (TRANSLUCENT OR SOLID) */}
          {layerVisibility.architecture && (
            <g className="pointer-events-none">
              {/* Outer Envelope 3D Walls */}
              {(() => {
                const h = floorHeightM;
                const p00_b = proj(0, 0, 0);
                const p10_b = proj(W, 0, 0);
                const p11_b = proj(W, H, 0);
                const p01_b = proj(0, H, 0);

                const p00_t = proj(0, 0, h);
                const p10_t = proj(W, 0, h);
                const p11_t = proj(W, H, h);
                const p01_t = proj(0, H, h);

                const wallOpacity = showWallTransparency ? 0.15 : 0.85;

                return (
                  <g>
                    {/* Top wall prism */}
                    <polygon
                      points={`${p00_b.px},${p00_b.py} ${p10_b.px},${p10_b.py} ${p10_t.px},${p10_t.py} ${p00_t.px},${p00_t.py}`}
                      fill="#0284c7"
                      fillOpacity={wallOpacity}
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                    />
                    {/* Right wall prism */}
                    <polygon
                      points={`${p10_b.px},${p10_b.py} ${p11_b.px},${p11_b.py} ${p11_t.px},${p11_t.py} ${p10_t.px},${p10_t.py}`}
                      fill="#0369a1"
                      fillOpacity={wallOpacity}
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                    />
                    {/* Bottom wall prism */}
                    <polygon
                      points={`${p11_b.px},${p11_b.py} ${p01_b.px},${p01_b.py} ${p01_t.px},${p01_t.py} ${p11_t.px},${p11_t.py}`}
                      fill="#0284c7"
                      fillOpacity={wallOpacity}
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                    />
                    {/* Left wall prism */}
                    <polygon
                      points={`${p01_b.px},${p01_b.py} ${p00_b.px},${p00_b.py} ${p00_t.px},${p00_t.py} ${p01_t.px},${p01_t.py}`}
                      fill="#0369a1"
                      fillOpacity={wallOpacity}
                      stroke="#38bdf8"
                      strokeWidth={1.5}
                    />

                    {/* Top perimeter crown rim */}
                    <line x1={p00_t.px} y1={p00_t.py} x2={p10_t.px} y2={p10_t.py} stroke="#7dd3fc" strokeWidth={2} />
                    <line x1={p10_t.px} y1={p10_t.py} x2={p11_t.px} y2={p11_t.py} stroke="#7dd3fc" strokeWidth={2} />
                    <line x1={p11_t.px} y1={p11_t.py} x2={p01_t.px} y2={p01_t.py} stroke="#7dd3fc" strokeWidth={2} />
                    <line x1={p01_t.px} y1={p01_t.py} x2={p00_t.px} y2={p00_t.py} stroke="#7dd3fc" strokeWidth={2} />
                  </g>
                );
              })()}

              {/* Interior Partitions 3D Slabs */}
              {partitions.map((part) => {
                const b1 = proj(part.x1, part.y1, 0);
                const b2 = proj(part.x2, part.y2, 0);
                const t1 = proj(part.x1, part.y1, floorHeightM);
                const t2 = proj(part.x2, part.y2, floorHeightM);

                return (
                  <g key={`axon_part_${part.id}`}>
                    {/* Wall vertical face */}
                    <polygon
                      points={`${b1.px},${b1.py} ${b2.px},${b2.py} ${t2.px},${t2.py} ${t1.px},${t1.py}`}
                      fill="#334155"
                      fillOpacity={showWallTransparency ? 0.2 : 0.8}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                    />
                    {/* Top ridge line */}
                    <line x1={t1.px} y1={t1.py} x2={t2.px} y2={t2.py} stroke="#cbd5e1" strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          )}

          {/* Coordinate Compass in corner */}
          <g transform="translate(60, 60)" className="pointer-events-none">
            <circle cx={0} cy={0} r={28} fill="rgba(15, 23, 42, 0.8)" stroke="#38bdf8" strokeWidth={1} />
            <Compass className="w-8 h-8 text-sky-400 absolute" style={{ transform: "translate(-16px, -16px)" }} />
            <text x={0} y={-14} textAnchor="middle" className="font-mono text-[8px] font-bold fill-sky-300">
              СЕВЕР
            </text>
            <text x={0} y={22} textAnchor="middle" className="font-mono text-[8px] font-bold fill-amber-300">
              {yawDeg}°
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Engineering Summary Bar */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="text-neutral-400">Тёплый пол:</span>
            <span className="text-rose-400 font-bold">
              {heatingLoops.length} контуров ({Math.round(totalFloorHeatingLength)} м трубы PEX)
            </span>
          </div>

          <span className="text-neutral-700">|</span>

          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-neutral-400">Электрика:</span>
            <span className="text-amber-400 font-bold">
              {elements.filter((e) => e.type.includes("socket")).length} розеток,{" "}
              {elements.filter((e) => e.type.includes("switch")).length} выкл.,{" "}
              {elements.filter((e) => e.type === "junction_box").length} распредкоробок
            </span>
          </div>

          <span className="text-neutral-700">|</span>

          <div className="flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-neutral-400">Сантехника:</span>
            <span className="text-blue-400 font-bold">
              {elements.filter((e) => e.type.startsWith("water_") || e.type.startsWith("drain_")).length} точек ВК
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Печать аксонометрии</span>
          </button>
        </div>
      </div>
    </div>
  );
};
