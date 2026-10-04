import React from "react";
import {
  RotateCw,
  Trash2,
  Info,
  Maximize2
} from "lucide-react";
import {
  FloorPartition,
  PlanRoom,
  FloorOpening,
  FloorPlanElement,
  UnderfloorHeatingLoop,
  EngineeringRoute,
  ROOM_PRESETS,
  ELEMENT_CATALOG
} from "../../types/architecturalTypes";
import { generateUnderfloorHeatingSvg, calculateRouteLength } from "./floorPlanUtils";

interface FloorPlanInspectorProps {
  W: number;
  H: number;
  outerWallThickness: number;
  activeRoom: PlanRoom | undefined;
  activePartition: FloorPartition | undefined;
  activeOpening: FloorOpening | undefined;
  activeElement: FloorPlanElement | undefined;
  activeHeatingLoop?: UnderfloorHeatingLoop | undefined;
  activeRoute?: EngineeringRoute | undefined;
  currentRooms: PlanRoom[];
  currentPartitions: FloorPartition[];
  currentElements: FloorPlanElement[];
  onUpdateRoom: (room: PlanRoom) => void;
  onUpdatePartition: (partition: FloorPartition) => void;
  onUpdateOpening: (opening: FloorOpening) => void;
  onUpdateElement: (el: FloorPlanElement) => void;
  onUpdateHeatingLoop?: (loop: UnderfloorHeatingLoop) => void;
  onUpdateRoute?: (route: EngineeringRoute) => void;
  onDeleteSelected: () => void;
  onRotateElement: (id: string) => void;
  onInstallOpeningOnPartition?: (
    partitionId: string,
    type: "door_interior" | "door_entrance" | "window_standard" | "window_panoramic"
  ) => void;
  onOpenTab?: (tab: "editor" | "axonometry" | "electric_scheme" | "collector_scheme" | "spec") => void;
}

export const FloorPlanInspector: React.FC<FloorPlanInspectorProps> = ({
  W,
  H,
  outerWallThickness,
  activeRoom,
  activePartition,
  activeOpening,
  activeElement,
  activeHeatingLoop,
  activeRoute,
  currentRooms,
  currentPartitions,
  currentElements,
  onUpdateRoom,
  onUpdatePartition,
  onUpdateOpening,
  onUpdateElement,
  onUpdateHeatingLoop,
  onUpdateRoute,
  onDeleteSelected,
  onRotateElement,
  onInstallOpeningOnPartition,
  onOpenTab
}) => {
  // Total area of rooms
  const totalRoomsArea = currentRooms.reduce((acc, r) => acc + r.wMeters * r.hMeters, 0);
  const totalPartitionsLength = currentPartitions.reduce((acc, p) => {
    return acc + Math.sqrt(Math.pow(p.x2 - p.x1, 2) + Math.pow(p.y2 - p.y1, 2));
  }, 0);

  return (
    <div className="w-76 border-l border-neutral-800 bg-neutral-950/70 p-4 flex flex-col justify-between overflow-y-auto text-neutral-200">
      {/* 1. ACTIVE PARTITION INSPECTOR */}
      {activePartition ? (
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-sky-400 block font-mono">
              Свойства перегородки
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5">
              🧱 {activePartition.label || "Внутренняя стена"}
            </h3>
            <span className="text-[11px] font-mono text-amber-400">
              Длина:{" "}
              {Math.round(
                Math.sqrt(
                  Math.pow(activePartition.x2 - activePartition.x1, 2) +
                    Math.pow(activePartition.y2 - activePartition.y1, 2)
                ) * 10
              ) / 10}{" "}
              м
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Название / Назначение стены:
              </label>
              <input
                type="text"
                value={activePartition.label || ""}
                onChange={(e) => onUpdatePartition({ ...activePartition, label: e.target.value })}
                placeholder="напр. Перегородка спальни"
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Толщина стены:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { thick: 0.10, label: "100 мм" },
                  { thick: 0.12, label: "120 мм" },
                  { thick: 0.15, label: "150 мм" },
                  { thick: 0.20, label: "200 мм" },
                  { thick: 0.25, label: "250 мм" }
                ].map((th) => (
                  <button
                    key={th.thick}
                    type="button"
                    onClick={() => onUpdatePartition({ ...activePartition, thicknessMeters: th.thick })}
                    className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                      Math.abs(activePartition.thicknessMeters - th.thick) < 0.01
                        ? "border-sky-500 bg-sky-500/20 text-sky-300 font-black"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates */}
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <span className="text-[9px] font-mono text-neutral-400 block uppercase">
                Координаты привязки (X, Y в метрах):
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-[9px] text-neutral-500">X1: {activePartition.x1}м</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500">Y1: {activePartition.y1}м</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500">X2: {activePartition.x2}м</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-500">Y2: {activePartition.y2}м</span>
                </div>
              </div>
            </div>

            {/* Direct 1-click wall opening creation */}
            <div className="pt-2 border-t border-neutral-800 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
                Формирование проема в стене:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onInstallOpeningOnPartition?.(activePartition.id, "door_interior")}
                  className="py-2 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <span>🚪</span>
                  <span>Врезать дверь</span>
                </button>
                <button
                  type="button"
                  onClick={() => onInstallOpeningOnPartition?.(activePartition.id, "window_standard")}
                  className="py-2 px-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer transition shadow-sm"
                >
                  <span>🪟</span>
                  <span>Врезать окно</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить перегородку</span>
            </button>
          </div>
        </div>
      ) : activeRoom ? (
        /* 2. ACTIVE ROOM INSPECTOR */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-500 block font-mono">
              Свойства помещения
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5">
              🏠 {activeRoom.name}
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400 block mt-0.5">
              Площадь: {Math.round(activeRoom.wMeters * activeRoom.hMeters * 10) / 10} м²
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Название комнаты:
              </label>
              <input
                type="text"
                value={activeRoom.name}
                onChange={(e) => onUpdateRoom({ ...activeRoom, name: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            {/* Room Type Selector */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Тип и назначение:
              </label>
              <select
                value={activeRoom.type}
                onChange={(e) => {
                  const match = ROOM_PRESETS.find((rp) => rp.type === e.target.value);
                  onUpdateRoom({
                    ...activeRoom,
                    type: e.target.value as any,
                    name: match ? match.label : activeRoom.name,
                    color: match ? match.color : activeRoom.color
                  });
                }}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 text-xs font-bold text-amber-400"
              >
                {ROOM_PRESETS.map((rp) => (
                  <option key={rp.type} value={rp.type}>
                    {rp.emoji} {rp.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Floor Finish */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Напольное покрытие:
              </label>
              <select
                value={activeRoom.floorFinish || "Ламинат 33 класс"}
                onChange={(e) => onUpdateRoom({ ...activeRoom, floorFinish: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 text-xs font-bold text-white"
              >
                <option value="Ламинат 33 класс">Ламинат 33 класс</option>
                <option value="Керамогранит">Керамогранит</option>
                <option value="Керамогранит антискользящий">Керамогранит антискользящий</option>
                <option value="Паркетная доска">Паркетная доска</option>
                <option value="Инженерная доска">Инженерная доска</option>
                <option value="Кварцвинил">Кварцвинил замковый</option>
                <option value="Шпунтованная лиственница">Шпунтованная лиственница</option>
                <option value="Черновая стяжка">Черновая стяжка</option>
              </select>
            </div>

            {/* Ceiling Height */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Высота потолка (м):
              </label>
              <input
                type="number"
                step="0.1"
                min="2.0"
                max="6.0"
                value={activeRoom.ceilingHeight || 2.8}
                onChange={(e) =>
                  onUpdateRoom({ ...activeRoom, ceilingHeight: parseFloat(e.target.value) || 2.8 })
                }
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white text-xs"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-neutral-500 block uppercase font-mono">Ширина (м):</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max={W}
                  value={activeRoom.wMeters}
                  onChange={(e) =>
                    onUpdateRoom({
                      ...activeRoom,
                      wMeters: Math.max(0.8, parseFloat(e.target.value) || 1)
                    })
                  }
                  className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                />
              </div>
              <div>
                <span className="text-[9px] text-neutral-500 block uppercase font-mono">Длина (м):</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max={H}
                  value={activeRoom.hMeters}
                  onChange={(e) =>
                    onUpdateRoom({
                      ...activeRoom,
                      hMeters: Math.max(0.8, parseFloat(e.target.value) || 1)
                    })
                  }
                  className="w-full p-1.5 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить помещение</span>
            </button>
          </div>
        </div>
      ) : activeOpening ? (
        /* 3. ACTIVE OPENING INSPECTOR (Door / Window) */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-500 block font-mono">
              Свойства проема
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5">
              {activeOpening.type.includes("door") ? "🚪" : "🪟"} {activeOpening.label || "Проем"}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Wall Attachment Status */}
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-base">✓</span>
              <div>
                <span className="text-[11px] font-bold text-emerald-300 block">
                  Сквозной проем сформирован в стене
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {activeOpening.wallId
                    ? (currentPartitions.find((p) => p.id === activeOpening.wallId)?.label ||
                       (activeOpening.wallId.startsWith("outer") ? "Наружная несущая стена (фасад)" : "Перегородка"))
                    : (activeOpening.orientation === "vertical" ? "Вертикальная стена" : "Горизонтальная стена")}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Наименование:
              </label>
              <input
                type="text"
                value={activeOpening.label || ""}
                onChange={(e) => onUpdateOpening({ ...activeOpening, label: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            {/* Orientation & Wall Alignment Toggle */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Ориентация вдоль стены:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOpening({
                      ...activeOpening,
                      orientation: "horizontal",
                      rotation: 0
                    })
                  }
                  className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    activeOpening.orientation !== "vertical"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  ↔ Горизонтально
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateOpening({
                      ...activeOpening,
                      orientation: "vertical",
                      rotation: 90
                    })
                  }
                  className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    activeOpening.orientation === "vertical"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 font-black"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  ↕ Вертикально
                </button>
              </div>
            </div>

            {/* Position along wall */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Положение вдоль стены ({activeOpening.orientation === "vertical" ? "Y" : "X"}, м):
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max={activeOpening.orientation === "vertical" ? H : W}
                value={activeOpening.orientation === "vertical" ? activeOpening.yMeters : activeOpening.xMeters}
                onChange={(e) => {
                  const val = Math.round(parseFloat(e.target.value || "0") * 100) / 100;
                  if (activeOpening.orientation === "vertical") {
                    onUpdateOpening({ ...activeOpening, yMeters: val });
                  } else {
                    onUpdateOpening({ ...activeOpening, xMeters: val });
                  }
                }}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white text-xs"
              />
            </div>

            {/* Width Presets */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Ширина проема: {activeOpening.widthMeters} м
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[0.7, 0.8, 0.85, 0.9, 1.0, 1.2, 1.4, 2.4].map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => onUpdateOpening({ ...activeOpening, widthMeters: sw })}
                    className={`py-1.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer ${
                      Math.abs(activeOpening.widthMeters - sw) < 0.02
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-extrabold"
                        : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {sw}м
                  </button>
                ))}
              </div>
            </div>

            {/* If door: swing direction flip */}
            {activeOpening.type.includes("door") && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const isLeft = activeOpening.swingDirection?.startsWith("left");
                    onUpdateOpening({
                      ...activeOpening,
                      swingDirection: isLeft ? "right_in" : "left_in"
                    });
                  }}
                  className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white font-bold text-center cursor-pointer transition"
                >
                  Петли: {activeOpening.swingDirection?.startsWith("left") ? "Слева" : "Справа"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isOut = activeOpening.swingDirection?.endsWith("out");
                    onUpdateOpening({
                      ...activeOpening,
                      swingDirection: isOut ? "right_in" : "right_out"
                    });
                  }}
                  className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 hover:text-white font-bold text-center cursor-pointer transition"
                >
                  Открывание: {activeOpening.swingDirection?.endsWith("out") ? "Наружу" : "Внутрь"}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить проем</span>
            </button>
          </div>
        </div>
      ) : activeElement ? (
        /* 4. ACTIVE ELEMENT (Furniture / MEP) INSPECTOR */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-500 block font-mono">
              Свойства оборудования
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5 flex items-center gap-1.5">
              <span>{ELEMENT_CATALOG.find((c) => c.type === activeElement.type)?.emoji}</span>
              <span>{activeElement.label}</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Обозначение / Маркировка:
              </label>
              <input
                type="text"
                value={activeElement.label}
                onChange={(e) => onUpdateElement({ ...activeElement, label: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Группа / Цепь (для электрики/сантехники):
              </label>
              <input
                type="text"
                value={activeElement.circuitNumber || ""}
                onChange={(e) => onUpdateElement({ ...activeElement, circuitNumber: e.target.value })}
                placeholder="напр. Р-1 Кухня / Стояк ХВС"
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-amber-400 text-xs"
              />
            </div>

            {/* Position & Dimensions */}
            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
              <span className="text-[9px] text-amber-500 uppercase font-mono font-black block">
                Координаты и точная подгонка
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">X (м):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.05}
                      min={0}
                      value={Math.round(activeElement.xMeters * 100) / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onUpdateElement({ ...activeElement, xMeters: val });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Y (м):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.05}
                      min={0}
                      value={Math.round(activeElement.yMeters * 100) / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onUpdateElement({ ...activeElement, yMeters: val });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Nudge buttons for element */}
              <div className="pt-1">
                <span className="text-[8px] text-neutral-500 block mb-1">Сдвиг на ±0.1м:</span>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...activeElement, xMeters: Math.max(0, Math.round((activeElement.xMeters - 0.1) * 100) / 100) })}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold"
                    title="Сдвинуть влево на 10 см"
                  >
                    ← 0.1м
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...activeElement, xMeters: Math.min(W - activeElement.wMeters, Math.round((activeElement.xMeters + 0.1) * 100) / 100) })}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold"
                    title="Сдвинуть вправо на 10 см"
                  >
                    → 0.1м
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...activeElement, yMeters: Math.max(0, Math.round((activeElement.yMeters - 0.1) * 100) / 100) })}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold"
                    title="Сдвинуть вверх на 10 см"
                  >
                    ↑ 0.1м
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateElement({ ...activeElement, yMeters: Math.min(H - activeElement.hMeters, Math.round((activeElement.yMeters + 0.1) * 100) / 100) })}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold"
                    title="Сдвинуть вниз на 10 см"
                  >
                    ↓ 0.1м
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Navigation to Dedicated Schematics */}
            {activeElement.type === "electric_panel" && onOpenTab && (
              <button
                type="button"
                onClick={() => onOpenTab("electric_scheme")}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md"
              >
                <span>⚡</span>
                <span>Схема электрощита (DIN-рейки и автоматы)</span>
              </button>
            )}

            {activeElement.type === "floor_heating_manifold" && (
              <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 block">
                  Комплектация коллекторного узла (ШРН-ТП):
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-mono">
                  <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-300">Запорные краны:</span>
                    <span className="text-emerald-400 font-black">✔ ВКЛ</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-300">Воздухоотводчик:</span>
                    <span className="text-emerald-400 font-black">✔ ВКЛ</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-300">Фильтр 100мкм:</span>
                    <span className="text-emerald-400 font-black">✔ ВКЛ</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-300">Смесит. узел:</span>
                    <span className="text-emerald-400 font-black">✔ ВКЛ</span>
                  </div>
                </div>
              </div>
            )}

            {(activeElement.type === "floor_heating_manifold" ||
              activeElement.type === "radiator" ||
              activeElement.type === "radiator_low" ||
              activeElement.type === "convector_floor" ||
              activeElement.type === "water_cold" ||
              activeElement.type === "water_hot" ||
              activeElement.type === "robot_vacuum_dock" ||
              activeElement.type === "humidifier_pump") && onOpenTab && (
              <button
                type="button"
                onClick={() => onOpenTab("collector_scheme")}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md"
              >
                <span>🔀</span>
                <span>Коллекторная схема (ТП, Радиаторы, Вода)</span>
              </button>
            )}

            {/* Engineering Specs & Tips for Advanced Elements */}
            {activeElement.type === "robot_vacuum_dock" && (
              <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-[11px] text-emerald-300 leading-snug">
                🤖 <strong>Скрытая база робота-пылесоса:</strong> Требует вывод холодной воды (ХВС 1/2"), слив в канализацию (Ø32/40 мм с гидрозатвором) и влагозащищенную розетку 220В.
              </div>
            )}

            {activeElement.type === "central_vacuum" && (
              <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/40 text-[11px] text-sky-300 leading-snug">
                🧹 <strong>Центральный силовой блок пылесоса:</strong> Размещается в котельной, техпомещении или гараже. Трубопровод Ø50 антистатический ПВХ к пневморозеткам и выхлоп на улицу с глушителем.
              </div>
            )}

            {activeElement.type === "vacuum_inlet" && (
              <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/40 text-[11px] text-sky-300 leading-snug">
                🕳️ <strong>Пневморозетка / VacPan:</strong> Радиус действия шланга 9м (одна розетка покрывает до 50–70 м²). Плинтусный пневмосовок монтируется в цоколь кухни.
              </div>
            )}

            {(activeElement.type === "humidifier_pump" || activeElement.type === "humidifier_nozzle") && (
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-[11px] text-cyan-300 leading-snug">
                🌫️ <strong>Система форсуночного увлажнения:</strong> Плунжерный насос 70 бар с обратным осмосом. Трубки высокого давления из нержавеющей стали AISI 316 или полиамида под потолком к распылительным форсункам.
              </div>
            )}

            {(activeElement.type === "vent_diffuser_supply" ||
              activeElement.type === "vent_diffuser_exhaust" ||
              activeElement.type === "vent_grille_linear" ||
              activeElement.type === "vent_penetration") && (
              <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/40 text-[11px] text-blue-300 leading-snug">
                💨 <strong>Приточно-вытяжная вентиляция:</strong> Подключение к круглым воздуховодам Ø100/125/160 мм или плоским каналам 204×60 мм. Решетки формируют правильную циркуляцию свежего воздуха.
              </div>
            )}

            <button
              type="button"
              onClick={() => onRotateElement(activeElement.id)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RotateCw className="w-4 h-4 text-amber-400" />
              <span>Повернуть на 90° ({activeElement.rotation || 0}°)</span>
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить с плана</span>
            </button>
          </div>
        </div>
      ) : activeHeatingLoop ? (
        /* 5. ACTIVE UNDERFLOOR HEATING LOOP INSPECTOR */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-500 font-mono">
                {activeHeatingLoop.zoneType === "edge_window"
                  ? "🔥 Рантовая зона (оконная 50°C)"
                  : "Контур водяного тёплого пола"}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                {activeHeatingLoop.targetTempC || (activeHeatingLoop.zoneType === "edge_window" ? 50 : 35)}°C
              </span>
            </div>
            <h3 className="font-extrabold text-sm text-white mt-1 flex items-center gap-1.5">
              <span>{activeHeatingLoop.zoneType === "edge_window" ? "🪟" : "🔥"}</span>
              <span>{activeHeatingLoop.name}</span>
            </h3>
            {(() => {
              const { lengthMeters } = generateUnderfloorHeatingSvg(activeHeatingLoop, 1, 0);
              const totalL = activeHeatingLoop.pipeLengthMeters || lengthMeters;
              const isOverlength = totalL > 85;
              return (
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${isOverlength ? "text-amber-400" : "text-emerald-400"}`}>
                    Длина трубы петли: {totalL} м
                  </span>
                  {isOverlength && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
                      &gt;85м (длинная)
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Название контура:
              </label>
              <input
                type="text"
                value={activeHeatingLoop.name}
                onChange={(e) => onUpdateHeatingLoop?.({ ...activeHeatingLoop, name: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            {/* Zone Type & Temperature */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Назначение и тепловой режим:
              </label>
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...activeHeatingLoop,
                      zoneType: "standard" as const,
                      targetTempC: 35,
                      color: activeHeatingLoop.color === "#dc2626" ? "#ef4444" : activeHeatingLoop.color
                    };
                    const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                    onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                  }}
                  className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                    activeHeatingLoop.zoneType !== "edge_window"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  Стандартный (35°C)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...activeHeatingLoop,
                      zoneType: "edge_window" as const,
                      stepMm: 100,
                      targetTempC: 50,
                      color: "#dc2626"
                    };
                    const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                    onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                  }}
                  className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                    activeHeatingLoop.zoneType === "edge_window"
                      ? "border-red-500 bg-red-600/30 text-red-200 font-black"
                      : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  🔥 Рантовый оконный (50°C)
                </button>
              </div>
            </div>

            {/* Geometry: Position & Size Coordinates */}
            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
              <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold block">
                📐 Габариты и положение контура (в метрах):
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Позиция X:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={Math.round(activeHeatingLoop.xMeters * 100) / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...activeHeatingLoop, xMeters: val };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">м</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Позиция Y:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={Math.round(activeHeatingLoop.yMeters * 100) / 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = { ...activeHeatingLoop, yMeters: val };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">м</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Ширина W:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      value={Math.round(activeHeatingLoop.wMeters * 100) / 100}
                      onChange={(e) => {
                        const val = Math.max(0.4, parseFloat(e.target.value) || 1);
                        const updated = { ...activeHeatingLoop, wMeters: val };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">м</span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-neutral-500 block uppercase">Длина H:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      value={Math.round(activeHeatingLoop.hMeters * 100) / 100}
                      onChange={(e) => {
                        const val = Math.max(0.4, parseFloat(e.target.value) || 1);
                        const updated = { ...activeHeatingLoop, hMeters: val };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-white font-bold"
                    />
                    <span className="text-neutral-500 text-[10px]">м</span>
                  </div>
                </div>
              </div>

              {/* Nudge & Fine-tuning Buttons for Heating Loop */}
              <div className="pt-2 border-t border-neutral-850 space-y-2">
                <div>
                  <span className="text-[8px] text-neutral-500 block mb-1">Сдвиг контура (±0.2м):</span>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, xMeters: Math.max(0, Math.round((activeHeatingLoop.xMeters - 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[10px] font-bold"
                      title="Сдвинуть влево"
                    >
                      ← 0.2м
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, xMeters: Math.min(W - activeHeatingLoop.wMeters, Math.round((activeHeatingLoop.xMeters + 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[10px] font-bold"
                      title="Сдвинуть вправо"
                    >
                      → 0.2м
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, yMeters: Math.max(0, Math.round((activeHeatingLoop.yMeters - 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[10px] font-bold"
                      title="Сдвинуть вверх"
                    >
                      ↑ 0.2м
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, yMeters: Math.min(H - activeHeatingLoop.hMeters, Math.round((activeHeatingLoop.yMeters + 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-[10px] font-bold"
                      title="Сдвинуть вниз"
                    >
                      ↓ 0.2м
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] text-neutral-500 block mb-1">Размеры контура (±0.2м):</span>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, wMeters: Math.max(0.4, Math.round((activeHeatingLoop.wMeters - 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold"
                    >
                      -0.2м W
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, wMeters: Math.min(W - activeHeatingLoop.xMeters, Math.round((activeHeatingLoop.wMeters + 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold"
                    >
                      +0.2м W
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, hMeters: Math.max(0.4, Math.round((activeHeatingLoop.hMeters - 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold"
                    >
                      -0.2м H
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...activeHeatingLoop, hMeters: Math.min(H - activeHeatingLoop.yMeters, Math.round((activeHeatingLoop.hMeters + 0.2) * 10) / 10) };
                        const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                        onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                      }}
                      className="p-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold"
                    >
                      +0.2м H
                    </button>
                  </div>
                </div>

                {/* Snap to Room Quick Alignments */}
                {currentRooms.length > 0 && (
                  <div className="pt-2 border-t border-neutral-850">
                    <span className="text-[8px] text-rose-400 font-mono uppercase font-bold block mb-1">
                      Выравнивание по помещениям:
                    </span>
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      {currentRooms.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            const offset = (activeHeatingLoop.wallOffsetMm || 100) / 1000;
                            const updated = {
                              ...activeHeatingLoop,
                              xMeters: Math.max(0, r.xMeters + offset),
                              yMeters: Math.max(0, r.yMeters + offset),
                              wMeters: Math.max(0.5, r.wMeters - offset * 2),
                              hMeters: Math.max(0.5, r.hMeters - offset * 2)
                            };
                            const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                            onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                          }}
                          className="p-1.5 rounded bg-neutral-800/90 hover:bg-neutral-700 text-left text-[9px] text-neutral-200 truncate border border-neutral-700/50"
                          title={`Вписать в ${r.name}`}
                        >
                          📍 {r.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipe Step selection */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Шаг укладки трубы (мм):
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { step: 100, label: "100 мм" },
                  { step: 150, label: "150 мм" },
                  { step: 200, label: "200 мм" }
                ].map((sItem) => (
                  <button
                    key={sItem.step}
                    type="button"
                    onClick={() => {
                      const updated = { ...activeHeatingLoop, stepMm: sItem.step };
                      const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                      onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                    }}
                    className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                      activeHeatingLoop.stepMm === sItem.step
                        ? "border-rose-500 bg-rose-500/20 text-rose-300 font-black"
                        : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span>{sItem.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Wall offset selection */}
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Отступ от стен (мм):
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[100, 150, 200].map((off) => (
                  <button
                    key={off}
                    type="button"
                    onClick={() => {
                      const updated = { ...activeHeatingLoop, wallOffsetMm: off };
                      const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                      onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                    }}
                    className={`p-1.5 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                      activeHeatingLoop.wallOffsetMm === off
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
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Способ укладки:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...activeHeatingLoop, pattern: "snail" as const };
                    const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                    onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                  }}
                  className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    activeHeatingLoop.pattern === "snail"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300 font-black"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  🌀 «Улитка»
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...activeHeatingLoop, pattern: "snake" as const };
                    const { lengthMeters } = generateUnderfloorHeatingSvg(updated, 1, 0);
                    onUpdateHeatingLoop?.({ ...updated, pipeLengthMeters: lengthMeters });
                  }}
                  className={`p-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    activeHeatingLoop.pattern === "snake"
                      ? "bg-rose-500/20 border-rose-500 text-rose-300 font-black"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  〰️ «Змейка»
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить контур тёплого пола</span>
            </button>
          </div>
        </div>
      ) : activeRoute ? (
        /* 6. ACTIVE ROUTE INSPECTOR */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-500 block font-mono">
              Инженерная трасса
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5 flex items-center gap-1.5">
              <span>{activeRoute.system === "electric" ? "⚡" : activeRoute.system === "sewer" ? "🕳️" : "💧"}</span>
              <span>{activeRoute.name}</span>
            </h3>
            <span className="text-xs font-mono font-bold text-amber-400 block mt-0.5">
              Длина трассы: {calculateRouteLength(activeRoute.points)} м ({activeRoute.points.length} точек)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                Наименование трассы:
              </label>
              <input
                type="text"
                value={activeRoute.name}
                onChange={(e) => onUpdateRoute?.({ ...activeRoute, name: e.target.value })}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-bold text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[9px] text-neutral-500 block uppercase font-mono mb-1">
                {activeRoute.system === "electric" ? "Марка кабеля:" : "Диаметр трубы (мм):"}
              </label>
              <input
                type="text"
                value={activeRoute.cableCores || (activeRoute.diameterMm ? `${activeRoute.diameterMm} мм` : "")}
                onChange={(e) =>
                  onUpdateRoute?.({
                    ...activeRoute,
                    cableCores: activeRoute.system === "electric" ? e.target.value : undefined,
                    diameterMm: activeRoute.system !== "electric" ? parseInt(e.target.value) || 16 : undefined
                  })
                }
                placeholder={activeRoute.system === "electric" ? "напр. ВВГнг 3x2.5" : "напр. 16 или 110"}
                className="w-full p-2 rounded bg-neutral-900 border border-neutral-800 font-mono font-bold text-white text-xs"
              />
            </div>

            <button
              type="button"
              onClick={onDeleteSelected}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800/40 hover:bg-red-900/60 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить трассу</span>
            </button>
          </div>
        </div>
      ) : (
        /* 5. DEFAULT OVERVIEW WHEN NOTHING IS SELECTED */
        <div className="space-y-4">
          <div className="border-b border-neutral-800 pb-2">
            <span className="text-[10px] font-black uppercase text-amber-400 block font-mono">
              Общие показатели этажа
            </span>
            <h3 className="font-extrabold text-sm text-white mt-0.5">
              Сводка по проекту
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-between">
              <span className="text-neutral-400">Пятно здания:</span>
              <span className="text-white font-bold">{Math.round(W * H * 10) / 10} м²</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-between">
              <span className="text-neutral-400">Площадь комнат:</span>
              <span className="text-amber-400 font-bold">{Math.round(totalRoomsArea * 10) / 10} м²</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-between">
              <span className="text-neutral-400">Кол-во комнат:</span>
              <span className="text-white font-bold">{currentRooms.length}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-between">
              <span className="text-neutral-400">Длина стен:</span>
              <span className="text-sky-400 font-bold">{Math.round(totalPartitionsLength * 10) / 10} пог.м</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-between">
              <span className="text-neutral-400">Точек оборудования:</span>
              <span className="text-emerald-400 font-bold">{currentElements.length} шт</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Кликните по любой стене, комнате или прибору на плане, чтобы редактировать их свойства и размеры.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
