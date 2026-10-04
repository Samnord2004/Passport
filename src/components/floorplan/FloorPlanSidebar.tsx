import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Home,
  Check,
  RotateCw,
  Flame,
  Zap,
  Droplets,
  Wind,
  Eye,
  EyeOff
} from "lucide-react";
import {
  ROOM_PRESETS,
  ELEMENT_CATALOG,
  RoomPreset,
  ElementCatalogItem,
  FloorPartition,
  PlanRoom,
  FloorOpening,
  FloorPlanElement,
  UnderfloorHeatingLoop,
  EngineeringRoute,
  RouteSystem,
  EngineeringLayerVisibility,
  DEFAULT_LAYER_VISIBILITY
} from "../../types/architecturalTypes";
import { generateUnderfloorHeatingSvg, calculateRouteLength } from "./floorPlanUtils";

export type WorkflowStep =
  | "step1_perimeter"
  | "step2_partitions"
  | "step3_rooms"
  | "step4_furniture";

interface FloorPlanSidebarProps {
  workflowStep: WorkflowStep;
  setWorkflowStep: (step: WorkflowStep) => void;
  W: number;
  H: number;
  outerWallThickness: number;
  onUpdatePerimeter: (w: number, h: number, thick: number) => void;
  onApplyTemplate: (type: "open_space" | "house" | "banya") => void;
  // Step 2: Partitions
  currentPartitions: FloorPartition[];
  onAddPartition: (orientation: "vertical" | "horizontal") => void;
  onSplitSpace: (mode: "half_v" | "half_h" | "hallway" | "entry") => void;
  onDeletePartition: (id: string) => void;
  onSelectPartition: (id: string) => void;
  // Step 3: Rooms
  currentRooms: PlanRoom[];
  onAutoGenerateRooms: () => void;
  onAddRoomPreset: (preset: RoomPreset) => void;
  onDeleteRoom: (id: string) => void;
  onSelectRoom: (id: string) => void;
  // Step 4: Openings & Equipment
  onAddOpening: (
    type: "door_interior" | "door_entrance" | "window_standard" | "window_panoramic",
    targetPartitionId?: string
  ) => void;
  onAddElement: (catItem: ElementCatalogItem) => void;
  onInstallOpeningOnPartition?: (
    partitionId: string,
    type: "door_interior" | "door_entrance" | "window_standard" | "window_panoramic"
  ) => void;
  // Engineering Layers & Routes
  layerVisibility?: EngineeringLayerVisibility;
  onToggleLayer?: (layer: keyof EngineeringLayerVisibility) => void;
  onSetSoloLayer?: (layer: keyof EngineeringLayerVisibility | "all") => void;
  currentHeatingLoops?: UnderfloorHeatingLoop[];
  currentRoutes?: EngineeringRoute[];
  onAddHeatingLoop?: (loop: UnderfloorHeatingLoop) => void;
  onDeleteHeatingLoop?: (id: string) => void;
  onSelectHeatingLoop?: (id: string) => void;
  onStartDrawingHeatingLoop?: () => void;
  onStartPlacingElement?: (catItem: ElementCatalogItem) => void;
  onStartDrawingRoute?: (system: RouteSystem, name: string, coresOrDia?: string, color?: string) => void;
  onAutoGenerateRoute?: (type: "electric_room" | "plumbing_main" | "heating_radiators") => void;
  onDeleteRoute?: (id: string) => void;
  onSelectRoute?: (id: string) => void;
  isDrawingRoute?: boolean;
  onCancelDrawingRoute?: () => void;
}

export const FloorPlanSidebar: React.FC<FloorPlanSidebarProps> = ({
  workflowStep,
  setWorkflowStep,
  W,
  H,
  outerWallThickness,
  onUpdatePerimeter,
  onApplyTemplate,
  currentPartitions,
  onAddPartition,
  onSplitSpace,
  onDeletePartition,
  onSelectPartition,
  currentRooms,
  onAutoGenerateRooms,
  onAddRoomPreset,
  onDeleteRoom,
  onSelectRoom,
  onAddOpening,
  onAddElement,
  onInstallOpeningOnPartition,
  layerVisibility = DEFAULT_LAYER_VISIBILITY,
  onToggleLayer,
  onSetSoloLayer,
  currentHeatingLoops = [],
  currentRoutes = [],
  onAddHeatingLoop,
  onDeleteHeatingLoop,
  onSelectHeatingLoop,
  onStartDrawingHeatingLoop,
  onStartPlacingElement,
  onStartDrawingRoute,
  onAutoGenerateRoute,
  onDeleteRoute,
  onSelectRoute,
  isDrawingRoute,
  onCancelDrawingRoute
}) => {
  const [mepCategory, setMepCategory] = useState<
    "openings" | "furniture" | "electric" | "plumbing" | "hvac" | "heating"
  >("openings");

  // Underfloor heating creator form state
  const [selectedHeatingRoomId, setSelectedHeatingRoomId] = useState<string>("");
  const [heatingStepMm, setHeatingStepMm] = useState<number>(150);
  const [heatingOffsetMm, setHeatingOffsetMm] = useState<number>(150);
  const [heatingPattern, setHeatingPattern] = useState<"snail" | "snake">("snail");
  const [circuitPartitionMode, setCircuitPartitionMode] = useState<
    "full" | "center" | "split_h_1" | "split_h_2" | "split_v_1" | "split_v_2" | "edge_window" | "custom"
  >("full");
  const [edgeDepthMeters, setEdgeDepthMeters] = useState<number>(0.8);

  // Custom free coordinates state
  const [customLoopX, setCustomLoopX] = useState<number>(1.0);
  const [customLoopY, setCustomLoopY] = useState<number>(1.0);
  const [customLoopW, setCustomLoopW] = useState<number>(3.0);
  const [customLoopH, setCustomLoopH] = useState<number>(2.5);

  // Palette of distinct colors for loops in the same room to prevent confusion
  const LOOP_COLORS = ["#ef4444", "#0284c7", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

  // Reusable interactive catalog item button with drag-and-drop and click-to-place
  const renderCatalogItemButton = (
    item: ElementCatalogItem,
    customClass = "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-amber-500/40"
  ) => (
    <button
      key={item.type}
      type="button"
      draggable={true}
      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify(item))}
      onClick={() => {
        if (onStartPlacingElement) onStartPlacingElement(item);
        else onAddElement(item);
      }}
      className={`w-full p-2 rounded-xl text-left text-xs transition cursor-grab active:cursor-grabbing flex items-center justify-between border ${customClass}`}
      title="Кликните для установки на плане (режим штампа) или перетащите мышкой (Drag-and-Drop)"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="text-base shrink-0">{item.emoji}</span>
        <div className="truncate">
          <span className="text-white font-bold block truncate">{item.label}</span>
          <span className="text-[10px] text-neutral-400 font-mono block truncate">
            {item.defaultW}×{item.defaultH}м · {item.desc}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800 shrink-0 font-bold">
        +
      </span>
    </button>
  );

  // Handler for adding a new underfloor heating loop
  const handleCreateHeatingLoop = () => {
    let loopX = 0.5;
    let loopY = 0.5;
    let loopW = Math.max(2, W - 1);
    let loopH = Math.max(2, H - 1);
    let loopName = `Контур ТП #${currentHeatingLoops.length + 1}`;
    let isEdge = circuitPartitionMode === "edge_window";
    let step = isEdge ? 100 : heatingStepMm;
    let temp = isEdge ? 50 : 35;
    const room = selectedHeatingRoomId
      ? currentRooms.find((r) => r.id === selectedHeatingRoomId)
      : currentRooms[0];

    const roomLoops = room
      ? currentHeatingLoops.filter((l) => l.roomId === room.id)
      : [];
    const color = isEdge
      ? "#dc2626"
      : LOOP_COLORS[roomLoops.length % LOOP_COLORS.length];

    if (circuitPartitionMode === "custom") {
      loopX = Math.round(customLoopX * 20) / 20;
      loopY = Math.round(customLoopY * 20) / 20;
      loopW = Math.max(0.6, Math.round(customLoopW * 20) / 20);
      loopH = Math.max(0.6, Math.round(customLoopH * 20) / 20);
      loopName = room ? `ТП (${room.name} - Свободный ${loopW}×${loopH}м)` : `ТП (Контур #${currentHeatingLoops.length + 1})`;
    } else if (room) {
      if (circuitPartitionMode === "full") {
        loopX = room.xMeters;
        loopY = room.yMeters;
        loopW = room.wMeters;
        loopH = room.hMeters;
        loopName = `ТП (${room.name}${roomLoops.length > 0 ? ` - К${roomLoops.length + 1}` : ""})`;
      } else if (circuitPartitionMode === "center") {
        const off = 0.5;
        loopX = Math.round((room.xMeters + off) * 100) / 100;
        loopY = Math.round((room.yMeters + off) * 100) / 100;
        loopW = Math.max(1.0, Math.round((room.wMeters - off * 2) * 100) / 100);
        loopH = Math.max(1.0, Math.round((room.hMeters - off * 2) * 100) / 100);
        loopName = `ТП (${room.name} - Центр комнаты)`;
      } else if (circuitPartitionMode === "split_h_1") {
        loopX = room.xMeters;
        loopY = room.yMeters;
        loopW = Math.round((room.wMeters / 2) * 100) / 100;
        loopH = room.hMeters;
        loopName = `ТП (${room.name} - Контур 1/2 [Левый])`;
      } else if (circuitPartitionMode === "split_h_2") {
        const halfW = Math.round((room.wMeters / 2) * 100) / 100;
        loopX = room.xMeters + halfW;
        loopY = room.yMeters;
        loopW = room.wMeters - halfW;
        loopH = room.hMeters;
        loopName = `ТП (${room.name} - Контур 2/2 [Правый])`;
      } else if (circuitPartitionMode === "split_v_1") {
        loopX = room.xMeters;
        loopY = room.yMeters;
        loopW = room.wMeters;
        loopH = Math.round((room.hMeters / 2) * 100) / 100;
        loopName = `ТП (${room.name} - Контур 1/2 [Верхний])`;
      } else if (circuitPartitionMode === "split_v_2") {
        const halfH = Math.round((room.hMeters / 2) * 100) / 100;
        loopX = room.xMeters;
        loopY = room.yMeters + halfH;
        loopW = room.wMeters;
        loopH = room.hMeters - halfH;
        loopName = `ТП (${room.name} - Контур 2/2 [Нижний])`;
      } else if (circuitPartitionMode === "edge_window") {
        const depth = Math.min(room.hMeters * 0.45, edgeDepthMeters);
        loopX = room.xMeters;
        loopY = room.yMeters;
        loopW = room.wMeters;
        loopH = Math.round(depth * 100) / 100;
        loopName = `ТП (${room.name} - Рантовая зона окон [50°C])`;
      }
    }

    const newLoop: UnderfloorHeatingLoop = {
      id: `loop_${Date.now()}`,
      floorLevel: 1,
      name: loopName,
      roomId: room?.id || undefined,
      circuitNumber: roomLoops.length + 1,
      zoneType: isEdge ? "edge_window" : "standard",
      targetTempC: temp,
      xMeters: loopX,
      yMeters: loopY,
      wMeters: loopW,
      hMeters: loopH,
      stepMm: step,
      wallOffsetMm: isEdge ? 80 : heatingOffsetMm,
      pattern: heatingPattern,
      pipeDiameterMm: 16,
      color
    };

    const { lengthMeters } = generateUnderfloorHeatingSvg(newLoop, 1, 0);
    newLoop.pipeLengthMeters = lengthMeters;

    onAddHeatingLoop?.(newLoop);
  };

  // Handler for automatically splitting room into 2 non-overlapping circuits in 1 click
  const handleAutoSplitRoomIntoTwoCircuits = () => {
    const room = selectedHeatingRoomId
      ? currentRooms.find((r) => r.id === selectedHeatingRoomId)
      : currentRooms[0];
    if (!room) return;

    // Split along longer dimension
    const splitHoriz = room.wMeters >= room.hMeters;
    if (splitHoriz) {
      const halfW = Math.round((room.wMeters / 2) * 100) / 100;
      const loop1: UnderfloorHeatingLoop = {
        id: `loop_${Date.now()}_1`,
        floorLevel: 1,
        name: `ТП (${room.name} - Контур 1/2 [Левый])`,
        roomId: room.id,
        circuitNumber: 1,
        zoneType: "standard",
        targetTempC: 35,
        xMeters: room.xMeters,
        yMeters: room.yMeters,
        wMeters: halfW,
        hMeters: room.hMeters,
        stepMm: heatingStepMm,
        wallOffsetMm: heatingOffsetMm,
        pattern: heatingPattern,
        pipeDiameterMm: 16,
        color: LOOP_COLORS[0]
      };
      const l1 = generateUnderfloorHeatingSvg(loop1, 1, 0).lengthMeters;
      loop1.pipeLengthMeters = l1;
      onAddHeatingLoop?.(loop1);

      const loop2: UnderfloorHeatingLoop = {
        id: `loop_${Date.now()}_2`,
        floorLevel: 1,
        name: `ТП (${room.name} - Контур 2/2 [Правый])`,
        roomId: room.id,
        circuitNumber: 2,
        zoneType: "standard",
        targetTempC: 35,
        xMeters: room.xMeters + halfW,
        yMeters: room.yMeters,
        wMeters: room.wMeters - halfW,
        hMeters: room.hMeters,
        stepMm: heatingStepMm,
        wallOffsetMm: heatingOffsetMm,
        pattern: heatingPattern,
        pipeDiameterMm: 16,
        color: LOOP_COLORS[1]
      };
      const l2 = generateUnderfloorHeatingSvg(loop2, 1, 0).lengthMeters;
      loop2.pipeLengthMeters = l2;
      onAddHeatingLoop?.(loop2);
    } else {
      const halfH = Math.round((room.hMeters / 2) * 100) / 100;
      const loop1: UnderfloorHeatingLoop = {
        id: `loop_${Date.now()}_1`,
        floorLevel: 1,
        name: `ТП (${room.name} - Контур 1/2 [Верхний])`,
        roomId: room.id,
        circuitNumber: 1,
        zoneType: "standard",
        targetTempC: 35,
        xMeters: room.xMeters,
        yMeters: room.yMeters,
        wMeters: room.wMeters,
        hH: halfH,
        hMeters: halfH,
        stepMm: heatingStepMm,
        wallOffsetMm: heatingOffsetMm,
        pattern: heatingPattern,
        pipeDiameterMm: 16,
        color: LOOP_COLORS[0]
      } as any;
      const l1 = generateUnderfloorHeatingSvg(loop1, 1, 0).lengthMeters;
      loop1.pipeLengthMeters = l1;
      onAddHeatingLoop?.(loop1);

      const loop2: UnderfloorHeatingLoop = {
        id: `loop_${Date.now()}_2`,
        floorLevel: 1,
        name: `ТП (${room.name} - Контур 2/2 [Нижний])`,
        roomId: room.id,
        circuitNumber: 2,
        zoneType: "standard",
        targetTempC: 35,
        xMeters: room.xMeters,
        yMeters: room.yMeters + halfH,
        wMeters: room.wMeters,
        hMeters: room.hMeters - halfH,
        stepMm: heatingStepMm,
        wallOffsetMm: heatingOffsetMm,
        pattern: heatingPattern,
        pipeDiameterMm: 16,
        color: LOOP_COLORS[1]
      };
      const l2 = generateUnderfloorHeatingSvg(loop2, 1, 0).lengthMeters;
      loop2.pipeLengthMeters = l2;
      onAddHeatingLoop?.(loop2);
    }
  };

  // Handler for adding a high-temperature edge loop along panoramic windows or facade
  const handleCreateHotWindowEdgeLoop = () => {
    const room = selectedHeatingRoomId
      ? currentRooms.find((r) => r.id === selectedHeatingRoomId)
      : currentRooms[0];
    if (!room) return;

    const depth = Math.min(room.hMeters * 0.4, edgeDepthMeters);
    const hotLoop: UnderfloorHeatingLoop = {
      id: `loop_${Date.now()}_edge`,
      floorLevel: 1,
      name: `🔥 Рантовая зона окон (${room.name} [50°C])`,
      roomId: room.id,
      circuitNumber: 99,
      zoneType: "edge_window",
      targetTempC: 50,
      xMeters: room.xMeters,
      yMeters: room.yMeters,
      wMeters: room.wMeters,
      hMeters: Math.round(depth * 100) / 100,
      stepMm: 100, // Denser pitch for window edge compensation
      wallOffsetMm: 80,
      pattern: "snail",
      pipeDiameterMm: 16,
      color: "#dc2626"
    };
    const { lengthMeters } = generateUnderfloorHeatingSvg(hotLoop, 1, 0);
    hotLoop.pipeLengthMeters = lengthMeters;
    onAddHeatingLoop?.(hotLoop);
  };

  return (
    <div className="w-80 border-r border-neutral-800 bg-neutral-950/70 flex flex-col h-full overflow-hidden text-neutral-200">
      {/* 4-Step Navigation Tabs */}
      <div className="p-2 border-b border-neutral-800 bg-neutral-900/50 grid grid-cols-2 gap-1 text-[11px] font-bold">
        {[
          { id: "step1_perimeter", num: "1", label: "Периметр", icon: "🏛️" },
          { id: "step2_partitions", num: "2", label: "Перегородки", icon: "🧱" },
          { id: "step3_rooms", num: "3", label: "Площади", icon: "📐" },
          { id: "step4_furniture", num: "4", label: "Инженерия и сети", icon: "⚡" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setWorkflowStep(tab.id as WorkflowStep)}
            className={`p-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer text-left ${
              workflowStep === tab.id
                ? "bg-amber-500 text-neutral-950 font-black shadow-md"
                : "bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300"
            }`}
          >
            <span>{tab.icon}</span>
            <div className="truncate">
              <span className="opacity-70 text-[9px] block">ШАГ {tab.num}</span>
              <span className="truncate">{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Layer Visibility Control Strip */}
      <div className="px-3 py-2 bg-neutral-900/90 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-500" />
            <span>Слои чертежа:</span>
          </span>
          <button
            type="button"
            onClick={() => onSetSoloLayer?.("all")}
            className="text-[9px] text-amber-400 hover:text-amber-300 font-mono cursor-pointer"
          >
            Показать все
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 text-[10px]">
          {[
            { key: "architecture" as const, label: "Стены", icon: "🏛️" },
            { key: "electric" as const, label: "Электрика", icon: "⚡" },
            { key: "heating" as const, label: "Тёплый пол", icon: "🔥" },
            { key: "plumbing" as const, label: "Сантехника", icon: "💧" },
            { key: "ventilation" as const, label: "Климат", icon: "❄️" },
            { key: "furniture" as const, label: "Мебель", icon: "🛋️" }
          ].map((l) => {
            const isVisible = layerVisibility[l.key];
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => onToggleLayer?.(l.key)}
                className={`p-1 rounded flex items-center justify-between px-1.5 font-bold transition cursor-pointer border ${
                  isVisible
                    ? "bg-neutral-800 border-neutral-700 text-white"
                    : "bg-neutral-950/60 border-neutral-900 text-neutral-600 line-through"
                }`}
                title={isVisible ? `Скрыть слой ${l.label}` : `Показать слой ${l.label}`}
              >
                <span className="flex items-center gap-1 truncate">
                  <span>{l.icon}</span>
                  <span className="truncate">{l.label}</span>
                </span>
                {isVisible ? (
                  <Eye className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                ) : (
                  <EyeOff className="w-2.5 h-2.5 text-neutral-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content depending on active workflow step */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ================= STEP 1: PERIMETER ================= */}
        {workflowStep === "step1_perimeter" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase text-amber-400 block mb-1">
                🏛️ Шаг 1: Периметр строения
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Задайте внешние габариты здания и толщину несущих стен. Это сформирует замкнутый внешний контур для
                построения всех перегородок и комнат.
              </p>
            </div>

            {/* Dimensions Input */}
            <div className="space-y-2 bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Габариты по внешним стенам:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[9px] text-neutral-500 block mb-1 font-mono">Длина W (м):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="3"
                    max="35"
                    value={W}
                    onChange={(e) =>
                      onUpdatePerimeter(
                        Math.max(3, parseFloat(e.target.value) || 6),
                        H,
                        outerWallThickness
                      )
                    }
                    className="w-full p-2 rounded bg-neutral-950 border border-neutral-700 font-mono font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-neutral-500 block mb-1 font-mono">Ширина H (м):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="3"
                    max="35"
                    value={H}
                    onChange={(e) =>
                      onUpdatePerimeter(
                        W,
                        Math.max(3, parseFloat(e.target.value) || 6),
                        outerWallThickness
                      )
                    }
                    className="w-full p-2 rounded bg-neutral-950 border border-neutral-700 font-mono font-bold text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-neutral-500 block mb-1 font-mono">
                  Толщина наружных стен:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[0.25, 0.35, 0.45].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onUpdatePerimeter(W, H, t)}
                      className={`p-1.5 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                        outerWallThickness === t
                          ? "border-amber-500 bg-amber-500/20 text-amber-300"
                          : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {t * 100} см
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Готовые архитектурные шаблоны:
              </span>
              <div className="space-y-1">
                {[
                  { id: "house", label: "Жилой дом (Кухня-гостиная, с/у, спальни)", icon: "🏡" },
                  { id: "banya", label: "Баня (Парная, помывочная, комната отдыха)", icon: "🪵" },
                  { id: "open_space", label: "Свободная планировка (Open Space)", icon: "📐" }
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => onApplyTemplate(tpl.id as any)}
                    className="w-full p-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-left text-xs transition cursor-pointer flex items-center gap-2 border border-neutral-800 hover:border-amber-500/40"
                  >
                    <span className="text-base">{tpl.icon}</span>
                    <span className="text-neutral-200 font-medium">{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PARTITIONS ================= */}
        {workflowStep === "step2_partitions" && (
          <div className="space-y-4">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase text-sky-400 block mb-1">
                🧱 Шаг 2: Внутренние перегородки
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Добавьте стены для разделения пространства на зоны. Перегородки привязаны к сетке 0.25м.
              </p>
            </div>

            {/* Add Partitions */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Добавить перегородку:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onAddPartition("vertical")}
                  className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-left text-xs font-bold transition cursor-pointer flex flex-col gap-1 text-white hover:border-sky-500"
                >
                  <span className="text-base">↕️ Вертикальная</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Стена по оси Y</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddPartition("horizontal")}
                  className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-left text-xs font-bold transition cursor-pointer flex flex-col gap-1 text-white hover:border-sky-500"
                >
                  <span className="text-base">↔️ Горизонтальная</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Стена по оси X</span>
                </button>
              </div>
            </div>

            {/* Quick Space Splitters */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Быстрое зонирование:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onSplitSpace("half_v")}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-left transition cursor-pointer border border-neutral-800"
                >
                  Деление пополам (Верт)
                </button>
                <button
                  type="button"
                  onClick={() => onSplitSpace("half_h")}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-left transition cursor-pointer border border-neutral-800"
                >
                  Деление пополам (Гор)
                </button>
                <button
                  type="button"
                  onClick={() => onSplitSpace("entry")}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-left transition cursor-pointer border border-neutral-800"
                >
                  Выделить тамбур/холл
                </button>
                <button
                  type="button"
                  onClick={() => onSplitSpace("hallway")}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-left transition cursor-pointer border border-neutral-800"
                >
                  Коридор по центру
                </button>
              </div>
            </div>

            {/* Current Partitions List */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Стены на плане ({currentPartitions.length}):
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {currentPartitions.map((p, idx) => {
                  const len = Math.round(
                    Math.sqrt(Math.pow(p.x2 - p.x1, 2) + Math.pow(p.y2 - p.y1, 2)) * 10
                  ) / 10;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPartition(p.id)}
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 flex items-center justify-between text-xs cursor-pointer border border-transparent hover:border-sky-500/40"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sky-400 font-mono font-bold text-[11px]">#{idx + 1}</span>
                        <span className="truncate text-white font-medium">{p.label || "Перегородка"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 font-mono text-[11px]">{len} м</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePartition(p.id);
                          }}
                          className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: ROOMS ================= */}
        {workflowStep === "step3_rooms" && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase text-emerald-400 block mb-1">
                📐 Шаг 3: Формирование комнат и площадей
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Нажмите автоопределение комнат по построенным стенам или выберите помещения вручную из каталога.
              </p>
            </div>

            <button
              type="button"
              onClick={onAutoGenerateRooms}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Автоопределение комнат по стенам</span>
            </button>

            {/* Room catalog */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Добавить готовое помещение:
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {ROOM_PRESETS.map((rp) => (
                  <button
                    key={rp.type}
                    type="button"
                    onClick={() => onAddRoomPreset(rp)}
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-left text-xs transition cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-amber-500/30"
                  >
                    <span>{rp.emoji}</span>
                    <span className="truncate text-neutral-200">{rp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* List of current rooms */}
            <div className="space-y-1.5 pt-1 border-t border-neutral-800">
              <span className="text-[10px] font-black uppercase text-neutral-400 block">
                Сформированные помещения ({currentRooms.length}):
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {currentRooms.map((r) => {
                  const area = Math.round(r.wMeters * r.hMeters * 10) / 10;
                  return (
                    <div
                      key={r.id}
                      onClick={() => onSelectRoom(r.id)}
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 flex items-center justify-between text-xs cursor-pointer border border-transparent hover:border-amber-500/40"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.color || "#fef3c7" }}
                        />
                        <span className="truncate text-white font-medium">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-mono font-bold text-[11px]">{area} м²</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRoom(r.id);
                          }}
                          className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 4: MEP & ROUTES ================= */}
        {workflowStep === "step4_furniture" && (
          <div className="space-y-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
              <span className="text-[10px] font-black uppercase text-purple-400 block mb-1">
                ⚡ Шаг 4: Инженерия, трассы и оборудование
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Накладывайте слои инженерных сетей: раскладка тёплого пола с реальным шагом, проводка от щита через
                распредкоробки, водопровод и сантехника.
              </p>
            </div>

            {/* Category Sub-tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-900 rounded-lg text-[10px] font-bold">
              {[
                { id: "heating", label: "Тёплый пол", icon: "🔥" },
                { id: "electric", label: "Электрика", icon: "⚡" },
                { id: "plumbing", label: "Сантехника", icon: "💧" },
                { id: "openings", label: "Двери/Окна", icon: "🚪" },
                { id: "furniture", label: "Мебель", icon: "🛋️" },
                { id: "hvac", label: "Климат", icon: "❄️" }
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMepCategory(c.id as any)}
                  className={`p-1.5 rounded text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                    mepCategory === c.id
                      ? "bg-amber-500 text-neutral-950 font-black shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>

            {/* 1. HEATING & UNDERFLOOR HEATING */}
            {mepCategory === "heating" && (
              <div className="space-y-3">
                {/* Underfloor heating layout tool */}
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-black text-rose-300 uppercase font-mono">
                        Контуры водяного тёплого пола
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      {currentHeatingLoops.length} шт
                    </span>
                  </div>

                  {/* Draw heating loop directly on canvas button */}
                  <button
                    type="button"
                    onClick={() => onStartDrawingHeatingLoop?.()}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                    <span>✏️ Нарисовать контур на плане (мышкой)</span>
                  </button>

                  {/* Room selector */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] text-neutral-400 uppercase font-mono">
                        Помещение / Зона:
                      </label>
                      {selectedHeatingRoomId && (
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {currentHeatingLoops.filter((l) => l.roomId === selectedHeatingRoomId).length > 0
                            ? `Уже контуров: ${currentHeatingLoops.filter((l) => l.roomId === selectedHeatingRoomId).length}`
                            : "Нет контуров"}
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedHeatingRoomId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        setSelectedHeatingRoomId(rId);
                        const r = currentRooms.find((rm) => rm.id === rId);
                        if (r) {
                          setCustomLoopX(r.xMeters + 0.5);
                          setCustomLoopY(r.yMeters + 0.5);
                          setCustomLoopW(Math.max(1.0, r.wMeters - 1.0));
                          setCustomLoopH(Math.max(1.0, r.hMeters - 1.0));
                        }
                      }}
                      className="w-full p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs font-bold"
                    >
                      <option value="">По периметру здания ({W}×{H}м)</option>
                      {currentRooms.map((r) => {
                        const inRoom = currentHeatingLoops.filter((l) => l.roomId === r.id).length;
                        return (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.wMeters}×{r.hMeters}м, {Math.round(r.wMeters * r.hMeters * 10) / 10} м²){inRoom > 0 ? ` [${inRoom} конт.]` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Multi-circuit Warning / Tip if room has loops already */}
                  {selectedHeatingRoomId && currentHeatingLoops.filter((l) => l.roomId === selectedHeatingRoomId).length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 leading-snug">
                      ⚠️ В этой комнате уже есть контуры. Выберите режим разделения (Слева/Справа или Сверху/Снизу), чтобы контуры не накладывались друг на друга.
                    </div>
                  )}

                  {/* Circuit Partitioning Option (Разделение комнаты на отдельные контуры) */}
                  <div>
                    <label className="text-[9px] text-neutral-400 block uppercase font-mono mb-1">
                      Зона покрытия и расположение контура:
                    </label>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {[
                        { id: "full", label: "Вся комната (100%)", icon: "⬛" },
                        { id: "center", label: "Центр комнаты (-0.5м)", icon: "🔲" },
                        { id: "custom", label: "📐 Свободные X, Y, W, H", icon: "📐" },
                        { id: "edge_window", label: "🔥 Рантовая зона (оконная)", icon: "🪟" },
                        { id: "split_h_1", label: "Левая 1/2", icon: "◧" },
                        { id: "split_h_2", label: "Правая 2/2", icon: "◨" },
                        { id: "split_v_1", label: "Верхняя 1/2", icon: "⬒" },
                        { id: "split_v_2", label: "Нижняя 2/2", icon: "⬓" }
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCircuitPartitionMode(m.id as any)}
                          className={`p-1.5 rounded text-left transition cursor-pointer border flex items-center gap-1 truncate ${
                            circuitPartitionMode === m.id
                              ? "border-rose-500 bg-rose-500/25 text-rose-300 font-black"
                              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <span>{m.icon}</span>
                          <span className="truncate">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Free Coordinates Inputs when custom is active */}
                  {circuitPartitionMode === "custom" && (
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-rose-500/40 space-y-2">
                      <span className="text-[10px] font-black uppercase text-rose-300 block font-mono">
                        Точные размеры и координаты контура (м):
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-0.5">X отступ (м):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={customLoopX}
                              onChange={(e) => setCustomLoopX(parseFloat(e.target.value) || 0)}
                              className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomLoopX((v) => Math.max(0, Math.round((v + 0.5) * 10) / 10))}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Y отступ (м):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step={0.1}
                              min={0}
                              value={customLoopY}
                              onChange={(e) => setCustomLoopY(parseFloat(e.target.value) || 0)}
                              className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomLoopY((v) => Math.max(0, Math.round((v + 0.5) * 10) / 10))}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Ширина W (м):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step={0.1}
                              min={0.6}
                              value={customLoopW}
                              onChange={(e) => setCustomLoopW(Math.max(0.6, parseFloat(e.target.value) || 1))}
                              className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomLoopW((v) => Math.round((v + 0.5) * 10) / 10)}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-0.5">Длина H (м):</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step={0.1}
                              min={0.6}
                              value={customLoopH}
                              onChange={(e) => setCustomLoopH(Math.max(0.6, parseFloat(e.target.value) || 1))}
                              className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomLoopH((v) => Math.round((v + 0.5) * 10) / 10)}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px]"
                            >
                              +0.5
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                        <span>Площадь: {Math.round(customLoopW * customLoopH * 100) / 100} м²</span>
                        <span>Труба: ~{Math.round((customLoopW * customLoopH / 0.15) * 1.1)} м</span>
                      </div>
                    </div>
                  )}

                  {/* Real Step mm */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] text-neutral-400 uppercase font-mono">
                        Шаг укладки трубы:
                      </label>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">
                        {circuitPartitionMode === "edge_window" ? "100 мм (рантовая зона)" : `${heatingStepMm} мм`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[100, 150, 200].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setHeatingStepMm(step)}
                          disabled={circuitPartitionMode === "edge_window"}
                          className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                            (circuitPartitionMode === "edge_window" ? 100 : heatingStepMm) === step
                              ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {step} мм
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wall offset mm */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] text-neutral-400 uppercase font-mono">
                        Отступ от стен:
                      </label>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">
                        {heatingOffsetMm} мм
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[100, 150, 200].map((off) => (
                        <button
                          key={off}
                          type="button"
                          onClick={() => setHeatingOffsetMm(off)}
                          className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                            heatingOffsetMm === off
                              ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                              : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {off} мм
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pattern */}
                  <div>
                    <label className="text-[9px] text-neutral-400 block uppercase font-mono mb-1">
                      Тип укладки (без самопересечений):
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setHeatingPattern("snail")}
                        className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          heatingPattern === "snail"
                            ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        🌀 «Улитка» (бифиляр)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeatingPattern("snake")}
                        className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          heatingPattern === "snake"
                            ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        〰️ «Змейка» (меандр)
                      </button>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCreateHeatingLoop}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {circuitPartitionMode === "edge_window"
                          ? "Добавить рантовый контур у окон (50°C)"
                          : "Добавить выбранный контур ТП"}
                      </span>
                    </button>

                    {/* Quick 1-click Auto-Split for Room */}
                    {selectedHeatingRoomId && (
                      <button
                        type="button"
                        onClick={handleAutoSplitRoomIntoTwoCircuits}
                        className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                        <span>Разбить комнату на 2 контура в 1 клик</span>
                      </button>
                    )}

                    {/* Quick 1-click Hot Edge Zone */}
                    {selectedHeatingRoomId && (
                      <button
                        type="button"
                        onClick={handleCreateHotWindowEdgeLoop}
                        className="w-full py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-600/50 text-red-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <span>🔥</span>
                        <span>Горячая рантовая зона окон (шаг 100мм, 50°C)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* List of active heating loops */}
                {currentHeatingLoops.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-rose-400 block font-mono">
                        Контуры теплого пола ({currentHeatingLoops.length}):
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400">
                        Σ {Math.round(currentHeatingLoops.reduce((acc, l) => acc + (l.pipeLengthMeters || 0), 0))} м
                      </span>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {currentHeatingLoops.map((loop) => {
                        const { lengthMeters } = generateUnderfloorHeatingSvg(loop, 1, 0);
                        const totalL = loop.pipeLengthMeters || lengthMeters;
                        const isEdge = loop.zoneType === "edge_window";
                        return (
                          <div
                            key={loop.id}
                            onClick={() => onSelectHeatingLoop?.(loop.id)}
                            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs cursor-pointer hover:border-rose-500/50"
                          >
                            <div className="truncate flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: loop.color || (isEdge ? "#dc2626" : "#ef4444") }}
                              />
                              <div className="truncate">
                                <span className="text-white font-bold block truncate">
                                  {isEdge ? "🔥 " : ""}{loop.name}
                                </span>
                                <span className="text-[10px] text-rose-400 font-mono">
                                  Шаг {loop.stepMm}мм {isEdge ? "· Т=50°C" : ""} · {totalL}м
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHeatingLoop?.(loop.id);
                              }}
                              className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Categorized Heating & Cooling Equipment Catalog */}
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                    Приборы отопления, конвекторы и тепловентиляторы:
                  </span>

                  {/* 1. Radiators & Convectors */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                      Радиаторы и конвекторы:
                    </span>
                    {ELEMENT_CATALOG.filter(
                      (el) =>
                        el.category === "heating" &&
                        ["radiator", "radiator_low", "convector_floor", "convector_wall"].includes(el.type)
                    ).map((item) => renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-amber-500/40"))}
                  </div>

                  {/* 2. Fan Heaters & Towel Dryers */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                      Тепловентиляторы и сушители:
                    </span>
                    {ELEMENT_CATALOG.filter(
                      (el) =>
                        el.category === "heating" &&
                        ["fan_heater", "towel_dryer"].includes(el.type)
                    ).map((item) => renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-rose-500/40"))}
                  </div>

                  {/* 3. Boiler & Floor Heating Manifold */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 block">
                      Котельное и распределительное оборудование:
                    </span>
                    {ELEMENT_CATALOG.filter(
                      (el) =>
                        el.category === "heating" &&
                        ["heating_boiler", "floor_heating_manifold"].includes(el.type)
                    ).map((item) => renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-orange-500/40"))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. ELECTRICITY, CABLING & JUNCTION BOXES */}
            {mepCategory === "electric" && (
              <div className="space-y-3">
                {/* Cabling routes action box */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-amber-300 uppercase font-mono">
                      Кабельные трассы электропроводки
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">
                    Прокладывайте трассы по потолку h=2.5м с опусками к розеткам и выключателям через распаячные коробки.
                  </p>

                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onStartDrawingRoute?.(
                          "electric",
                          `Кабель ВВГнг-LS 3x2.5 #${currentRoutes.filter((r) => r.system === "electric").length + 1}`,
                          "3x2.5",
                          "#f59e0b"
                        )
                      }
                      className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Начертить трассу розеток (3х2.5)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onStartDrawingRoute?.(
                          "electric",
                          `Освещение ВВГнг-LS 3x1.5 #${currentRoutes.filter((r) => r.system === "electric").length + 1}`,
                          "3x1.5",
                          "#fbbf24"
                        )
                      }
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>💡</span>
                      <span>Начертить трассу освещения (3х1.5)</span>
                    </button>
                  </div>
                </div>

                {/* Electric routes list */}
                {currentRoutes.filter((r) => r.system === "electric").length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                      Проложенные кабели ({currentRoutes.filter((r) => r.system === "electric").length}):
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {currentRoutes
                        .filter((r) => r.system === "electric")
                        .map((route) => {
                          const len = calculateRouteLength(route.points);
                          return (
                            <div
                              key={route.id}
                              onClick={() => onSelectRoute?.(route.id)}
                              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs cursor-pointer hover:border-amber-500/50"
                            >
                              <div className="truncate">
                                <span className="text-white font-bold block truncate">⚡ {route.name}</span>
                                <span className="text-[10px] text-amber-400 font-mono">
                                  {route.cableCores || "ВВГнг"} · {len}м ({route.points.length} т.)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRoute?.(route.id);
                                }}
                                className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Elements */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  {/* Sockets sub-group */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                      🔌 Розетки (220В, интернет, TV, USB Type-C, 380В):
                    </span>
                    <div className="space-y-1">
                      {ELEMENT_CATALOG.filter((el) => el.type.startsWith("socket_")).map((item) =>
                        renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-amber-500/40")
                      )}
                    </div>
                  </div>

                  {/* Switch and Light sub-group */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-yellow-400 block font-mono">
                      💡 Освещение и управление:
                    </span>
                    <div className="space-y-1">
                      {ELEMENT_CATALOG.filter((el) => el.type === "switch_light" || el.type === "light_ceiling").map((item) =>
                        renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-amber-500/40")
                      )}
                    </div>
                  </div>

                  {/* Panels & Junction Boxes */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-red-400 block font-mono">
                      ⚡ Электрощиты и коммутация:
                    </span>
                    <div className="space-y-1">
                      {ELEMENT_CATALOG.filter((el) => el.type === "electric_panel" || el.type === "junction_box").map((item) =>
                        renderCatalogItemButton(
                          item,
                          item.type === "electric_panel"
                            ? "bg-red-950/25 border-red-500/50 hover:bg-red-900/35"
                            : "bg-rose-950/25 border-rose-500/50 hover:bg-rose-900/35"
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PLUMBING & SEWER */}
            {mepCategory === "plumbing" && (
              <div className="space-y-3">
                {/* Piping routes action box */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black text-blue-300 uppercase font-mono">
                      Трассы водопровода и канализации
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onStartDrawingRoute?.(
                          "plumbing_cold",
                          `ХВС PEX-a Ø16 #${currentRoutes.filter((r) => r.system === "plumbing_cold").length + 1}`,
                          "16",
                          "#0284c7"
                        )
                      }
                      className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <span>🔵</span>
                      <span>Проложить трассу ХВС (холодная вода)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onStartDrawingRoute?.(
                          "plumbing_hot",
                          `ГВС PEX-a Ø16 #${currentRoutes.filter((r) => r.system === "plumbing_hot").length + 1}`,
                          "16",
                          "#ef4444"
                        )
                      }
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>🔴</span>
                      <span>Проложить трассу ГВС (горячая вода)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onStartDrawingRoute?.(
                          "sewer",
                          `Канализация ПВХ Ø110 #${currentRoutes.filter((r) => r.system === "sewer").length + 1}`,
                          "110",
                          "#475569"
                        )
                      }
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>🕳️</span>
                      <span>Проложить трассу канализации (Ø110)</span>
                    </button>
                  </div>
                </div>

                {/* Plumbing routes list */}
                {currentRoutes.filter((r) => r.system.startsWith("plumbing") || r.system === "sewer").length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-400 block font-mono">
                      Трубопроводы:
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {currentRoutes
                        .filter((r) => r.system.startsWith("plumbing") || r.system === "sewer")
                        .map((route) => {
                          const len = calculateRouteLength(route.points);
                          return (
                            <div
                              key={route.id}
                              onClick={() => onSelectRoute?.(route.id)}
                              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs cursor-pointer hover:border-blue-500/50"
                            >
                              <div className="truncate">
                                <span className="text-white font-bold block truncate">
                                  {route.system === "sewer" ? "🕳️" : "💧"} {route.name}
                                </span>
                                <span className="text-[10px] text-blue-400 font-mono">
                                  {route.diameterMm ? `Ø${route.diameterMm}мм` : ""} · {len}м ({route.points.length} т.)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRoute?.(route.id);
                                }}
                                className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Elements */}
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  {/* Vacuum and Robot Dock */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-sky-400 block font-mono">
                      🧹 Встроенная уборка и скрытый робот-пылесос:
                    </span>
                    <div className="space-y-1">
                      {ELEMENT_CATALOG.filter(
                        (el) =>
                          el.type === "central_vacuum" ||
                          el.type === "vacuum_inlet" ||
                          el.type === "robot_vacuum_dock"
                      ).map((item) =>
                        renderCatalogItemButton(
                          item,
                          item.type === "robot_vacuum_dock"
                            ? "bg-emerald-950/25 border-emerald-500/40 hover:bg-emerald-900/30"
                            : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-sky-500/40"
                        )
                      )}
                    </div>
                  </div>

                  {/* Water points */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-blue-400 block font-mono">
                      💧 Точки водоразбора и водоочистки:
                    </span>
                    <div className="space-y-1">
                      {ELEMENT_CATALOG.filter(
                        (el) =>
                          el.category === "plumbing" &&
                          el.type !== "central_vacuum" &&
                          el.type !== "vacuum_inlet" &&
                          el.type !== "robot_vacuum_dock"
                      ).map((item) =>
                        renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-blue-500/30")
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DOORS & WINDOWS */}
            {mepCategory === "openings" && (
              <div className="space-y-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                  <span className="font-bold block mb-0.5">⚡ Сквозные проёмы в стенах:</span>
                  <span>
                    Двери и окна формируют архитектурный проём в перегородке с автоматическим срезом тела стены.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-neutral-400 block">
                    Добавить новый проем:
                  </span>
                  {[
                    { type: "door_interior", label: "Дверь межкомнатная (0.85м)", icon: "🚪" },
                    { type: "door_entrance", label: "Входная дверь (1.0м)", icon: "🚪⭐" },
                    { type: "window_standard", label: "Окно стандартное (1.4м)", icon: "🪟" },
                    { type: "window_panoramic", label: "Панорамное окно (2.4м)", icon: "🪟✨" }
                  ].map((op) => (
                    <button
                      key={op.type}
                      type="button"
                      onClick={() => onAddOpening(op.type as any)}
                      className="w-full p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-left text-xs font-bold transition cursor-pointer flex items-center gap-2 border border-neutral-800 hover:border-amber-500/40"
                    >
                      <span>{op.icon}</span>
                      <span className="text-white">{op.label}</span>
                    </button>
                  ))}
                </div>

                {currentPartitions.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                    <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                      Врезать дверь в стену в 1 клик:
                    </span>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {currentPartitions.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800/80 flex items-center justify-between text-xs"
                        >
                          <span className="text-neutral-300 font-medium truncate text-[11px]">
                            #{idx + 1} {p.label || "Перегородка"}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onInstallOpeningOnPartition?.(p.id, "door_interior")}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold cursor-pointer transition"
                              title="Врезать межкомнатную дверь"
                            >
                              🚪 Дверь
                            </button>
                            <button
                              type="button"
                              onClick={() => onInstallOpeningOnPartition?.(p.id, "window_standard")}
                              className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-bold cursor-pointer transition"
                              title="Врезать окно"
                            >
                              🪟 Окно
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. HVAC (VENTILATION, DIFFUSERS, HUMIDIFICATION) & FURNITURE */}
            {mepCategory === "hvac" && (
              <div className="space-y-3">
                {/* Humidification sub-group */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-cyan-400 block font-mono">
                    🌫️ Форсуночное увлажнение воздуха (70 бар):
                  </span>
                  <div className="space-y-1">
                    {ELEMENT_CATALOG.filter(
                      (el) => el.type === "humidifier_pump" || el.type === "humidifier_nozzle"
                    ).map((item) => renderCatalogItemButton(item, "bg-cyan-950/20 hover:bg-cyan-900/30 border-cyan-500/40"))}
                  </div>
                </div>

                {/* Ventilation Diffusers & Wall penetrations */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                  <span className="text-[10px] font-black uppercase text-sky-400 block font-mono">
                    💨 Приточно-вытяжные диффузоры и проходы решёток:
                  </span>
                  <div className="space-y-1">
                    {ELEMENT_CATALOG.filter(
                      (el) =>
                        el.type === "vent_diffuser_supply" ||
                        el.type === "vent_diffuser_exhaust" ||
                        el.type === "vent_grille_linear" ||
                        el.type === "vent_penetration" ||
                        el.type === "vent_recuperator" ||
                        el.type === "vent_valve" ||
                        el.type === "vent_hood"
                    ).map((item) => renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-sky-500/40"))}
                  </div>
                </div>

                {/* Air conditioning */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                  <span className="text-[10px] font-black uppercase text-blue-400 block font-mono">
                    ❄️ Кондиционирование:
                  </span>
                  <div className="space-y-1">
                    {ELEMENT_CATALOG.filter((el) => el.type === "ac_indoor" || el.type === "ac_outdoor").map((item) =>
                      renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-blue-500/30")
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. FURNITURE */}
            {mepCategory === "furniture" && (
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {ELEMENT_CATALOG.filter((el) => el.category === "furniture").map((item) =>
                  renderCatalogItemButton(item, "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-amber-500/30")
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
