import React, { useState, useEffect, useRef } from 'react';
import { Wrench, CheckCircle2, Plus, Sparkles, Tag, Layers, ChevronDown, Search, X, Trash2 } from 'lucide-react';

export interface LifeSupportCategory {
  id: string;
  title: string;
  shortName: string;
  icon: string;
  tags: string[];
}

export const LIFE_SUPPORT_CATEGORIES: LifeSupportCategory[] = [
  {
    id: "electricity",
    title: "Электроснабжение и освещение",
    shortName: "Электрика",
    icon: "⚡",
    tags: ["Допуск IV группа по электробезопасности", "Сборка щитов АВР", "Наладка ИБП и дизель-генераторов", "Прокладка кабеля", "Проектирование освещения", "Поиск коротких замыканий"]
  },
  {
    id: "heating",
    title: "Отопление и котельное оборудование",
    shortName: "Отопление",
    icon: "🔥",
    tags: ["Котлы Viessmann / Baxi / Vaillant", "Обслуживание ИТП и гидрострелок", "Гидравлическая балансировка", "Тепловые насосы", "Чистка горелок", "Опрессовка систем"]
  },
  {
    id: "ventilation",
    title: "Вентиляция и кондиционирование",
    shortName: "Вентиляция",
    icon: "🌀",
    tags: ["Приточно-вытяжные установки Systemair / VTS", "Чистка чиллеров и фанкойлов", "Заправка фреоном R410 / R32", "Пусконаладка ВЕЗА", "Замена фильтров тонкой очистки"]
  },
  {
    id: "plumbing",
    title: "Водоснабжение, канализация и водоочистка",
    shortName: "Водоснабжение",
    icon: "💧",
    tags: ["Насосы Grundfos / Wilo", "Фильтры обезжелезивания и аэрации", "Установки обратного осмоса", "Сервис КНС и септиков", "Устранение сложных протечек"]
  },
  {
    id: "automation",
    title: "Автоматизация, Диспетчеризация и Умный дом",
    shortName: "Автоматизация",
    icon: "🤖",
    tags: ["Контроллеры Danfoss / Schneider / Siemens", "Протоколы KNX / Modbus / BACnet", "Щиты автоматики КИПиА", "Настройка Wiren Board", "Удаленный диспетчерский мониторинг"]
  },
  {
    id: "irrigation",
    title: "Автополив и гидросооружения",
    shortName: "Автополив",
    icon: "🌱",
    tags: ["Контроллеры Hunter / Rain Bird", "Продувка и консервация автополива", "Ремонт электромагнитных клапанов", "Капельный полив газонов"]
  },
  {
    id: "pool",
    title: "Бассейны, Сауны и СПА-комплексы",
    shortName: "Бассейны и СПА",
    icon: "🏊",
    tags: ["Станции дозирования реагентов", "Промывка кварцевых фильтров", "Дезинфекция и озонирование", "Ремонт парогенераторов EOS / Harvia", "Замена УФ-ламп"]
  },
  {
    id: "landscape",
    title: "Ландшафтный дизайн и уход за растениями",
    shortName: "Ландшафт",
    icon: "🌿",
    tags: ["Аэрация и скарификация газона", "Сезонная обрезка деревьев", "Обработка от вредителей", "Уход за альпинариями", "Подкормка крупномеров"]
  },
  {
    id: "construction",
    title: "Строительные и монтажные работы",
    shortName: "Спец. монтаж",
    icon: "🏗️",
    tags: ["Монтаж металлоконструкций", "Аргоновая и электродуговая сварка", "Бетонирование и монолит", "Алмазное бурение стенового бетона", "Монтаж перекрытий"]
  },
  {
    id: "restoration",
    title: "Реставрация, отделка и интерьер",
    shortName: "Реставрация",
    icon: "🏛️",
    tags: ["Реставрация массива дерева и паркета", "Декоративная штукатурка", "Восстановление гипса и лепнины", "Шлифовка и полировка мрамора", "Восстановление резного декора"]
  },
  {
    id: "roofing",
    title: "Кровельные и фасадные работы",
    shortName: "Кровля и фасад",
    icon: "🏠",
    tags: ["Ремонт фальцевой кровли", "Герметизация водосточных систем", "Ремонт штукатурных фасадов", "Обслуживание снегозадержателей", "Промышленный альпинизм"]
  },
  {
    id: "low_voltage",
    title: "Слаботочные системы и Видеонаблюдение",
    shortName: "Слаботочка и СКУД",
    icon: "📹",
    tags: ["Монтаж IP-камер Hikvision / Dahua", "Настройка СКУД и автоматики ворот", "Прокладка ВОЛС / СКС", "Настройка бесшовного Wi-Fi", "IP-домофония"]
  },
  {
    id: "fire_gas",
    title: "Газовое оборудование и Пожаротушение",
    shortName: "Газ и Пожбезопасность",
    icon: "🔥",
    tags: ["Обслуживание газоанализаторов", "Сигнализаторы загазованности САКЗ", "Обслуживание АУПТ и ОПС", "Акты ВДГО / ВКГО"]
  }
];

export function parseSkillsData(rawText: string) {
  if (!rawText) return { selectedCategories: [] as string[], details: "" };

  let selectedCategories: string[] = [];
  let details = rawText;

  // Search for "Разделы: ..." or "Системы: ..."
  const catMatch = rawText.match(/(?:Разделы|Системы|Области):\s*([^\n]+)/i);
  if (catMatch) {
    const catsStr = catMatch[1];
    selectedCategories = catsStr
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(Boolean);

    // Extract skills details if structured
    const detailsMatch = rawText.match(/(?:Навыки|Детали|Компетенции|Перечень навыки):\s*([\s\S]+)/i);
    if (detailsMatch) {
      details = detailsMatch[1].trim();
    } else {
      // Remove the categories line from the text
      details = rawText.replace(catMatch[0], "").trim();
    }
  } else {
    // Attempt auto-matching categories if user entered plain text
    LIFE_SUPPORT_CATEGORIES.forEach(cat => {
      if (
        rawText.toLowerCase().includes(cat.title.toLowerCase()) ||
        rawText.toLowerCase().includes(cat.shortName.toLowerCase())
      ) {
        if (!selectedCategories.includes(cat.title)) {
          selectedCategories.push(cat.title);
        }
      }
    });
  }

  return { selectedCategories, details };
}

export function formatSkillsData(selectedCategories: string[], details: string) {
  const cleanDetails = details.trim();
  if (selectedCategories.length === 0 && !cleanDetails) return "";
  if (selectedCategories.length === 0) return cleanDetails;

  const catsLine = `Разделы: ${selectedCategories.join(", ")}`;
  if (!cleanDetails) return catsLine;
  return `${catsLine}\nНавыки: ${cleanDetails}`;
}

interface SpecialistSkillsEditorProps {
  initialValue: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  isSaving?: boolean;
  inputStyle?: string;
}

export const SpecialistSkillsEditor: React.FC<SpecialistSkillsEditorProps> = ({
  initialValue,
  onChange,
  onSave,
  isSaving = false,
  inputStyle = ""
}) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [detailsText, setDetailsText] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>("");
  const [skillTagSearchQuery, setSkillTagSearchQuery] = useState<string>("");
  const [customCategoryInput, setCustomCategoryInput] = useState<string>("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseSkillsData(initialValue || "");
    setSelectedCategories(parsed.selectedCategories);
    setDetailsText(parsed.details);
  }, [initialValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateParent = (cats: string[], details: string) => {
    const formatted = formatSkillsData(cats, details);
    if (onChange) {
      onChange(formatted);
    }
  };

  const toggleCategory = (catTitle: string) => {
    let nextCats: string[];
    if (selectedCategories.includes(catTitle)) {
      nextCats = selectedCategories.filter(c => c !== catTitle);
    } else {
      nextCats = [...selectedCategories, catTitle];
    }
    setSelectedCategories(nextCats);
    updateParent(nextCats, detailsText);
  };

  const handleAddCustomCategory = () => {
    if (!customCategoryInput.trim()) return;
    const trimmed = customCategoryInput.trim();
    if (!selectedCategories.includes(trimmed)) {
      const nextCats = [...selectedCategories, trimmed];
      setSelectedCategories(nextCats);
      updateParent(nextCats, detailsText);
    }
    setCustomCategoryInput("");
  };

  const removeCategory = (catTitle: string) => {
    const nextCats = selectedCategories.filter(c => c !== catTitle);
    setSelectedCategories(nextCats);
    updateParent(nextCats, detailsText);
  };

  const addSkillTag = (tagText: string) => {
    let updated = detailsText.trim();
    if (updated.includes(tagText)) return; // Avoid duplicates

    if (updated) {
      updated = updated + ", " + tagText;
    } else {
      updated = tagText;
    }
    setDetailsText(updated);
    updateParent(selectedCategories, updated);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDetailsText(val);
    updateParent(selectedCategories, val);
  };

  const handleSaveClick = async () => {
    const formatted = formatSkillsData(selectedCategories, detailsText);
    if (onSave) {
      await onSave(formatted);
    }
  };

  // Filter categories by search
  const filteredCategories = LIFE_SUPPORT_CATEGORIES.filter(cat =>
    cat.title.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
    cat.shortName.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Available skills tags from selected categories
  const availableSkillTags = LIFE_SUPPORT_CATEGORIES
    .filter(cat => selectedCategories.includes(cat.title) || selectedCategories.includes(cat.shortName))
    .flatMap(cat => cat.tags)
    .filter((tag, idx, self) => self.indexOf(tag) === idx)
    .filter(tag => tag.toLowerCase().includes(skillTagSearchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* SECTION 1: DROPDOWN FOR SELECTING LIFE SUPPORT SYSTEM CATEGORIES */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>1. Разделы систем жизнеобеспечения (из выпадающего списка):</span>
          </label>
          <span className="text-[10px] text-zinc-400 font-medium">
            Выбрано разделов: <strong className="text-amber-600 dark:text-amber-400">{selectedCategories.length}</strong>
          </span>
        </div>

        {/* Selected Categories Badge List */}
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
            {selectedCategories.map((catTitle, idx) => {
              const catObj = LIFE_SUPPORT_CATEGORIES.find(c => c.title === catTitle || c.shortName === catTitle);
              return (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm border border-amber-500/30"
                >
                  <span>{catObj?.icon || "⚙️"}</span>
                  <span>{catTitle}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(catTitle)}
                    className="p-0.5 hover:bg-amber-600/30 rounded text-amber-700 dark:text-amber-300 cursor-pointer"
                    title="Удалить раздел"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => { setSelectedCategories([]); updateParent([], detailsText); }}
              className="text-[10px] text-zinc-400 hover:text-rose-500 font-bold px-2 py-1 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Очистить все</span>
            </button>
          </div>
        )}

        {/* Dropdown Selector Component */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-amber-500 focus:outline-none flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>
                {selectedCategories.length === 0
                  ? "— Нажмите, чтобы выбрать разделы из выпадающего списка —"
                  : `Выбрано разделов: ${selectedCategories.length}. Нажмите для выбора дополнительных...`}
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu Panel */}
          {isDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl space-y-2 animate-fadeIn max-h-80 overflow-hidden flex flex-col">
              {/* Category Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Быстрый поиск среди разделов (электрика, котельные, вентиляция...)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800 border-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* List of categories */}
              <div className="overflow-y-auto max-h-52 space-y-1 pr-1">
                {filteredCategories.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-400">
                    Раздел не найден по запросу «{categorySearchQuery}». Вы можете добавить его вручную ниже.
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.title) || selectedCategories.includes(cat.shortName);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.title)}
                        className={`w-full p-2 rounded-xl text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold border border-amber-500/30"
                            : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          <span className="font-semibold">{cat.title}</span>
                        </span>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-zinc-400 opacity-60 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Add Custom Category Option */}
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex gap-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  placeholder="Добавить свой раздел..."
                  className="flex-1 p-1.5 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800 border-none focus:ring-1 focus:ring-amber-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  disabled={!customCategoryInput.trim()}
                  className="py-1 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ➕ Добавить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: SKILL TAG SUGGESTIONS WITH SEARCH & FILTER */}
      {selectedCategories.length > 0 && (
        <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl border border-amber-500/15 space-y-2 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Быстрый подбор навыков и допусков для выбранных разделов:
            </span>
            <div className="relative max-w-xs">
              <Search className="w-3 h-3 absolute left-2 top-2 text-zinc-400" />
              <input
                type="text"
                value={skillTagSearchQuery}
                onChange={(e) => setSkillTagSearchQuery(e.target.value)}
                placeholder="Фильтр навыков..."
                className="w-full pl-6 pr-2 py-1 text-[10px] rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {availableSkillTags.length === 0 ? (
              <p className="text-[11px] text-zinc-400 italic">Навыки не найдены по запросу «{skillTagSearchQuery}»</p>
            ) : (
              availableSkillTags.map((tag, idx) => {
                const isAlreadyAdded = detailsText.includes(tag);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => addSkillTag(tag)}
                    disabled={isAlreadyAdded}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isAlreadyAdded
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default opacity-80"
                        : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 shadow-sm"
                    }`}
                  >
                    <Tag className="w-3 h-3 text-amber-500 opacity-70" />
                    <span>{tag}</span>
                    {isAlreadyAdded && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: DIRECT SKILL ENUMERATION & DETAILS TEXTAREA */}
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>2. Перечень конкретных навыков, оборудования и марок:</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Подробное перечисление компетенций</span>
        </label>

        <textarea
          value={detailsText}
          onChange={handleTextChange}
          placeholder="Перечислите ваши навыки, допуски к работам, обслуживаемые марки котлов, насосов, контроллеров и систем (например: Наладка автоматики ИТП Danfoss, ремонт чиллеров Carrier, допуск IV группа по электробезопасности, аттестация по ВДГО...)"
          className={`w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-black/50 focus:ring-2 focus:ring-amber-500/50 transition-colors leading-relaxed ${inputStyle}`}
          rows={4}
        />
      </div>

      {/* SECTION 4: PREVIEW OF HOW IT LOOKS TO ADMINS & OWNERS */}
      {(selectedCategories.length > 0 || detailsText.trim()) && (
        <div className="p-3 bg-neutral-100/60 dark:bg-zinc-800/40 rounded-xl border border-neutral-200 dark:border-zinc-700/60 space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">
            👁️ Превью отображения карточки специалиста для Заказчика и Администратора:
          </span>

          <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs space-y-1">
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center mb-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-400 mr-1">
                  Обслуживаемые системы:
                </span>
                {selectedCategories.map((cat, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold text-[10px]">
                    {cat}
                  </span>
                ))}
              </div>
            )}
            {detailsText.trim() && (
              <div className="text-slate-800 dark:text-zinc-200 text-[11px] whitespace-pre-wrap leading-snug">
                <strong>Перечень навыков:</strong> {detailsText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVE BUTTON IF PROVIDED */}
      {onSave && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
          >
            <Wrench className="w-4 h-4" />
            <span>{isSaving ? "Сохранение..." : "💾 Сохранить ключевые навыки"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
