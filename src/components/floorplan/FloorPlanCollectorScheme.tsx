import React, { useState } from "react";
import {
  Flame,
  Droplets,
  Plus,
  Trash2,
  Settings,
  Layers,
  Check,
  ShieldCheck,
  Gauge,
  Activity,
  ArrowDownUp,
  Edit2,
  X,
  Sliders,
  Sparkles,
  Wind,
  Filter
} from "lucide-react";
import {
  CollectorScheme,
  ManifoldCircuitItem
} from "../../types/architecturalTypes";

interface FloorPlanCollectorSchemeProps {
  schemes: CollectorScheme[];
  onUpdateSchemes: (schemes: CollectorScheme[]) => void;
  onClose?: () => void;
}

const CONSUMER_PRESETS: Array<{ type: string; label: string; icon: string }> = [
  { type: "floor_loop", label: "Контур тёплого пола", icon: "🔥" },
  { type: "radiator", label: "Радиатор отопления", icon: "🌡️" },
  { type: "convector", label: "Внутрипольный конвектор", icon: "⏹️" },
  { type: "sink", label: "Раковина / Умывальник", icon: "🚰" },
  { type: "shower", label: "Душ / Ванна", icon: "🚿" },
  { type: "toilet", label: "Инсталляция унитаза", icon: "🚽" },
  { type: "washing_machine", label: "Стиральная / сушильная машина", icon: "🧺" },
  { type: "robot_dock", label: "Скрытая база робота-пылесоса (автонаполнение)", icon: "🤖" },
  { type: "humidifier", label: "Система форсуночного увлажнения воздуха", icon: "🌫️" },
  { type: "boiler", label: "Бойлер / Водонагреватель", icon: "♨️" }
];

export const FloorPlanCollectorScheme: React.FC<FloorPlanCollectorSchemeProps> = ({
  schemes,
  onUpdateSchemes,
  onClose
}) => {
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(
    schemes[0]?.id || "collector_heating_1"
  );
  const [editingCircuit, setEditingCircuit] = useState<ManifoldCircuitItem | null>(null);
  const [showAddCircuitModal, setShowAddCircuitModal] = useState<boolean>(false);
  const [showNewSchemeModal, setShowNewSchemeModal] = useState<boolean>(false);

  // New scheme form state
  const [newSchemeTitle, setNewSchemeTitle] = useState<string>("");
  const [newSchemeType, setNewSchemeType] = useState<
    "underfloor_heating" | "heating_radiators" | "water_cold" | "water_hot"
  >("underfloor_heating");
  const [newCabinetLocation, setNewCabinetLocation] = useState<string>("Котельная / Техшкаф");

  // New circuit form state
  const [newCircuitName, setNewCircuitName] = useState<string>("");
  const [newConsumerType, setNewConsumerType] = useState<string>("radiator");
  const [newPipeType, setNewPipeType] = useState<string>("PEX-a 16x2.2");
  const [newPipeLength, setNewPipeLength] = useState<number>(20);
  const [newFlowRate, setNewFlowRate] = useState<number>(2.0);
  const [newHasServo, setNewHasServo] = useState<boolean>(false);

  const activeScheme = schemes.find((s) => s.id === selectedSchemeId) || schemes[0];

  if (!activeScheme) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Нет созданных коллекторных схем.
      </div>
    );
  }

  const isUnderfloor = activeScheme.type === "underfloor_heating";
  const isRadiator = activeScheme.type === "heating_radiators";
  const isWater = activeScheme.type.startsWith("water");

  const totalLength = Math.round(
    activeScheme.circuits.reduce((acc, c) => acc + (c.pipeLengthMeters || 0), 0) * 10
  ) / 10;

  const handleUpdateCircuit = (updated: ManifoldCircuitItem) => {
    const updatedCircuits = activeScheme.circuits.map((c) =>
      c.id === updated.id ? updated : c
    );
    const updatedScheme = { ...activeScheme, circuits: updatedCircuits };
    onUpdateSchemes(
      schemes.map((s) => (s.id === activeScheme.id ? updatedScheme : s))
    );
    setEditingCircuit(null);
  };

  const handleDeleteCircuit = (circuitId: string) => {
    const updatedCircuits = activeScheme.circuits
      .filter((c) => c.id !== circuitId)
      .map((c, idx) => ({ ...c, number: idx + 1 }));

    const updatedScheme = {
      ...activeScheme,
      circuitsCount: updatedCircuits.length,
      circuits: updatedCircuits
    };
    onUpdateSchemes(
      schemes.map((s) => (s.id === activeScheme.id ? updatedScheme : s))
    );
    if (editingCircuit?.id === circuitId) {
      setEditingCircuit(null);
    }
  };

  const isEquipmentActive = (key: keyof CollectorScheme["equipment"]): boolean => {
    const val = activeScheme.equipment[key];
    if (val !== undefined) return Boolean(val);
    // Explicit standard engineering defaults
    if (
      key === "hasShutoffValves" ||
      key === "hasAirVents" ||
      key === "hasDrainValves" ||
      key === "hasFineFilter"
    ) {
      return true;
    }
    if (key === "hasFlowMeters" || key === "hasMixingUnit") {
      return isUnderfloor;
    }
    if (key === "hasLeakProtectionValve" || key === "hasWaterHammerArrestor") {
      return isWater;
    }
    if (key === "hasPressureRegulator") {
      return !isRadiator;
    }
    return false;
  };

  const handleToggleEquipment = (key: keyof CollectorScheme["equipment"]) => {
    const currentActive = isEquipmentActive(key);
    const updatedScheme: CollectorScheme = {
      ...activeScheme,
      equipment: {
        ...activeScheme.equipment,
        [key]: !currentActive
      }
    };
    onUpdateSchemes(
      schemes.map((s) => (s.id === activeScheme.id ? updatedScheme : s))
    );
  };

  const handleAddCircuit = () => {
    if (!newCircuitName.trim()) return;

    const newCircuit: ManifoldCircuitItem = {
      id: `circ_${Date.now()}`,
      number: activeScheme.circuits.length + 1,
      name: newCircuitName.trim(),
      consumerType: newConsumerType,
      pipeType: newPipeType,
      pipeLengthMeters: newPipeLength,
      flowRateLMin: isUnderfloor ? newFlowRate : undefined,
      hasServoDrive: isUnderfloor ? newHasServo : undefined,
      hasShutoffValve: true
    };

    const updatedScheme = {
      ...activeScheme,
      circuitsCount: activeScheme.circuits.length + 1,
      circuits: [...activeScheme.circuits, newCircuit]
    };
    onUpdateSchemes(
      schemes.map((s) => (s.id === activeScheme.id ? updatedScheme : s))
    );

    setNewCircuitName("");
    setShowAddCircuitModal(false);
  };

  const handleCreateNewScheme = () => {
    if (!newSchemeTitle.trim()) return;
    const isTP = newSchemeType === "underfloor_heating";
    const isRad = newSchemeType === "heating_radiators";

    const newScheme: CollectorScheme = {
      id: `col_${Date.now()}`,
      type: newSchemeType,
      title: newSchemeTitle.trim(),
      cabinetLocation: newCabinetLocation.trim(),
      circuitsCount: 3,
      equipment: {
        hasMixingUnit: isTP,
        pumpModel: isTP ? "Grundfos UPM3 Auto L 25-70" : undefined,
        hasLeakProtectionValve: !isRad,
        hasFineFilter: true,
        hasPressureRegulator: true,
        hasWaterHammerArrestor: !isRad
      },
      circuits: [
        {
          id: `circ_1_${Date.now()}`,
          number: 1,
          name: isTP ? "Контур 1 (Гостиная)" : isRad ? "Радиатор 1 (Гостиная)" : "Кухонная мойка и фильтр",
          consumerType: isTP ? "floor_loop" : isRad ? "radiator" : "sink",
          pipeType: "PEX-a 16x2.2",
          pipeLengthMeters: isTP ? 65 : isRad ? 18 : 6,
          flowRateLMin: isTP ? 2.2 : undefined,
          hasServoDrive: isTP,
          hasShutoffValve: true
        },
        {
          id: `circ_2_${Date.now()}`,
          number: 2,
          name: isTP ? "Контур 2 (Кухня)" : isRad ? "Радиатор 2 (Спальня)" : "Скрытая база робота-пылесоса",
          consumerType: isTP ? "floor_loop" : isRad ? "radiator" : "robot_dock",
          pipeType: "PEX-a 16x2.2",
          pipeLengthMeters: isTP ? 48 : isRad ? 14 : 7,
          flowRateLMin: isTP ? 1.8 : undefined,
          hasServoDrive: isTP,
          hasShutoffValve: true
        },
        {
          id: `circ_3_${Date.now()}`,
          number: 3,
          name: isTP ? "🔥 Рантовый контур у окон" : isRad ? "Внутрипольный конвектор" : "Форсуночное увлажнение воздуха",
          consumerType: isTP ? "floor_loop" : isRad ? "convector" : "humidifier",
          pipeType: "PEX-a 16x2.2",
          pipeLengthMeters: isTP ? 32 : isRad ? 19 : 5,
          flowRateLMin: isTP ? 1.6 : undefined,
          hasServoDrive: isTP,
          hasShutoffValve: true
        }
      ]
    };

    onUpdateSchemes([...schemes, newScheme]);
    setSelectedSchemeId(newScheme.id);
    setNewSchemeTitle("");
    setShowNewSchemeModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden text-neutral-100">
      {/* Top Header & Scheme Switcher */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUnderfloor
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : isRadiator
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
            }`}
          >
            {isUnderfloor ? <Flame className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                {activeScheme.title}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold">
                Шкаф: {activeScheme.cabinetLocation}
              </span>
            </div>
            <span className="text-xs text-neutral-400">
              {isUnderfloor
                ? "Распределительный коллектор водяного теплого пола: расходомеры, сервоприводы 230В, смесительный узел"
                : isRadiator
                ? "Лучевая коллекторная схема радиаторов и конвекторов: балансировочные клапаны, изоляция"
                : "Коллекторный узел водоснабжения: защита от протечек, фильтр 100мкм, редуктор давления, гидроудары"}
            </span>
          </div>
        </div>

        {/* Scheme Switcher Tabs & New Scheme Button */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            {schemes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSchemeId(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedSchemeId === s.id
                    ? s.type === "underfloor_heating"
                      ? "bg-rose-600 text-white font-black shadow-sm"
                      : s.type === "heating_radiators"
                      ? "bg-orange-600 text-white font-black shadow-sm"
                      : "bg-sky-600 text-white font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>{s.type === "underfloor_heating" ? "🔥" : s.type === "heating_radiators" ? "🌡️" : "💧"}</span>
                <span>{s.title.split("(")[0]}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowNewSchemeModal(true)}
              className="p-1 px-2 rounded-lg text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 transition cursor-pointer flex items-center gap-1"
              title="Создать новый коллекторный шкаф"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Шкаф</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCircuitModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить отвод</span>
          </button>
        </div>
      </div>

      {/* Main Manifold Visual Schematic */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Equipment Configuration Toggles Bar */}
        <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono font-bold text-neutral-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Комплектация и модули коллекторного узла (клик для включения/выключения):</span>
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-neutral-400">
                Отводов: <strong className="text-white">{activeScheme.circuits.length} шт</strong>
              </span>
              <span className="text-neutral-400">
                Длина трубы: <strong className="text-amber-400">{totalLength} м</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {/* 1. Запорные краны на вводе */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasShutoffValves")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasShutoffValves")
                  ? "bg-red-500/20 border-red-500/60 text-red-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Шаровые краны на вводе с американками и встроенными термометрами"
            >
              <span>🔴🔵</span>
              <span>Запорные краны на вводе</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasShutoffValves")
                  ? "bg-red-500/30 text-red-300 border border-red-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasShutoffValves") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 2. Автоматический воздухоотводчик */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasAirVents")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasAirVents")
                  ? "bg-sky-500/20 border-sky-500/60 text-sky-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Поплавковый спускник воздуха на торцах коллекторных балок"
            >
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>Воздухоотводчик (на балках)</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasAirVents")
                  ? "bg-sky-500/30 text-sky-300 border border-sky-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasAirVents") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 3. Самопромывной фильтр */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasFineFilter")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasFineFilter")
                  ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Сетчатый фильтр 100 мкм с манометром и промывочным краном"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Самопромывной фильтр 100 мкм</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasFineFilter")
                  ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasFineFilter") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 4. Смесительный узел с насосом (для ТП) */}
            {isUnderfloor && (
              <button
                type="button"
                onClick={() => handleToggleEquipment("hasMixingUnit")}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                  isEquipmentActive("hasMixingUnit")
                    ? "bg-rose-500/20 border-rose-500/60 text-rose-200 shadow-sm"
                    : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Насосно-смесительный узел с 3-ходовым клапаном"
              >
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span>Смесительный узел ({activeScheme.equipment.pumpModel || "Grundfos 25-70"})</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                  isEquipmentActive("hasMixingUnit")
                    ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                    : "bg-neutral-800 text-neutral-500"
                }`}>
                  {isEquipmentActive("hasMixingUnit") ? "ВКЛ ✔" : "ВЫКЛ"}
                </span>
              </button>
            )}

            {/* 5. Кран защиты от протечек */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasLeakProtectionValve")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasLeakProtectionValve")
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Шаровый кран с электроприводом 12В/220В (Нептун / Аквасторож)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Защита от протечек (электропривод)</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasLeakProtectionValve")
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasLeakProtectionValve") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 6. Редуктор давления */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasPressureRegulator")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasPressureRegulator")
                  ? "bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Мембранный редуктор давления 3.0 бар с манометром"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Редуктор давления 3.0 бар</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasPressureRegulator")
                  ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasPressureRegulator") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 7. Гаситель гидроударов */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasWaterHammerArrestor")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasWaterHammerArrestor")
                  ? "bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Мембранный компенсатор гидроударов FAR"
            >
              <span>🛡️ Гаситель гидроударов</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasWaterHammerArrestor")
                  ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasWaterHammerArrestor") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 8. Сливные дренажные краны */}
            <button
              type="button"
              onClick={() => handleToggleEquipment("hasDrainValves")}
              className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                isEquipmentActive("hasDrainValves")
                  ? "bg-blue-500/20 border-blue-500/60 text-blue-200 shadow-sm"
                  : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
              title="Дренажные краны со штуцером под шланг"
            >
              <span>🚿 Дренажные краны</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                isEquipmentActive("hasDrainValves")
                  ? "bg-blue-500/30 text-blue-300 border border-blue-500/40"
                  : "bg-neutral-800 text-neutral-500"
              }`}>
                {isEquipmentActive("hasDrainValves") ? "ВКЛ ✔" : "ВЫКЛ"}
              </span>
            </button>

            {/* 9. Расходомеры (для ТП) */}
            {isUnderfloor && (
              <button
                type="button"
                onClick={() => handleToggleEquipment("hasFlowMeters")}
                className={`px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-2 font-bold ${
                  isEquipmentActive("hasFlowMeters")
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-200 shadow-sm"
                    : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
                title="Ротаметры 0-5 л/мин с регулировочной шкалой"
              >
                <span>📊 Ротаметры (0-5 л/мин)</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black ${
                  isEquipmentActive("hasFlowMeters")
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                    : "bg-neutral-800 text-neutral-500"
                }`}>
                  {isEquipmentActive("hasFlowMeters") ? "ВКЛ ✔" : "ВЫКЛ"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Realistic Graphical Manifold CAD Display */}
        <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-mono text-xs uppercase font-black text-neutral-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span>
                {isUnderfloor
                  ? "Коллекторный шкаф ТП (ШРН): Вводная обвязка, подающая гребёнка с ротаметрами & обратная с сервоприводами"
                  : isRadiator
                  ? "Коллекторный шкаф радиаторного отопления (ШРН-РАД): Лучевая разводка с балансировочными клапанами"
                  : "Коллекторный узел водоснабжения: Ввод, фильтрация 100мкм, редуктор давления и распределительная гребёнка"}
              </span>
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">
              Нержавеющая сталь AISI 304 / Латунь CW617N · 1" (Ду 25)
            </span>
          </div>

          {/* Manifold Vector CAD Graphic Canvas */}
          <div className="relative py-4 px-2 bg-[#080d19] rounded-xl border border-neutral-850 overflow-x-auto shadow-inner">
            {(() => {
              const circuitsCount = activeScheme.circuits.length;
              const circuitPitch = 100;
              const inletWidth = 280;
              const headerWidth = Math.max(380, circuitsCount * circuitPitch + 150);
              const svgWidth = inletWidth + headerWidth + 60;
              const svgHeight = 520;

              const topHeaderY = 175; // Supply (Подача Т1)
              const bottomHeaderY = 320; // Return (Обратка Т2)
              const headerStartX = inletWidth + 15;
              const headerEndX = headerStartX + circuitsCount * circuitPitch + 40;

              const eq = activeScheme.equipment;
              const showShutoff = isEquipmentActive("hasShutoffValves");
              const showAirVents = isEquipmentActive("hasAirVents");
              const showFilter = isEquipmentActive("hasFineFilter");
              const showLeakValves = isEquipmentActive("hasLeakProtectionValve");
              const showRegulator = isEquipmentActive("hasPressureRegulator");
              const showArrestor = isEquipmentActive("hasWaterHammerArrestor");
              const showMixing = isUnderfloor && isEquipmentActive("hasMixingUnit");
              const showDrains = isEquipmentActive("hasDrainValves");
              const showFlowMeters = isUnderfloor && isEquipmentActive("hasFlowMeters");

              return (
                <svg
                  width={svgWidth}
                  height={svgHeight}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="block mx-auto select-none"
                >
                  <defs>
                    {/* Metal cabinet body gradient */}
                    <linearGradient id="cabFrameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="50%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>

                    {/* Stainless Steel header cylindrical gradient */}
                    <linearGradient id="steelHeaderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="25%" stopColor="#f8fafc" />
                      <stop offset="60%" stopColor="#94a3b8" />
                      <stop offset="85%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>

                    {/* Polished Brass cylindrical gradient */}
                    <linearGradient id="brassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fde047" />
                      <stop offset="25%" stopColor="#fef08a" />
                      <stop offset="60%" stopColor="#d97706" />
                      <stop offset="90%" stopColor="#b45309" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* Red supply pipe gradient */}
                    <linearGradient id="redPipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="40%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </linearGradient>

                    {/* Blue return pipe gradient */}
                    <linearGradient id="bluePipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="40%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>

                    {/* Flow meter glass vial gradient */}
                    <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                      <stop offset="30%" stopColor="rgba(56,189,248,0.15)" />
                      <stop offset="70%" stopColor="rgba(56,189,248,0.25)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>

                    {/* Drop shadow */}
                    <filter id="cadShadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* 1. CABINET ENCLOSURE (ШКАФ КОЛЛЕКТОРНЫЙ) */}
                  <g>
                    {/* Outer cabinet frame */}
                    <rect
                      x={15}
                      y={15}
                      width={svgWidth - 30}
                      height={svgHeight - 30}
                      rx={10}
                      fill="url(#cabFrameGrad)"
                      stroke="#475569"
                      strokeWidth={2}
                      className="shadow-2xl"
                    />
                    {/* Inner back-plate */}
                    <rect
                      x={25}
                      y={25}
                      width={svgWidth - 50}
                      height={svgHeight - 50}
                      rx={6}
                      fill="#090d16"
                      stroke="#1e293b"
                      strokeWidth={1.5}
                    />

                    {/* Cabinet mounting DIN rails (Вертикальные шины крепления) */}
                    <g opacity={0.6}>
                      <rect x={inletWidth + 50} y={45} width={12} height={svgHeight - 90} rx={2} fill="#334155" stroke="#1e293b" />
                      <rect x={headerEndX - 30} y={45} width={12} height={svgHeight - 90} rx={2} fill="#334155" stroke="#1e293b" />
                      {/* Perforation holes on rails */}
                      {Array.from({ length: 14 }).map((_, rIdx) => (
                        <g key={`rail_hole_${rIdx}`}>
                          <rect x={inletWidth + 52} y={55 + rIdx * 28} width={8} height={12} rx={1.5} fill="#090d16" />
                          <rect x={headerEndX - 28} y={55 + rIdx * 28} width={8} height={12} rx={1.5} fill="#090d16" />
                        </g>
                      ))}
                    </g>

                    {/* Cabinet Header Plates */}
                    <text x={svgWidth / 2} y={45} textAnchor="middle" className="font-mono text-[11px] font-black fill-neutral-400 tracking-wider">
                      {activeScheme.title.toUpperCase()} · {activeScheme.cabinetLocation}
                    </text>
                  </g>

                  {/* 2. INLET PIPING & EQUIPMENT (ЛЕВАЯ ВВОДНАЯ ГРУППА) */}
                  <g>
                    {/* Supply Input Pipe (Т1 / ХВС) */}
                    <path
                      d={`M 25 ${topHeaderY} L ${inletWidth + 5} ${topHeaderY}`}
                      stroke="url(#redPipeGrad)"
                      strokeWidth={14}
                      strokeLinecap="round"
                    />
                    {/* Inflow indicator arrow */}
                    <g transform={`translate(42, ${topHeaderY})`}>
                      <polygon points="0,-4 8,0 0,4" fill="#ffffff" />
                      <text x={12} y={3} className="font-mono text-[8px] font-black fill-white">
                        {isWater ? "ХВС" : "Т1 70°C"}
                      </text>
                    </g>

                    {/* Return Input Pipe (Т2 / ГВС) */}
                    {!isWater && (
                      <>
                        <path
                          d={`M 25 ${bottomHeaderY} L ${inletWidth + 5} ${bottomHeaderY}`}
                          stroke="url(#bluePipeGrad)"
                          strokeWidth={14}
                          strokeLinecap="round"
                        />
                        <g transform={`translate(42, ${bottomHeaderY})`}>
                          <polygon points="8,-4 0,0 8,4" fill="#ffffff" />
                          <text x={12} y={3} className="font-mono text-[8px] font-black fill-white">
                            Т2 40°C
                          </text>
                        </g>
                      </>
                    )}

                    {/* A. ЗАПОРНЫЕ ШАРОВЫЕ КРАНЫ НА ВВОДЕ (Shutoff Valves with Thermometers) */}
                    {showShutoff ? (
                      <>
                        {/* Supply Ball Valve */}
                        <g
                          transform={`translate(75, ${topHeaderY})`}
                          filter="url(#cadShadow)"
                          className="cursor-pointer group"
                          onClick={() => handleToggleEquipment("hasShutoffValves")}
                        >
                          <title>Шаровый кран с термометром подачи (Кликните для выключения)</title>
                          {/* Brass body */}
                          <rect x={-14} y={-10} width={28} height={20} rx={3} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                          {/* Union nut (Американка) */}
                          <rect x={14} y={-12} width={8} height={24} rx={1.5} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                          {/* Red Butterfly handle on top */}
                          <g transform="translate(0, -14)">
                            <ellipse cx={0} cy={0} rx={14} ry={4.5} fill="#ef4444" stroke="#991b1b" strokeWidth={1.2} />
                            <circle cx={0} cy={0} r={3} fill="#ffffff" />
                          </g>
                          {/* Dial Thermometer */}
                          <g transform="translate(-2, 18)">
                            <circle cx={0} cy={0} r={10} fill="#ffffff" stroke="#78350f" strokeWidth={1.5} />
                            <circle cx={0} cy={0} r={8.5} fill="#f8fafc" />
                            {/* Needle */}
                            <line x1={0} y1={0} x2={4} y2={-5} stroke="#dc2626" strokeWidth={1.5} strokeLinecap="round" />
                            <circle cx={0} cy={0} r={1.5} fill="#18181b" />
                            <text x={0} y={14} textAnchor="middle" className="font-mono text-[7px] font-bold fill-red-400">
                              45°C
                            </text>
                          </g>
                        </g>

                        {/* Return Ball Valve */}
                        {!isWater && (
                          <g
                            transform={`translate(75, ${bottomHeaderY})`}
                            filter="url(#cadShadow)"
                            className="cursor-pointer group"
                            onClick={() => handleToggleEquipment("hasShutoffValves")}
                          >
                            <title>Шаровый кран с термометром обратки (Кликните для выключения)</title>
                            {/* Brass body */}
                            <rect x={-14} y={-10} width={28} height={20} rx={3} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                            {/* Union nut (Американка) */}
                            <rect x={14} y={-12} width={8} height={24} rx={1.5} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                            {/* Blue Butterfly handle on bottom */}
                            <g transform="translate(0, 14)">
                              <ellipse cx={0} cy={0} rx={14} ry={4.5} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1.2} />
                              <circle cx={0} cy={0} r={3} fill="#ffffff" />
                            </g>
                            {/* Dial Thermometer */}
                            <g transform="translate(-2, -18)">
                              <circle cx={0} cy={0} r={10} fill="#ffffff" stroke="#78350f" strokeWidth={1.5} />
                              <circle cx={0} cy={0} r={8.5} fill="#f8fafc" />
                              <line x1={0} y1={0} x2={2} y2={-5} stroke="#2563eb" strokeWidth={1.5} strokeLinecap="round" />
                              <circle cx={0} cy={0} r={1.5} fill="#18181b" />
                              <text x={0} y={-12} textAnchor="middle" className="font-mono text-[7px] font-bold fill-sky-400">
                                30°C
                              </text>
                            </g>
                          </g>
                        )}
                      </>
                    ) : (
                      /* Fallback straight pipe coupling when shutoff valves are disabled */
                      <g
                        transform={`translate(75, ${topHeaderY})`}
                        className="cursor-pointer group"
                        onClick={() => handleToggleEquipment("hasShutoffValves")}
                      >
                        <title>Кликните для включения запорных кранов на вводе</title>
                        <rect x={-10} y={-8} width={20} height={16} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                        <text x={0} y={-12} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-red-400/80 group-hover:fill-red-300">
                          + КРАНЫ
                        </text>
                      </g>
                    )}

                    {/* B. КРАН С ЭЛЕКТРОПРИВОДОМ ЗАЩИТЫ ОТ ПРОТЕЧЕК (Motorized Leak Valve) */}
                    {showLeakValves && (
                      <g transform={`translate(130, ${topHeaderY})`} filter="url(#cadShadow)">
                        {/* Valve body */}
                        <rect x={-12} y={-9} width={24} height={18} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                        {/* Motor Actuator Housing (Нептун / Аквасторож) */}
                        <rect x={-15} y={-42} width={30} height={32} rx={4} fill="#047857" stroke="#10b981" strokeWidth={1.5} />
                        <circle cx={0} cy={-28} r={3} fill="#34d399" className="animate-pulse" />
                        <text x={0} y={-16} textAnchor="middle" className="font-mono text-[6.5px] font-black fill-white">
                          НЕПТУН
                        </text>
                        {/* Wire cable */}
                        <path d="M 0 -42 Q -8 -50 -14 -46" fill="none" stroke="#34d399" strokeWidth={1.2} />
                      </g>
                    )}

                    {/* C. САМОПРОМЫВНОЙ ФИЛЬТР 100 МКМ + МАНОМЕТР (Self-cleaning filter) */}
                    {showFilter ? (
                      <g
                        transform={`translate(178, ${topHeaderY})`}
                        filter="url(#cadShadow)"
                        className="cursor-pointer group"
                        onClick={() => handleToggleEquipment("hasFineFilter")}
                      >
                        <title>Самопромывной фильтр 100 мкм с манометром (Кликните для выключения)</title>
                        {/* Brass Filter Top Head */}
                        <rect x={-14} y={-12} width={28} height={24} rx={3} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                        
                        {/* Top Pressure Gauge (Манометр 0-10 бар) */}
                        <g transform="translate(0, -32)">
                          <circle cx={0} cy={0} r={14} fill="#ffffff" stroke="#78350f" strokeWidth={1.5} />
                          <circle cx={0} cy={0} r={12} fill="#f8fafc" />
                          {/* Green operating zone (2-4 bar) */}
                          <path d="M 0 0 L -6 -8 A 10 10 0 0 1 7 -7 Z" fill="#22c55e" opacity={0.35} />
                          {/* Pointer needle */}
                          <line x1={0} y1={0} x2={2} y2={-8} stroke="#dc2626" strokeWidth={1.5} strokeLinecap="round" />
                          <circle cx={0} cy={0} r={2} fill="#18181b" />
                          <text x={0} y={-16} textAnchor="middle" className="font-mono text-[7px] font-bold fill-sky-400">
                            3.5 бар
                          </text>
                        </g>

                        {/* Transparent/Stainless Filter Bowl (Колба с сеткой 100 мкм) */}
                        <rect x={-10} y={12} width={20} height={28} rx={2} fill="url(#glassGrad)" stroke="#38bdf8" strokeWidth={1} />
                        {/* Stainless Steel fine mesh inside */}
                        <g opacity={0.7}>
                          <line x1={-8} y1={18} x2={8} y2={18} stroke="#94a3b8" strokeWidth={1} strokeDasharray="1.5 1.5" />
                          <line x1={-8} y1={24} x2={8} y2={24} stroke="#94a3b8" strokeWidth={1} strokeDasharray="1.5 1.5" />
                          <line x1={-8} y1={30} x2={8} y2={30} stroke="#94a3b8" strokeWidth={1} strokeDasharray="1.5 1.5" />
                          <line x1={-8} y1={36} x2={8} y2={36} stroke="#94a3b8" strokeWidth={1} strokeDasharray="1.5 1.5" />
                        </g>
                        <text x={0} y={28} textAnchor="middle" className="font-mono text-[6px] font-bold fill-sky-200">
                          100μm
                        </text>

                        {/* Bottom Brass Drain Cock (Кран промывки) */}
                        <g transform="translate(0, 40)">
                          <rect x={-4} y={0} width={8} height={8} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                          {/* Small red drain tap */}
                          <rect x={-8} y={4} width={16} height={3} rx={1} fill="#ef4444" />
                          {/* Hose connector */}
                          <rect x={-2.5} y={8} width={5} height={6} fill="url(#brassGrad)" />
                          <line x1={0} y1={14} x2={0} y2={24} stroke="#38bdf8" strokeWidth={2} strokeDasharray="2 2" />
                        </g>
                      </g>
                    ) : (
                      /* Fallback straight pipe coupling when filter is disabled */
                      <g
                        transform={`translate(178, ${topHeaderY})`}
                        className="cursor-pointer group"
                        onClick={() => handleToggleEquipment("hasFineFilter")}
                      >
                        <title>Кликните для установки самопромывного фильтра 100 мкм</title>
                        <rect x={-10} y={-8} width={20} height={16} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                        <text x={0} y={-12} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-cyan-400/80 group-hover:fill-cyan-300">
                          + ФИЛЬТР
                        </text>
                      </g>
                    )}

                    {/* D. РЕДУКТОР ДАВЛЕНИЯ (Pressure Regulator) */}
                    {showRegulator && (
                      <g transform={`translate(225, ${topHeaderY})`} filter="url(#cadShadow)">
                        {/* Brass body */}
                        <rect x={-12} y={-9} width={24} height={18} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                        {/* Upper adjustment bell */}
                        <path d="M -8 -9 L -5 -22 L 5 -22 L 8 -9 Z" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                        <rect x={-3} y={-26} width={6} height={4} fill="#18181b" />
                        <text x={0} y={-28} textAnchor="middle" className="font-mono text-[6.5px] font-bold fill-amber-400">
                          3.0 BAR
                        </text>
                      </g>
                    )}

                    {/* E. ГАСИТЕЛЬ ГИДРОУДАРОВ (Water Hammer Arrestor) */}
                    {showArrestor && (
                      <g transform={`translate(250, ${topHeaderY - 26})`} filter="url(#cadShadow)">
                        <rect x={-6} y={16} width={12} height={10} fill="url(#brassGrad)" />
                        {/* Stainless Steel Expansion Dome (FAR) */}
                        <rect x={-9} y={-10} width={18} height={26} rx={9} fill="url(#steelHeaderGrad)" stroke="#94a3b8" strokeWidth={1} />
                        <text x={0} y={5} textAnchor="middle" className="font-mono text-[6px] font-black fill-slate-800">
                          FAR
                        </text>
                      </g>
                    )}

                    {/* F. СМЕСИТЕЛЬНЫЙ УЗЕЛ С НАСОСОМ (Mixing unit with pump) for underfloor heating */}
                    {showMixing && (
                      <g transform={`translate(${inletWidth - 10}, ${(topHeaderY + bottomHeaderY) / 2})`} filter="url(#cadShadow)">
                        {/* Bypass vertical connection pipe between Т1 and Т2 */}
                        <line x1={0} y1={-70} x2={0} y2={70} stroke="url(#steelHeaderGrad)" strokeWidth={10} />
                        
                        {/* Circulation Pump Body (Grundfos UPM3 / Wilo) */}
                        <rect x={-20} y={-26} width={40} height={52} rx={6} fill="#b91c1c" stroke="#f87171" strokeWidth={1.5} />
                        <circle cx={0} cy={0} r={16} fill="#18181b" stroke="#7f1d1d" strokeWidth={1.2} />
                        {/* Rotor center */}
                        <circle cx={0} cy={0} r={6} fill="#e2e8f0" />
                        <text x={0} y={-12} textAnchor="middle" className="font-mono text-[7px] font-black fill-white">
                          GRUNDFOS
                        </text>
                        {/* Digital LED readout */}
                        <rect x={-14} y={8} width={28} height={10} rx={2} fill="#090d16" />
                        <text x={0} y={16} textAnchor="middle" className="font-mono text-[7px] font-bold fill-emerald-400">
                          45 W
                        </text>

                        {/* 3-way thermostatic mixing valve on top */}
                        <g transform="translate(0, -60)">
                          <rect x={-10} y={-8} width={20} height={16} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                          {/* Thermostatic head with capillary tube */}
                          <rect x={-7} y={-22} width={14} height={14} rx={3} fill="#ffffff" stroke="#94a3b8" strokeWidth={1} />
                          <line x1={0} y1={-22} x2={30} y2={-topHeaderY + 140} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="2 1" />
                        </g>
                      </g>
                    )}
                  </g>

                  {/* 3. MANIFOLD BARS & OUTLETS (БАЛКИ КОЛЛЕКТОРА) */}
                  <g>
                    {/* Mounting brackets on rails gripping headers */}
                    <rect x={inletWidth + 44} y={topHeaderY - 20} width={24} height={40} rx={4} fill="#475569" stroke="#64748b" opacity={0.8} />
                    <rect x={headerEndX - 36} y={topHeaderY - 20} width={24} height={40} rx={4} fill="#475569" stroke="#64748b" opacity={0.8} />
                    {!isWater && (
                      <>
                        <rect x={inletWidth + 44} y={bottomHeaderY - 20} width={24} height={40} rx={4} fill="#475569" stroke="#64748b" opacity={0.8} />
                        <rect x={headerEndX - 36} y={bottomHeaderY - 20} width={24} height={40} rx={4} fill="#475569" stroke="#64748b" opacity={0.8} />
                      </>
                    )}

                    {/* UPPER SUPPLY HEADER (ПОДАЮЩАЯ БАЛКА) */}
                    <g filter="url(#cadShadow)">
                      <rect
                        x={headerStartX}
                        y={topHeaderY - 16}
                        width={headerEndX - headerStartX}
                        height={32}
                        rx={6}
                        fill="url(#steelHeaderGrad)"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                      />
                      {/* Red color stripe marking */}
                      <rect
                        x={headerStartX + 10}
                        y={topHeaderY - 4}
                        width={headerEndX - headerStartX - 20}
                        height={8}
                        rx={2}
                        fill="#ef4444"
                        opacity={0.85}
                      />
                      <text
                        x={headerStartX + 20}
                        y={topHeaderY + 2}
                        className="font-mono text-[8px] font-black fill-white tracking-widest"
                      >
                        {isWater ? "КОЛЛЕКТОР ХОЛОДНОЙ ВОДЫ (ХВС) · AISI 304 1\"" : "ПОДАЮЩИЙ КОЛЛЕКТОР (Т1) · AISI 304 1\""}
                      </text>
                    </g>

                    {/* LOWER RETURN HEADER (ОБРАТНАЯ БАЛКА - ДЛЯ ОТОПЛЕНИЯ) */}
                    {!isWater && (
                      <g filter="url(#cadShadow)">
                        <rect
                          x={headerStartX}
                          y={bottomHeaderY - 16}
                          width={headerEndX - headerStartX}
                          height={32}
                          rx={6}
                          fill="url(#steelHeaderGrad)"
                          stroke="#94a3b8"
                          strokeWidth={1.5}
                        />
                        {/* Blue color stripe marking */}
                        <rect
                          x={headerStartX + 10}
                          y={bottomHeaderY - 4}
                          width={headerEndX - headerStartX - 20}
                          height={8}
                          rx={2}
                          fill="#3b82f6"
                          opacity={0.85}
                        />
                        <text
                          x={headerStartX + 20}
                          y={bottomHeaderY + 2}
                          className="font-mono text-[8px] font-black fill-white tracking-widest"
                        >
                          ОБРАТНЫЙ КОЛЛЕКТОР (Т2) · AISI 304 1"
                        </text>
                      </g>
                    )}

                    {/* RIGHT END UNITS (Концевые секции: Воздухоотводчик + Дренажный кран) */}
                    {/* Upper Header End Section */}
                    <g transform={`translate(${headerEndX + 5}, ${topHeaderY})`} filter="url(#cadShadow)">
                      {/* End manifold union fitting */}
                      <rect x={0} y={-14} width={14} height={28} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                      
                      {/* 1. АВТОМАТИЧЕСКИЙ ВОЗДУХООТВОДЧИК НА ПОДАЧЕ (Automatic Float Air Vent) */}
                      {showAirVents ? (
                        <g transform="translate(22, -26)" className="cursor-pointer group" onClick={() => handleToggleEquipment("hasAirVents")}>
                          <title>Автоматический воздухоотводчик (Кликните для выключения)</title>
                          {/* Brass connecting tee */}
                          <line x1={-8} y1={26} x2={0} y2={10} stroke="url(#brassGrad)" strokeWidth={8} />
                          {/* Brass vertical cylinder */}
                          <rect x={-8} y={-14} width={16} height={24} rx={3} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                          {/* Top black knurled air release cap */}
                          <rect x={-4} y={-22} width={8} height={8} rx={1.5} fill="#18181b" stroke="#475569" strokeWidth={1} />
                          {/* Air venting puff icon */}
                          <g transform="translate(0, -28)" opacity={0.9}>
                            <path d="M -4 0 Q 0 -6 4 0" fill="none" stroke="#38bdf8" strokeWidth={1.2} />
                            <path d="M -6 -4 Q 0 -12 6 -4" fill="none" stroke="#38bdf8" strokeWidth={1.2} />
                          </g>
                          <text x={0} y={-32} textAnchor="middle" className="font-mono text-[7px] font-black fill-sky-300">
                            ВОЗДУХ
                          </text>
                        </g>
                      ) : (
                        <g transform="translate(18, -4)" className="cursor-pointer group" onClick={() => handleToggleEquipment("hasAirVents")}>
                          <title>Заглушка 1" (Кликните для установки автоматического воздухоотводчика)</title>
                          <rect x={-4} y={-8} width={8} height={16} rx={1} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                          <polygon points="4,-6 8,-3 8,3 4,6" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                          <text x={14} y={-1} className="font-mono text-[6px] font-bold fill-neutral-500 group-hover:fill-sky-400">
                            ЗАГЛУШКА
                          </text>
                        </g>
                      )}

                      {/* 2. СЛИВНОЙ ДРЕНАЖНЫЙ КРАН НА ПОДАЧЕ (Drain Cock) */}
                      {showDrains && (
                        <g transform="translate(22, 24)" className="cursor-pointer" onClick={() => handleToggleEquipment("hasDrainValves")}>
                          <line x1={-8} y1={-24} x2={0} y2={-8} stroke="url(#brassGrad)" strokeWidth={8} />
                          {/* Brass tap body */}
                          <rect x={-7} y={-8} width={14} height={16} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                          {/* Red lever */}
                          <rect x={2} y={-4} width={16} height={4} rx={1} fill="#ef4444" />
                          {/* Hose barb nozzle pointing down */}
                          <path d="M -4 8 L 4 8 L 2 18 L -2 18 Z" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                          <text x={12} y={18} className="font-mono text-[6.5px] font-bold fill-neutral-400">
                            СЛИВ
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Lower Header End Section (Обратка) */}
                    {!isWater && (
                      <g transform={`translate(${headerEndX + 5}, ${bottomHeaderY})`} filter="url(#cadShadow)">
                        {/* End union fitting */}
                        <rect x={0} y={-14} width={14} height={28} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />

                        {/* 1. АВТОМАТИЧЕСКИЙ ВОЗДУХООТВОДЧИК НА ОБРАТКЕ */}
                        {showAirVents ? (
                          <g transform="translate(22, -26)" className="cursor-pointer group" onClick={() => handleToggleEquipment("hasAirVents")}>
                            <title>Автоматический воздухоотводчик (Кликните для выключения)</title>
                            <line x1={-8} y1={26} x2={0} y2={10} stroke="url(#brassGrad)" strokeWidth={8} />
                            <rect x={-8} y={-14} width={16} height={24} rx={3} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                            <rect x={-4} y={-22} width={8} height={8} rx={1.5} fill="#18181b" stroke="#475569" strokeWidth={1} />
                            <g transform="translate(0, -28)" opacity={0.9}>
                              <path d="M -4 0 Q 0 -6 4 0" fill="none" stroke="#38bdf8" strokeWidth={1.2} />
                              <path d="M -6 -4 Q 0 -12 6 -4" fill="none" stroke="#38bdf8" strokeWidth={1.2} />
                            </g>
                            <text x={0} y={-32} textAnchor="middle" className="font-mono text-[7px] font-black fill-sky-300">
                              ВОЗДУХ
                            </text>
                          </g>
                        ) : (
                          <g transform="translate(18, -4)" className="cursor-pointer group" onClick={() => handleToggleEquipment("hasAirVents")}>
                            <title>Заглушка 1" (Кликните для установки автоматического воздухоотводчика)</title>
                            <rect x={-4} y={-8} width={8} height={16} rx={1} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                            <polygon points="4,-6 8,-3 8,3 4,6" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                            <text x={14} y={-1} className="font-mono text-[6px] font-bold fill-neutral-500 group-hover:fill-sky-400">
                              ЗАГЛУШКА
                            </text>
                          </g>
                        )}

                        {/* 2. СЛИВНОЙ ДРЕНАЖНЫЙ КРАН НА ОБРАТКЕ */}
                        {showDrains && (
                          <g transform="translate(22, 24)" className="cursor-pointer" onClick={() => handleToggleEquipment("hasDrainValves")}>
                            <line x1={-8} y1={-24} x2={0} y2={-8} stroke="url(#brassGrad)" strokeWidth={8} />
                            <rect x={-7} y={-8} width={14} height={16} rx={2} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={1} />
                            <rect x={2} y={-4} width={16} height={4} rx={1} fill="#3b82f6" />
                            <path d="M -4 8 L 4 8 L 2 18 L -2 18 Z" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                            <text x={12} y={18} className="font-mono text-[6.5px] font-bold fill-neutral-400">
                              СЛИВ
                            </text>
                          </g>
                        )}
                      </g>
                    )}
                  </g>

                  {/* 4. CIRCUIT PORTS, FLOW METERS & ACTUATORS (ОТВОДЫ ПОТРЕБИТЕЛЕЙ) */}
                  <g>
                    {activeScheme.circuits.map((circ, idx) => {
                      const cx = headerStartX + 50 + idx * circuitPitch;
                      const preset = CONSUMER_PRESETS.find((p) => p.type === circ.consumerType);
                      const isHovered = editingCircuit?.id === circ.id;

                      return (
                        <g
                          key={circ.id}
                          className="cursor-pointer group"
                          onClick={() => setEditingCircuit(circ)}
                        >
                          {/* Vertical guide highlight line behind */}
                          <line
                            x1={cx}
                            y1={80}
                            x2={cx}
                            y2={svgHeight - 40}
                            stroke={isHovered ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.03)"}
                            strokeWidth={isHovered ? 60 : 40}
                            className="transition-colors"
                          />

                          {/* TOP OUTLET: РОТАМЕТР / ВЕНТИЛЬ (Flow Meter or Valve) */}
                          <g transform={`translate(${cx}, ${topHeaderY})`} filter="url(#cadShadow)">
                            {/* Nipple fitting */}
                            <rect x={-6} y={-22} width={12} height={8} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />

                            {isUnderfloor ? (
                              showFlowMeters ? (
                                /* Realistic Rotameter / Flow Meter (0-5 l/min) */
                                <g transform="translate(0, -22)">
                                  {/* Brass Hex Nut Base */}
                                  <polygon points="-8,0 -5,-7 5,-7 8,0 5,7 -5,7" fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                                  
                                  {/* Glass vial */}
                                  <rect x={-6} y={-45} width={12} height={38} rx={2} fill="url(#glassGrad)" stroke="#38bdf8" strokeWidth={1} />
                                  
                                  {/* Scale measurement tick marks (0, 1, 2, 3, 4, 5) */}
                                  {Array.from({ length: 5 }).map((_, mIdx) => (
                                    <line
                                      key={`scale_${mIdx}`}
                                      x1={-4}
                                      y1={-40 + mIdx * 7}
                                      x2={2}
                                      y2={-40 + mIdx * 7}
                                      stroke="#0284c7"
                                      strokeWidth={0.8}
                                    />
                                  ))}

                                  {/* Floating Red Indicator Disk positioned by flow rate */}
                                  {(() => {
                                    const flow = circ.flowRateLMin || 2.0;
                                    const floatY = -12 - Math.min(26, (flow / 4.0) * 26);
                                    return (
                                      <g transform={`translate(0, ${floatY})`}>
                                        <rect x={-5} y={-2} width={10} height={4} rx={1} fill="#ef4444" stroke="#991b1b" strokeWidth={0.8} />
                                      </g>
                                    );
                                  })()}

                                  {/* Top Red Knurled Adjusting Ring */}
                                  <rect x={-7} y={-52} width={14} height={7} rx={2} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
                                  {/* Top Flow text badge */}
                                  <text x={0} y={-58} textAnchor="middle" className="font-mono text-[8px] font-black fill-amber-300">
                                    {circ.flowRateLMin || 2.0} л/м
                                  </text>
                                </g>
                              ) : (
                                /* Red Shutoff Knob */
                                <g transform="translate(0, -24)">
                                  <rect x={-7} y={-14} width={14} height={14} rx={3} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
                                  <circle cx={0} cy={-7} r={2} fill="#ffffff" />
                                </g>
                              )
                            ) : (
                              /* Radiator / Water Red Handwheel */
                              <g transform="translate(0, -24)">
                                <ellipse cx={0} cy={-7} rx={10} ry={4} fill="#ef4444" stroke="#991b1b" strokeWidth={1} />
                                <circle cx={0} cy={-7} r={2.5} fill="#ffffff" />
                              </g>
                            )}
                          </g>

                          {/* BOTTOM OUTLET: СЕРВОПРИВОД 230В / БАЛАНСИРОВОЧНЫЙ ВЕНТИЛЬ */}
                          {!isWater && (
                            <g transform={`translate(${cx}, ${bottomHeaderY})`} filter="url(#cadShadow)">
                              {/* Nipple fitting */}
                              <rect x={-6} y={-22} width={12} height={8} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />

                              {isUnderfloor ? (
                                circ.hasServoDrive ? (
                                  /* Thermoelectric Actuator 230V */
                                  <g transform="translate(0, -22)">
                                    {/* Brass connecting ring */}
                                    <rect x={-7} y={-4} width={14} height={6} fill="url(#brassGrad)" stroke="#78350f" strokeWidth={0.8} />
                                    {/* White cylindrical servo body */}
                                    <rect x={-11} y={-38} width={22} height={34} rx={4} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.2} />
                                    {/* Orange optical stroke indicator ring */}
                                    <rect x={-9} y={-34} width={18} height={5} rx={1} fill="#f97316" />
                                    <text x={0} y={-20} textAnchor="middle" className="font-mono text-[7px] font-black fill-slate-800">
                                      230V
                                    </text>
                                    <text x={0} y={-12} textAnchor="middle" className="font-mono text-[6px] font-bold fill-slate-500">
                                      NC
                                    </text>
                                    {/* Cable on top */}
                                    <path d="M 0 -38 Q 4 -48 10 -46" fill="none" stroke="#f8fafc" strokeWidth={2} />
                                  </g>
                                ) : (
                                  /* Manual Blue Adjustment Cap */
                                  <g transform="translate(0, -22)">
                                    <rect x={-8} y={-16} width={16} height={16} rx={3} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1} />
                                    <circle cx={0} cy={-8} r={2.5} fill="#ffffff" />
                                  </g>
                                )
                              ) : (
                                /* Radiator Blue Balancing Lockshield */
                                <g transform="translate(0, -22)">
                                  <rect x={-7} y={-12} width={14} height={12} rx={2} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1} />
                                  <polygon points="0,-10 -3,-5 3,-5" fill="#ffffff" />
                                </g>
                              )}
                            </g>
                          )}

                          {/* DOWNSTREAM PEX PIPES IN CORRUGATED SLEEVE (ТРУБЫ В ПОЛ) */}
                          <g>
                            {/* Supply Red Pipe from top header */}
                            <path
                              d={`M ${cx - 5} ${topHeaderY + 16} L ${cx - 5} ${bottomHeaderY - 16} L ${cx - 5} ${svgHeight - 85}`}
                              fill="none"
                              stroke="url(#redPipeGrad)"
                              strokeWidth={7}
                              strokeLinecap="round"
                            />
                            {/* Corrugated protection sleeve (Пешель) at exit */}
                            <rect x={cx - 9} y={svgHeight - 110} width={8} height={25} rx={2} fill="#ef4444" stroke="#991b1b" strokeWidth={0.8} />

                            {/* Return Blue Pipe from bottom header */}
                            {!isWater && (
                              <>
                                <path
                                  d={`M ${cx + 5} ${bottomHeaderY + 16} L ${cx + 5} ${svgHeight - 85}`}
                                  fill="none"
                                  stroke="url(#bluePipeGrad)"
                                  strokeWidth={7}
                                  strokeLinecap="round"
                                />
                                <rect x={cx + 1} y={svgHeight - 110} width={8} height={25} rx={2} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={0.8} />
                              </>
                            )}
                          </g>

                          {/* CIRCUIT TAG BADGE (Маркировочная табличка отвода) */}
                          <g transform={`translate(${cx}, ${svgHeight - 55})`} filter="url(#cadShadow)">
                            <rect
                              x={-42}
                              y={-22}
                              width={84}
                              height={46}
                              rx={6}
                              fill={isHovered ? "#1e293b" : "#0f172a"}
                              stroke={isHovered ? "#f59e0b" : "#334155"}
                              strokeWidth={isHovered ? 1.8 : 1}
                              className="transition-colors"
                            />
                            {/* Header pill */}
                            <rect x={-38} y={-18} width={26} height={13} rx={3} fill="#1e293b" />
                            <text x={-25} y={-9} textAnchor="middle" className="font-mono text-[8px] font-black fill-amber-400">
                              #{circ.number}
                            </text>
                            <text x={26} y={-9} textAnchor="middle" className="text-[10px]">
                              {preset?.icon || "🔹"}
                            </text>

                            {/* Room / consumer name */}
                            <text
                              x={0}
                              y={5}
                              textAnchor="middle"
                              className="font-bold text-[8.5px] fill-white truncate max-w-[76px]"
                            >
                              {circ.name.length > 12 ? circ.name.slice(0, 11) + "…" : circ.name}
                            </text>

                            {/* Length and flow */}
                            <text x={0} y={17} textAnchor="middle" className="font-mono text-[7.5px] font-bold fill-neutral-400">
                              {circ.pipeLengthMeters ? `${circ.pipeLengthMeters}м` : "16×2.2"}
                              {circ.flowRateLMin ? ` · ${circ.flowRateLMin}л/м` : ""}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              );
            })()}
          </div>

          {/* Graphical Legend & Specs */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-neutral-850 text-[11px] font-mono text-neutral-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Подача Т1 (Красный PEX)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Обратка Т2 (Синий PEX)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Латунные фитинги CW617N / Евроконус 3/4"</span>
              </span>
            </div>
            <span className="text-amber-400 font-bold">
              💡 Кликните по отводу или карточке ниже для редактирования параметров
            </span>
          </div>
        </div>

        {/* Circuits Breakdown Cards */}

          {/* Circuits Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeScheme.circuits.map((circ) => {
              const preset = CONSUMER_PRESETS.find((p) => p.type === circ.consumerType);
              return (
                <div
                  key={circ.id}
                  onClick={() => setEditingCircuit(circ)}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition flex flex-col justify-between space-y-2 group shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-neutral-800 text-amber-400 border border-neutral-700">
                        Отвод #{circ.number}
                      </span>
                      <span>{preset?.icon || "🔹"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCircuit(circ);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-amber-400 transition p-0.5"
                        title="Редактировать отвод"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCircuit(circ.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition p-0.5"
                        title="Удалить отвод"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-white truncate" title={circ.name}>
                      {circ.name}
                    </h4>
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      Труба: {circ.pipeType}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-neutral-850 flex items-center justify-between text-[11px] font-mono">
                    {circ.pipeLengthMeters && (
                      <span className="text-amber-300 font-bold">
                        {circ.pipeLengthMeters} м
                      </span>
                    )}
                    {circ.flowRateLMin && (
                      <span className="text-sky-300 font-bold">
                        {circ.flowRateLMin} л/мин
                      </span>
                    )}
                    {circ.hasServoDrive && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                        Сервопривод
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Modal: Edit Existing Circuit */}
      {editingCircuit && (
        <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-rose-400" />
                <span>Редактирование отвода #{editingCircuit.number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCircuit(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Название контура / потребителя:
                </label>
                <input
                  type="text"
                  value={editingCircuit.name}
                  onChange={(e) =>
                    setEditingCircuit({ ...editingCircuit, name: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Тип подключаемого оборудования:
                </label>
                <select
                  value={editingCircuit.consumerType}
                  onChange={(e) =>
                    setEditingCircuit({ ...editingCircuit, consumerType: e.target.value })
                  }
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300 font-bold"
                >
                  {CONSUMER_PRESETS.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Тип трубы:
                  </label>
                  <select
                    value={editingCircuit.pipeType}
                    onChange={(e) =>
                      setEditingCircuit({ ...editingCircuit, pipeType: e.target.value })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  >
                    <option value="PEX-a 16x2.2">PEX-a 16x2.2 (Тёплый пол/ХВС)</option>
                    <option value="PEX-a 20x2.8">PEX-a 20x2.8 (Ванна/магистраль)</option>
                    <option value="PEX-b 16x2.0">PEX-b 16x2.0</option>
                    <option value="Металлопластик 16">Металлопластик 16</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Длина трубы (м):
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    value={editingCircuit.pipeLengthMeters || 15}
                    onChange={(e) =>
                      setEditingCircuit({
                        ...editingCircuit,
                        pipeLengthMeters: parseFloat(e.target.value) || 1
                      })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              {isUnderfloor && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                  <div>
                    <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                      Расход (л/мин):
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.2}
                      max={5}
                      value={editingCircuit.flowRateLMin || 2}
                      onChange={(e) =>
                        setEditingCircuit({
                          ...editingCircuit,
                          flowRateLMin: parseFloat(e.target.value) || 2
                        })
                      }
                      className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingCircuit.hasServoDrive || false}
                        onChange={(e) =>
                          setEditingCircuit({
                            ...editingCircuit,
                            hasServoDrive: e.target.checked
                          })
                        }
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                      />
                      <span className="font-bold text-neutral-200">
                        Сервопривод 230В
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteCircuit(editingCircuit.id)}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить отвод</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCircuit(null)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCircuit(editingCircuit)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Circuit */}
      {showAddCircuitModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>🔀</span>
                <span>Добавление контура / отвода коллектора</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCircuitModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Наименование потребителя / прибора:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Тёплый пол Кабинет, Радиатор Спальня, Скрытая база робота-пылесоса..."
                  value={newCircuitName}
                  onChange={(e) => setNewCircuitName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-750 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Тип оборудования:
                </label>
                <select
                  value={newConsumerType}
                  onChange={(e) => setNewConsumerType(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300 font-bold"
                >
                  {CONSUMER_PRESETS.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.icon} {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Тип трубы:
                  </label>
                  <select
                    value={newPipeType}
                    onChange={(e) => setNewPipeType(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-750 text-white font-mono font-bold"
                  >
                    <option value="PEX-a 16x2.2">PEX-a 16x2.2 (Тёплый пол/ХВС)</option>
                    <option value="PEX-a 20x2.8">PEX-a 20x2.8 (Ванна/магистраль)</option>
                    <option value="PEX-b 16x2.0">PEX-b 16x2.0</option>
                    <option value="Металлопластик 16">Металлопластик 16</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Длина трубы (м):
                  </label>
                  <input
                    type="number"
                    step={1}
                    min={1}
                    value={newPipeLength}
                    onChange={(e) => setNewPipeLength(parseFloat(e.target.value) || 10)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-750 text-white font-mono font-bold"
                  />
                </div>
              </div>

              {isUnderfloor && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                  <div>
                    <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                      Расход (л/мин):
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.2}
                      max={5}
                      value={newFlowRate}
                      onChange={(e) => setNewFlowRate(parseFloat(e.target.value) || 2)}
                      className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-750 text-white font-mono font-bold"
                    />
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHasServo}
                        onChange={(e) => setNewHasServo(e.target.checked)}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                      />
                      <span className="font-bold text-neutral-200">
                        Сервопривод 230В
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCircuitModal(false)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddCircuit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black"
              >
                Добавить отвод
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Collector Scheme */}
      {showNewSchemeModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                <span>Создание нового коллекторного шкафа</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewSchemeModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Назначение коллекторного узла:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "underfloor_heating", label: "Тёплый пол", icon: "🔥", desc: "Смесительный узел + расходомеры" },
                    { id: "heating_radiators", label: "Радиаторы", icon: "🌡️", desc: "Лучевая разводка отопления" },
                    { id: "water_cold", label: "ХВС (Вода)", icon: "🔵", desc: "Гребёнка с защитой от протечек" },
                    { id: "water_hot", label: "ГВС (Горячая)", icon: "🔴", desc: "Гребёнка горячей воды / рециркуляция" }
                  ].map((ct) => (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => {
                        setNewSchemeType(ct.id as any);
                        if (!newSchemeTitle) {
                          setNewSchemeTitle(
                            ct.id === "underfloor_heating"
                              ? "Коллекторный шкаф ТП (ШРН-2)"
                              : ct.id === "heating_radiators"
                              ? "Гребёнка радиаторов 2-й этаж"
                              : ct.id === "water_cold"
                              ? "Гребёнка ХВС с Нептуном"
                              : "Гребёнка ГВС"
                          );
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        newSchemeType === ct.id
                          ? "bg-rose-950/40 border-rose-500 text-rose-300"
                          : "bg-neutral-950 border-neutral-800 text-neutral-400"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-white mb-0.5">
                        <span>{ct.icon}</span>
                        <span>{ct.label}</span>
                      </div>
                      <span className="text-[9px] text-neutral-400 block leading-tight">{ct.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Название шкафа / узла:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Шкаф коллекторный ТП ШРН-2..."
                  value={newSchemeTitle}
                  onChange={(e) => setNewSchemeTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Место размещения шкафа:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Коридор 2-го этажа, Сантехшкаф, Котельная..."
                  value={newCabinetLocation}
                  onChange={(e) => setNewCabinetLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewSchemeModal(false)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateNewScheme}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black"
              >
                Создать шкаф
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
