import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  RotateCw,
  Maximize2,
  Printer,
  Layers,
  Zap,
  Droplets,
  Wind,
  Flame,
  Armchair,
  DoorOpen,
  Info,
  Grid,
  FileSpreadsheet
} from "lucide-react";
import {
  BuildingFloorPlan,
  PlanRoom,
  FloorPlanElement,
  FloorElementType,
  FloorElementCategory,
  ROOM_PRESETS,
  ELEMENT_CATALOG,
  ElementCatalogItem,
  createDefaultFloorPlan
} from "../types/architecturalTypes";

interface FloorPlanModalProps {
  buildingLabel: string;
  wMeters: number;
  hMeters: number;
  subType?: string;
  initialFloorPlan?: BuildingFloorPlan;
  onSave: (floorPlan: BuildingFloorPlan) => void;
  onClose: () => void;
}

export const FloorPlanModal: React.FC<FloorPlanModalProps> = ({
  buildingLabel,
  wMeters,
  hMeters,
  subType,
  initialFloorPlan,
  onSave,
  onClose,
}) => {
  // Ensure valid dimensions
  const W = Math.max(2, wMeters || 6);
  const H = Math.max(2, hMeters || 6);

  // Floor plan state
  const [floorPlan, setFloorPlan] = useState<BuildingFloorPlan>(() => {
    if (initialFloorPlan && initialFloorPlan.floors && initialFloorPlan.floors.length > 0) {
      return initialFloorPlan;
    }
    return createDefaultFloorPlan(W, H, subType);
  });

  const [currentFloor, setCurrentFloor] = useState<number>(floorPlan.currentFloor || 1);
  const [activeCategory, setActiveCategory] = useState<
    "rooms" | "electric" | "plumbing" | "hvac" | "heating" | "furniture" | "doors"
  >("rooms");

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Canvas zoom and pan
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridStepMeters, setGridStepMeters] = useState<number>(0.25);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"editor" | "spec">("editor");

  // Dragging state for canvas
  const [draggingItem, setDraggingItem] = useState<{
    type: "room" | "element";
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Calculate pixels per meter to fit comfortably in viewport
  // Default canvas bounds
  const canvasPadding = 40;
  const pixelsPerMeter = 55; // 1 meter = 55 pixels
  const svgWidth = W * pixelsPerMeter + canvasPadding * 2;
  const svgHeight = H * pixelsPerMeter + canvasPadding * 2;

  // Filter items for current floor
  const currentRooms = floorPlan.rooms.filter((r) => r.floorLevel === currentFloor);
  const currentElements = floorPlan.elements.filter((e) => e.floorLevel === currentFloor);

  // Compute total area of current floor rooms
  const totalFloorArea = currentRooms.reduce((acc, r) => acc + r.wMeters * r.hMeters, 0);

  // Snap helper
  const snapVal = (val: number, step: number = gridStepMeters) => {
    if (!snapToGrid) return Math.round(val * 100) / 100;
    return Math.round(val / step) * step;
  };

  // Add Room
  const handleAddRoom = (preset: typeof ROOM_PRESETS[0]) => {
    const rw = Math.min(preset.defaultW, W);
    const rh = Math.min(preset.defaultH, H);
    // Find next empty spot or place at origin
    const existing = currentRooms;
    let placeX = 0;
    let placeY = 0;
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      placeX = Math.min(W - rw, last.xMeters + 0.5);
      placeY = Math.min(H - rh, last.yMeters + 0.5);
    }

    const newRoom: PlanRoom = {
      id: "room_" + Date.now(),
      name: preset.label,
      type: preset.type,
      xMeters: Math.round(placeX * 10) / 10,
      yMeters: Math.round(placeY * 10) / 10,
      wMeters: rw,
      hMeters: rh,
      floorLevel: currentFloor,
      color: preset.color,
    };

    setFloorPlan((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }));
    setSelectedRoomId(newRoom.id);
    setSelectedElementId(null);
  };

  // Add Floor Element (Socket, Water, AC, Furniture, Door)
  const handleAddElement = (catalogItem: ElementCatalogItem) => {
    const newElement: FloorPlanElement = {
      id: "el_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type: catalogItem.type,
      floorLevel: currentFloor,
      xMeters: Math.min(W - catalogItem.defaultW, 1.0),
      yMeters: Math.min(H - catalogItem.defaultH, 1.0),
      wMeters: catalogItem.defaultW,
      hMeters: catalogItem.defaultH,
      rotation: 0,
      label: catalogItem.label,
      circuitNumber:
        catalogItem.category === "electric"
          ? "ЭЛ-" + (currentElements.filter((e) => e.type.includes("socket")).length + 1)
          : catalogItem.category === "plumbing"
          ? "В-" + (currentElements.filter((e) => e.type.includes("water")).length + 1)
          : catalogItem.category === "hvac"
          ? "К-" + (currentElements.filter((e) => e.type.includes("ac")).length + 1)
          : undefined,
    };

    setFloorPlan((prev) => ({
      ...prev,
      elements: [...prev.elements, newElement],
    }));
    setSelectedElementId(newElement.id);
    setSelectedRoomId(null);
  };

  // Add new Floor level (e.g. 2nd floor, attic, basement)
  const handleAddFloor = () => {
    const nextLevel = floorPlan.floors.length + 1;
    const name = nextLevel === 2 ? "2 этаж" : nextLevel === 3 ? "3 этаж" : `Этаж ${nextLevel}`;
    const newFloors = [...floorPlan.floors, { level: nextLevel, name, heightMeters: 2.7 }];
    setFloorPlan((prev) => ({ ...prev, floors: newFloors }));
    setCurrentFloor(nextLevel);
  };

  // Remove Floor
  const handleRemoveCurrentFloor = () => {
    if (floorPlan.floors.length <= 1) return;
    const remainingFloors = floorPlan.floors.filter((f) => f.level !== currentFloor);
    const remainingRooms = floorPlan.rooms.filter((r) => r.floorLevel !== currentFloor);
    const remainingElements = floorPlan.elements.filter((e) => e.floorLevel !== currentFloor);
    const targetFloor = remainingFloors[0].level;
    setFloorPlan({
      currentFloor: targetFloor,
      floors: remainingFloors,
      rooms: remainingRooms,
      elements: remainingElements,
    });
    setCurrentFloor(targetFloor);
  };

  // Drag handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    type: "room" | "element",
    id: string,
    origX: number,
    origY: number
  ) => {
    e.stopPropagation();
    if (type === "room") {
      setSelectedRoomId(id);
      setSelectedElementId(null);
    } else {
      setSelectedElementId(id);
      setSelectedRoomId(null);
    }
    setDraggingItem({
      type,
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX,
      origY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingItem) return;
    const dx = (e.clientX - draggingItem.startX) / pixelsPerMeter;
    const dy = (e.clientY - draggingItem.startY) / pixelsPerMeter;

    if (draggingItem.type === "room") {
      const room = floorPlan.rooms.find((r) => r.id === draggingItem.id);
      if (!room) return;
      let newX = snapVal(Math.max(0, Math.min(W - room.wMeters, draggingItem.origX + dx)));
      let newY = snapVal(Math.max(0, Math.min(H - room.hMeters, draggingItem.origY + dy)));
      setFloorPlan((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === draggingItem.id ? { ...r, xMeters: newX, yMeters: newY } : r)),
      }));
    } else {
      const el = floorPlan.elements.find((e) => e.id === draggingItem.id);
      if (!el) return;
      let newX = snapVal(Math.max(0, Math.min(W - el.wMeters, draggingItem.origX + dx)));
      let newY = snapVal(Math.max(0, Math.min(H - el.hMeters, draggingItem.origY + dy)));
      setFloorPlan((prev) => ({
        ...prev,
        elements: prev.elements.map((e) =>
          e.id === draggingItem.id ? { ...e, xMeters: newX, yMeters: newY } : e
        ),
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  // Rotate selected element by 90 degrees
  const handleRotateElement = (id: string) => {
    setFloorPlan((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id !== id) return el;
        const newRot = (el.rotation + 90) % 360;
        // Swap w and h for 90/270 deg
        return {
          ...el,
          rotation: newRot,
        };
      }),
    }));
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (selectedElementId) {
      setFloorPlan((prev) => ({
        ...prev,
        elements: prev.elements.filter((e) => e.id !== selectedElementId),
      }));
      setSelectedElementId(null);
    } else if (selectedRoomId) {
      setFloorPlan((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== selectedRoomId),
      }));
      setSelectedRoomId(null);
    }
  };

  // Save changes
  const handleSave = () => {
    onSave(floorPlan);
    onClose();
  };

  // Selected item details for inspector
  const activeRoom = floorPlan.rooms.find((r) => r.id === selectedRoomId);
  const activeElement = floorPlan.elements.find((e) => e.id === selectedElementId);

  // Statistics
  const socketCount = currentElements.filter((e) => e.type.includes("socket")).length;
  const plumbingCount = currentElements.filter(
    (e) => e.type.includes("water") || e.type.includes("drain") || e.type.includes("heater")
  ).length;
  const hvacCount = currentElements.filter(
    (e) => e.type.includes("ac") || e.type.includes("vent")
  ).length;
  const heatingCount = currentElements.filter(
    (e) => e.type.includes("radiator") || e.type.includes("boiler") || e.type.includes("heating")
  ).length;

  return (
    <div
      className="fixed inset-0 z-[125] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-[1240px] h-[94vh] shadow-2xl flex flex-col overflow-hidden text-neutral-100">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📐</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">
                  Планировка этажей и инженерные сети: {buildingLabel || "Строение"}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-amber-400 font-mono font-bold">
                  {W}м × {H}м ({Math.round(W * H * 10) / 10} м² пятно)
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Моделирование помещений в точных размерах, расстановка электрики, ХВС/ГВС, кондиционирования и мебели
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "editor" ? "spec" : "editor")}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "spec"
                  ? "border-amber-500 bg-amber-500/20 text-amber-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{activeTab === "spec" ? "Вернуться к чертежу" : "Экспликация и ведомость"}</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить планировку</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floor Switcher & Controls Bar */}
        <div className="px-5 py-2 border-b border-neutral-800/80 bg-neutral-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Floors list */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-neutral-400 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Этаж:</span>
            </span>

            {floorPlan.floors.map((fl) => (
              <button
                key={fl.level}
                onClick={() => {
                  setCurrentFloor(fl.level);
                  setSelectedRoomId(null);
                  setSelectedElementId(null);
                }}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  currentFloor === fl.level
                    ? "bg-amber-500 text-neutral-950 shadow-md font-black"
                    : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {fl.name}
              </button>
            ))}

            <button
              onClick={handleAddFloor}
              className="p-1 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Добавить следующий этаж"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить этаж</span>
            </button>

            {floorPlan.floors.length > 1 && (
              <button
                onClick={handleRemoveCurrentFloor}
                className="p-1 px-2 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 text-xs font-bold cursor-pointer"
                title="Удалить текущий этаж"
              >
                Удалить этаж
              </button>
            )}
          </div>

          {/* Quick stats on current floor */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-neutral-400">
              Комнат: <strong className="text-white">{currentRooms.length}</strong> ({Math.round(totalFloorArea * 10) / 10} м²)
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-amber-400 font-bold" title="Розетки 220В">
              🔌 {socketCount} роз.
            </span>
            <span className="text-blue-400 font-bold" title="Точки ХВС / ГВС">
              💧 {plumbingCount} сан.
            </span>
            <span className="text-cyan-400 font-bold" title="Кондиционеры и вентиляция">
              ❄️ {hvacCount} клим.
            </span>
            <span className="text-orange-400 font-bold" title="Отопление">
              🔥 {heatingCount} отоп.
            </span>
          </div>

          {/* Grid snap & rulers toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-white text-[11px]">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Привязка к сетке (0.25м)</span>
            </label>

            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Печать чертежа"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === "editor" ? (
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT PALETTE: CATALOG & ADDING */}
            <div className="w-64 sm:w-72 border-r border-neutral-800 bg-neutral-950/60 flex flex-col overflow-hidden">
              {/* Category tabs */}
              <div className="p-2 border-b border-neutral-800/80 grid grid-cols-4 gap-1">
                {[
                  { id: "rooms", label: "Комнаты", icon: "🏠" },
                  { id: "electric", label: "Электрика", icon: "🔌" },
                  { id: "plumbing", label: "Вода / Слив", icon: "💧" },
                  { id: "hvac", label: "Климат / Вент", icon: "❄️" },
                  { id: "heating", label: "Отопление", icon: "🔥" },
                  { id: "furniture", label: "Мебель", icon: "🛋️" },
                  { id: "doors", label: "Двери", icon: "🚪" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`p-1.5 rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      activeCategory === cat.id
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold"
                        : "hover:bg-neutral-800/60 text-neutral-400 border border-transparent"
                    }`}
                    title={cat.label}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-[9px] mt-0.5 truncate max-w-full">{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Items List for active category */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeCategory === "rooms" && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider block mb-1">
                      Добавить помещение:
                    </span>
                    {ROOM_PRESETS.map((rp) => (
                      <button
                        key={rp.type}
                        onClick={() => handleAddRoom(rp)}
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-850 text-left transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{rp.emoji}</span>
                          <div>
                            <div className="font-bold text-xs text-white group-hover:text-amber-400">
                              {rp.label}
                            </div>
                            <div className="text-[9px] text-neutral-500 font-mono">
                              Стандарт {rp.defaultW}×{rp.defaultH}м ({Math.round(rp.defaultW * rp.defaultH * 10) / 10} м²)
                            </div>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-neutral-500 group-hover:text-amber-400" />
                      </button>
                    ))}
                  </div>
                )}

                {activeCategory !== "rooms" && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider block mb-1">
                      Разместить на плане:
                    </span>
                    {ELEMENT_CATALOG.filter((item) => {
                      if (activeCategory === "electric") return item.category === "electric";
                      if (activeCategory === "plumbing") return item.category === "plumbing";
                      if (activeCategory === "hvac") return item.category === "hvac";
                      if (activeCategory === "heating") return item.category === "heating";
                      if (activeCategory === "furniture") return item.category === "furniture";
                      if (activeCategory === "doors") return item.category === "interior_door";
                      return false;
                    }).map((el) => (
                      <button
                        key={el.type}
                        onClick={() => handleAddElement(el)}
                        className="w-full p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-850 text-left transition flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{el.emoji}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-white group-hover:text-amber-400 truncate">
                              {el.label}
                            </div>
                            <div className="text-[9px] text-neutral-400 font-mono truncate">
                              {el.defaultW}×{el.defaultH}м • {el.desc}
                            </div>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Quick Instructions */}
              <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 text-[10px] text-neutral-400 space-y-1">
                <div className="font-bold text-neutral-300 flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-500" />
                  <span>Управление:</span>
                </div>
                <p>• Перетаскивайте комнаты и розетки мышью</p>
                <p>• Клик по объекту открывает точные настройки</p>
              </div>
            </div>

            {/* CENTER BLUEPRINT CAD CANVAS */}
            <div className="flex-1 bg-neutral-950 overflow-auto p-4 flex items-center justify-center relative select-none">
              
              <div className="relative shadow-2xl rounded-xl border border-neutral-800 bg-[#0d1527] overflow-hidden">
                
                {/* Canvas Blueprint Grid SVG */}
                <svg
                  ref={svgRef}
                  width={svgWidth}
                  height={svgHeight}
                  className="cursor-crosshair block"
                  onClick={() => {
                    setSelectedRoomId(null);
                    setSelectedElementId(null);
                  }}
                >
                  <defs>
                    {/* Small grid pattern (0.5 meter) */}
                    <pattern
                      id="smallGrid"
                      width={0.5 * pixelsPerMeter}
                      height={0.5 * pixelsPerMeter}
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d={`M ${0.5 * pixelsPerMeter} 0 L 0 0 0 ${0.5 * pixelsPerMeter}`}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="0.8"
                      />
                    </pattern>
                    {/* Large grid pattern (1 meter) */}
                    <pattern
                      id="grid"
                      width={pixelsPerMeter}
                      height={pixelsPerMeter}
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width={pixelsPerMeter} height={pixelsPerMeter} fill="url(#smallGrid)" />
                      <path
                        d={`M ${pixelsPerMeter} 0 L 0 0 0 ${pixelsPerMeter}`}
                        fill="none"
                        stroke="rgba(56, 189, 248, 0.15)"
                        strokeWidth="1.2"
                      />
                    </pattern>
                  </defs>

                  {/* Background grid */}
                  <rect width="100%" height="100%" fill="#090e1a" />
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Rulers along top & left */}
                  {showRulers && (
                    <g className="text-[9px] font-mono fill-sky-400/60 select-none">
                      {Array.from({ length: Math.ceil(W) + 1 }).map((_, i) => (
                        <g key={`rx_${i}`}>
                          <line
                            x1={canvasPadding + i * pixelsPerMeter}
                            y1={canvasPadding - 8}
                            x2={canvasPadding + i * pixelsPerMeter}
                            y2={canvasPadding}
                            stroke="rgba(56, 189, 248, 0.4)"
                            strokeWidth="1"
                          />
                          <text
                            x={canvasPadding + i * pixelsPerMeter}
                            y={canvasPadding - 12}
                            textAnchor="middle"
                          >
                            {i}м
                          </text>
                        </g>
                      ))}

                      {Array.from({ length: Math.ceil(H) + 1 }).map((_, j) => (
                        <g key={`ry_${j}`}>
                          <line
                            x1={canvasPadding - 8}
                            y1={canvasPadding + j * pixelsPerMeter}
                            x2={canvasPadding}
                            y2={canvasPadding + j * pixelsPerMeter}
                            stroke="rgba(56, 189, 248, 0.4)"
                            strokeWidth="1"
                          />
                          <text
                            x={canvasPadding - 12}
                            y={canvasPadding + j * pixelsPerMeter + 3}
                            textAnchor="end"
                          >
                            {j}м
                          </text>
                        </g>
                      ))}
                    </g>
                  )}

                  {/* Outer Perimeter Walls of Building */}
                  <g>
                    <rect
                      x={canvasPadding}
                      y={canvasPadding}
                      width={W * pixelsPerMeter}
                      height={H * pixelsPerMeter}
                      fill="rgba(15, 23, 42, 0.7)"
                      stroke="#38bdf8"
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                    {/* Dimension labels on perimeter */}
                    <text
                      x={canvasPadding + (W * pixelsPerMeter) / 2}
                      y={canvasPadding + H * pixelsPerMeter + 22}
                      textAnchor="middle"
                      className="fill-sky-400 font-mono text-xs font-bold"
                    >
                      {W} м
                    </text>
                    <text
                      x={canvasPadding + W * pixelsPerMeter + 22}
                      y={canvasPadding + (H * pixelsPerMeter) / 2}
                      textAnchor="middle"
                      transform={`rotate(90 ${canvasPadding + W * pixelsPerMeter + 22} ${
                        canvasPadding + (H * pixelsPerMeter) / 2
                      })`}
                      className="fill-sky-400 font-mono text-xs font-bold"
                    >
                      {H} м
                    </text>
                  </g>

                  {/* Render ROOMS on current floor */}
                  {currentRooms.map((room) => {
                    const rx = canvasPadding + room.xMeters * pixelsPerMeter;
                    const ry = canvasPadding + room.yMeters * pixelsPerMeter;
                    const rw = room.wMeters * pixelsPerMeter;
                    const rh = room.hMeters * pixelsPerMeter;
                    const isSelected = selectedRoomId === room.id;
                    const area = Math.round(room.wMeters * room.hMeters * 10) / 10;

                    return (
                      <g
                        key={room.id}
                        onMouseDown={(e) =>
                          handleMouseDown(e, "room", room.id, room.xMeters, room.yMeters)
                        }
                        className="cursor-move"
                      >
                        {/* Room Area Rectangle */}
                        <rect
                          x={rx}
                          y={ry}
                          width={rw}
                          height={rh}
                          fill={room.color || "#fef3c7"}
                          fillOpacity={isSelected ? 0.35 : 0.2}
                          stroke={isSelected ? "#f59e0b" : "#475569"}
                          strokeWidth={isSelected ? 3 : 2}
                          strokeDasharray={isSelected ? "none" : "none"}
                        />

                        {/* Room Text Label */}
                        <text
                          x={rx + rw / 2}
                          y={ry + rh / 2 - 8}
                          textAnchor="middle"
                          className="font-bold text-[11px] fill-white pointer-events-none select-none drop-shadow"
                        >
                          {room.name}
                        </text>
                        <text
                          x={rx + rw / 2}
                          y={ry + rh / 2 + 10}
                          textAnchor="middle"
                          className="font-mono font-bold text-[10px] fill-amber-400 pointer-events-none select-none"
                        >
                          {room.wMeters}×{room.hMeters}м ({area} м²)
                        </text>
                      </g>
                    );
                  })}

                  {/* Render ELEMENTS (Sockets, Water Inlets, AC, Furniture, Doors) */}
                  {currentElements.map((el) => {
                    const ex = canvasPadding + el.xMeters * pixelsPerMeter;
                    const ey = canvasPadding + el.yMeters * pixelsPerMeter;
                    const ew = el.wMeters * pixelsPerMeter;
                    const eh = el.hMeters * pixelsPerMeter;
                    const isSelected = selectedElementId === el.id;
                    const catItem = ELEMENT_CATALOG.find((c) => c.type === el.type);
                    const color = catItem?.color || "#f59e0b";
                    const isDoor = el.type.includes("door");

                    return (
                      <g
                        key={el.id}
                        transform={`rotate(${el.rotation} ${ex + ew / 2} ${ey + eh / 2})`}
                        onMouseDown={(e) =>
                          handleMouseDown(e, "element", el.id, el.xMeters, el.yMeters)
                        }
                        className="cursor-move"
                      >
                        {isDoor ? (
                          // Door graphic with opening arc
                          <g>
                            <rect
                              x={ex}
                              y={ey}
                              width={ew}
                              height={Math.max(4, eh)}
                              fill="#a16207"
                              stroke="#000"
                              strokeWidth="1"
                            />
                            <path
                              d={`M ${ex} ${ey} A ${ew} ${ew} 0 0 1 ${ex + ew} ${ey + ew}`}
                              fill="none"
                              stroke="rgba(245, 158, 11, 0.4)"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          </g>
                        ) : (
                          // Standard Element Body
                          <rect
                            x={ex}
                            y={ey}
                            width={ew}
                            height={eh}
                            rx="3"
                            fill={color}
                            fillOpacity="0.85"
                            stroke={isSelected ? "#fff" : "#000"}
                            strokeWidth={isSelected ? 2 : 1}
                            className="drop-shadow-md"
                          />
                        )}

                        {/* Emoji icon inside element */}
                        <text
                          x={ex + ew / 2}
                          y={ey + eh / 2 + 4}
                          textAnchor="middle"
                          className="text-[10px] pointer-events-none select-none font-bold fill-white"
                        >
                          {catItem?.emoji || "⚡"}
                        </text>

                        {/* Small circuit number or label badge */}
                        {el.circuitNumber && (
                          <text
                            x={ex + ew / 2}
                            y={ey - 3}
                            textAnchor="middle"
                            className="text-[8px] font-mono font-bold fill-sky-300 pointer-events-none select-none"
                          >
                            {el.circuitNumber}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Overlay helper legend */}
                <div className="absolute bottom-2 left-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-[10px] text-neutral-300 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
                    <span>Электрика</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" />
                    <span>Водопровод</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" />
                    <span>Кондиционер / Вент</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block" />
                    <span>Отопление</span>
                  </span>
                </div>
              </div>

            </div>

            {/* RIGHT INSPECTOR PANEL: SELECTED OBJECT PROPERTIES */}
            <div className="w-72 border-l border-neutral-800 bg-neutral-950/70 p-4 flex flex-col justify-between overflow-y-auto">
              {activeElement ? (
                <div className="space-y-4">
                  <div className="border-b border-neutral-800 pb-2">
                    <span className="text-[10px] font-black uppercase text-amber-500 block">
                      Свойства элемента:
                    </span>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5 mt-0.5">
                      <span>{ELEMENT_CATALOG.find((c) => c.type === activeElement.type)?.emoji}</span>
                      <span>{activeElement.label}</span>
                    </h3>
                  </div>

                  {/* Coordinates & Dimensions */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                          X от угла (м):
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={W - activeElement.wMeters}
                          value={activeElement.xMeters}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFloorPlan((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === activeElement.id ? { ...el, xMeters: val } : el
                              ),
                            }));
                          }}
                          className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-amber-400"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                          Y от угла (м):
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={H - activeElement.hMeters}
                          value={activeElement.yMeters}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFloorPlan((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === activeElement.id ? { ...el, yMeters: val } : el
                              ),
                            }));
                          }}
                          className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-amber-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                          Ширина (м):
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.2"
                          max="4.0"
                          value={activeElement.wMeters}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.5;
                            setFloorPlan((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === activeElement.id ? { ...el, wMeters: val } : el
                              ),
                            }));
                          }}
                          className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                          Глубина (м):
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.2"
                          max="4.0"
                          value={activeElement.hMeters}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.5;
                            setFloorPlan((prev) => ({
                              ...prev,
                              elements: prev.elements.map((el) =>
                                el.id === activeElement.id ? { ...el, hMeters: val } : el
                              ),
                            }));
                          }}
                          className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Circuit / Line number */}
                  <div>
                    <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                      Обозначение / Номер линии или стояка:
                    </label>
                    <input
                      type="text"
                      value={activeElement.circuitNumber || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFloorPlan((prev) => ({
                          ...prev,
                          elements: prev.elements.map((el) =>
                            el.id === activeElement.id ? { ...el, circuitNumber: val } : el
                          ),
                        }));
                      }}
                      placeholder="напр. Розетки кухня / ЩР-1 / Стояк 1"
                      className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono font-bold text-white"
                    />
                  </div>

                  {/* Rotation button */}
                  <div>
                    <button
                      onClick={() => handleRotateElement(activeElement.id)}
                      className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <RotateCw className="w-4 h-4 text-amber-500" />
                      <span>Повернуть на 90° ({activeElement.rotation}°)</span>
                    </button>
                  </div>

                  {/* Delete button */}
                  <div>
                    <button
                      onClick={handleDeleteSelected}
                      className="w-full py-2 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить с плана</span>
                    </button>
                  </div>
                </div>
              ) : activeRoom ? (
                <div className="space-y-4">
                  <div className="border-b border-neutral-800 pb-2">
                    <span className="text-[10px] font-black uppercase text-amber-500 block">
                      Свойства помещения:
                    </span>
                    <h3 className="font-extrabold text-sm text-white mt-0.5">
                      🏠 {activeRoom.name}
                    </h3>
                    <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                      Площадь: {Math.round(activeRoom.wMeters * activeRoom.hMeters * 10) / 10} м²
                    </span>
                  </div>

                  {/* Room Name */}
                  <div>
                    <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                      Название комнаты:
                    </label>
                    <input
                      type="text"
                      value={activeRoom.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFloorPlan((prev) => ({
                          ...prev,
                          rooms: prev.rooms.map((r) =>
                            r.id === activeRoom.id ? { ...r, name: val } : r
                          ),
                        }));
                      }}
                      className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 text-xs font-bold text-white"
                    />
                  </div>

                  {/* Room Dimensions */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                        Ширина (м):
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max={W}
                        value={activeRoom.wMeters}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setFloorPlan((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r) =>
                              r.id === activeRoom.id ? { ...r, wMeters: val } : r
                            ),
                          }));
                        }}
                        className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                        Длина (м):
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max={H}
                        value={activeRoom.hMeters}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setFloorPlan((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r) =>
                              r.id === activeRoom.id ? { ...r, hMeters: val } : r
                            ),
                          }));
                        }}
                        className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                        Смещение X (м):
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={W - activeRoom.wMeters}
                        value={activeRoom.xMeters}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFloorPlan((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r) =>
                              r.id === activeRoom.id ? { ...r, xMeters: val } : r
                            ),
                          }));
                        }}
                        className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-amber-400"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-neutral-500 block uppercase font-mono">
                        Смещение Y (м):
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max={H - activeRoom.hMeters}
                        value={activeRoom.yMeters}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFloorPlan((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r) =>
                              r.id === activeRoom.id ? { ...r, yMeters: val } : r
                            ),
                          }));
                        }}
                        className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-amber-400"
                      />
                    </div>
                  </div>

                  {/* Color tint */}
                  <div>
                    <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                      Цветовая заливка помещения:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeRoom.color || "#fef3c7"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFloorPlan((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((r) =>
                              r.id === activeRoom.id ? { ...r, color: val } : r
                            ),
                          }));
                        }}
                        className="w-7 h-7 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
                      />
                      <span className="font-mono text-xs text-neutral-400">
                        {activeRoom.color || "#fef3c7"}
                      </span>
                    </div>
                  </div>

                  {/* Delete Room */}
                  <div>
                    <button
                      onClick={handleDeleteSelected}
                      className="w-full py-2 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить комнату</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-500 space-y-2">
                  <Grid className="w-8 h-8 text-neutral-700 animate-pulse" />
                  <div className="text-xs font-bold text-neutral-400">Ничего не выбрано</div>
                  <p className="text-[11px] leading-relaxed">
                    Кликните на комнату или значок инженерной точки на плане для редактирования размеров и параметров
                  </p>
                </div>
              )}

              {/* Bottom Quick Info */}
              <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl text-[10px] text-neutral-400 space-y-1">
                <div className="font-bold text-neutral-300">План этажа:</div>
                <div className="flex justify-between">
                  <span>Общая площадь:</span>
                  <span className="font-mono text-white font-bold">{Math.round(W * H * 10) / 10} м²</span>
                </div>
                <div className="flex justify-between">
                  <span>Жилая/полезная:</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(totalFloorArea * 10) / 10} м²</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* TAB 2: SPECIFICATION & ROOM EXPLICATION TABLE */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Room Schedule (Экспликация) */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>📋 Экспликация помещений ({floorPlan.floors.find((f) => f.level === currentFloor)?.name}):</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[10px] uppercase">
                        <th className="py-2">№</th>
                        <th className="py-2">Наименование помещения</th>
                        <th className="py-2">Размеры (м)</th>
                        <th className="py-2 text-right">Площадь (м²)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {currentRooms.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-neutral-900/50">
                          <td className="py-2.5 font-mono text-neutral-500">{idx + 1}</td>
                          <td className="py-2.5 font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color || "#ccc" }} />
                            <span>{r.name}</span>
                          </td>
                          <td className="py-2.5 font-mono text-neutral-400">
                            {r.wMeters} × {r.hMeters}
                          </td>
                          <td className="py-2.5 font-mono font-bold text-amber-400 text-right">
                            {Math.round(r.wMeters * r.hMeters * 10) / 10} м²
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-neutral-700 font-black text-xs text-white">
                        <td colSpan={3} className="py-3">ИТОГО полезная площадь помещений этажа:</td>
                        <td className="py-3 font-mono text-amber-400 text-right text-sm">
                          {Math.round(totalFloorArea * 10) / 10} м²
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Engineering Equipment Schedule (Ведомость оборудования и коммуникаций) */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>⚡ Ведомость инженерных точек и коммуникаций ({floorPlan.floors.find((f) => f.level === currentFloor)?.name}):</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { title: "Розетки 220В", icon: "🔌", count: socketCount, color: "text-amber-400" },
                    { title: "Водорозетки и сливы", icon: "💧", count: plumbingCount, color: "text-blue-400" },
                    { title: "Кондиционеры и вент.", icon: "❄️", count: hvacCount, color: "text-cyan-400" },
                    { title: "Отопление (радиаторы)", icon: "🔥", count: heatingCount, color: "text-orange-400" },
                    { title: "Мебель и сантехника", icon: "🛋️", count: currentElements.filter((e) => e.type.includes("bed") || e.type.includes("sofa") || e.type.includes("table") || e.type.includes("bath") || e.type.includes("toilet")).length, color: "text-purple-400" },
                    { title: "Межкомнатные двери", icon: "🚪", count: currentElements.filter((e) => e.type.includes("door")).length, color: "text-emerald-400" },
                  ].map((stat, i) => (
                    <div key={i} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{stat.icon}</span>
                        <span className="text-xs font-bold text-neutral-300">{stat.title}</span>
                      </div>
                      <span className={`text-base font-black font-mono ${stat.color}`}>
                        {stat.count} шт
                      </span>
                    </div>
                  ))}
                </div>

                {/* Detailed element list */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-500 font-mono text-[10px] uppercase">
                        <th className="py-2">№</th>
                        <th className="py-2">Тип элемента</th>
                        <th className="py-2">Линия / Стояк</th>
                        <th className="py-2">Позиция X, Y</th>
                        <th className="py-2 text-right">Поворот</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {currentElements.map((el, idx) => (
                        <tr key={el.id} className="hover:bg-neutral-900/50">
                          <td className="py-2 font-mono text-neutral-500">{idx + 1}</td>
                          <td className="py-2 font-bold text-white flex items-center gap-1.5">
                            <span>{ELEMENT_CATALOG.find((c) => c.type === el.type)?.emoji}</span>
                            <span>{el.label}</span>
                          </td>
                          <td className="py-2 font-mono text-sky-400">{el.circuitNumber || "—"}</td>
                          <td className="py-2 font-mono text-neutral-400">
                            X: {el.xMeters}м, Y: {el.yMeters}м
                          </td>
                          <td className="py-2 font-mono text-neutral-400 text-right">{el.rotation}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/80">
          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Данные планировки сохраняются в объекте здания и доступны в 3D просмотре</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Применить планировку</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
