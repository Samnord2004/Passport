import React from "react";
import { Printer, Flame, Zap, Droplets, Layers } from "lucide-react";
import {
  PlanRoom,
  FloorPartition,
  FloorOpening,
  FloorPlanElement,
  UnderfloorHeatingLoop,
  EngineeringRoute,
  ELEMENT_CATALOG
} from "../../types/architecturalTypes";
import { generateUnderfloorHeatingSvg, calculateRouteLength } from "./floorPlanUtils";

interface FloorPlanSpecTableProps {
  buildingLabel: string;
  W: number;
  H: number;
  currentFloor: number;
  currentRooms: PlanRoom[];
  currentPartitions: FloorPartition[];
  currentOpenings: FloorOpening[];
  currentElements: FloorPlanElement[];
  currentHeatingLoops?: UnderfloorHeatingLoop[];
  currentRoutes?: EngineeringRoute[];
  onBackToEditor: () => void;
}

export const FloorPlanSpecTable: React.FC<FloorPlanSpecTableProps> = ({
  buildingLabel,
  W,
  H,
  currentFloor,
  currentRooms,
  currentPartitions,
  currentOpenings,
  currentElements,
  currentHeatingLoops = [],
  currentRoutes = [],
  onBackToEditor
}) => {
  const totalRoomsArea = Math.round(
    currentRooms.reduce((acc, r) => acc + r.wMeters * r.hMeters, 0) * 10
  ) / 10;

  const totalPartitionsLength = Math.round(
    currentPartitions.reduce((acc, p) => {
      return acc + Math.sqrt(Math.pow(p.x2 - p.x1, 2) + Math.pow(p.y2 - p.y1, 2));
    }, 0) * 10
  ) / 10;

  const totalHeatingPipeLength = currentHeatingLoops.reduce((sum, loop) => {
    const { lengthMeters } = generateUnderfloorHeatingSvg(loop, 1, 0);
    return sum + (loop.pipeLengthMeters || lengthMeters || 0);
  }, 0);

  const totalElectricCableLength = currentRoutes
    .filter((r) => r.system === "electric")
    .reduce((sum, r) => sum + calculateRouteLength(r.points), 0);

  const totalPlumbingLength = currentRoutes
    .filter((r) => r.system.startsWith("plumbing") || r.system === "sewer")
    .reduce((sum, r) => sum + calculateRouteLength(r.points), 0);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-neutral-900 text-neutral-100 space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white">
            Экспликация помещений и спецификация инженерных сетей: {buildingLabel}
          </h2>
          <span className="text-xs text-neutral-400 font-mono">
            Этаж {currentFloor} · Габариты: {W}м × {H}м · Суммарная площадь комнат: {totalRoomsArea} м²
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Печать ведомости</span>
          </button>
          <button
            type="button"
            onClick={onBackToEditor}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs cursor-pointer transition"
          >
            Вернуться к чертежу
          </button>
        </div>
      </div>

      {/* 1. ЭКСПЛИКАЦИЯ ПОМЕЩЕНИЙ */}
      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase text-amber-400 font-mono">
          1. Экспликация помещений (ГОСТ 21.501)
        </h3>
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-950 text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-2.5">№</th>
                <th className="p-2.5">Наименование помещения</th>
                <th className="p-2.5">Размеры (м)</th>
                <th className="p-2.5">Площадь (м²)</th>
                <th className="p-2.5">Покрытие пола</th>
                <th className="p-2.5">Высота (м)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {currentRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-neutral-500 font-sans">
                    Помещения еще не сформированы. Вернитесь на шаг 3 и сформируйте комнаты.
                  </td>
                </tr>
              ) : (
                currentRooms.map((r, i) => (
                  <tr key={r.id} className="hover:bg-neutral-850/50">
                    <td className="p-2.5 text-neutral-500 font-bold">{i + 1}</td>
                    <td className="p-2.5 font-sans font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>{r.name}</span>
                    </td>
                    <td className="p-2.5 text-neutral-300">
                      {r.wMeters} × {r.hMeters}
                    </td>
                    <td className="p-2.5 font-bold text-amber-400">
                      {Math.round(r.wMeters * r.hMeters * 10) / 10} м²
                    </td>
                    <td className="p-2.5 text-neutral-300 font-sans">{r.floorFinish || "Ламинат"}</td>
                    <td className="p-2.5 text-neutral-400">{r.ceilingHeight || 2.8}м</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-neutral-950 font-bold font-mono text-xs border-t border-neutral-800">
              <tr>
                <td colSpan={3} className="p-2.5 text-right text-neutral-400">
                  ИТОГО ПОЛЕЗНАЯ ПЛОЩАДЬ:
                </td>
                <td className="p-2.5 text-amber-400">{totalRoomsArea} м²</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 2. СВЕДОМОСТЬ СТЕН И ПЕРЕГОРОДОК */}
      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase text-sky-400 font-mono">
          2. Ведомость перегородок и внутренних стен
        </h3>
        <div className="border border-neutral-800 rounded-xl overflow-hidden p-4 bg-neutral-950/50 grid grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-neutral-500 block uppercase text-[10px]">Количество перегородок:</span>
            <span className="text-white font-bold text-lg">{currentPartitions.length} шт</span>
          </div>
          <div>
            <span className="text-neutral-500 block uppercase text-[10px]">Общая длина стен:</span>
            <span className="text-sky-400 font-bold text-lg">{totalPartitionsLength} пог.м</span>
          </div>
          <div>
            <span className="text-neutral-500 block uppercase text-[10px]">Площадь возводимых стен (h=2.8м):</span>
            <span className="text-emerald-400 font-bold text-lg">
              {Math.round(totalPartitionsLength * 2.8 * 10) / 10} м²
            </span>
          </div>
        </div>
      </div>

      {/* 3. ВЕДОМОСТЬ ТЁПЛОГО ПОЛА И ОТОПИТЕЛЬНЫХ КОНТУРОВ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-rose-400 font-mono flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>3. Спецификация водяного тёплого пола ({currentHeatingLoops.length} контуров)</span>
          </h3>
          <span className="text-xs font-mono font-bold text-rose-400">
            Всего трубы PEX 16мм: {Math.round(totalHeatingPipeLength)} пог.м
          </span>
        </div>

        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-2.5">Контур</th>
                <th className="p-2.5">Габариты зоны</th>
                <th className="p-2.5">Шаг трубы (мм)</th>
                <th className="p-2.5">Отступ стен (мм)</th>
                <th className="p-2.5">Укладка</th>
                <th className="p-2.5">Длина трубы (м)</th>
                <th className="p-2.5">Статус гидравлики</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {currentHeatingLoops.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-neutral-500 font-sans">
                    Контуры тёплого пола еще не добавлены. Перейдите на шаг 4 во вкладку «Тёплый пол».
                  </td>
                </tr>
              ) : (
                currentHeatingLoops.map((loop) => {
                  const { lengthMeters } = generateUnderfloorHeatingSvg(loop, 1, 0);
                  const len = loop.pipeLengthMeters || lengthMeters;
                  const isLong = len > 85;
                  return (
                    <tr key={loop.id} className="hover:bg-neutral-850/50">
                      <td className="p-2.5 font-bold text-white flex items-center gap-1.5 font-sans">
                        <span>🔥</span>
                        <span>{loop.name}</span>
                      </td>
                      <td className="p-2.5 text-neutral-300">
                        {loop.wMeters} × {loop.hMeters}м
                      </td>
                      <td className="p-2.5 text-neutral-300">{loop.stepMm} мм</td>
                      <td className="p-2.5 text-neutral-300">{loop.wallOffsetMm} мм</td>
                      <td className="p-2.5 text-neutral-300 font-sans">
                        {loop.pattern === "snail" ? "🌀 Улитка" : "〰️ Змейка"}
                      </td>
                      <td className="p-2.5 font-bold text-rose-400">{len} м</td>
                      <td className="p-2.5">
                        {isLong ? (
                          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
                            Внимание: &gt;85м (рекомендуется разбить на 2 контура)
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            ✓ Оптимально (&lt;85м)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ВЕДОМОСТЬ КАБЕЛЬНЫХ ТРАСС И ТРУБОПРОВОДОВ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-amber-400 font-mono flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>4. Инженерные кабельные трассы и трубопроводы ({currentRoutes.length})</span>
          </h3>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-amber-400 font-bold">Кабель: {totalElectricCableLength} м</span>
            <span className="text-neutral-600">|</span>
            <span className="text-sky-400 font-bold">Трубы ВК: {totalPlumbingLength} м</span>
          </div>
        </div>

        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] border-b border-neutral-800">
              <tr>
                <th className="p-2.5">Система</th>
                <th className="p-2.5">Наименование трассы</th>
                <th className="p-2.5">Спецификация кабеля / трубы</th>
                <th className="p-2.5">Кол-во поворотов</th>
                <th className="p-2.5">Длина трассы (м)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {currentRoutes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500 font-sans">
                    Инженерные трассы еще не начерчены. Используйте инструмент «Начертить трассу» на шаге 4.
                  </td>
                </tr>
              ) : (
                currentRoutes.map((r) => {
                  const len = calculateRouteLength(r.points);
                  const isEl = r.system === "electric";
                  return (
                    <tr key={r.id} className="hover:bg-neutral-850/50">
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isEl
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : r.system === "sewer"
                              ? "bg-neutral-700 text-neutral-200"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                          }`}
                        >
                          {isEl ? "⚡ Электрика" : r.system === "sewer" ? "🕳️ Канализация" : "💧 Водопровод"}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-white font-sans">{r.name}</td>
                      <td className="p-2.5 text-neutral-300">
                        {r.cableCores || (r.diameterMm ? `Ø${r.diameterMm} мм` : "—")}
                      </td>
                      <td className="p-2.5 text-neutral-400">{r.points.length} точек</td>
                      <td className="p-2.5 font-bold text-amber-400">{len} пог.м</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ВЕДОМОСТЬ ДВЕРЕЙ, ОКОН И ТОЧЕК ОБОРУДОВАНИЯ */}
      <div className="grid grid-cols-2 gap-4">
        {/* Openings */}
        <div className="space-y-2">
          <h3 className="text-sm font-black uppercase text-purple-400 font-mono">
            5. Двери и светопрозрачные конструкции ({currentOpenings.length})
          </h3>
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50 p-3 space-y-1.5 text-xs font-mono">
            {currentOpenings.length === 0 ? (
              <span className="text-neutral-500 font-sans block p-2">Проемы не добавлены</span>
            ) : (
              currentOpenings.map((op, idx) => (
                <div key={op.id} className="flex justify-between py-1 border-b border-neutral-850">
                  <span className="text-neutral-300 font-sans">
                    {idx + 1}. {op.label || (op.type.includes("door") ? "Дверь" : "Окно")}
                  </span>
                  <span className="text-amber-400 font-bold">{op.widthMeters} м</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MEP & Furniture */}
        <div className="space-y-2">
          <h3 className="text-sm font-black uppercase text-emerald-400 font-mono">
            6. Приборы, розетки и распредкоробки ({currentElements.length})
          </h3>
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50 p-3 max-h-56 overflow-y-auto space-y-1.5 text-xs font-mono">
            {currentElements.length === 0 ? (
              <span className="text-neutral-500 font-sans block p-2">Оборудование не расставлено</span>
            ) : (
              currentElements.map((el) => {
                const cat = ELEMENT_CATALOG.find((c) => c.type === el.type);
                return (
                  <div key={el.id} className="flex justify-between py-1 border-b border-neutral-850">
                    <span className="text-neutral-300 font-sans flex items-center gap-1.5">
                      <span>{cat?.emoji}</span>
                      <span>{el.label}</span>
                    </span>
                    <span className="text-emerald-400">{el.circuitNumber || "—"}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
