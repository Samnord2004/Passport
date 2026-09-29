import React, { useState } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  Home,
  Layers,
  Palette,
  Maximize2
} from "lucide-react";
import {
  Building3DStyle,
  FacadeOpening,
  FacadeSide,
  WALL_MATERIALS,
  ROOF_TYPES,
  ROOF_MATERIALS,
  OPENING_PRESETS,
  WallMaterialType,
  RoofType,
  RoofMaterialType,
  OpeningType
} from "../types/architecturalTypes";

interface Building3DCustomizerModalProps {
  buildingLabel: string;
  wMeters: number;
  hMeters: number;
  subType?: string;
  currentStyle?: Building3DStyle;
  onSave: (style: Building3DStyle) => void;
  onClose: () => void;
}

const RAL_ROOF_COLORS = [
  { name: "RAL 7016 Антрацит", hex: "#374151" },
  { name: "RAL 8017 Шоколад", hex: "#451a03" },
  { name: "RAL 3005 Винно-красный", hex: "#831843" },
  { name: "RAL 6005 Зеленый мох", hex: "#14532d" },
  { name: "Терракота кирпич", hex: "#9a3412" },
  { name: "RAL 9005 Графит черный", hex: "#1e293b" },
  { name: "RAL 7004 Серый кварц", hex: "#64748b" },
  { name: "Песочно-золотистый", hex: "#a16207" },
];

const WALL_PRESET_COLORS = [
  { name: "Белоснежный", hex: "#f8fafc" },
  { name: "Слоновая кость / крем", hex: "#fef3c7" },
  { name: "Классический кирпич", hex: "#9a3412" },
  { name: "Золотистый дуб", hex: "#b45309" },
  { name: "Натуральная сосна", hex: "#d97706" },
  { name: "Скандинавский серый", hex: "#64748b" },
  { name: "Темный графит", hex: "#334155" },
  { name: "Антрацит хай-тек", hex: "#1e293b" },
];

const FRAME_COLORS = [
  { name: "Белый ПВХ", hex: "#f8fafc" },
  { name: "Антрацит 7016", hex: "#1e293b" },
  { name: "Темный шоколад", hex: "#451a03" },
  { name: "Золотой дуб", hex: "#92400e" },
  { name: "Черный матовый", hex: "#0f172a" },
];

export const Building3DCustomizerModal: React.FC<Building3DCustomizerModalProps> = ({
  buildingLabel,
  wMeters,
  hMeters,
  subType,
  currentStyle,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"walls" | "roof" | "openings">("walls");

  // Wall state
  const [wallMaterial, setWallMaterial] = useState<WallMaterialType>(
    currentStyle?.wallMaterial || (subType === "banya" ? "wood_timber" : "brick_red")
  );
  const [wallColor, setWallColor] = useState<string>(
    currentStyle?.wallColor ||
      WALL_MATERIALS.find((m) => m.id === (currentStyle?.wallMaterial || "brick_red"))?.defaultColor ||
      "#9a3412"
  );
  const [plinthHeight, setPlinthHeight] = useState<number>(currentStyle?.plinthHeightMeters ?? 0.3);
  const [plinthColor, setPlinthColor] = useState<string>(currentStyle?.plinthColor ?? "#334155");

  // Roof state
  const [roofType, setRoofType] = useState<RoofType>(
    currentStyle?.roofType || (subType === "garage" ? "shed" : "gable")
  );
  const [roofMaterial, setRoofMaterial] = useState<RoofMaterialType>(
    currentStyle?.roofMaterial || "metal_tile"
  );
  const [roofColor, setRoofColor] = useState<string>(
    currentStyle?.roofColor ||
      ROOF_MATERIALS.find((m) => m.id === (currentStyle?.roofMaterial || "metal_tile"))?.defaultColor ||
      "#7f1d1d"
  );
  const [roofHeight, setRoofHeight] = useState<number>(currentStyle?.roofHeightMeters ?? 2.0);

  // Facade openings state
  const [openings, setOpenings] = useState<FacadeOpening[]>(() => {
    if (currentStyle?.openings && currentStyle.openings.length > 0) {
      return [...currentStyle.openings];
    }
    // Default smart openings for residential house or garage
    if (subType === "garage") {
      return [
        {
          id: "op_" + Date.now(),
          type: "door_garage",
          facadeSide: "front",
          offsetMeters: Math.max(0.3, (wMeters - 2.8) / 2),
          elevationMeters: 0,
          widthMeters: 2.8,
          heightMeters: 2.2,
          floorLevel: 1,
        },
      ];
    }
    return [
      {
        id: "op_1_" + Date.now(),
        type: "door_single",
        facadeSide: "front",
        offsetMeters: Math.max(0.4, wMeters / 2 - 0.5),
        elevationMeters: 0,
        widthMeters: 0.95,
        heightMeters: 2.1,
        floorLevel: 1,
      },
      {
        id: "op_2_" + Date.now(),
        type: "window_double",
        facadeSide: "front",
        offsetMeters: 0.8,
        elevationMeters: 0.9,
        widthMeters: 1.4,
        heightMeters: 1.4,
        floorLevel: 1,
      },
      {
        id: "op_3_" + Date.now(),
        type: "window_double",
        facadeSide: "front",
        offsetMeters: Math.max(2.5, wMeters - 2.2),
        elevationMeters: 0.9,
        widthMeters: 1.4,
        heightMeters: 1.4,
        floorLevel: 1,
      },
    ];
  });

  const [windowFrameColor, setWindowFrameColor] = useState<string>(
    currentStyle?.windowFrameColor || "#1e293b"
  );
  const [doorColor, setDoorColor] = useState<string>(
    currentStyle?.doorColor || "#451a03"
  );

  // Selected facade side to edit openings on
  const [activeSide, setActiveSide] = useState<FacadeSide>("front");

  // Helper to get facade width
  const getFacadeWidth = (side: FacadeSide) => {
    return side === "front" || side === "back" ? wMeters : hMeters;
  };

  const handleAddOpening = (preset: typeof OPENING_PRESETS[0]) => {
    const fWidth = getFacadeWidth(activeSide);
    const existingOnSide = openings.filter((o) => o.facadeSide === activeSide);
    const initialOffset = Math.min(
      Math.max(0.2, existingOnSide.length * 1.6 + 0.4),
      Math.max(0.1, fWidth - preset.defaultW - 0.2)
    );

    const newOpening: FacadeOpening = {
      id: "op_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type: preset.type,
      facadeSide: activeSide,
      offsetMeters: Math.round(initialOffset * 10) / 10,
      elevationMeters: preset.defaultElevation,
      widthMeters: preset.defaultW,
      heightMeters: preset.defaultH,
      floorLevel: 1,
    };
    setOpenings((prev) => [...prev, newOpening]);
  };

  const handleUpdateOpening = (id: string, updates: Partial<FacadeOpening>) => {
    setOpenings((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const handleRemoveOpening = (id: string) => {
    setOpenings((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSaveAll = () => {
    const compiledStyle: Building3DStyle = {
      wallMaterial,
      wallColor,
      roofType,
      roofMaterial,
      roofColor,
      roofHeightMeters: roofHeight,
      plinthHeightMeters: plinthHeight,
      plinthColor,
      windowFrameColor,
      doorColor,
      openings,
      numberOfFloors: currentStyle?.numberOfFloors ?? 1,
      floorHeightMeters: currentStyle?.floorHeightMeters ?? 2.8,
    };
    onSave(compiledStyle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-neutral-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
              3D Архитектура и Фасады
            </span>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🏛️ {buildingLabel || "Строение"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono font-normal">
                {wMeters}м × {hMeters}м
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Сохранить в 3D</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 gap-2">
          <button
            onClick={() => setActiveTab("walls")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "walls"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Материал стен и отделка</span>
          </button>
          <button
            onClick={() => setActiveTab("roof")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "roof"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Тип и материал кровли</span>
          </button>
          <button
            onClick={() => setActiveTab("openings")}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === "openings"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Окна и двери фасадов ({openings.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: WALLS */}
          {activeTab === "walls" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-amber-500 tracking-wider mb-2">
                  1. Выберите материал стен:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {WALL_MATERIALS.map((mat) => {
                    const isSelected = wallMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => {
                          setWallMaterial(mat.id);
                          setWallColor(mat.defaultColor);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/15 shadow-md"
                            : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{mat.emoji}</span>
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: mat.defaultColor }}
                          />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white">{mat.label}</div>
                          <div className="text-[10px] text-neutral-400 mt-1 line-clamp-2 leading-tight">
                            {mat.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wall Color Selection */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-neutral-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-500" />
                    <span>Цвет стен фасада:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={wallColor}
                      onChange={(e) => setWallColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs text-neutral-400">{wallColor}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {WALL_PRESET_COLORS.map((clr) => (
                    <button
                      key={clr.hex}
                      type="button"
                      onClick={() => setWallColor(clr.hex)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                        wallColor.toLowerCase() === clr.hex.toLowerCase()
                          ? "border-amber-500 bg-amber-500/20 text-white"
                          : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: clr.hex }} />
                      <span>{clr.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plinth & Base */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div>
                  <label className="block text-xs font-black uppercase text-neutral-300 mb-1">
                    Высота цоколя: {plinthHeight} м
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.2"
                    step="0.05"
                    value={plinthHeight}
                    onChange={(e) => setPlinthHeight(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-neutral-400">
                    Основание строения (каменный или монолитный пояс)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-neutral-300 mb-1">
                    Цвет отделки цоколя:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={plinthColor}
                      onChange={(e) => setPlinthColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs text-neutral-400">{plinthColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOF */}
          {activeTab === "roof" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-amber-500 tracking-wider mb-2">
                  1. Форма и геометрия кровли:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ROOF_TYPES.map((rf) => {
                    const isSelected = roofType === rf.id;
                    return (
                      <button
                        key={rf.id}
                        type="button"
                        onClick={() => setRoofType(rf.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/15 shadow-md"
                            : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700"
                        }`}
                      >
                        <div className="text-2xl mb-1">{rf.emoji}</div>
                        <div>
                          <div className="font-extrabold text-xs text-white">{rf.label}</div>
                          <div className="text-[10px] text-neutral-400 mt-1 leading-tight">
                            {rf.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roof Height Slider */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black uppercase text-neutral-300">
                    Высота конька / ската: {roofHeight} м
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    Уклон: {Math.round(Math.atan2(roofHeight, (wMeters || 4) / 2) * (180 / Math.PI))}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.5"
                  step="0.1"
                  value={roofHeight}
                  onChange={(e) => setRoofHeight(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Roof Material */}
              <div>
                <label className="block text-xs font-black uppercase text-amber-500 tracking-wider mb-2">
                  2. Материал покрытия кровли:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ROOF_MATERIALS.map((rm) => {
                    const isSelected = roofMaterial === rm.id;
                    return (
                      <button
                        key={rm.id}
                        type="button"
                        onClick={() => {
                          setRoofMaterial(rm.id);
                          setRoofColor(rm.defaultColor);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/15 shadow-md"
                            : "border-neutral-800 bg-neutral-950/60 hover:border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-2xl">{rm.emoji}</span>
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: rm.defaultColor }}
                          />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white">{rm.label}</div>
                          <div className="text-[10px] text-neutral-400 mt-1 leading-tight">
                            {rm.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Roof Color & RAL Presets */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-neutral-300 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-500" />
                    <span>Цвет кровельного покрытия (RAL):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={roofColor}
                      onChange={(e) => setRoofColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs text-neutral-400">{roofColor}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {RAL_ROOF_COLORS.map((clr) => (
                    <button
                      key={clr.hex}
                      type="button"
                      onClick={() => setRoofColor(clr.hex)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                        roofColor.toLowerCase() === clr.hex.toLowerCase()
                          ? "border-amber-500 bg-amber-500/20 text-white"
                          : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: clr.hex }} />
                      <span>{clr.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WINDOWS & DOORS OPENINGS */}
          {activeTab === "openings" && (
            <div className="space-y-6">
              {/* Facade Side Selector */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-500 tracking-wider">
                    Выберите фасад для настройки окон и дверей:
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    Ширина выбранного фасада: {getFacadeWidth(activeSide)} м
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { side: "front", label: "Передний (Главный)", sub: "Юг / Лицевой", w: wMeters },
                    { side: "back", label: "Задний фасад", sub: "Север / Двор", w: wMeters },
                    { side: "left", label: "Левый фасад", sub: "Западный торец", w: hMeters },
                    { side: "right", label: "Правый фасад", sub: "Восточный торец", w: hMeters },
                  ].map((f) => {
                    const count = openings.filter((o) => o.facadeSide === f.side).length;
                    const isSelected = activeSide === f.side;
                    return (
                      <button
                        key={f.side}
                        type="button"
                        onClick={() => setActiveSide(f.side as FacadeSide)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/20 text-white"
                            : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700"
                        }`}
                      >
                        <div className="font-extrabold text-xs">{f.label}</div>
                        <div className="text-[10px] text-neutral-400 flex items-center justify-between mt-1">
                          <span>{f.sub} ({f.w}м)</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-amber-400 font-mono text-[9px]">
                            {count} шт
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Opening Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-neutral-300 block">
                  Добавить конструкцию на {activeSide === "front" ? "передний" : activeSide === "back" ? "задний" : activeSide === "left" ? "левый" : "правый"} фасад:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OPENING_PRESETS.map((preset) => (
                    <button
                      key={preset.type}
                      type="button"
                      onClick={() => handleAddOpening(preset)}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/60 hover:bg-neutral-800/60 text-left transition flex items-center gap-2 cursor-pointer group"
                    >
                      <span className="text-lg">{preset.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white group-hover:text-amber-400 truncate">
                          + {preset.label}
                        </div>
                        <div className="text-[9px] text-neutral-500 font-mono">
                          {preset.defaultW}×{preset.defaultH}м
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Facade Visual Schematic (SVG elevation view of current facade) */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-neutral-400">
                    Схематичный вид фасада ({getFacadeWidth(activeSide)}м по ширине)
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Отображение положения проемов в масштабе
                  </span>
                </div>

                <div className="relative w-full h-36 bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex items-end p-2">
                  {/* Facade rectangle */}
                  <div
                    className="relative w-full h-28 rounded border border-neutral-700/60 transition-all"
                    style={{ backgroundColor: wallColor }}
                  >
                    {/* Render openings on this facade */}
                    {openings
                      .filter((o) => o.facadeSide === activeSide)
                      .map((o) => {
                        const fWidth = getFacadeWidth(activeSide);
                        const leftPct = Math.min(95, Math.max(2, (o.offsetMeters / fWidth) * 100));
                        const widthPct = Math.min(60, (o.widthMeters / fWidth) * 100);
                        const bottomPct = Math.min(80, (o.elevationMeters / 3.0) * 100);
                        const heightPct = Math.min(80, (o.heightMeters / 3.0) * 100);
                        const isDoor = o.type.includes("door");

                        return (
                          <div
                            key={o.id}
                            className="absolute border border-black/40 rounded flex flex-col items-center justify-center text-[9px] font-bold shadow-md transition-all group"
                            style={{
                              left: `${leftPct}%`,
                              bottom: `${bottomPct}%`,
                              width: `${widthPct}%`,
                              height: `${heightPct}%`,
                              backgroundColor: isDoor ? doorColor : "#bae6fd",
                              borderColor: windowFrameColor,
                              borderWidth: "2px",
                            }}
                            title={`${o.type}: ${o.widthMeters}×${o.heightMeters}м (отступ ${o.offsetMeters}м)`}
                          >
                            <span className="text-[8px] truncate px-0.5" style={{ color: isDoor ? "#fff" : "#0f172a" }}>
                              {isDoor ? "🚪" : "🪟"} {o.widthMeters}x{o.heightMeters}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* List of openings on this facade */}
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-neutral-300 block">
                  Список проемов на текущем фасаде ({openings.filter((o) => o.facadeSide === activeSide).length}):
                </span>

                {openings.filter((o) => o.facadeSide === activeSide).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-500">
                    На этом фасаде пока нет окон и дверей. Нажмите кнопку выше, чтобы добавить конструкцию.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openings
                      .filter((o) => o.facadeSide === activeSide)
                      .map((o) => {
                        const fWidth = getFacadeWidth(activeSide);
                        return (
                          <div
                            key={o.id}
                            className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {o.type.includes("door") ? "🚪" : "🪟"}
                              </span>
                              <div>
                                <select
                                  value={o.type}
                                  onChange={(e) =>
                                    handleUpdateOpening(o.id, { type: e.target.value as OpeningType })
                                  }
                                  className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 font-bold text-xs text-white"
                                >
                                  {OPENING_PRESETS.map((p) => (
                                    <option key={p.type} value={p.type}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Dimension inputs */}
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="text-[9px] text-neutral-500 block uppercase">
                                  Отступ X (м):
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.max(0.5, fWidth - o.widthMeters)}
                                  step="0.1"
                                  value={o.offsetMeters}
                                  onChange={(e) =>
                                    handleUpdateOpening(o.id, {
                                      offsetMeters: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-16 p-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-center font-bold text-amber-400"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-neutral-500 block uppercase">
                                  Высота от пола (м):
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max="3"
                                  step="0.1"
                                  value={o.elevationMeters}
                                  onChange={(e) =>
                                    handleUpdateOpening(o.id, {
                                      elevationMeters: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-16 p-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-center font-bold text-white"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-neutral-500 block uppercase">
                                  Ширина (м):
                                </span>
                                <input
                                  type="number"
                                  min="0.4"
                                  max="5.0"
                                  step="0.1"
                                  value={o.widthMeters}
                                  onChange={(e) =>
                                    handleUpdateOpening(o.id, {
                                      widthMeters: parseFloat(e.target.value) || 1,
                                    })
                                  }
                                  className="w-16 p-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-center font-bold text-white"
                                />
                              </div>

                              <div>
                                <span className="text-[9px] text-neutral-500 block uppercase">
                                  Высота (м):
                                </span>
                                <input
                                  type="number"
                                  min="0.4"
                                  max="3.5"
                                  step="0.1"
                                  value={o.heightMeters}
                                  onChange={(e) =>
                                    handleUpdateOpening(o.id, {
                                      heightMeters: parseFloat(e.target.value) || 1,
                                    })
                                  }
                                  className="w-16 p-1 rounded bg-neutral-900 border border-neutral-800 font-mono text-center font-bold text-white"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveOpening(o.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
                                title="Удалить конструкцию"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Window frame and Door colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
                <div>
                  <label className="block text-xs font-black uppercase text-neutral-300 mb-2">
                    Цвет оконных рам:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FRAME_COLORS.map((fc) => (
                      <button
                        key={fc.hex}
                        type="button"
                        onClick={() => setWindowFrameColor(fc.hex)}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-bold transition cursor-pointer ${
                          windowFrameColor === fc.hex
                            ? "border-amber-500 bg-amber-500/20 text-white"
                            : "border-neutral-800 bg-neutral-900 text-neutral-400"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fc.hex }} />
                        <span>{fc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-neutral-300 mb-2">
                    Цвет полотна дверей:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={doorColor}
                      onChange={(e) => setDoorColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-neutral-700 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs text-neutral-400">{doorColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/80">
          <div className="text-[11px] text-neutral-400">
            Изменения материалов и проемов моментально отобразятся в 3D модели здания
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Применить к 3D модели</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
