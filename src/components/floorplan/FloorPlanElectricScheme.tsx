import React, { useState } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Edit2,
  Check,
  ShieldAlert,
  Power,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Hash,
  Copy,
  Printer,
  X
} from "lucide-react";
import {
  ElectricalPanelScheme,
  PanelBreakerItem,
  BreakerType
} from "../../types/architecturalTypes";

interface FloorPlanElectricSchemeProps {
  panels: ElectricalPanelScheme[];
  onUpdatePanels: (panels: ElectricalPanelScheme[]) => void;
  onClose?: () => void;
}

const BREAKER_TYPES_CATALOG: Array<{
  type: BreakerType;
  label: string;
  prefix: string;
  defaultCurve: "B" | "C" | "D";
  defaultRating: number;
  defaultPhases: 1 | 3;
  defaultCable: string;
  defaultPower: number;
  desc: string;
}> = [
  {
    type: "main_switch",
    label: "Вводной выключатель-рубильник (QS / QF0)",
    prefix: "QF0",
    defaultCurve: "C",
    defaultRating: 25,
    defaultPhases: 3,
    defaultCable: "ВВГнг 5x6.0",
    defaultPower: 15.0,
    desc: "Главный рубильник полного обесточивания щита"
  },
  {
    type: "surge_protector",
    label: "УЗИП (Защита от импульсных перенапряжений SPD)",
    prefix: "SPD1",
    defaultCurve: "C",
    defaultRating: 25,
    defaultPhases: 3,
    defaultCable: "ПВ-3 6.0",
    defaultPower: 0,
    desc: "Защита электроники от грозовых и коммутационных импульсов"
  },
  {
    type: "voltage_relay",
    label: "Реле контроля напряжения (РН-263Т / Zubr)",
    prefix: "РН",
    defaultCurve: "C",
    defaultRating: 63,
    defaultPhases: 1,
    defaultCable: "ПВ-3 6.0",
    defaultPower: 5.0,
    desc: "Защита бытовой техники от обрыва нуля и скачков напряжения >255V / <185V"
  },
  {
    type: "contactor",
    label: "Модульный мастер-контактор (KM / Отпуск)",
    prefix: "KM",
    defaultCurve: "C",
    defaultRating: 40,
    defaultPhases: 3,
    defaultCable: "ВВГнг 5x4.0",
    defaultPower: 12.0,
    desc: "Центральное отключение неприоритетных групп при уходе одной кнопкой"
  },
  {
    type: "rcd",
    label: "УЗО групповое 30мА / 10мА (QD)",
    prefix: "QD",
    defaultCurve: "C",
    defaultRating: 40,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x4.0",
    defaultPower: 8.0,
    desc: "Дифференциальная защита от утечки тока и поражения человека"
  },
  {
    type: "rcbo",
    label: "Дифференциальный автомат АВДТ (QFD)",
    prefix: "QF",
    defaultCurve: "C",
    defaultRating: 16,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x2.5",
    defaultPower: 3.5,
    desc: "Совмещенный автомат + УЗО в одном корпусе"
  },
  {
    type: "mcb_b10",
    label: "Автоматический выключатель B10 (Освещение)",
    prefix: "QF",
    defaultCurve: "B",
    defaultRating: 10,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x1.5",
    defaultPower: 1.5,
    desc: "Линии светодиодного и трекового освещения"
  },
  {
    type: "mcb_b16",
    label: "Автоматический выключатель B16 (Розетки)",
    prefix: "QF",
    defaultCurve: "B",
    defaultRating: 16,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x2.5",
    defaultPower: 3.5,
    desc: "Бытовые розеточные группы комнат"
  },
  {
    type: "mcb_c16",
    label: "Автоматический выключатель C16 (Кондиционеры / Насосы)",
    prefix: "QF",
    defaultCurve: "C",
    defaultRating: 16,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x2.5",
    defaultPower: 2.8,
    desc: "Климатическая техника с пусковыми токами компрессоров"
  },
  {
    type: "mcb_c20",
    label: "Автоматический выключатель C20 (Водонагреватель / Бойлер)",
    prefix: "QF",
    defaultCurve: "C",
    defaultRating: 20,
    defaultPhases: 1,
    defaultCable: "ВВГнг 3x2.5",
    defaultPower: 4.4,
    desc: "Мощные проточные и накопительные водонагреватели"
  },
  {
    type: "mcb_c25",
    label: "Автоматический выключатель C25 (Варочная панель / Плита)",
    prefix: "QF",
    defaultCurve: "C",
    defaultRating: 25,
    defaultPhases: 3,
    defaultCable: "ВВГнг 5x4.0",
    defaultPower: 8.5,
    desc: "Выделенная силовая трехфазная линия электроплиты"
  },
  {
    type: "mcb_c32",
    label: "Автоматический выключатель C32 (Электрокотёл / Ввод)",
    prefix: "QF",
    defaultCurve: "C",
    defaultRating: 32,
    defaultPhases: 3,
    defaultCable: "ВВГнг 5x6.0",
    defaultPower: 12.0,
    desc: "Отопительный электрокотёл или вводной автомат"
  }
];

export const FloorPlanElectricScheme: React.FC<FloorPlanElectricSchemeProps> = ({
  panels,
  onUpdatePanels,
  onClose
}) => {
  const [selectedPanelId, setSelectedPanelId] = useState<string>(
    panels[0]?.id || "panel_main_1"
  );

  const [editingBreaker, setEditingBreaker] = useState<PanelBreakerItem | null>(null);
  const [showAddBreakerModal, setShowAddBreakerModal] = useState<boolean>(false);
  const [showNewPanelModal, setShowNewPanelModal] = useState<boolean>(false);
  const [newPanelName, setNewPanelName] = useState<string>("");
  const [newPanelVoltage, setNewPanelVoltage] = useState<220 | 380>(380);

  // New breaker form state
  const [newNumber, setNewNumber] = useState<string>("");
  const [newLabel, setNewLabel] = useState<string>("");
  const [newType, setNewType] = useState<BreakerType>("mcb_b16");
  const [newRating, setNewRating] = useState<number>(16);
  const [newCurve, setNewCurve] = useState<"B" | "C" | "D">("B");
  const [newPhases, setNewPhases] = useState<1 | 3>(1);
  const [newCable, setNewCable] = useState<string>("ВВГнг-LS 3x2.5");
  const [newPowerKw, setNewPowerKw] = useState<number>(2.5);
  const [newDinRail, setNewDinRail] = useState<number>(2);
  const [newNonDisconnectable, setNewNonDisconnectable] = useState<boolean>(false);

  const activePanel = panels.find((p) => p.id === selectedPanelId) || panels[0];

  if (!activePanel) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Нет созданных электрощитов.
      </div>
    );
  }

  // Calculate statistics
  const totalBreakers = activePanel.breakers.length;
  const totalPower = Math.round(
    activePanel.breakers.reduce((acc, b) => acc + (b.powerKw || 0), 0) * 10
  ) / 10;
  const nonDisconnectableCount = activePanel.breakers.filter(
    (b) => b.isNonDisconnectable
  ).length;

  const handleUpdateBreaker = (updated: PanelBreakerItem) => {
    const updatedBreakers = activePanel.breakers.map((b) =>
      b.id === updated.id ? updated : b
    );
    const updatedPanel = { ...activePanel, breakers: updatedBreakers };
    onUpdatePanels(
      panels.map((p) => (p.id === activePanel.id ? updatedPanel : p))
    );
    setEditingBreaker(null);
  };

  const handleDeleteBreaker = (breakerId: string) => {
    const updatedBreakers = activePanel.breakers.filter((b) => b.id !== breakerId);
    const updatedPanel = { ...activePanel, breakers: updatedBreakers };
    onUpdatePanels(
      panels.map((p) => (p.id === activePanel.id ? updatedPanel : p))
    );
    if (editingBreaker?.id === breakerId) {
      setEditingBreaker(null);
    }
  };

  // 1-Click Auto Renumbering of All Breakers according to Russian PUE standard
  const handleAutoRenumber = () => {
    let qfCount = 1;
    let qdCount = 1;
    let rnCount = 1;
    let kmCount = 1;
    let spdCount = 1;

    const renumberedBreakers = activePanel.breakers.map((b) => {
      let num = b.number;
      if (b.type === "main_switch") {
        num = "QF0";
      } else if (b.type === "surge_protector") {
        num = `SPD${spdCount++}`;
      } else if (b.type === "voltage_relay") {
        num = `РН${rnCount++}`;
      } else if (b.type === "contactor") {
        num = `KM${kmCount++}`;
      } else if (b.type === "rcd") {
        num = `QD${qdCount++}`;
      } else {
        num = `QF${qfCount++}`;
      }
      return { ...b, number: num };
    });

    const updatedPanel = { ...activePanel, breakers: renumberedBreakers };
    onUpdatePanels(
      panels.map((p) => (p.id === activePanel.id ? updatedPanel : p))
    );
  };

  const handleSelectBreakerTypePreset = (type: BreakerType) => {
    setNewType(type);
    const item = BREAKER_TYPES_CATALOG.find((c) => c.type === type);
    if (item) {
      setNewRating(item.defaultRating);
      setNewCurve(item.defaultCurve);
      setNewPhases(item.defaultPhases);
      setNewCable(item.defaultCable);
      setNewPowerKw(item.defaultPower);
    }
  };

  const handleAddBreaker = () => {
    if (!newLabel.trim()) return;
    const item = BREAKER_TYPES_CATALOG.find((c) => c.type === newType);
    const prefix = item?.prefix || "QF";

    const countOfType = activePanel.breakers.filter(
      (b) => b.type === newType || (prefix === "QF" && (b.type.startsWith("mcb") || b.type === "rcbo"))
    ).length;

    const generatedNumber =
      newNumber.trim() ||
      (newType === "main_switch"
        ? "QF0"
        : `${prefix}${countOfType + 1}`);

    const newBreaker: PanelBreakerItem = {
      id: `brk_${Date.now()}`,
      number: generatedNumber,
      type: newType,
      label: newLabel.trim(),
      ratingAmps: newRating,
      curve: newCurve,
      phases: newPhases,
      cableSection: newCable,
      powerKw: newPowerKw,
      dinRail: newDinRail,
      isNonDisconnectable: newNonDisconnectable
    };

    const updatedPanel = {
      ...activePanel,
      breakers: [...activePanel.breakers, newBreaker]
    };
    onUpdatePanels(
      panels.map((p) => (p.id === activePanel.id ? updatedPanel : p))
    );

    // Reset form
    setNewLabel("");
    setNewNumber("");
    setShowAddBreakerModal(false);
  };

  const handleCreateNewPanel = () => {
    if (!newPanelName.trim()) return;
    const newPanel: ElectricalPanelScheme = {
      id: `panel_${Date.now()}`,
      panelName: newPanelName.trim(),
      panelType: "floor_subpanel",
      location: "Этаж / Коридор",
      voltage: newPanelVoltage,
      phases: newPanelVoltage === 380 ? 3 : 1,
      allocatedPowerKw: newPanelVoltage === 380 ? 10.0 : 5.0,
      dinRailsCount: 3,
      breakers: [
        {
          id: `brk_m_${Date.now()}`,
          number: "QF0",
          type: "main_switch",
          label: "Вводной выключатель",
          ratingAmps: newPanelVoltage === 380 ? 25 : 32,
          curve: "C",
          phases: newPanelVoltage === 380 ? 3 : 1,
          cableSection: newPanelVoltage === 380 ? "ВВГнг 5x4.0" : "ВВГнг 3x6.0",
          powerKw: newPanelVoltage === 380 ? 10.0 : 5.0,
          dinRail: 1
        },
        {
          id: `brk_qd_${Date.now()}`,
          number: "QD1",
          type: "rcd",
          label: "УЗО розеточных групп 30мА",
          ratingAmps: 40,
          curve: "C",
          leakageCurrentMa: 30,
          phases: 1,
          cableSection: "ВВГнг 3x4.0",
          powerKw: 5.0,
          dinRail: 2
        },
        {
          id: `brk_qf1_${Date.now()}`,
          number: "QF1",
          type: "mcb_b16",
          label: "Розетки",
          ratingAmps: 16,
          curve: "B",
          phases: 1,
          cableSection: "ВВГнг 3x2.5",
          powerKw: 2.5,
          dinRail: 2
        },
        {
          id: `brk_qf2_${Date.now()}`,
          number: "QF2",
          type: "mcb_b10",
          label: "Освещение",
          ratingAmps: 10,
          curve: "B",
          phases: 1,
          cableSection: "ВВГнг 3x1.5",
          powerKw: 1.2,
          dinRail: 3
        }
      ]
    };

    onUpdatePanels([...panels, newPanel]);
    setSelectedPanelId(newPanel.id);
    setNewPanelName("");
    setShowNewPanelModal(false);
  };

  const dinRails = [1, 2, 3];

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden text-neutral-100">
      {/* Top Header & Overview Bar */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                {activePanel.panelName}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800 text-red-300 font-bold">
                {activePanel.voltage}В / {activePanel.phases} фазы ({activePanel.allocatedPowerKw} кВт)
              </span>
            </div>
            <span className="text-xs text-neutral-400">
              Схема электрощита: DIN-рейки, маркировка приборов, нумерация автоматов (QF/QD/РН), сечения кабелей
            </span>
          </div>
        </div>

        {/* Panel Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Panels list switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            {panels.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPanelId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedPanelId === p.id
                    ? "bg-amber-500 text-neutral-950 font-black shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{p.panelName.split("(")[0]}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowNewPanelModal(true)}
              className="p-1 px-2 rounded-lg text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 transition cursor-pointer flex items-center gap-1"
              title="Добавить дополнительный электрощит"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Щит</span>
            </button>
          </div>

          {/* Quick stats pill */}
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl font-mono text-[11px]">
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase">Автоматов</span>
              <span className="text-amber-400 font-bold">{totalBreakers} шт</span>
            </div>
            <div className="border-l border-neutral-800 pl-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Нагрузка</span>
              <span className="text-emerald-400 font-bold">{totalPower} кВт</span>
            </div>
            <div className="border-l border-neutral-800 pl-2">
              <span className="text-neutral-500 block text-[9px] uppercase">Неотключ.</span>
              <span className="text-sky-400 font-bold">{nonDisconnectableCount}</span>
            </div>
          </div>

          {/* Auto Renumber button */}
          <button
            type="button"
            onClick={handleAutoRenumber}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Автоматически упорядочить и перенумеровать все автоматы по стандарту (QF1, QF2... QD1, РН1)"
          >
            <Hash className="w-4 h-4 text-amber-400" />
            <span>Нумеровать автоматы</span>
          </button>

          {/* Add Breaker button */}
          <button
            type="button"
            onClick={() => setShowAddBreakerModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить автомат</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Visual DIN Rails */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-center justify-between">
          <span>
            💡 Кликните на любой модульный автомат для редактирования его маркировки, номинала, фаз, сечения кабеля и неотключаемого статуса.
          </span>
          <span className="font-mono text-[10px] text-amber-400 uppercase font-bold">
            ГОСТ Р 50571 / СП 256.1325800
          </span>
        </div>

        {/* DIN Rails Layout */}
        {dinRails.map((railNum) => {
          const railBreakers = activePanel.breakers.filter((b) => b.dinRail === railNum);
          return (
            <div
              key={railNum}
              className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3 relative overflow-hidden"
            >
              {/* Metallic DIN-rail bar backdrop */}
              <div className="absolute top-1/2 left-0 right-0 h-4 bg-gradient-to-b from-neutral-700 to-neutral-800 -translate-y-1/2 opacity-30 pointer-events-none" />

              {/* DIN Rail Header */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-white font-mono font-black text-xs">
                    DIN-РЕЙКА #{railNum}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {railNum === 1
                      ? "Вводная секция: Рубильник, УЗИП, Реле напряжения и Контактор"
                      : railNum === 2
                      ? "Секция силовых электроприборов: Кухня, плита, бойлер, стиральная машина, робот-пылесос"
                      : "Секция розеточных групп, освещения, слаботочки и неотключаемых линий"}
                  </span>
                </div>
                <span className="text-xs text-neutral-500 font-mono">
                  {railBreakers.length} модулей
                </span>
              </div>

              {/* Modular Devices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5 relative z-10">
                {railBreakers.map((brk) => {
                  const isMain = brk.type === "main_switch";
                  const isRcd = brk.type === "rcd";
                  const isVoltage = brk.type === "voltage_relay";
                  const isContactor = brk.type === "contactor";
                  const isSurge = brk.type === "surge_protector";
                  const isNonDisc = brk.isNonDisconnectable;

                  return (
                    <div
                      key={brk.id}
                      onClick={() => setEditingBreaker(brk)}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition cursor-pointer group shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                        isNonDisc
                          ? "bg-sky-950/30 border-sky-500/50 hover:border-sky-400"
                          : isMain
                          ? "bg-red-950/30 border-red-500/50 hover:border-red-400"
                          : isRcd
                          ? "bg-amber-950/30 border-amber-500/50 hover:border-amber-400"
                          : isVoltage
                          ? "bg-emerald-950/30 border-emerald-500/50 hover:border-emerald-400"
                          : "bg-neutral-900 border-neutral-750 hover:border-neutral-500"
                      }`}
                    >
                      {/* Top Bar of Breaker Module */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-black text-xs px-1.5 py-0.5 rounded ${
                              isMain
                                ? "bg-red-600 text-white"
                                : isRcd
                                ? "bg-amber-500 text-neutral-950"
                                : isNonDisc
                                ? "bg-sky-500 text-neutral-950"
                                : "bg-neutral-800 text-amber-300 border border-neutral-700"
                            }`}
                          >
                            {brk.number}
                          </span>
                          {isNonDisc && (
                            <span
                              className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              title="Неотключаемая линия (не выключается мастер-рубильником)"
                            >
                              НЕОТКЛ
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBreaker(brk);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-amber-400 p-0.5 transition"
                            title="Редактировать автомат"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBreaker(brk.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-0.5 transition"
                            title="Удалить автомат"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Modular device visual casing */}
                      <div className="py-2 px-2 bg-neutral-950 rounded-lg border border-neutral-800 mb-2 flex items-center justify-between">
                        {/* Rating & Characteristics */}
                        <div>
                          <span className="text-[11px] font-black text-white font-mono block">
                            {brk.curve}
                            {brk.ratingAmps}A
                          </span>
                          <span className="text-[9px] text-neutral-400 font-mono block">
                            {brk.phases}P · {brk.phases === 3 ? "380В" : "230В"}
                          </span>
                        </div>

                        {/* Switch lever or LED indicator */}
                        {isVoltage ? (
                          <div className="text-right">
                            <span className="font-mono text-emerald-400 font-bold text-[10px] block">
                              230V
                            </span>
                            <span className="text-[8px] text-neutral-500 font-mono">РЕХ</span>
                          </div>
                        ) : isRcd ? (
                          <div className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500 flex items-center justify-center text-[8px] font-black text-amber-300">
                            Т
                          </div>
                        ) : (
                          <div
                            className={`w-3.5 h-6 rounded-sm border ${
                              isMain
                                ? "bg-red-600 border-red-400"
                                : "bg-neutral-800 border-neutral-600"
                            } flex items-center justify-center`}
                          >
                            <div className="w-1 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Consumer Label & Details */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-200 block truncate" title={brk.label}>
                          {brk.label}
                        </span>

                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-800">
                          <span className="truncate text-amber-400/90">{brk.cableSection}</span>
                          <span className="font-bold text-white shrink-0">{brk.powerKw} кВт</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Cable & Load Balance Summary Table */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-xs uppercase font-mono text-neutral-300">
                Кабельный журнал и спецификация аппаратов защиты:
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              Всего: {activePanel.breakers.length} линий / {totalPower} кВт
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 font-mono text-[10px] uppercase border-b border-neutral-800">
                <tr>
                  <th className="p-2.5">Обозначение</th>
                  <th className="p-2.5">Тип аппарата</th>
                  <th className="p-2.5">Номинал / Кривая</th>
                  <th className="p-2.5">Наименование нагрузки</th>
                  <th className="p-2.5">Мощность (кВт)</th>
                  <th className="p-2.5">Марка и сечение кабеля</th>
                  <th className="p-2.5">Категория</th>
                  <th className="p-2.5 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                {activePanel.breakers.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-850/50 cursor-pointer" onClick={() => setEditingBreaker(b)}>
                    <td className="p-2.5 font-bold text-amber-400">{b.number}</td>
                    <td className="p-2.5 text-neutral-300">
                      {b.type === "main_switch"
                        ? "Выключатель-рубильник"
                        : b.type === "voltage_relay"
                        ? "Реле напряжения"
                        : b.type === "rcd"
                        ? "УЗО дифференциальное"
                        : b.type === "rcbo"
                        ? "Диф.автомат (АВДТ)"
                        : b.type === "surge_protector"
                        ? "УЗИП"
                        : b.type === "contactor"
                        ? "Контактор модульный"
                        : "Автоматический выключатель"}
                    </td>
                    <td className="p-2.5 text-white font-bold">
                      {b.curve}
                      {b.ratingAmps}А {b.phases === 3 ? "3P" : "1P"} {b.leakageCurrentMa ? `(${b.leakageCurrentMa}мА)` : ""}
                    </td>
                    <td className="p-2.5 text-neutral-200 font-sans font-medium">{b.label}</td>
                    <td className="p-2.5 text-emerald-400 font-bold">{b.powerKw} кВт</td>
                    <td className="p-2.5 text-amber-300">{b.cableSection}</td>
                    <td className="p-2.5">
                      {b.isNonDisconnectable ? (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-bold">
                          Неотключаемая
                        </span>
                      ) : (
                        <span className="text-neutral-500 text-[10px]">Отключаемая</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBreaker(b);
                        }}
                        className="text-amber-400 hover:underline mr-2 text-[10px]"
                      >
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Edit Existing Breaker */}
      {editingBreaker && (
        <div className="fixed inset-0 z-[160] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-lg w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Редактирование автомата: {editingBreaker.number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingBreaker(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Наименование нагрузки (потребителя):
                </label>
                <input
                  type="text"
                  value={editingBreaker.label}
                  onChange={(e) =>
                    setEditingBreaker({ ...editingBreaker, label: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Обозначение (номер автомата):
                  </label>
                  <input
                    type="text"
                    value={editingBreaker.number}
                    onChange={(e) =>
                      setEditingBreaker({ ...editingBreaker, number: e.target.value })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    DIN-рейка:
                  </label>
                  <select
                    value={editingBreaker.dinRail || 1}
                    onChange={(e) =>
                      setEditingBreaker({
                        ...editingBreaker,
                        dinRail: parseInt(e.target.value) || 1
                      })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-bold"
                  >
                    <option value={1}>Рейка 1 (Ввод и защита)</option>
                    <option value={2}>Рейка 2 (Кухня и силовые)</option>
                    <option value={3}>Рейка 3 (Жилые и освещение)</option>
                  </select>
                </div>
              </div>

              {/* Breaker Type */}
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Тип модульного прибора:
                </label>
                <select
                  value={editingBreaker.type}
                  onChange={(e) => {
                    const newT = e.target.value as BreakerType;
                    const match = BREAKER_TYPES_CATALOG.find((c) => c.type === newT);
                    setEditingBreaker({
                      ...editingBreaker,
                      type: newT,
                      ratingAmps: match ? match.defaultRating : editingBreaker.ratingAmps,
                      curve: match ? match.defaultCurve : editingBreaker.curve,
                      phases: match ? match.defaultPhases : editingBreaker.phases
                    });
                  }}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-amber-300 font-bold"
                >
                  {BREAKER_TYPES_CATALOG.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Номинал тока:
                  </label>
                  <select
                    value={editingBreaker.ratingAmps}
                    onChange={(e) =>
                      setEditingBreaker({
                        ...editingBreaker,
                        ratingAmps: parseInt(e.target.value) || 16
                      })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  >
                    {[6, 10, 16, 20, 25, 32, 40, 50, 63].map((r) => (
                      <option key={r} value={r}>
                        {r} А
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Кривая:
                  </label>
                  <select
                    value={editingBreaker.curve || "C"}
                    onChange={(e) =>
                      setEditingBreaker({
                        ...editingBreaker,
                        curve: e.target.value as any
                      })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  >
                    <option value="B">B (быстрый)</option>
                    <option value="C">C (стандартный)</option>
                    <option value="D">D (тяжелый пуск)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Мощность (кВт):
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={editingBreaker.powerKw || 1.5}
                    onChange={(e) =>
                      setEditingBreaker({
                        ...editingBreaker,
                        powerKw: parseFloat(e.target.value) || 1
                      })
                    }
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Марка и сечение кабеля:
                </label>
                <input
                  type="text"
                  value={editingBreaker.cableSection}
                  onChange={(e) =>
                    setEditingBreaker({
                      ...editingBreaker,
                      cableSection: e.target.value
                    })
                  }
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                />
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingBreaker.isNonDisconnectable || false}
                    onChange={(e) =>
                      setEditingBreaker({
                        ...editingBreaker,
                        isNonDisconnectable: e.target.checked
                      })
                    }
                    className="rounded border-neutral-700 text-sky-500 focus:ring-0"
                  />
                  <span className="font-bold text-neutral-200">
                    Неотключаемая линия (холодильник, сервер, котёл, увлажнение)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteBreaker(editingBreaker.id)}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/60 text-red-300 font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить автомат</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBreaker(null)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateBreaker(editingBreaker)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Breaker */}
      {showAddBreakerModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-lg w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Добавление автоматического выключателя / аппарата защиты</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBreakerModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Type catalog select */}
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Тип установленного прибора:
                </label>
                <select
                  value={newType}
                  onChange={(e) => handleSelectBreakerTypePreset(e.target.value as BreakerType)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-amber-300 font-bold"
                >
                  {BREAKER_TYPES_CATALOG.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Наименование нагрузки (потребителя):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Розетки спальни, Кондиционер, Скрытый робот-пылесос, Встроенный пылесос..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Обозначение (номер):
                  </label>
                  <input
                    type="text"
                    placeholder="QF14, QD3, РН2..."
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    DIN-рейка:
                  </label>
                  <select
                    value={newDinRail}
                    onChange={(e) => setNewDinRail(parseInt(e.target.value) || 1)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-bold"
                  >
                    <option value={1}>Рейка 1 (Ввод и защита)</option>
                    <option value={2}>Рейка 2 (Кухня и силовые)</option>
                    <option value={3}>Рейка 3 (Жилые и освещение)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Номинал тока:
                  </label>
                  <select
                    value={newRating}
                    onChange={(e) => setNewRating(parseInt(e.target.value) || 16)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  >
                    {[6, 10, 16, 20, 25, 32, 40, 50, 63].map((r) => (
                      <option key={r} value={r}>
                        {r} А
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Кривая:
                  </label>
                  <select
                    value={newCurve}
                    onChange={(e) => setNewCurve(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  >
                    <option value="B">B (быстрый)</option>
                    <option value="C">C (стандартный)</option>
                    <option value="D">D (тяжелый пуск)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                    Мощность (кВт):
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0.1}
                    value={newPowerKw}
                    onChange={(e) => setNewPowerKw(parseFloat(e.target.value) || 1)}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Кабель:
                </label>
                <select
                  value={newCable}
                  onChange={(e) => setNewCable(e.target.value)}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white font-mono font-bold"
                >
                  <option value="ВВГнг-LS 3x1.5">ВВГнг-LS 3x1.5 (Освещение)</option>
                  <option value="ВВГнг-LS 3x2.5">ВВГнг-LS 3x2.5 (Розетки 16А)</option>
                  <option value="ВВГнг-LS 3x4.0">ВВГнг-LS 3x4.0 (Силовая 25А)</option>
                  <option value="ВВГнг-LS 5x2.5">ВВГнг-LS 5x2.5 (3-фазная 16А)</option>
                  <option value="ВВГнг-LS 5x4.0">ВВГнг-LS 5x4.0 (Варочная 380В)</option>
                  <option value="ВВГнг-LS 5x6.0">ВВГнг-LS 5x6.0 (Вводной кабель)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newNonDisconnectable}
                    onChange={(e) => setNewNonDisconnectable(e.target.checked)}
                    className="rounded border-neutral-700 text-sky-500 focus:ring-0"
                  />
                  <span className="font-bold text-neutral-200">
                    Неотключаемая линия (холодильник, сервер, котёл, увлажнение)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBreakerModal(false)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleAddBreaker}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black"
              >
                Добавить в щит
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Electrical Panel */}
      {showNewPanelModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Создание нового распределительного щита</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPanelModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Название электрощита:
                </label>
                <input
                  type="text"
                  placeholder="e.g. ЩР-2 (Щит 2 этажа), Щит котельной, Слаботочный щит..."
                  value={newPanelName}
                  onChange={(e) => setNewPanelName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-700 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block uppercase font-mono mb-1">
                  Вводное напряжение:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPanelVoltage(380)}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      newPanelVoltage === 380
                        ? "bg-red-950/40 border-red-500 text-red-300"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <span className="block text-white font-black">380В / 3 Фазы</span>
                    <span className="text-[10px]">Ввод 15 кВт</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPanelVoltage(220)}
                    className={`p-3 rounded-xl border text-left font-bold ${
                      newPanelVoltage === 220
                        ? "bg-amber-950/40 border-amber-500 text-amber-300"
                        : "bg-neutral-950 border-neutral-800 text-neutral-400"
                    }`}
                  >
                    <span className="block text-white font-black">220В / 1 Фаза</span>
                    <span className="text-[10px]">Ввод 5–7 кВт</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewPanelModal(false)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateNewPanel}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black"
              >
                Создать щит
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
