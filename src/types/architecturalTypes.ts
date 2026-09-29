// Architectural & Floor Planning Types for Building 3D and Interior Modeling

export type WallMaterialType =
  | "brick_red"        // Красный облицовочный кирпич
  | "brick_white"      // Белый силикатный кирпич
  | "wood_timber"      // Профилированный брус
  | "wood_log"         // Оцилиндрованное бревно
  | "stucco_white"     // Белая штукатурка (короед/гладкая)
  | "stucco_warm"      // Теплая бежевая штукатурка
  | "concrete_blocks"  // Газобетонные блоки / монолит
  | "siding_grey"      // Фасадный сайдинг серый
  | "stone_slate"      // Натуральный камень / сланец
  | "composite_dark";  // Темные композитные панели (хай-тек)

export interface WallMaterialConfig {
  id: WallMaterialType;
  label: string;
  emoji: string;
  defaultColor: string;
  roughness: number;
  metalness: number;
  desc: string;
}

export const WALL_MATERIALS: WallMaterialConfig[] = [
  { id: "brick_red", label: "Красный кирпич", emoji: "🧱", defaultColor: "#9a3412", roughness: 0.85, metalness: 0.05, desc: "Классический керамический облицовочный кирпич" },
  { id: "brick_white", label: "Белый силикат / клинкер", emoji: "🏢", defaultColor: "#e2e8f0", roughness: 0.8, metalness: 0.05, desc: "Светлый фасадный кирпич или клинкерная плитка" },
  { id: "wood_timber", label: "Профилированный брус", emoji: "🪵", defaultColor: "#b45309", roughness: 0.75, metalness: 0.05, desc: "Натуральный клееный или профилированный брус" },
  { id: "wood_log", label: "Оцилиндрованное бревно", emoji: "🌲", defaultColor: "#a16207", roughness: 0.85, metalness: 0.0, desc: "Традиционный деревянный сруб" },
  { id: "stucco_white", label: "Штукатурка белая", emoji: "🏛️", defaultColor: "#f8fafc", roughness: 0.9, metalness: 0.0, desc: "Скандинавская фасадная штукатурка" },
  { id: "stucco_warm", label: "Штукатурка теплая", emoji: "🏺", defaultColor: "#fef3c7", roughness: 0.9, metalness: 0.0, desc: "Теплый песчано-бежевый оттенок" },
  { id: "concrete_blocks", label: "Газобетон / Блоки", emoji: "🪨", defaultColor: "#94a3b8", roughness: 0.88, metalness: 0.05, desc: "Современные стеновые блоки" },
  { id: "siding_grey", label: "Сайдинг графитовый", emoji: "🩶", defaultColor: "#475569", roughness: 0.6, metalness: 0.15, desc: "Металлический или виниловый сайдинг" },
  { id: "stone_slate", label: "Камень / Сланец", emoji: "⛰️", defaultColor: "#334155", roughness: 0.9, metalness: 0.1, desc: "Облицовка натуральным камнем" },
  { id: "composite_dark", label: "Композитные панели", emoji: "⬛", defaultColor: "#1e293b", roughness: 0.4, metalness: 0.35, desc: "Вентилируемый фасад в стиле хай-тек" }
];

export type RoofType =
  | "gable"    // Двускатная
  | "hipped"   // Четырехскатная (вальмовая)
  | "shed"     // Односкатная
  | "flat"     // Плоская с парапетом
  | "mansard"  // Мансардная (ломаная)
  | "pyramid"; // Шатровая (4-скатная пирамидальная)

export interface RoofTypeConfig {
  id: RoofType;
  label: string;
  emoji: string;
  desc: string;
}

export const ROOF_TYPES: RoofTypeConfig[] = [
  { id: "gable", label: "Двускатная", emoji: "🏠", desc: "Классическая двускатная кровля с фронтонами" },
  { id: "hipped", label: "Вальмовая (4-скатная)", emoji: "🏰", desc: "Четырехскатная кровля, стойкая к ветровым нагрузкам" },
  { id: "shed", label: "Односкатная", emoji: "📐", desc: "Современная кровля с уклоном в одну сторону" },
  { id: "flat", label: "Плоская с парапетом", emoji: "🏢", desc: "Эксплуатируемая или мембранная плоская крыша" },
  { id: "mansard", label: "Мансардная (ломаная)", emoji: "🏘️", desc: "Ломаная кровля с увеличенным подкровельным объемом" },
  { id: "pyramid", label: "Шатровая", emoji: "🎪", desc: "Пирамидальная кровля для квадратных строений" }
];

export type RoofMaterialType =
  | "metal_tile"      // Металлочерепица / Профлист
  | "shingle_soft"    // Гибкая черепица (битумная)
  | "clay_tile"       // Натуральная глиняная черепица
  | "standing_seam"   // Фальцевая кровля
  | "membrane_flat"   // ПВХ мембрана / рулонная
  | "slate_wood";     // Деревянный гонт / шифер

export interface RoofMaterialConfig {
  id: RoofMaterialType;
  label: string;
  emoji: string;
  defaultColor: string;
  roughness: number;
  metalness: number;
  desc: string;
}

export const ROOF_MATERIALS: RoofMaterialConfig[] = [
  { id: "metal_tile", label: "Металлочерепица", emoji: "⚙️", defaultColor: "#7f1d1d", roughness: 0.45, metalness: 0.4, desc: "Профилированная сталь с полимерным покрытием" },
  { id: "shingle_soft", label: "Мягкая черепица", emoji: "⬛", defaultColor: "#1e293b", roughness: 0.9, metalness: 0.05, desc: "Битумная многослойная гибкая черепица" },
  { id: "clay_tile", label: "Керамическая черепица", emoji: "🧱", defaultColor: "#9a3412", roughness: 0.75, metalness: 0.05, desc: "Традиционная натуральная обожженная глина" },
  { id: "standing_seam", label: "Фальцевая кровля", emoji: "🛡️", defaultColor: "#334155", roughness: 0.35, metalness: 0.5, desc: "Герметичные металлические картины с фальцем" },
  { id: "membrane_flat", label: "ПВХ Мембрана", emoji: "📜", defaultColor: "#64748b", roughness: 0.8, metalness: 0.1, desc: "Рулонная гидроизоляция для плоских кровель" },
  { id: "slate_wood", label: "Гонт / Шифер", emoji: "🪵", defaultColor: "#451a03", roughness: 0.9, metalness: 0.0, desc: "Фактурная дранка или композитный шифер" }
];

export type FacadeSide = "front" | "back" | "left" | "right";

export type OpeningType =
  | "window_single"     // Одностворчатое окно (0.9x1.4м)
  | "window_double"     // Двустворчатое окно (1.4x1.4м)
  | "window_triple"     // Панорамное трехстворчатое (2.2x1.6м)
  | "window_small"      // Малое окно / фрамуга (0.6x0.6м)
  | "door_single"       // Входная дверь (0.9x2.1м)
  | "door_glass"        // Стеклянная террасная (1.8x2.1м)
  | "door_garage";      // Секционные гаражные ворота (2.8x2.2м)

export interface OpeningPreset {
  type: OpeningType;
  label: string;
  emoji: string;
  defaultW: number;
  defaultH: number;
  defaultElevation: number; // elevation from floor level
  desc: string;
}

export const OPENING_PRESETS: OpeningPreset[] = [
  { type: "window_single", label: "Окно 1-створчатое", emoji: "🪟", defaultW: 0.9, defaultH: 1.4, defaultElevation: 0.9, desc: "Стандартное узкое окно с подоконником" },
  { type: "window_double", label: "Окно 2-створчатое", emoji: "🪟", defaultW: 1.4, defaultH: 1.4, defaultElevation: 0.9, desc: "Классическое двухстворчатое окно" },
  { type: "window_triple", label: "Панорамное окно 3-ств.", emoji: "🖼️", defaultW: 2.2, defaultH: 1.8, defaultElevation: 0.4, desc: "Широкое витражное окно в пол" },
  { type: "window_small", label: "Фрамуга / Санузел", emoji: "▫️", defaultW: 0.6, defaultH: 0.6, defaultElevation: 1.5, desc: "Небольшое вентиляционное окно" },
  { type: "door_single", label: "Входная дверь", emoji: "🚪", defaultW: 0.95, defaultH: 2.1, defaultElevation: 0.0, desc: "Металлическая утепленная сейф-дверь" },
  { type: "door_glass", label: "Террасная стеклянная", emoji: "🪟🚪", defaultW: 1.8, defaultH: 2.1, defaultElevation: 0.0, desc: "Раздвижной стеклянный портал" },
  { type: "door_garage", label: "Ворота гаражные", emoji: "🚗🚪", defaultW: 2.8, defaultH: 2.2, defaultElevation: 0.0, desc: "Подъемно-секционные автоматические ворота" }
];

export interface FacadeOpening {
  id: string;
  type: OpeningType;
  facadeSide: FacadeSide; // front (+Z), back (-Z), left (-X), right (+X)
  offsetMeters: number;   // смещение от левого края фасада
  elevationMeters: number;// высота от основания (подоконник / порог)
  widthMeters: number;    // ширина проема
  heightMeters: number;   // высота проема
  floorLevel?: number;    // этаж 1..3
}

export interface Building3DStyle {
  wallMaterial?: WallMaterialType;
  wallColor?: string;
  roofType?: RoofType;
  roofMaterial?: RoofMaterialType;
  roofColor?: string;
  roofHeightMeters?: number;
  plinthHeightMeters?: number;
  plinthColor?: string;
  windowFrameColor?: string;
  doorColor?: string;
  openings?: FacadeOpening[];
  numberOfFloors?: number;
  floorHeightMeters?: number;
}

// -------------------------------------------------------------
// FLOOR PLAN & INTERIOR SPACE MODELING
// -------------------------------------------------------------

export type RoomType =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "kitchen_living"
  | "bathroom"
  | "toilet"
  | "boiler_room"
  | "hallway"
  | "closet"
  | "office"
  | "nursery"
  | "terrace"
  | "garage"
  | "other";

export interface RoomPreset {
  type: RoomType;
  label: string;
  emoji: string;
  defaultW: number;
  defaultH: number;
  color: string;
}

export const ROOM_PRESETS: RoomPreset[] = [
  { type: "living_room", label: "Гостиная", emoji: "🛋️", defaultW: 4.5, defaultH: 4.0, color: "#fef3c7" },
  { type: "kitchen_living", label: "Кухня-гостиная", emoji: "🍽️", defaultW: 5.5, defaultH: 4.0, color: "#fed7aa" },
  { type: "bedroom", label: "Спальня", emoji: "🛏️", defaultW: 3.5, defaultH: 3.5, color: "#e0e7ff" },
  { type: "kitchen", label: "Кухня", emoji: "🍳", defaultW: 3.2, defaultH: 3.0, color: "#fef08a" },
  { type: "bathroom", label: "Санузел / Ванная", emoji: "🛁", defaultW: 2.4, defaultH: 2.2, color: "#bae6fd" },
  { type: "toilet", label: "Туалет гостевой", emoji: "🚽", defaultW: 1.2, defaultH: 1.6, color: "#cffafe" },
  { type: "boiler_room", label: "Котельная / Техпомещение", emoji: "🔥", defaultW: 2.2, defaultH: 2.4, color: "#fecdd3" },
  { type: "hallway", label: "Прихожая / Холл", emoji: "🚪", defaultW: 2.5, defaultH: 2.2, color: "#f3e8ff" },
  { type: "closet", label: "Гардеробная", emoji: "👔", defaultW: 2.0, defaultH: 1.8, color: "#fce7f3" },
  { type: "office", label: "Кабинет", emoji: "💻", defaultW: 3.0, defaultH: 3.0, color: "#dbeafe" },
  { type: "nursery", label: "Детская", emoji: "🧸", defaultW: 3.2, defaultH: 3.5, color: "#fef9c3" },
  { type: "terrace", label: "Терраса / Крыльцо", emoji: "🪴", defaultW: 4.0, defaultH: 2.5, color: "#dcfce7" },
  { type: "garage", label: "Гараж", emoji: "🚗", defaultW: 4.0, defaultH: 6.0, color: "#e2e8f0" },
  { type: "other", label: "Свободное помещение", emoji: "📦", defaultW: 3.0, defaultH: 3.0, color: "#f1f5f9" }
];

export interface PlanRoom {
  id: string;
  name: string;
  type: RoomType;
  xMeters: number; // offset from building bottom-left corner
  yMeters: number;
  wMeters: number;
  hMeters: number;
  floorLevel: number; // 1, 2, 3
  color?: string;
}

export type FloorElementCategory =
  | "electric"     // Электрика (розетки, выключатели, щит)
  | "plumbing"     // Водоснабжение и канализация
  | "hvac"         // Климат, вентиляция и кондиционеры
  | "heating"      // Отопление (радиаторы, котел)
  | "furniture"    // Мебель и сантехнические приборы
  | "interior_door"; // Внутренние двери и проемы

export type FloorElementType =
  // Электрика
  | "socket_single"
  | "socket_double"
  | "socket_wet"
  | "switch_light"
  | "light_ceiling"
  | "electric_panel"
  // Водоснабжение и канализация
  | "water_cold"
  | "water_hot"
  | "drain_sewer"
  | "water_heater"
  | "water_filter"
  // Климат и вентиляция
  | "ac_indoor"
  | "ac_outdoor"
  | "vent_hood"
  | "vent_valve"
  | "vent_recuperator"
  // Отопление
  | "radiator"
  | "heating_boiler"
  | "floor_heating_manifold"
  // Мебель и сантехника
  | "bed_double"
  | "bed_single"
  | "sofa"
  | "dining_table"
  | "desk"
  | "wardrobe"
  | "kitchen_counter"
  | "fridge"
  | "stove"
  | "sink_kitchen"
  | "washbasin"
  | "bathtub"
  | "shower"
  | "toilet"
  | "washing_machine"
  // Внутренние проемы
  | "door_interior"
  | "door_sliding";

export interface ElementCatalogItem {
  type: FloorElementType;
  category: FloorElementCategory;
  label: string;
  emoji: string;
  defaultW: number; // in meters
  defaultH: number; // in meters
  color: string;
  desc: string;
}

export const ELEMENT_CATALOG: ElementCatalogItem[] = [
  // 🔌 Электрика
  { type: "socket_single", category: "electric", label: "Розетка 220В", emoji: "🔌", defaultW: 0.3, defaultH: 0.3, color: "#f59e0b", desc: "Одинарная силовая розетка 16А" },
  { type: "socket_double", category: "electric", label: "Розетка 2х220В", emoji: "⚡", defaultW: 0.5, defaultH: 0.3, color: "#f59e0b", desc: "Двойной розеточный блок 16А" },
  { type: "socket_wet", category: "electric", label: "Розетка влагозащитная IP44", emoji: "💧🔌", defaultW: 0.35, defaultH: 0.35, color: "#0ea5e9", desc: "Влагозащищенная розетка с крышкой для с/у и кухни" },
  { type: "switch_light", category: "electric", label: "Выключатель света", emoji: "🔘", defaultW: 0.3, defaultH: 0.3, color: "#6366f1", desc: "Одно- или двухклавишный выключатель" },
  { type: "light_ceiling", category: "electric", label: "Светильник / Люстра", emoji: "💡", defaultW: 0.5, defaultH: 0.5, color: "#eab308", desc: "Точка потолочного освещения" },
  { type: "electric_panel", category: "electric", label: "Главный электрощит (ВРУ)", emoji: "⚡📦", defaultW: 0.6, defaultH: 0.3, color: "#dc2626", desc: "Распределительный щит с автоматами и УЗО" },

  // 💧 Водоснабжение и канализация
  { type: "water_cold", category: "plumbing", label: "Точка ХВС (Холодная вода)", emoji: "🔵", defaultW: 0.3, defaultH: 0.3, color: "#0284c7", desc: "Водорозетка холодной воды 1/2\"" },
  { type: "water_hot", category: "plumbing", label: "Точка ГВС (Горячая вода)", emoji: "🔴", defaultW: 0.3, defaultH: 0.3, color: "#ef4444", desc: "Водорозетка горячей воды 1/2\"" },
  { type: "drain_sewer", category: "plumbing", label: "Канализационный стояк / слив", emoji: "🕳️", defaultW: 0.4, defaultH: 0.4, color: "#475569", desc: "Точка подключения канализации (50/110 мм)" },
  { type: "water_heater", category: "plumbing", label: "Бойлер / Водонагреватель", emoji: "♨️", defaultW: 0.6, defaultH: 0.5, color: "#0284c7", desc: "Накопительный или проточный водонагреватель" },
  { type: "water_filter", category: "plumbing", label: "Фильтр водоочистки", emoji: "🚰", defaultW: 0.5, defaultH: 0.35, color: "#06b6d4", desc: "Комплексная система очистки и умягчения воды" },

  // ❄️ Климат и вентиляция
  { type: "ac_indoor", category: "hvac", label: "Кондиционер (внутренний блок)", emoji: "❄️", defaultW: 0.9, defaultH: 0.3, color: "#06b6d4", desc: "Настенная сплит-система кондиционирования" },
  { type: "ac_outdoor", category: "hvac", label: "Кондиционер (наружный блок)", emoji: "💨", defaultW: 0.8, defaultH: 0.4, color: "#64748b", desc: "Внешний компрессорный блок на фасаде" },
  { type: "vent_hood", category: "hvac", label: "Вентканал / Вытяжка", emoji: "🌪️", defaultW: 0.5, defaultH: 0.4, color: "#10b981", desc: "Принудительная вытяжная вентиляция" },
  { type: "vent_valve", category: "hvac", label: "Приточный клапан (КИВ / бризер)", emoji: "🌬️", defaultW: 0.4, defaultH: 0.3, color: "#14b8a6", desc: "Стеновое приточное вентиляционное устройство" },
  { type: "vent_recuperator", category: "hvac", label: "Приточно-вытяжная ПВУ / рекуператор", emoji: "🔄", defaultW: 0.9, defaultH: 0.6, color: "#0d9488", desc: "Вентиляционная установка с рекуперацией тепла" },

  // 🔥 Отопление
  { type: "radiator", category: "heating", label: "Радиатор отопления", emoji: "🔥", defaultW: 1.0, defaultH: 0.25, color: "#ea580c", desc: "Секционный или панельный радиатор под окно" },
  { type: "heating_boiler", category: "heating", label: "Котел отопления (газ/электро)", emoji: "🏭", defaultW: 0.6, defaultH: 0.5, color: "#c2410c", desc: "Основной отопительный котел" },
  { type: "floor_heating_manifold", category: "heating", label: "Коллектор теплого пола", emoji: "🔀", defaultW: 0.7, defaultH: 0.3, color: "#f97316", desc: "Распределительная гребенка водяного теплого пола" },

  // 🛋️ Мебель и сантехника
  { type: "bed_double", category: "furniture", label: "Двуспальная кровать", emoji: "🛏️", defaultW: 1.8, defaultH: 2.1, color: "#818cf8", desc: "Кровать 180×200 см" },
  { type: "bed_single", category: "furniture", label: "Односпальная кровать", emoji: "🛏️", defaultW: 1.0, defaultH: 2.0, color: "#a5b4fc", desc: "Кровать 90×200 см" },
  { type: "sofa", category: "furniture", label: "Диван", emoji: "🛋️", defaultW: 2.2, defaultH: 0.95, color: "#38bdf8", desc: "Прямой мягкий диван" },
  { type: "dining_table", category: "furniture", label: "Обеденный стол", emoji: "🍽️", defaultW: 1.5, defaultH: 0.9, color: "#f59e0b", desc: "Стол со стульями" },
  { type: "desk", category: "furniture", label: "Рабочий стол", emoji: "🖥️", defaultW: 1.3, defaultH: 0.7, color: "#64748b", desc: "Письменный/компьютерный стол" },
  { type: "wardrobe", category: "furniture", label: "Шкаф-купе", emoji: "🚪", defaultW: 1.8, defaultH: 0.6, color: "#94a3b8", desc: "Вместительный шкаф для одежды" },
  { type: "kitchen_counter", category: "furniture", label: "Кухонный гарнитур (модуль)", emoji: "🍳", defaultW: 2.4, defaultH: 0.6, color: "#fbbf24", desc: "Рабочая поверхность кухни со столешницей" },
  { type: "fridge", category: "furniture", label: "Холодильник", emoji: "🧊", defaultW: 0.65, defaultH: 0.65, color: "#cbd5e1", desc: "Двухкамерный холодильник" },
  { type: "stove", category: "furniture", label: "Варочная панель / плита", emoji: "🍳", defaultW: 0.6, defaultH: 0.6, color: "#475569", desc: "Индукционная или газовая варочная панель" },
  { type: "sink_kitchen", category: "furniture", label: "Кухонная мойка", emoji: "🚰", defaultW: 0.6, defaultH: 0.5, color: "#94a3b8", desc: "Врезная раковина на кухне" },
  { type: "washbasin", category: "furniture", label: "Умывальник в ванную", emoji: "🧴", defaultW: 0.7, defaultH: 0.5, color: "#38bdf8", desc: "Раковина с тумбой и зеркалом" },
  { type: "bathtub", category: "furniture", label: "Ванна акриловая", emoji: "🛁", defaultW: 1.7, defaultH: 0.75, color: "#0284c7", desc: "Полноразмерная ванна 170×75 см" },
  { type: "shower", category: "furniture", label: "Душевая кабина", emoji: "🚿", defaultW: 0.9, defaultH: 0.9, color: "#0ea5e9", desc: "Угловое душевое ограждение 90×90 см" },
  { type: "toilet", category: "furniture", label: "Унитаз с инсталляцией", emoji: "🚽", defaultW: 0.5, defaultH: 0.65, color: "#38bdf8", desc: "Подвесной унитаз" },
  { type: "washing_machine", category: "furniture", label: "Стиральная машина", emoji: "🧺", defaultW: 0.6, defaultH: 0.6, color: "#64748b", desc: "Стиральная/сушильная машина" },

  // 🚪 Межкомнатные двери
  { type: "door_interior", category: "interior_door", label: "Дверь межкомнатная", emoji: "🚪", defaultW: 0.85, defaultH: 0.15, color: "#a16207", desc: "Распашная дверь с наличником и полотном" },
  { type: "door_sliding", category: "interior_door", label: "Дверь раздвижная", emoji: "🚪↔️", defaultW: 0.9, defaultH: 0.12, color: "#78350f", desc: "Пенал или навесная раздвижная дверь" }
];

export interface FloorPlanElement {
  id: string;
  type: FloorElementType;
  floorLevel: number;
  xMeters: number;
  yMeters: number;
  wMeters: number;
  hMeters: number;
  rotation: number; // 0, 90, 180, 270 deg
  label: string;
  notes?: string;
  circuitNumber?: string; // e.g. "Л-1", "Стояк ГВС-1", "Контур 2"
}

export interface BuildingFloorPlan {
  currentFloor: number;
  floors: Array<{
    level: number;
    name: string;
    heightMeters: number;
  }>;
  rooms: PlanRoom[];
  elements: FloorPlanElement[];
}

export function createDefaultFloorPlan(wMeters: number, hMeters: number, subType?: string): BuildingFloorPlan {
  const w = Math.max(3, wMeters);
  const h = Math.max(3, hMeters);

  const defaultFloors = [
    { level: 1, name: "1 этаж", heightMeters: 2.8 },
  ];

  if (subType === "house") {
    defaultFloors.push({ level: 2, name: "2 этаж", heightMeters: 2.7 });
  }

  // Generate 2-3 standard rooms to get started immediately
  const rooms: PlanRoom[] = [];
  const elements: FloorPlanElement[] = [];

  if (subType === "house") {
    const halfW = Math.round((w / 2) * 10) / 10;
    const halfH = Math.round((h / 2) * 10) / 10;

    rooms.push(
      {
        id: "room_living_" + Date.now(),
        name: "Гостиная / Зал",
        type: "living_room",
        xMeters: 0,
        yMeters: 0,
        wMeters: halfW,
        hMeters: h,
        floorLevel: 1,
        color: "#fef3c7"
      },
      {
        id: "room_kitchen_" + (Date.now() + 1),
        name: "Кухня-столовая",
        type: "kitchen",
        xMeters: halfW,
        yMeters: 0,
        wMeters: w - halfW,
        hMeters: halfH,
        floorLevel: 1,
        color: "#fed7aa"
      },
      {
        id: "room_bath_" + (Date.now() + 2),
        name: "Ванная комната",
        type: "bathroom",
        xMeters: halfW,
        yMeters: halfH,
        wMeters: w - halfW,
        hMeters: h - halfH,
        floorLevel: 1,
        color: "#bae6fd"
      }
    );

    // Initial electrical & plumbing points
    elements.push(
      {
        id: "el_pnl_" + Date.now(),
        type: "electric_panel",
        floorLevel: 1,
        xMeters: 0.2,
        yMeters: 0.2,
        wMeters: 0.6,
        hMeters: 0.3,
        rotation: 0,
        label: "Электрощит ВРУ",
        circuitNumber: "ЩР-1"
      },
      {
        id: "el_sock_1_" + Date.now(),
        type: "socket_double",
        floorLevel: 1,
        xMeters: halfW - 0.7,
        yMeters: 0.2,
        wMeters: 0.5,
        hMeters: 0.3,
        rotation: 0,
        label: "Розетки ТВ",
        circuitNumber: "Р-1"
      },
      {
        id: "el_ac_1_" + Date.now(),
        type: "ac_indoor",
        floorLevel: 1,
        xMeters: 1.0,
        yMeters: h - 0.4,
        wMeters: 0.9,
        hMeters: 0.3,
        rotation: 0,
        label: "Кондиционер сплит",
        circuitNumber: "К-1"
      },
      {
        id: "plumb_cold_" + Date.now(),
        type: "water_cold",
        floorLevel: 1,
        xMeters: halfW + 0.3,
        yMeters: halfH + 0.3,
        wMeters: 0.3,
        hMeters: 0.3,
        rotation: 0,
        label: "Ввод ХВС",
        circuitNumber: "ХВС-1"
      },
      {
        id: "plumb_hot_" + Date.now(),
        type: "water_hot",
        floorLevel: 1,
        xMeters: halfW + 0.7,
        yMeters: halfH + 0.3,
        wMeters: 0.3,
        hMeters: 0.3,
        rotation: 0,
        label: "Ввод ГВС",
        circuitNumber: "ГВС-1"
      }
    );
  } else if (subType === "banya") {
    const partW = Math.round((w * 0.6) * 10) / 10;
    rooms.push(
      {
        id: "room_rest_" + Date.now(),
        name: "Комната отдыха",
        type: "living_room",
        xMeters: 0,
        yMeters: 0,
        wMeters: partW,
        hMeters: h,
        floorLevel: 1,
        color: "#fef3c7"
      },
      {
        id: "room_steam_" + (Date.now() + 1),
        name: "Парная",
        type: "bathroom",
        xMeters: partW,
        yMeters: 0,
        wMeters: w - partW,
        hMeters: h * 0.55,
        floorLevel: 1,
        color: "#fed7aa"
      },
      {
        id: "room_wash_" + (Date.now() + 2),
        name: "Помывочная",
        type: "bathroom",
        xMeters: partW,
        yMeters: h * 0.55,
        wMeters: w - partW,
        hMeters: h * 0.45,
        floorLevel: 1,
        color: "#bae6fd"
      }
    );
  } else {
    // Default open single space
    rooms.push({
      id: "room_main_" + Date.now(),
      name: "Основное пространство",
      type: "living_room",
      xMeters: 0,
      yMeters: 0,
      wMeters: w,
      hMeters: h,
      floorLevel: 1,
      color: "#f1f5f9"
    });
  }

  return {
    currentFloor: 1,
    floors: defaultFloors,
    rooms,
    elements
  };
}
