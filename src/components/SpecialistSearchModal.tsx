import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Star, 
  HardHat, 
  Phone, 
  Mail, 
  Send, 
  CheckCircle2, 
  Filter, 
  User as UserIcon, 
  Briefcase, 
  Building2, 
  ChevronRight, 
  MessageSquare, 
  ShieldCheck, 
  Wrench, 
  Sparkles, 
  Award, 
  ExternalLink,
  SlidersHorizontal,
  Clock,
  AlertCircle
} from 'lucide-react';
import { User, BuildingObject, CompletedChecklist, ScheduleItem } from '../types';
import { LIFE_SUPPORT_CATEGORIES, LifeSupportCategory } from './SpecialistSkillsEditor';

interface SpecialistSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  reports: CompletedChecklist[];
  objects: BuildingObject[];
  currentUser: User | null;
  schedules?: ScheduleItem[];
  onAssignSpecialistToObject?: (specialistId: string, objectId: string) => void;
  onRemoveSpecialistFromObject?: (specialistId: string, objectId: string) => void;
}

// Predefined task presets for quick one-click filtering
const TASK_PRESETS = [
  { id: 'all', label: 'Все задачи и профили', icon: '🔍', query: '' },
  { id: 'heating', label: 'Отопление и Котлы', icon: '🔥', query: 'котел отопление viessmann baxi vaillant гвс тепло' },
  { id: 'electricity', label: 'Электрика и АВР', icon: '⚡', query: 'электрик щит авр ибп генератор кабель короткое замыкание' },
  { id: 'plumbing', label: 'Водоснабжение и Насосы', icon: '💧', query: 'насос grundfos wilo фильтр водоочистка обратный осмос протечка' },
  { id: 'landscape', label: 'Ландшафт, Газон и Полив', icon: '🌿', query: 'газон полив аэрация деревья обрезка вредители альпинарий' },
  { id: 'automation', label: 'Умный дом и КИПиА', icon: '🤖', query: 'автоматика knx modbus wirenboard датчики диспетчеризация' },
  { id: 'ventilation', label: 'Вентиляция и Климат', icon: '🌀', query: 'вентиляция кондиционер чиллер фанкойл фреон фильтр' },
  { id: 'pool', label: 'Бассейн, СПА и Сауна', icon: '🏊', query: 'бассейн спа реагенты фильтрация сауна паpогенератор озон' },
  { id: 'cctv', label: 'Видеонаблюдение и СКУД', icon: '📹', query: 'камера cctv домофон ворота автошлагбаум wifi оптика' },
  { id: 'construction', label: 'Общестроительные работы', icon: '🏗️', query: 'сварка фасад кровля металлоконструкции монолит реставрация' },
];

export const SpecialistSearchModal: React.FC<SpecialistSearchModalProps> = ({
  isOpen,
  onClose,
  users,
  reports,
  objects,
  currentUser,
  schedules = [],
  onAssignSpecialistToObject,
  onRemoveSpecialistFromObject
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreset, setActivePreset] = useState('all');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedObjectIdFilter, setSelectedObjectIdFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'reports_count' | 'name'>('relevance');

  // Active Specialist Card modal/detail view
  const [selectedSpec, setSelectedSpec] = useState<User | null>(null);
  const [activeCardTab, setActiveCardTab] = useState<'overview' | 'skills' | 'reviews' | 'objects' | 'task_request'>('overview');

  // Task request modal inside card
  const [requestTargetObject, setRequestTargetObject] = useState<string>('');
  const [requestTaskTitle, setRequestTaskTitle] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Extract all specialists from users list
  const specialists = useMemo(() => {
    return users.filter(u => u.role === 'specialist');
  }, [users]);

  // Extract unique companies list
  const companiesList = useMemo(() => {
    const list = new Set<string>();
    specialists.forEach(s => {
      if (s.company && s.company.trim()) {
        list.add(s.company.trim());
      }
    });
    return Array.from(list);
  }, [specialists]);

  // Calculate statistics for each specialist
  const specialistStats = useMemo(() => {
    const map = new Map<string, {
      allReports: CompletedChecklist[];
      ratedReports: CompletedChecklist[];
      avgRating: number | null;
      assignedObjectIds: string[];
    }>();

    specialists.forEach(spec => {
      const specReports = reports.filter(r => r.specialistUserId === spec.id);
      const ratedReports = specReports.filter(r => r.approvedByOwner && r.ownerRating !== undefined && r.ownerRating > 0);
      
      let avgRating: number | null = null;
      if (ratedReports.length > 0) {
        const sum = ratedReports.reduce((acc, r) => acc + (r.ownerRating || 0), 0);
        avgRating = Number((sum / ratedReports.length).toFixed(1));
      } else if (spec.rating && spec.rating > 0) {
        avgRating = spec.rating;
      }

      // Objects assigned to this spec
      const assignedObjectIds = objects
        .filter(o => o.allowedSpecialistIds?.includes(spec.id))
        .map(o => o.id);

      map.set(spec.id, {
        allReports: specReports,
        ratedReports,
        avgRating,
        assignedObjectIds
      });
    });

    return map;
  }, [specialists, reports, objects]);

  // Matching logic
  const filteredSpecialists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const preset = TASK_PRESETS.find(p => p.id === activePreset);
    const presetQuery = preset && preset.id !== 'all' ? preset.query.toLowerCase() : '';

    return specialists.map(spec => {
      const stats = specialistStats.get(spec.id);
      const avgRating = stats?.avgRating || 0;
      const reportsCount = stats?.allReports.length || 0;
      const assignedObjIds = stats?.assignedObjectIds || [];

      // Relevance score calculation
      let score = 100;
      const specText = `${spec.fullname} ${spec.company || ''} ${spec.keySkills || ''} ${spec.email} ${spec.phone || ''}`.toLowerCase();

      // Check text search query
      if (q) {
        const words = q.split(/\s+/).filter(w => w.length > 1);
        let matchCount = 0;
        words.forEach(word => {
          if (specText.includes(word)) {
            matchCount += 1;
          }
        });

        if (words.length > 0) {
          const matchRatio = matchCount / words.length;
          if (matchRatio === 0) {
            score = 0; // No match at all
          } else {
            score = Math.min(100, Math.round(50 + matchRatio * 50));
          }
        }
      }

      // Check preset category query
      if (presetQuery && score > 0) {
        const presetWords = presetQuery.split(/\s+/).filter(w => w.length > 2);
        let presetMatches = 0;
        presetWords.forEach(pw => {
          if (specText.includes(pw)) presetMatches += 1;
        });

        if (presetMatches === 0 && !q) {
          // If no direct text search, downgrade score for unmatched preset
          score = 30;
        } else if (presetMatches > 0) {
          score = Math.min(100, score + 20);
        }
      }

      // Filter by min rating
      if (minRatingFilter > 0 && avgRating < minRatingFilter) {
        score = 0;
      }

      // Filter by company
      if (selectedCompanyFilter !== 'all' && spec.company !== selectedCompanyFilter) {
        score = 0;
      }

      // Filter by assigned object
      if (selectedObjectIdFilter !== 'all' && !assignedObjIds.includes(selectedObjectIdFilter)) {
        score = 0;
      }

      return {
        spec,
        stats,
        score,
        avgRating,
        reportsCount
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (sortBy === 'relevance') return b.score - a.score;
      if (sortBy === 'rating') return (b.avgRating || 0) - (a.avgRating || 0);
      if (sortBy === 'reports_count') return b.reportsCount - a.reportsCount;
      if (sortBy === 'name') return a.spec.fullname.localeCompare(b.spec.fullname, 'ru');
      return 0;
    });
  }, [specialists, searchQuery, activePreset, minRatingFilter, selectedCompanyFilter, selectedObjectIdFilter, sortBy, specialistStats]);

  // Handle Preset Click
  const handlePresetClick = (preset: typeof TASK_PRESETS[0]) => {
    setActivePreset(preset.id);
    if (preset.id === 'all') {
      setSearchQuery('');
    }
  };

  // Open task request modal for specialist
  const handleOpenTaskRequest = (spec: User) => {
    setSelectedSpec(spec);
    setActiveCardTab('task_request');
    setRequestTargetObject(objects[0]?.id || '');
    setRequestTaskTitle('');
    setRequestNotes('');
    setRequestSuccess(false);
  };

  // Submit task request
  const handleSubmitTaskRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setActiveCardTab('overview');
    }, 2200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-5xl my-auto flex flex-col max-h-[92vh] overflow-hidden relative">
        
        {/* Header Modal Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-950 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
              <Search className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Подбор технических специалистов под задачу</h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Владелец & Семья
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Единая база сервисных инженеров, мастеров и служб с поиском по компетенциям, рейтингу и отзывам
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Закрыть подбор"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filtering Control Panel */}
        <div className="p-4 sm:p-5 bg-neutral-50 dark:bg-zinc-900/80 border-b border-neutral-200 dark:border-zinc-800 space-y-4 shrink-0 overflow-x-hidden">
          
          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-5 h-5 absolute left-3.5 text-zinc-400 pointer-events-none" />
            <input 
              type="text"
              placeholder="Опишите задачу или проблему (например: протекает котёл, подстричь газон, сантехника, КИПиА, замена фильтра)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activePreset !== 'all') setActivePreset('all');
              }}
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-black/50 border-2 border-neutral-200 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-500 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-zinc-400 outline-none transition shadow-sm font-medium"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Task Presets Badges */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <span>Быстрый выбор сферы задачи:</span>
              <span className="text-[10px] font-normal text-zinc-400">Нажмите на значок для мгновенной фильтрации</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
              {TASK_PRESETS.map(preset => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                      isActive 
                        ? 'bg-amber-500 text-neutral-950 border-amber-600 shadow-md scale-[1.02]' 
                        : 'bg-white dark:bg-zinc-800/80 text-neutral-700 dark:text-zinc-300 border-neutral-200 dark:border-zinc-700 hover:border-amber-500/50 hover:bg-neutral-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter & Sort Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1 text-xs">
            {/* Min Rating Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Рейтинг специалиста:
              </label>
              <select 
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value={0}>★ Любой рейтинг</option>
                <option value={4}>★ 4.0 и выше</option>
                <option value={4.5}>★ 4.5 и выше (Высокий)</option>
                <option value={5}>★ 5.0 (Идеально)</option>
              </select>
            </div>

            {/* Service Company Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Сервисная компания:
              </label>
              <select 
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="all">🏢 Все службы и фрилансеры</option>
                {companiesList.map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>

            {/* Object Attachment Filter */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Привязка к объекту:
              </label>
              <select 
                value={selectedObjectIdFilter}
                onChange={(e) => setSelectedObjectIdFilter(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="all">🏡 Все объекты недвижимости</option>
                {objects.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                Сортировка:
              </label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 rounded-xl bg-white dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 font-medium text-neutral-800 dark:text-neutral-200 outline-none"
              >
                <option value="relevance">🎯 По совпадению с задачей</option>
                <option value="rating">★ По рейтингу (высокий сначала)</option>
                <option value="reports_count">📋 По количеству работ</option>
                <option value="name">🔤 По алфавиту ФИО</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pb-2 border-b border-neutral-100 dark:border-zinc-800">
            <div>
              Найдено мастеров: <strong className="text-neutral-900 dark:text-white font-extrabold">{filteredSpecialists.length}</strong> из {specialists.length}
            </div>
            {searchQuery && (
              <span className="text-[11px] italic bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Поиск по запросу: "{searchQuery}"
              </span>
            )}
          </div>

          {/* Specialist Cards Grid */}
          {filteredSpecialists.length === 0 ? (
            <div className="p-10 text-center bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-zinc-800 space-y-3 my-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-neutral-800 dark:text-neutral-200">
                Специалистов по заданным критериям не найдено
              </h4>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Попробуйте уменьшить фильтры, выбрать другой пресет задачи или ввести более общее ключевое слово (например: «котёл», «газон», «электрика»).
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActivePreset('all');
                  setMinRatingFilter(0);
                  setSelectedCompanyFilter('all');
                  setSelectedObjectIdFilter('all');
                }}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
              >
                Сбросить все фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {filteredSpecialists.map(({ spec, stats, score, avgRating, reportsCount }) => {
                const assignedObjs = objects.filter(o => o.allowedSpecialistIds?.includes(spec.id));

                return (
                  <div
                    key={spec.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-500 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 relative group"
                  >
                    {/* Header profile info */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {spec.avatarUrl ? (
                            <img 
                              src={spec.avatarUrl} 
                              alt={spec.fullname} 
                              className="w-12 h-12 rounded-2xl object-cover border border-neutral-200 dark:border-zinc-700 shadow-sm shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/30 flex items-center justify-center shrink-0">
                              <HardHat className="w-6 h-6 text-amber-500" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-extrabold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {spec.fullname}
                              </h4>
                              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" title="Авторизованный специалист" />
                            </div>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              {spec.company || "Частный инженер / Служба эксплуатации"}
                            </p>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="shrink-0 text-right">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider block ${
                            score >= 80 
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                              : score >= 50 
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-neutral-100 dark:bg-zinc-800 text-zinc-500"
                          }`}>
                            {score >= 80 ? "🟢 95%+ Подходит" : score >= 50 ? "🟡 Подходит" : "⚪ Частично"}
                          </span>
                        </div>
                      </div>

                      {/* Rating & Works Count Badges */}
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/40 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{avgRating ? `${avgRating} / 5.0` : "Нет оценок"}</span>
                        </div>

                        <div className="text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Выполнено ТО: <strong>{reportsCount}</strong></span>
                        </div>

                        {assignedObjs.length > 0 && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Закреплен ({assignedObjs.length})</span>
                          </div>
                        )}
                      </div>

                      {/* Key Skills snippet */}
                      {spec.keySkills && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-black/30 border border-neutral-200/80 dark:border-zinc-800 text-xs space-y-1">
                          <span className="text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-500 tracking-wider block">
                            Компетенции и ключевые навыки:
                          </span>
                          <p className="text-neutral-800 dark:text-zinc-300 line-clamp-2 leading-relaxed text-[11px] font-medium">
                            {spec.keySkills}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpec(spec);
                          setActiveCardTab('overview');
                        }}
                        className="px-3.5 py-2 bg-neutral-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Карточка мастера</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {spec.phone && (
                          <a
                            href={`tel:${spec.phone}`}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl transition border border-emerald-200/50 dark:border-emerald-900/40"
                            title={`Позвонить ${spec.fullname}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenTaskRequest(spec)}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Отправить задачу</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DETAILED SPECIALIST CARD MODAL / DRAWER */}
        {selectedSpec && (() => {
          const stats = specialistStats.get(selectedSpec.id);
          const ratedReports = stats?.ratedReports || [];
          const avgRating = stats?.avgRating || 0;
          const assignedObjs = objects.filter(o => o.allowedSpecialistIds?.includes(selectedSpec.id));

          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn">
              <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-3xl my-auto flex flex-col max-h-[90vh] overflow-hidden relative">
                
                {/* Specialist Card Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white relative border-b border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setSelectedSpec(null)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8">
                    {selectedSpec.avatarUrl ? (
                      <img 
                        src={selectedSpec.avatarUrl} 
                        alt={selectedSpec.fullname} 
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-xl shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 flex items-center justify-center shrink-0 shadow-xl border-2 border-amber-400">
                        <HardHat className="w-9 h-9" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-amber-500 text-neutral-950 font-black text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">
                          Инженер ТО & Сервис
                        </span>
                        {avgRating ? (
                          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                            ★ {avgRating} / 5.0
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-xl font-extrabold">{selectedSpec.fullname}</h3>
                      <p className="text-xs text-zinc-300 font-medium">
                        {selectedSpec.company || "Служба эксплуатации и ТО"}
                      </p>
                    </div>
                  </div>

                  {/* Navigation Tabs inside Specialist Card */}
                  <div className="flex items-center gap-1 mt-6 border-b border-zinc-800 overflow-x-auto scrollbar-none text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveCardTab('overview')}
                      className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                        activeCardTab === 'overview' 
                          ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white border-t-2 border-amber-500' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Обзор и Контакты</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCardTab('skills')}
                      className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                        activeCardTab === 'skills' 
                          ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white border-t-2 border-amber-500' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Навыки и Квалификация</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCardTab('reviews')}
                      className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                        activeCardTab === 'reviews' 
                          ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white border-t-2 border-amber-500' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Отзывы и Оценки ({ratedReports.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCardTab('objects')}
                      className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                        activeCardTab === 'objects' 
                          ? 'bg-white dark:bg-zinc-900 text-neutral-900 dark:text-white border-t-2 border-amber-500' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Объекты ({assignedObjs.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveCardTab('task_request')}
                      className={`px-4 py-2.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 ${
                        activeCardTab === 'task_request' 
                          ? 'bg-amber-500 text-neutral-950 font-extrabold' 
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Отправить задачу</span>
                    </button>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-neutral-800 dark:text-zinc-200">
                  
                  {/* TAB 1: OVERVIEW & CONTACTS */}
                  {activeCardTab === 'overview' && (
                    <div className="space-y-5 animate-fadeIn">
                      
                      {/* Direct Contacts Grid */}
                      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200 dark:border-zinc-800 space-y-3">
                        <h4 className="font-extrabold text-xs uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-emerald-500" />
                          Контакты и доступ для связи
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {selectedSpec.phone && (
                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-400 block font-bold uppercase">Телефон</span>
                                <a href={`tel:${selectedSpec.phone}`} className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline">
                                  {selectedSpec.phone}
                                </a>
                              </div>
                              <a href={`tel:${selectedSpec.phone}`} className="p-2 bg-emerald-500 text-neutral-950 font-bold rounded-lg text-[11px] hover:bg-emerald-400 transition">
                                Позвонить
                              </a>
                            </div>
                          )}

                          <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">Электронная почта</span>
                              <a href={`mailto:${selectedSpec.email}`} className="font-bold text-sky-600 dark:text-sky-400 hover:underline truncate block max-w-[180px]">
                                {selectedSpec.email}
                              </a>
                            </div>
                            <a href={`mailto:${selectedSpec.email}`} className="p-2 bg-sky-500 text-white font-bold rounded-lg text-[11px] hover:bg-sky-600 transition">
                              E-mail
                            </a>
                          </div>

                          {selectedSpec.telegramChatId && (
                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-zinc-400 block font-bold uppercase">Telegram ID</span>
                                <span className="font-mono text-xs font-bold text-sky-500">{selectedSpec.telegramChatId}</span>
                              </div>
                              <span className="px-2 py-1 bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-bold text-[10px] rounded-lg">
                                Подключен
                              </span>
                            </div>
                          )}

                          <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-zinc-400 block font-bold uppercase">Статус доступа</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Активен в базе
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary skills snippet */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/30 border border-neutral-200 dark:border-zinc-800 space-y-2">
                        <h4 className="font-extrabold text-xs uppercase text-zinc-400 tracking-wider">
                          Краткая сводка квалификации
                        </h4>
                        <p className="text-xs text-neutral-800 dark:text-zinc-200 font-medium whitespace-pre-wrap leading-relaxed">
                          {selectedSpec.keySkills || "Специалист пока не заполнил развернутое описание компетенций."}
                        </p>
                      </div>

                      {/* Quick CTA */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveCardTab('task_request')}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Направить поручение / Задачу специалисту</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SKILLS & COMPETENCIES */}
                  {activeCardTab === 'skills' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200 dark:border-zinc-800 space-y-3">
                        <h4 className="font-extrabold text-xs uppercase text-amber-600 dark:text-amber-500 tracking-wider flex items-center gap-1.5">
                          <Wrench className="w-4 h-4" />
                          Профессиональный стек и допуски
                        </h4>

                        {selectedSpec.keySkills ? (
                          <div className="space-y-3">
                            <p className="text-xs text-neutral-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed font-medium bg-white dark:bg-zinc-800 p-4 rounded-xl border border-neutral-200 dark:border-zinc-700">
                              {selectedSpec.keySkills}
                            </p>

                            <div className="text-[11px] text-zinc-500 italic">
                              💡 Квалификация подтверждена при регистрации инженера в службе эксплуатации объекта.
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 italic">Навыки не указаны.</p>
                        )}
                      </div>

                      {/* Life Support Categories Matrix */}
                      <div className="space-y-2">
                        <h4 className="font-extrabold text-xs uppercase text-zinc-400 tracking-wider">
                          Обслуживаемые категории инженерных систем:
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {LIFE_SUPPORT_CATEGORIES.map(cat => {
                            const isMatch = selectedSpec.keySkills?.toLowerCase().includes(cat.shortName.toLowerCase()) || 
                              selectedSpec.keySkills?.toLowerCase().includes(cat.title.toLowerCase());

                            return (
                              <div 
                                key={cat.id} 
                                className={`p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
                                  isMatch 
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-bold" 
                                    : "bg-white dark:bg-zinc-800/40 border-neutral-200 dark:border-zinc-800 text-zinc-500 opacity-60"
                                }`}
                              >
                                <span className="text-base">{cat.icon}</span>
                                <div className="text-xs">
                                  <div className="font-bold">{cat.shortName}</div>
                                  <div className="text-[10px] font-normal opacity-80 truncate">{cat.title}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: REVIEWS & FEEDBACK */}
                  {activeCardTab === 'reviews' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                        <div>
                          <div className="text-lg font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                            <span>{avgRating ? `${avgRating} из 5.0` : "Нет оценок"}</span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            Средняя оценка на основе {ratedReports.length} проверенных Актов ТО от Собственника
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="px-3 py-1 bg-amber-500 text-neutral-950 font-black text-xs rounded-xl">
                            {ratedReports.length} отзывов
                          </span>
                        </div>
                      </div>

                      {/* Reviews List */}
                      {ratedReports.length === 0 ? (
                        <div className="p-8 text-center bg-neutral-50 dark:bg-zinc-800/30 border border-neutral-200 dark:border-zinc-800 rounded-2xl space-y-2">
                          <MessageSquare className="w-8 h-8 mx-auto text-zinc-400" />
                          <h5 className="font-bold text-xs text-neutral-700 dark:text-zinc-300">
                            Отзывов по выполненным работам пока нет
                          </h5>
                          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                            После утверждения первого Акта обслуживания собственник сможет поставить оценку и оставить отзыв о мастере.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {ratedReports.map(rep => {
                            const obj = objects.find(o => o.id === rep.objectId);
                            const sch = schedules.find(s => s.id === rep.scheduleItemId);

                            return (
                              <div key={rep.id} className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${star <= (rep.ownerRating || 0) ? "fill-amber-500 text-amber-500" : "text-zinc-300 dark:text-zinc-700"}`} 
                                      />
                                    ))}
                                    <span className="ml-1.5 font-bold text-xs text-neutral-900 dark:text-white">
                                      {rep.ownerRating} / 5
                                    </span>
                                  </div>

                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {new Date(rep.dateDone).toLocaleDateString('ru-RU')}
                                  </span>
                                </div>

                                <div className="text-xs text-zinc-500 font-medium flex items-center gap-2 flex-wrap">
                                  <span>🏠 {obj?.name || "Объект недвижимости"}</span>
                                  <span>•</span>
                                  <span>📋 {sch?.title || "Техническое обслуживание"}</span>
                                </div>

                                {rep.ownerRatingComment ? (
                                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-neutral-200/60 dark:border-zinc-800 italic">
                                    "{rep.ownerRatingComment}"
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-zinc-400 italic">Работа утверждена без текстового комментария.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: ASSIGNED OBJECTS */}
                  {activeCardTab === 'objects' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200 dark:border-zinc-800 space-y-2">
                        <h4 className="font-extrabold text-xs uppercase text-zinc-400 tracking-wider">
                          Объекты недвижимости в зоне ответственности
                        </h4>
                        <p className="text-xs text-zinc-500 font-medium">
                          Специалист имеет доступ к проведению ТО и просмотру регламентов по следующим объектам:
                        </p>
                      </div>

                      <div className="space-y-2">
                        {objects.map(obj => {
                          const isAssigned = obj.allowedSpecialistIds?.includes(selectedSpec.id);

                          return (
                            <div key={obj.id} className="p-3.5 rounded-xl bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <h5 className="font-bold text-xs text-neutral-900 dark:text-white flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-amber-500" />
                                  {obj.name}
                                </h5>
                                <p className="text-[11px] text-zinc-400 truncate max-w-sm">{obj.address}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isAssigned) {
                                    onRemoveSpecialistFromObject?.(selectedSpec.id, obj.id);
                                  } else {
                                    onAssignSpecialistToObject?.(selectedSpec.id, obj.id);
                                  }
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                                  isAssigned
                                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 hover:bg-rose-100 hover:text-rose-700"
                                    : "bg-neutral-100 dark:bg-zinc-700 text-neutral-700 dark:text-zinc-200 hover:bg-amber-500 hover:text-neutral-950"
                                }`}
                              >
                                {isAssigned ? "✓ Доступ разрешен (Отвязать)" : "+ Привязать объект"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SEND TASK REQUEST FORM */}
                  {activeCardTab === 'task_request' && (
                    <form onSubmit={handleSubmitTaskRequest} className="space-y-4 animate-fadeIn">
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                        <h4 className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Send className="w-4 h-4" />
                          Отправка поручения / Задачи мастеру
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          Сообщение будет мгновенно отправлено инженеру {selectedSpec.fullname} через системный Telegram/Email бот.
                        </p>
                      </div>

                      {requestSuccess && (
                        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>Поручение успешно отправлено мастеру! Уведомление доставлено.</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                            Объект недвижимости *
                          </label>
                          <select
                            required
                            value={requestTargetObject}
                            onChange={(e) => setRequestTargetObject(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold"
                          >
                            {objects.map(obj => (
                              <option key={obj.id} value={obj.id}>{obj.name} ({obj.address})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                            Тема задачи / Проблема *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Например: Проверить давление в котле / Сервис автополива"
                            value={requestTaskTitle}
                            onChange={(e) => setRequestTaskTitle(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider block">
                            Детальное описание и желаемая дата выезда
                          </label>
                          <textarea
                            rows={4}
                            placeholder="Опишите симптомы, желаемый день прибытия мастера, особенности проезда или код от ворот..."
                            value={requestNotes}
                            onChange={(e) => setRequestNotes(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-zinc-700 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Отправить поручение инженеру</span>
                      </button>
                    </form>
                  )}

                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};
