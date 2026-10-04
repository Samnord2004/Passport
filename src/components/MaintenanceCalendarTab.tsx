import React, { useState, useMemo } from "react";
import { 
  ScheduleItem, 
  BuildingObject, 
  User, 
  ChecklistTemplate 
} from "../types";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Clock, 
  Building, 
  User as UserIcon, 
  AlertTriangle, 
  CheckCircle2, 
  Move, 
  X, 
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";

interface MaintenanceCalendarTabProps {
  schedules: ScheduleItem[];
  objects: BuildingObject[];
  users: User[];
  templates: ChecklistTemplate[];
  getScheduleStatus: (sch: ScheduleItem) => {
    label: string;
    class: string;
    overdue: boolean;
    diffDays: number;
    criticalOverdue?: boolean;
    [key: string]: any;
  };
  onUpdateScheduleDate: (scheduleId: string, newDateStr: string) => Promise<void>;
  onSelectSchedule?: (sch: ScheduleItem) => void;
  onNavigateToScheduleTab?: () => void;
  currentUser: User | null;
  cardStyle?: string;
  inputStyle?: string;
  referenceDate?: string; // Default simulated reference date "2026-05-24"
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const MaintenanceCalendarTab: React.FC<MaintenanceCalendarTabProps> = ({
  schedules,
  objects,
  users,
  templates,
  getScheduleStatus,
  onUpdateScheduleDate,
  onSelectSchedule,
  onNavigateToScheduleTab,
  currentUser,
  cardStyle = "",
  inputStyle = "",
  referenceDate = "2026-05-24"
}) => {
  // Parse reference date for default view (May 2026 in demo data, or current real date)
  const initialDate = useMemo(() => {
    const d = new Date(referenceDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [referenceDate]);

  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Filters & Search
  const [selectedObjectId, setSelectedObjectId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"month" | "list">("month");

  // Drag and drop states
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleItem | null>(null);
  const [dragOverDayStr, setDragOverDayStr] = useState<string | null>(null);
  const [isUpdatingDate, setIsUpdatingDate] = useState<boolean>(false);

  // Inspection & Reschedule Modal state
  const [inspectSchedule, setInspectSchedule] = useState<ScheduleItem | null>(null);
  const [manualDateInput, setManualDateInput] = useState<string>("");

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleTodayClick = () => {
    setCurrentYear(initialDate.getFullYear());
    setCurrentMonth(initialDate.getMonth());
  };

  // Helper to determine the target calendar date of a schedule
  const getScheduleScheduledDate = (sch: ScheduleItem): string => {
    if (sch.scheduledDate && sch.scheduledDate.trim() !== "") {
      return sch.scheduledDate.split("T")[0];
    }
    if (sch.lastDoneDate) {
      const parts = sch.lastDoneDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + (sch.intervalDays || 1));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    }
    if (sch.commissioningDate) {
      const parts = sch.commissioningDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + (sch.intervalDays || 1));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    }
    // Default fallback to the simulated reference date
    return referenceDate;
  };

  // Available unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [schedules]);

  // Filtered schedules according to search and selection
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      // 1. Object filter
      if (selectedObjectId !== "all" && sch.objectId !== selectedObjectId) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== "all" && sch.category !== selectedCategory) {
        return false;
      }
      // 3. Specialist filter
      if (selectedSpecialistId !== "all" && sch.responsibleUserId !== selectedSpecialistId) {
        return false;
      }
      // 4. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const obj = objects.find(o => o.id === sch.objectId);
        const objName = (obj?.name || "").toLowerCase();
        const title = (sch.title || "").toLowerCase();
        const cat = (sch.category || "").toLowerCase();
        const notes = (sch.notes || "").toLowerCase();
        return objName.includes(q) || title.includes(q) || cat.includes(q) || notes.includes(q);
      }
      return true;
    });
  }, [schedules, objects, selectedObjectId, selectedCategory, selectedSpecialistId, searchQuery]);

  // Map of schedules grouped by YYYY-MM-DD
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    filteredSchedules.forEach(sch => {
      const dateKey = getScheduleScheduledDate(sch);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(sch);
    });
    return map;
  }, [filteredSchedules, referenceDate]);

  // Calendar matrix calculation for the active month (7-column grid)
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Day of week: 0 is Sun, 1 is Mon... convert so Mon is 0, Sun is 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = lastDayOfMonth.getDate();

    // Previous month filler days
    const prevDateBase = new Date(currentYear, currentMonth, 0);
    const prevMonthLastDay = prevDateBase.getDate();
    const prevDays = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const d = String(prevDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      prevDays.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false
      });
    }

    // Current month days
    const currentDays = [];
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      currentDays.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false
      });
    }

    // Next month filler days to complete weeks (multiple of 7)
    const totalDaysSoFar = prevDays.length + currentDays.length;
    const remainingDays = (7 - (totalDaysSoFar % 7)) % 7;
    const nextDays = [];
    for (let d = 1; d <= remainingDays; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const day = String(nextDate.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      nextDays.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true
      });
    }

    return [...prevDays, ...currentDays, ...nextDays];
  }, [currentYear, currentMonth]);

  // Drag and Drop handlers
  const handleDragStart = (sch: ScheduleItem, e: React.DragEvent) => {
    setDraggedSchedule(sch);
    e.dataTransfer.setData("text/plain", sch.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
    setDragOverDayStr(null);
  };

  const handleDragOverDay = (dayStr: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDayStr !== dayStr) {
      setDragOverDayStr(dayStr);
    }
  };

  const handleDragLeaveDay = (dayStr: string) => {
    if (dragOverDayStr === dayStr) {
      setDragOverDayStr(null);
    }
  };

  const handleDropOnDay = async (dayStr: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDayStr(null);
    const scheduleId = e.dataTransfer.getData("text/plain") || draggedSchedule?.id;
    if (!scheduleId) return;

    const targetSch = schedules.find(s => s.id === scheduleId);
    if (!targetSch) return;

    const currentDateStr = getScheduleScheduledDate(targetSch);
    if (currentDateStr === dayStr) {
      // Dropped on the same day, no action needed
      setDraggedSchedule(null);
      return;
    }

    setIsUpdatingDate(true);
    try {
      await onUpdateScheduleDate(scheduleId, dayStr);
    } finally {
      setIsUpdatingDate(false);
      setDraggedSchedule(null);
    }
  };

  // Manual modal reschedule submit
  const handleManualReschedule = async () => {
    if (!inspectSchedule || !manualDateInput) return;
    setIsUpdatingDate(true);
    try {
      await onUpdateScheduleDate(inspectSchedule.id, manualDateInput);
      setInspectSchedule(null);
    } finally {
      setIsUpdatingDate(false);
    }
  };

  // Get user fullname lookup
  const getUserName = (userId?: string) => {
    if (!userId) return "Свободный выбор (не назначен)";
    const found = users.find(u => u.id === userId);
    return found ? found.fullname : "Неизвестный специалист";
  };

  // Get object name lookup
  const getObjectName = (objectId?: string) => {
    const found = objects.find(o => o.id === objectId);
    return found ? found.name : "Неизвестный объект";
  };

  // Count metrics for current active month
  const activeMonthStats = useMemo(() => {
    let totalInMonth = 0;
    let overdueCount = 0;
    let criticalOverdueCount = 0;

    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const prefix = `${currentYear}-${monthStr}`;

    filteredSchedules.forEach(sch => {
      const dateStr = getScheduleScheduledDate(sch);
      if (dateStr.startsWith(prefix)) {
        totalInMonth++;
        const st = getScheduleStatus(sch);
        if (st.overdue) {
          overdueCount++;
          if (st.diffDays < -5) {
            criticalOverdueCount++;
          }
        }
      }
    });

    return { totalInMonth, overdueCount, criticalOverdueCount };
  }, [filteredSchedules, currentYear, currentMonth, referenceDate]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm space-y-4 ${cardStyle}`}>
        {/* Row 1: Title and View Toggles */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-200/70 dark:border-zinc-800">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-sm">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <span>Интерактивный календарь обслуживания ТО</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Визуализация плановых дат проведения регламентов с возможностью перетаскивания (Drag & Drop) для изменения сроков
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {/* View Switch */}
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-zinc-800/80 rounded-xl border border-neutral-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "month" 
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                📅 Сетка месяца
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "list" 
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                📋 Список по дням
              </button>
            </div>

            {/* Today Quick Button */}
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              title="Перейти к текущей контрольной дате"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
              <span>Сегодня ({new Date(referenceDate).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })})</span>
            </button>

            {onNavigateToScheduleTab && (
              <button
                type="button"
                onClick={onNavigateToScheduleTab}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
                title="Перейти к табличной структуре регламентов"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Табличный реестр</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Month Navigation & Summary Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month Stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-200 cursor-pointer shadow-sm transition-colors"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100/80 dark:bg-zinc-800/80 border border-neutral-200/80 dark:border-zinc-700 font-extrabold text-sm sm:text-base text-neutral-850 dark:text-neutral-100 min-w-[170px] justify-center">
              <span>{MONTH_NAMES[currentMonth]} {currentYear} г.</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-200 cursor-pointer shadow-sm transition-colors"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Summary Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5">
              <span>Запланировано:</span>
              <strong className="font-black text-sm">{activeMonthStats.totalInMonth}</strong>
            </span>

            {activeMonthStats.overdueCount > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Просрочено:</span>
                <strong className="font-black text-sm">{activeMonthStats.overdueCount}</strong>
              </span>
            )}

            {activeMonthStats.criticalOverdueCount > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-red-600 text-white font-extrabold text-xs flex items-center gap-1 animate-pulse shadow-sm">
                <span>🚨 Просрочка &gt;5 дн.:</span>
                <strong className="font-black text-sm">{activeMonthStats.criticalOverdueCount}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-neutral-200/50 dark:border-zinc-800/60 text-xs">
          {/* Object Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
            <Building className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="w-full bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">Все объекты ({objects.length})</option>
              {objects.map(obj => (
                <option key={obj.id} value={obj.id}>{obj.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
            <Layers className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">Все категории ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Specialist Filter */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
            <UserIcon className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            <select
              value={selectedSpecialistId}
              onChange={(e) => setSelectedSpecialistId(e.target.value)}
              className="w-full bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">Все специалисты</option>
              {users.filter(u => u.role === "specialist").map(spec => (
                <option key={spec.id} value={spec.id}>{spec.fullname} ({spec.company || "Частный мастер"})</option>
              ))}
            </select>
          </div>

          {/* Text Search */}
          <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
            <Search className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Поиск регламента..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none text-xs placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white mr-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Drag and Drop Instruction Callout */}
        <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/30 flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold">
              <strong>Drag & Drop:</strong> Перетаскивайте карточки регламентов мышью на любой день сетки календаря для мгновенного изменения плановой даты ТО.
            </span>
          </div>
          {isUpdatingDate && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              Сохранение даты...
            </span>
          )}
        </div>
      </div>

      {/* Main Calendar View Container */}
      {viewMode === "month" ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 shadow-sm overflow-hidden backdrop-blur-sm">
          {/* Weekday Columns Header */}
          <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-100/70 dark:bg-zinc-800/60 text-center py-2.5 text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-zinc-300">
            {WEEK_DAYS.map((dayName, idx) => (
              <div 
                key={dayName}
                className={idx >= 5 ? "text-amber-600 dark:text-amber-400" : ""}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* 7-column Calendar Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200/70 dark:divide-zinc-800/80 auto-rows-fr">
            {calendarGrid.map((dayObj, cellIdx) => {
              const { dayNumber, dateStr, isCurrentMonth, isPrevMonth, isNextMonth } = dayObj;
              const isToday = dateStr === referenceDate;
              const isDragOver = dragOverDayStr === dateStr;
              const daySchedules = schedulesByDate.get(dateStr) || [];

              return (
                <div
                  key={dateStr + "_" + cellIdx}
                  onDragOver={(e) => handleDragOverDay(dateStr, e)}
                  onDragLeave={() => handleDragLeaveDay(dateStr)}
                  onDrop={(e) => handleDropOnDay(dateStr, e)}
                  className={`min-h-[120px] sm:min-h-[140px] p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-150 relative ${
                    isCurrentMonth 
                      ? "bg-white dark:bg-zinc-900/95" 
                      : "bg-neutral-50/60 dark:bg-zinc-950/40 opacity-60"
                  } ${
                    isDragOver 
                      ? "bg-blue-100/80 dark:bg-blue-900/40 ring-2 ring-blue-500 ring-inset shadow-inner" 
                      : ""
                  } ${
                    isToday 
                      ? "ring-2 ring-blue-600/70 dark:ring-blue-500/70 ring-inset bg-blue-50/20 dark:bg-blue-950/10" 
                      : ""
                  }`}
                >
                  {/* Day Header (Date number and badges) */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span 
                      className={`text-xs font-black rounded-lg px-1.5 py-0.5 inline-block ${
                        isToday 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : isCurrentMonth 
                            ? "text-neutral-800 dark:text-neutral-200" 
                            : "text-neutral-400 dark:text-zinc-500"
                      }`}
                    >
                      {dayNumber}
                      {isToday && <span className="ml-1 text-[9px] uppercase font-bold tracking-tighter">Сегодня</span>}
                    </span>

                    {daySchedules.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-neutral-200/70 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  {/* Day Content: List of Draggable Schedule Cards */}
                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[140px] scrollbar-thin">
                    {daySchedules.map((sch) => {
                      const status = getScheduleStatus(sch);
                      const isOverdue = status.overdue;
                      const isCritical = status.diffDays < -5;
                      const isBeingDragged = draggedSchedule?.id === sch.id;
                      const obj = objects.find(o => o.id === sch.objectId);

                      return (
                        <div
                          key={sch.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(sch, e)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setInspectSchedule(sch);
                            setManualDateInput(dateStr);
                          }}
                          className={`p-1.5 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all select-none shadow-xs group ${
                            isBeingDragged ? "opacity-30 scale-95" : "hover:scale-[1.02] hover:shadow-md"
                          } ${
                            isCritical 
                              ? "bg-rose-100 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                              : isOverdue 
                                ? "bg-amber-100/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                : "bg-white dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700 text-neutral-800 dark:text-neutral-100"
                          }`}
                          title={`Нажмите для просмотра деталей или перетащите мышью на другой день.\nОбъект: ${obj?.name || 'Не указан'}\nСтатус: ${status.label}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 truncate max-w-[85px]">
                              {sch.category}
                            </span>
                            <Move className="w-3 h-3 text-neutral-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          <div className="font-extrabold text-[11px] leading-tight truncate">
                            {sch.title}
                          </div>

                          <div className="text-[9px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            🏢 {obj?.name || "Объект"}
                          </div>

                          {/* Overdue alert indicator badge */}
                          {isOverdue && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] font-black text-rose-600 dark:text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                              <span>{isCritical ? "🚨 > 5 дн." : "Просрочено"}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Drop zone placeholder overlay when dragged over this cell */}
                  {isDragOver && (
                    <div className="mt-1 text-center py-1 rounded-md border border-dashed border-blue-500 bg-blue-500/10 text-[10px] font-black text-blue-600 dark:text-blue-300 animate-pulse">
                      + Перенести на {dayNumber} число
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda / Day List View Mode */
        <div className="space-y-3">
          {calendarGrid
            .filter(d => (schedulesByDate.get(d.dateStr) || []).length > 0)
            .map(dayObj => {
              const { dateStr } = dayObj;
              const daySchedules = schedulesByDate.get(dateStr) || [];
              const isToday = dateStr === referenceDate;
              const formattedDate = new Date(dateStr).toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              });

              return (
                <div 
                  key={dateStr}
                  onDragOver={(e) => handleDragOverDay(dateStr, e)}
                  onDragLeave={() => handleDragLeaveDay(dateStr)}
                  onDrop={(e) => handleDropOnDay(dateStr, e)}
                  className={`p-4 rounded-2xl border transition-all ${
                    dragOverDayStr === dateStr 
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500" 
                      : isToday 
                        ? "border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20" 
                        : "border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-neutral-200 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                        <Clock className="w-4 h-4 text-blue-500" />
                      </span>
                      <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 capitalize">
                        {formattedDate}
                      </h4>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase">
                          Сегодня
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-400">
                      Задач: {daySchedules.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {daySchedules.map(sch => {
                      const status = getScheduleStatus(sch);
                      const obj = objects.find(o => o.id === sch.objectId);
                      const isBeingDragged = draggedSchedule?.id === sch.id;

                      return (
                        <div
                          key={sch.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(sch, e)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setInspectSchedule(sch);
                            setManualDateInput(dateStr);
                          }}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                            isBeingDragged ? "opacity-30" : ""
                          } ${
                            status.overdue 
                              ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900" 
                              : "bg-neutral-50/50 dark:bg-zinc-850 border-neutral-200 dark:border-zinc-750"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-neutral-200 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300">
                                {sch.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.class}`}>
                                {status.shortLabel || status.label}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100">
                              {sch.title}
                            </h5>

                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="truncate">{obj?.name || "Объект не привязан"}</span>
                            </div>

                            <div className="text-[11px] text-neutral-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3 shrink-0" />
                              <span className="truncate">{getUserName(sch.responsibleUserId)}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] text-neutral-400">
                            <span>Интервал: {sch.intervalDays} дн.</span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                              <Move className="w-3 h-3" /> Перетащить
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Regulation Inspection & Reschedule Modal */}
      {inspectSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl p-5 sm:p-6 space-y-4 text-neutral-800 dark:text-neutral-100 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                  <CalendarIcon className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-base text-neutral-900 dark:text-white">
                    Параметры регламента ТО
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Просмотр данных и изменение плановой даты
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectSchedule(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Table */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-zinc-850 border border-neutral-200/80 dark:border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Название:</span>
                  <span className="font-extrabold text-neutral-850 dark:text-white">{inspectSchedule.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Категория:</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{inspectSchedule.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Объект:</span>
                  <span className="font-bold text-neutral-700 dark:text-zinc-200">{getObjectName(inspectSchedule.objectId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Периодичность:</span>
                  <span className="font-bold">Каждые {inspectSchedule.intervalDays} дн.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Исполнитель:</span>
                  <span className="font-bold text-neutral-700 dark:text-zinc-200">{getUserName(inspectSchedule.responsibleUserId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 font-semibold">Текущий статус:</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${getScheduleStatus(inspectSchedule).class}`}>
                    {getScheduleStatus(inspectSchedule).label}
                  </span>
                </div>
              </div>

              {/* Reschedule Date Input Box */}
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                <label className="block font-bold text-xs text-blue-900 dark:text-blue-200">
                  🗓️ Изменить плановую дату выполнения ТО:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={manualDateInput}
                    onChange={(e) => setManualDateInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 font-semibold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleManualReschedule}
                    disabled={isUpdatingDate || !manualDateInput}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {isUpdatingDate ? "Сохранение..." : "Применить дату"}
                  </button>
                </div>

                {/* Quick Shift Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-neutral-400 font-semibold mr-1">Быстрый сдвиг:</span>
                  <button
                    type="button"
                    onClick={() => setManualDateInput(referenceDate)}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-750 transition-colors"
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = manualDateInput ? new Date(manualDateInput) : new Date(referenceDate);
                      base.setDate(base.getDate() + 1);
                      const y = base.getFullYear();
                      const m = String(base.getMonth() + 1).padStart(2, "0");
                      const d = String(base.getDate()).padStart(2, "0");
                      setManualDateInput(`${y}-${m}-${d}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-[10px] font-bold text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-750 transition-colors"
                  >
                    +1 дн.
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = manualDateInput ? new Date(manualDateInput) : new Date(referenceDate);
                      base.setDate(base.getDate() + 3);
                      const y = base.getFullYear();
                      const m = String(base.getMonth() + 1).padStart(2, "0");
                      const d = String(base.getDate()).padStart(2, "0");
                      setManualDateInput(`${y}-${m}-${d}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-[10px] font-bold text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-750 transition-colors"
                  >
                    +3 дн.
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = manualDateInput ? new Date(manualDateInput) : new Date(referenceDate);
                      base.setDate(base.getDate() + 7);
                      const y = base.getFullYear();
                      const m = String(base.getMonth() + 1).padStart(2, "0");
                      const d = String(base.getDate()).padStart(2, "0");
                      setManualDateInput(`${y}-${m}-${d}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-[10px] font-bold text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-750 transition-colors"
                  >
                    +7 дн. (Неделя)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = manualDateInput ? new Date(manualDateInput) : new Date(referenceDate);
                      base.setMonth(base.getMonth() + 1);
                      const y = base.getFullYear();
                      const m = String(base.getMonth() + 1).padStart(2, "0");
                      const d = String(base.getDate()).padStart(2, "0");
                      setManualDateInput(`${y}-${m}-${d}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 text-[10px] font-bold text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-750 transition-colors"
                  >
                    +1 месяц
                  </button>
                </div>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block leading-tight">
                  Вы также можете быстро перетащить этот регламент на нужный день прямо в сетке календаря.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setInspectSchedule(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
