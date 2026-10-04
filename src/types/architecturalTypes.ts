// Floor Planning & Interior Space Modeling Types (2D CAD View)

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
  floorFinish?: string; // Ламинат, керамогранит, паркет, плитка и т.д.
  ceilingHeight?: number; // Высота потолка в метрах (например 2.8)
  notes?: string;
}

export interface FloorPartition {
  id: string;
  floorLevel: number;
  orientation: "horizontal" | "vertical" | "custom";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thicknessMeters: number; // например, 0.12 или 0.15 м
  wallType?: "partition" | "bearing"; // перегородка или несущая
  label?: string;
}

export interface FloorOpening {
  id: string;
  floorLevel: number;
  type: "door_interior" | "door_entrance" | "door_sliding" | "window_standard" | "window_panoramic" | "arch";
  xMeters: number;
  yMeters: number;
  widthMeters: number;
  orientation: "horizontal" | "vertical";
  rotation?: number; // 0, 90, 180, 270 deg
  swingDirection?: "left_in" | "right_in" | "left_out" | "right_out";
  label?: string;
  wallId?: string; // id of FloorPartition, or "outer_top", "outer_bottom", "outer_left", "outer_right"
  wallThickness?: number;
}

export type FloorElementCategory =
  | "electric"     // Электрика (розетки, выключатели, щит)
  | "plumbing"     // Водоснабжение и канализация
  | "hvac"         // Климат, вентиляция и кондиционеры
  | "heating"      // Отопление (радиаторы, котел)
  | "furniture"    // Мебель и сантехнические приборы
  | "interior_door"; // Внутренние двери и проемы

export type FloorElementType =
  // Электрика и слаботочка
  | "socket_single"
  | "socket_double"
  | "socket_wet"
  | "socket_internet"
  | "socket_tv"
  | "socket_usb"
  | "socket_380v"
  | "switch_light"
  | "light_ceiling"
  | "electric_panel"
  | "junction_box"
  // Водоснабжение, канализация и встроенная уборка
  | "water_cold"
  | "water_hot"
  | "drain_sewer"
  | "water_heater"
  | "water_filter"
  | "central_vacuum"
  | "vacuum_inlet"
  | "robot_vacuum_dock"
  // Климат, вентиляция и форсуночное увлажнение
  | "ac_indoor"
  | "ac_outdoor"
  | "vent_hood"
  | "vent_valve"
  | "vent_recuperator"
  | "humidifier_pump"
  | "humidifier_nozzle"
  | "vent_diffuser_supply"
  | "vent_diffuser_exhaust"
  | "vent_grille_linear"
  | "vent_penetration"
  // Отопление
  | "radiator"
  | "radiator_low"
  | "convector_floor"
  | "convector_wall"
  | "fan_heater"
  | "towel_dryer"
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
  // 🔌 Электрика и слаботочка
  { type: "socket_single", category: "electric", label: "Розетка 220В", emoji: "🔌", defaultW: 0.3, defaultH: 0.3, color: "#f59e0b", desc: "Одинарная силовая розетка 16А с заземлением" },
  { type: "socket_double", category: "electric", label: "Розетка 2х220В", emoji: "⚡", defaultW: 0.5, defaultH: 0.3, color: "#f59e0b", desc: "Двойной розеточный блок 16А" },
  { type: "socket_wet", category: "electric", label: "Розетка влагозащитная IP44", emoji: "💧🔌", defaultW: 0.35, defaultH: 0.35, color: "#0ea5e9", desc: "Влагозащищенная розетка с крышкой для с/у и кухни" },
  { type: "socket_internet", category: "electric", label: "Розетка RJ45 (Интернет / LAN)", emoji: "🌐", defaultW: 0.3, defaultH: 0.3, color: "#3b82f6", desc: "Компьютерная интернет-розетка RJ45 Cat.6 (витая пара UTP/FTP)" },
  { type: "socket_tv", category: "electric", label: "Розетка TV / SAT", emoji: "📺", defaultW: 0.3, defaultH: 0.3, color: "#8b5cf6", desc: "Телевизионная коаксиальная розетка TV/FM/SAT" },
  { type: "socket_usb", category: "electric", label: "Розетка USB-A + Type-C", emoji: "🔋", defaultW: 0.3, defaultH: 0.3, color: "#10b981", desc: "Зарядная розетка с разъемами быстрой зарядки USB-A и Type-C PD" },
  { type: "socket_380v", category: "electric", label: "Силовая розетка 380В / плита", emoji: "⚡🔴", defaultW: 0.45, defaultH: 0.35, color: "#dc2626", desc: "Трехфазная силовая розетка 380В 32А (варочная панель, электрокотел)" },
  { type: "switch_light", category: "electric", label: "Выключатель света", emoji: "🔘", defaultW: 0.3, defaultH: 0.3, color: "#6366f1", desc: "Одно- или двухклавишный выключатель / проходной" },
  { type: "light_ceiling", category: "electric", label: "Светильник / Люстра", emoji: "💡", defaultW: 0.5, defaultH: 0.5, color: "#eab308", desc: "Точка потолочного освещения" },
  { type: "electric_panel", category: "electric", label: "Главный электрощит (ВРУ)", emoji: "⚡📦", defaultW: 0.6, defaultH: 0.3, color: "#dc2626", desc: "Распределительный щит с автоматами, УЗО и реле напряжения" },
  { type: "junction_box", category: "electric", label: "Распредкоробка", emoji: "🔲", defaultW: 0.25, defaultH: 0.25, color: "#e11d48", desc: "Распределительная коробка (коммутация кабелей освещения и розеток)" },

  // 💧 Водоснабжение, канализация и умная уборка
  { type: "water_cold", category: "plumbing", label: "Точка ХВС (Холодная вода)", emoji: "🔵", defaultW: 0.3, defaultH: 0.3, color: "#0284c7", desc: "Водорозетка холодной воды 1/2\"" },
  { type: "water_hot", category: "plumbing", label: "Точка ГВС (Горячая вода)", emoji: "🔴", defaultW: 0.3, defaultH: 0.3, color: "#ef4444", desc: "Водорозетка горячей воды 1/2\"" },
  { type: "drain_sewer", category: "plumbing", label: "Канализационный стояк / слив", emoji: "🕳️", defaultW: 0.4, defaultH: 0.4, color: "#475569", desc: "Точка подключения канализации (50/110 мм)" },
  { type: "water_heater", category: "plumbing", label: "Бойлер / Водонагреватель", emoji: "♨️", defaultW: 0.6, defaultH: 0.5, color: "#0284c7", desc: "Накопительный или проточный водонагреватель" },
  { type: "water_filter", category: "plumbing", label: "Фильтр водоочистки", emoji: "🚰", defaultW: 0.5, defaultH: 0.35, color: "#06b6d4", desc: "Комплексная система очистки и умягчения воды" },
  { type: "central_vacuum", category: "plumbing", label: "Встроенный пылесос (Силовой блок)", emoji: "🧹⚙️", defaultW: 0.6, defaultH: 0.5, color: "#0284c7", desc: "Силовой агрегат центрального пылесоса в техпомещении/гараже с выхлопом на улицу" },
  { type: "vacuum_inlet", category: "plumbing", label: "Пневморозетка / Совок в плинтус", emoji: "🕳️🧹", defaultW: 0.3, defaultH: 0.2, color: "#0ea5e9", desc: "Стеновая пневморозетка для шланга пылесоса или плинтусный совок VacPan" },
  { type: "robot_vacuum_dock", category: "plumbing", label: "Скрытая база робота-пылесоса", emoji: "🤖🚿", defaultW: 0.6, defaultH: 0.5, color: "#059669", desc: "База в цоколе кухни или шкафу со скрытым подключением к ХВС, канализации и 220В" },

  // ❄️ Климат, вентиляция и форсуночное увлажнение
  { type: "ac_indoor", category: "hvac", label: "Кондиционер (внутренний блок)", emoji: "❄️", defaultW: 0.9, defaultH: 0.3, color: "#06b6d4", desc: "Настенная сплит-система кондиционирования" },
  { type: "ac_outdoor", category: "hvac", label: "Кондиционер (наружный блок)", emoji: "💨", defaultW: 0.8, defaultH: 0.4, color: "#64748b", desc: "Внешний компрессорный блок на фасаде" },
  { type: "vent_hood", category: "hvac", label: "Вентканал / Вытяжка", emoji: "🌪️", defaultW: 0.5, defaultH: 0.4, color: "#10b981", desc: "Принудительная вытяжная вентиляция" },
  { type: "vent_valve", category: "hvac", label: "Приточный клапан (КИВ / бризер)", emoji: "🌬️", defaultW: 0.4, defaultH: 0.3, color: "#14b8a6", desc: "Стеновое приточное вентиляционное устройство" },
  { type: "vent_recuperator", category: "hvac", label: "Приточно-вытяжная ПВУ / рекуператор", emoji: "🔄", defaultW: 0.9, defaultH: 0.6, color: "#0d9488", desc: "Вентиляционная установка с рекуперацией тепла" },
  { type: "humidifier_pump", category: "hvac", label: "Насосная станция увлажнения", emoji: "💦⚙️", defaultW: 0.6, defaultH: 0.4, color: "#0284c7", desc: "Плунжерный насос высокого давления 50-70 бар с водоподготовкой обратного осмоса" },
  { type: "humidifier_nozzle", category: "hvac", label: "Форсунка прямого увлажнения", emoji: "🌫️", defaultW: 0.2, defaultH: 0.2, color: "#06b6d4", desc: "Высоконапорная распылительная форсунка (микрокапельный туман) под потолком" },
  { type: "vent_diffuser_supply", category: "hvac", label: "Приточный диффузор / анемостат", emoji: "🔵💨", defaultW: 0.35, defaultH: 0.35, color: "#38bdf8", desc: "Потолочный приточный диффузор подачи свежего воздуха" },
  { type: "vent_diffuser_exhaust", category: "hvac", label: "Вытяжной диффузор / анемостат", emoji: "🔴💨", defaultW: 0.35, defaultH: 0.35, color: "#f87171", desc: "Потолочный вытяжной диффузор удаления отработанного воздуха" },
  { type: "vent_grille_linear", category: "hvac", label: "Щелевой диффузор / решётка", emoji: "🔲💨", defaultW: 1.0, defaultH: 0.15, color: "#0ea5e9", desc: "Скрытый щелевой линейный диффузор для потолка или стен" },
  { type: "vent_penetration", category: "hvac", label: "Проход вентрешётки / гильза в стене", emoji: "🧱🚪", defaultW: 0.35, defaultH: 0.2, color: "#64748b", desc: "Место прохода воздуховода или переточной решетки через стену" },

  // 🔥 Отопление и климатический обогрев
  { type: "radiator", category: "heating", label: "Радиатор отопления", emoji: "🔥", defaultW: 1.0, defaultH: 0.22, color: "#ea580c", desc: "Секционный или панельный радиатор под окно (высокотемпературный 70/50°C)" },
  { type: "radiator_low", category: "heating", label: "Низкий радиатор напольный", emoji: "🌡️", defaultW: 1.3, defaultH: 0.2, color: "#f97316", desc: "Низкий напольный радиатор на ножках под витражные окна (h=200-300 мм)" },
  { type: "convector_floor", category: "heating", label: "Внутрипольный конвектор", emoji: "⏹️", defaultW: 1.6, defaultH: 0.28, color: "#d97706", desc: "Внутрипольный водяной конвектор с рулонной решеткой под панорамные окна" },
  { type: "convector_wall", category: "heating", label: "Настенный конвектор", emoji: "♨️", defaultW: 0.8, defaultH: 0.15, color: "#ea580c", desc: "Компактный настенный конвектор быстрого теплого фронта" },
  { type: "fan_heater", category: "heating", label: "Тепловентилятор / Теплозавеса", emoji: "💨", defaultW: 1.0, defaultH: 0.35, color: "#dc2626", desc: "Тепловентилятор / тепловая завеса над проемом/окном" },
  { type: "towel_dryer", category: "heating", label: "Полотенцесушитель", emoji: "🪜", defaultW: 0.5, defaultH: 0.15, color: "#f43f5e", desc: "Полотенцесушитель водяной / электрический лесенка" },
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

export type RouteSystem =
  | "electric"
  | "plumbing_cold"
  | "plumbing_hot"
  | "sewer"
  | "heating"
  | "ventilation";

export interface RoutePoint {
  x: number; // in meters from building bottom-left corner
  y: number; // in meters
  z?: number; // height in meters (e.g. 0.3m for sockets, 0.9m switches, 2.5m ceiling trace)
}

export interface EngineeringRoute {
  id: string;
  floorLevel: number;
  system: RouteSystem;
  name: string; // e.g. "ВВГнг 3x2.5 Розеточная сеть", "ХВС PEX-a 16", "Канализация ПВХ 110"
  points: RoutePoint[];
  color?: string;
  diameterMm?: number; // 16, 20, 25, 32, 50, 110 mm
  cableCores?: string; // e.g. "3x2.5", "3x1.5", "5x4.0"
  notes?: string;
}

export interface UnderfloorHeatingLoop {
  id: string;
  floorLevel: number;
  name: string; // e.g. "Контур 1 (Гостиная)"
  roomId?: string; // Room association
  circuitNumber?: number; // Номер контура в комнате (1, 2, 3...)
  zoneType?: "standard" | "edge_window" | "bathroom" | "corridor"; // "edge_window" = горячий рантовый контур вдоль окон
  targetTempC?: number; // e.g. 50°C for edge_window, 35°C for standard comfort
  xMeters: number; // Bounding zone
  yMeters: number;
  wMeters: number;
  hMeters: number;
  stepMm: number; // 100, 150, 200 mm
  wallOffsetMm: number; // 100, 150, 200 mm
  pattern: "snake" | "snail"; // "змейка" или "улитка"
  pipeDiameterMm: number; // default 16
  color?: string;
  pipeLengthMeters?: number; // calculated total length
}

export interface EngineeringLayerVisibility {
  architecture: boolean; // walls, partitions, doors, windows, dimensions
  furniture: boolean;    // furniture, appliances
  electric: boolean;     // wiring routes, junction boxes, panels, sockets, switches, lights
  plumbing: boolean;     // water lines, sewer lines, water points, collectors
  heating: boolean;      // underfloor heating loops, radiators, boilers, heating routes
  ventilation: boolean;  // AC, ventilation ducts, valves, recuperators
}

export const DEFAULT_LAYER_VISIBILITY: EngineeringLayerVisibility = {
  architecture: true,
  furniture: true,
  electric: true,
  plumbing: true,
  heating: true,
  ventilation: true,
};

// ==================== СХЕМЫ ЭЛЕКТРОЩИТОВ (BREAKER PANELS) ====================
export type BreakerType =
  | "main_switch"         // Вводной выключатель-разъединитель / рубильник
  | "voltage_relay"       // Реле контроля напряжения с защитой от скачков (РН-263Т)
  | "rcd"                 // УЗО (Устройство защитного отключения)
  | "mcb_b10"             // Автомат 10А (B10, освещение)
  | "mcb_b16"             // Автомат 16А (B16, розетки)
  | "mcb_c16"             // Автомат 16А (C16, кондиционеры)
  | "mcb_c20"             // Автомат 20А (C20, стиральная/сушильная машина)
  | "mcb_c25"             // Автомат 25А (C25, варочная панель, духовой шкаф)
  | "mcb_c32"             // Автомат 32А (C32, проточный нагреватель, ввод)
  | "rcbo"                // Дифференциальный автомат (АВДТ со встроенным УЗО)
  | "contactor"           // Модульный контактор (мастер-выключатель / неотключаемые)
  | "surge_protector";    // УЗИП (защита от импульсных перенапряжений)

export interface PanelBreakerItem {
  id: string;
  number: string;        // QF1, QF2, QD1, KM1, РН1
  type: BreakerType;
  label: string;         // e.g. "Вводной автомат 3P 25A", "Розетки кухни", "Освещение спальни"
  ratingAmps: number;    // 10, 16, 20, 25, 32, 40, 50, 63
  curve: "B" | "C" | "D";
  phases: 1 | 3;
  leakageCurrentMa?: number; // 10, 30, 100, 300 mA
  cableSection: string;  // e.g. "ВВГнг-LS 3x2.5", "3x1.5", "5x4.0"
  powerKw: number;       // e.g. 3.5 kW
  groupName?: string;    // e.g. "Группа УЗО 1 (Мокрые зоны)", "Неотключаемая группа"
  dinRail: number;       // DIN-рейка № 1, 2, 3
  isNonDisconnectable?: boolean; // Неотключаемая линия (холодильник, сервер, котел)
}

export interface ElectricalPanelScheme {
  id: string;
  panelName: string;
  panelType: "main_vru" | "floor_subpanel" | "low_current_rack";
  location: string;
  voltage: 220 | 380;
  phases: 1 | 3;
  allocatedPowerKw: number;
  dinRailsCount: number;
  breakers: PanelBreakerItem[];
}

// ==================== КОЛЛЕКТОРНЫЕ СХЕМЫ (MANIFOLD SCHEMES) ====================
export interface ManifoldCircuitItem {
  id: string;
  number: number;          // № отвода: 1, 2, 3...
  name: string;            // e.g. "Радиатор (Гостиная окно)", "Петля ТП 1 (Кухня)", "Раковина (Санузел)"
  consumerType: string;    // "radiator" | "floor_loop" | "sink" | "toilet" | "shower" | "boiler" | "washing_machine" | "robot_dock"
  pipeType: string;        // "PEX-a 16x2.2", "PEX-a 20x2.8", "Металлопластик 16"
  pipeLengthMeters?: number;
  flowRateLMin?: number;   // Расход л/мин (для расходомеров ТП)
  hasServoDrive?: boolean; // Термоэлектрический сервопривод
  hasShutoffValve?: boolean;
}

export interface CollectorScheme {
  id: string;
  type: "heating_radiators" | "underfloor_heating" | "water_cold" | "water_hot";
  title: string;           // "Шкаф коллекторный ТП ШРН-1", "Гребенка ХВС"
  cabinetLocation: string; // "Котельная", "Коридор шкаф"
  circuitsCount: number;
  circuits: ManifoldCircuitItem[];
  equipment: {
    hasShutoffValves?: boolean;        // Запорные краны (шаровые краны на вводе с американками)
    hasAirVents?: boolean;             // Воздухоотводчик (автоматический спускник воздуха на торцах балок)
    hasFineFilter?: boolean;           // Самопромывной фильтр 100 мкм + манометр
    hasMixingUnit?: boolean;          // Смесительный узел с циркуляционным насосом
    pumpModel?: string;               // Grundfos UPM3 / Wilo Yonos
    hasWaterHammerArrestor?: boolean; // Компенсатор гидроударов
    hasPressureRegulator?: boolean;   // Редуктор давления с манометром
    hasLeakProtectionValve?: boolean; // Кран защиты от протечек (Нептун / Аквасторож)
    hasDrainValves?: boolean;         // Сливные дренажные краны
    hasFlowMeters?: boolean;          // Расходомеры / ротаметры
    hasThermometers?: boolean;        // Стрелочные термометры подачи и обратки
  };
}

export interface BuildingFloorPlan {
  currentFloor: number;
  floors: Array<{
    level: number;
    name: string;
    heightMeters: number;
  }>;
  outerWallThicknessMeters?: number; // default 0.35m
  partitions: FloorPartition[];
  rooms: PlanRoom[];
  openings?: FloorOpening[];
  elements: FloorPlanElement[];
  routes?: EngineeringRoute[];
  heatingLoops?: UnderfloorHeatingLoop[];
  electricalPanels?: ElectricalPanelScheme[];
  collectorSchemes?: CollectorScheme[];
}

export function createDefaultElectricalPanels(): ElectricalPanelScheme[] {
  return [
    {
      id: "panel_main_1",
      panelName: "Главный распределительный щит (ВРУ)",
      panelType: "main_vru",
      location: "Прихожая / Коридор",
      voltage: 380,
      phases: 3,
      allocatedPowerKw: 15.0,
      dinRailsCount: 3,
      breakers: [
        // DIN-рейка 1: Ввод и защита
        { id: "brk_0", number: "QF0", type: "main_switch", label: "Вводной выключатель-рубильник 3P", ratingAmps: 25, curve: "C", phases: 3, cableSection: "ВВГнг 5x6.0", powerKw: 15.0, dinRail: 1 },
        { id: "brk_spd", number: "SPD1", type: "surge_protector", label: "УЗИП (Защита от перенапряжений)", ratingAmps: 25, curve: "C", phases: 3, cableSection: "ПВ-3 6.0", powerKw: 0, dinRail: 1 },
        { id: "brk_rn1", number: "РН1", type: "voltage_relay", label: "Реле напряжения L1 (РН-263Т)", ratingAmps: 63, curve: "C", phases: 1, cableSection: "ПВ-3 6.0", powerKw: 5.0, dinRail: 1 },
        { id: "brk_rn2", number: "РН2", type: "voltage_relay", label: "Реле напряжения L2 (РН-263Т)", ratingAmps: 63, curve: "C", phases: 1, cableSection: "ПВ-3 6.0", powerKw: 5.0, dinRail: 1 },
        { id: "brk_rn3", number: "РН3", type: "voltage_relay", label: "Реле напряжения L3 (РН-263Т)", ratingAmps: 63, curve: "C", phases: 1, cableSection: "ПВ-3 6.0", powerKw: 5.0, dinRail: 1 },
        { id: "brk_km1", number: "KM1", type: "contactor", label: "Мастер-контактор (отключение при уходе)", ratingAmps: 40, curve: "C", phases: 3, cableSection: "ВВГнг 5x4.0", powerKw: 12.0, dinRail: 1 },

        // DIN-рейка 2: Кухня и силовые приборы
        { id: "brk_qd1", number: "QD1", type: "rcd", label: "УЗО 40А 30мА (Кухня и мокрые зоны)", ratingAmps: 40, curve: "C", leakageCurrentMa: 30, phases: 1, cableSection: "ВВГнг 3x4.0", powerKw: 8.0, dinRail: 2, groupName: "Группа Кухня" },
        { id: "brk_1", number: "QF1", type: "mcb_c25", label: "Варочная панель 380В / плита", ratingAmps: 25, curve: "C", phases: 3, cableSection: "ВВГнг 5x4.0", powerKw: 7.2, dinRail: 2 },
        { id: "brk_2", number: "QF2", type: "mcb_b16", label: "Духовой шкаф / СВЧ", ratingAmps: 16, curve: "B", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 3.2, dinRail: 2 },
        { id: "brk_3", number: "QF3", type: "mcb_b16", label: "Посудомоечная машина", ratingAmps: 16, curve: "B", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 2.2, dinRail: 2 },
        { id: "brk_4", number: "QF4", type: "mcb_b16", label: "Розетки рабочей зоны кухни", ratingAmps: 16, curve: "B", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 3.5, dinRail: 2 },
        { id: "brk_5", number: "QF5", type: "mcb_c16", label: "Стиральная и сушильная машина", ratingAmps: 16, curve: "C", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 2.5, dinRail: 2 },
        { id: "brk_6", number: "QF6", type: "mcb_c20", label: "Водонагреватель / бойлер", ratingAmps: 20, curve: "C", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 3.0, dinRail: 2 },

        // DIN-рейка 3: Жилые зоны и неотключаемые линии
        { id: "brk_qd2", number: "QD2", type: "rcd", label: "УЗО 40А 30мА (Жилые комнаты)", ratingAmps: 40, curve: "C", leakageCurrentMa: 30, phases: 1, cableSection: "ВВГнг 3x4.0", powerKw: 6.0, dinRail: 3, groupName: "Группа Жилые зоны" },
        { id: "brk_7", number: "QF7", type: "mcb_b16", label: "Розетки гостиной, TV и акустика", ratingAmps: 16, curve: "B", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 2.5, dinRail: 3 },
        { id: "brk_8", number: "QF8", type: "mcb_b16", label: "Розетки спальни и кабинета", ratingAmps: 16, curve: "B", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 2.5, dinRail: 3 },
        { id: "brk_9", number: "QF9", type: "mcb_b10", label: "Освещение комнат и коридора", ratingAmps: 10, curve: "B", phases: 1, cableSection: "ВВГнг 3x1.5", powerKw: 1.2, dinRail: 3 },
        { id: "brk_10", number: "QF10", type: "mcb_c16", label: "Сплит-системы кондиционирования", ratingAmps: 16, curve: "C", phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 2.6, dinRail: 3 },
        { id: "brk_11", number: "QF11", type: "rcbo", label: "Неотключаемая: Холодильник", ratingAmps: 16, curve: "C", leakageCurrentMa: 30, phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 0.4, dinRail: 3, isNonDisconnectable: true, groupName: "Неотключаемая" },
        { id: "brk_12", number: "QF12", type: "rcbo", label: "Неотключаемая: Сервер, Wi-Fi, Охрана", ratingAmps: 10, curve: "B", leakageCurrentMa: 30, phases: 1, cableSection: "ВВГнг 3x1.5", powerKw: 0.3, dinRail: 3, isNonDisconnectable: true, groupName: "Неотключаемая" },
        { id: "brk_13", number: "QF13", type: "rcbo", label: "Неотключаемая: Котёл, насосы, увлажнение", ratingAmps: 16, curve: "C", leakageCurrentMa: 30, phases: 1, cableSection: "ВВГнг 3x2.5", powerKw: 1.8, dinRail: 3, isNonDisconnectable: true, groupName: "Неотключаемая" }
      ]
    }
  ];
}

export function createDefaultCollectorSchemes(): CollectorScheme[] {
  return [
    {
      id: "collector_heating_1",
      type: "underfloor_heating",
      title: "Коллекторный шкаф тёплого пола (ШРН-ТП)",
      cabinetLocation: "Котельная / Тех.помещение",
      circuitsCount: 4,
      equipment: {
        hasShutoffValves: true,
        hasAirVents: true,
        hasDrainValves: true,
        hasFlowMeters: true,
        hasThermometers: true,
        hasMixingUnit: true,
        pumpModel: "Grundfos UPM3 Auto L 25-70",
        hasWaterHammerArrestor: false,
        hasPressureRegulator: true,
        hasLeakProtectionValve: false,
        hasFineFilter: true
      },
      circuits: [
        { id: "circ_tp_1", number: 1, name: "ТП Гостиная зона (основной контур)", consumerType: "floor_loop", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 64.0, flowRateLMin: 2.2, hasServoDrive: true, hasShutoffValve: true },
        { id: "circ_tp_2", number: 2, name: "ТП Кухня-столовая", consumerType: "floor_loop", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 52.0, flowRateLMin: 1.8, hasServoDrive: true, hasShutoffValve: true },
        { id: "circ_tp_3", number: 3, name: "ТП Санузел / Ванная (комфорт)", consumerType: "floor_loop", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 28.0, flowRateLMin: 1.2, hasServoDrive: true, hasShutoffValve: true },
        { id: "circ_tp_4", number: 4, name: "🔥 Рантовая зона витражных окон [50°C]", consumerType: "floor_loop", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 31.0, flowRateLMin: 1.6, hasServoDrive: true, hasShutoffValve: true }
      ]
    },
    {
      id: "collector_radiator_1",
      type: "heating_radiators",
      title: "Гребёнка радиаторного отопления (ШРН-РАД)",
      cabinetLocation: "Коридор шкаф",
      circuitsCount: 4,
      equipment: {
        hasShutoffValves: true,
        hasAirVents: true,
        hasDrainValves: true,
        hasThermometers: true,
        hasMixingUnit: false,
        hasWaterHammerArrestor: false,
        hasPressureRegulator: false,
        hasLeakProtectionValve: false,
        hasFineFilter: true
      },
      circuits: [
        { id: "circ_rad_1", number: 1, name: "Радиатор Гостиная окно 1", consumerType: "radiator", pipeType: "PEX-a 16x2.2 в теплоизоляции", pipeLengthMeters: 18.5, hasShutoffValve: true },
        { id: "circ_rad_2", number: 2, name: "Внутрипольный конвектор ВК-ПОЛ (Витраж)", consumerType: "radiator", pipeType: "PEX-a 16x2.2 в теплоизоляции", pipeLengthMeters: 22.0, hasShutoffValve: true },
        { id: "circ_rad_3", number: 3, name: "Радиатор Спальня окно", consumerType: "radiator", pipeType: "PEX-a 16x2.2 в теплоизоляции", pipeLengthMeters: 14.0, hasShutoffValve: true },
        { id: "circ_rad_4", number: 4, name: "Полотенцесушитель Санузел (лесенка)", consumerType: "radiator", pipeType: "PEX-a 16x2.2 в теплоизоляции", pipeLengthMeters: 11.5, hasShutoffValve: true }
      ]
    },
    {
      id: "collector_water_cold_1",
      type: "water_cold",
      title: "Коллекторный узел ХВС (с защитой от протечек)",
      cabinetLocation: "Сантехнический шкаф",
      circuitsCount: 7,
      equipment: {
        hasShutoffValves: true,
        hasAirVents: false,
        hasLeakProtectionValve: true, // Кран с электроприводом Нептун
        hasFineFilter: true,          // Фильтр 100 мкм с промывкой
        hasPressureRegulator: true,   // Редуктор давления 3.0 бар
        hasWaterHammerArrestor: true  // Компенсатор гидроударов
      },
      circuits: [
        { id: "circ_wc_1", number: 1, name: "Кухонная мойка и питьевой фильтр", consumerType: "sink", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 6.5, hasShutoffValve: true },
        { id: "circ_wc_2", number: 2, name: "Посудомоечная машина", consumerType: "sink", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 7.0, hasShutoffValve: true },
        { id: "circ_wc_3", number: 3, name: "Умывальник в санузле", consumerType: "sink", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 3.5, hasShutoffValve: true },
        { id: "circ_wc_4", number: 4, name: "Инсталляция подвесного унитаза", consumerType: "toilet", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 2.0, hasShutoffValve: true },
        { id: "circ_wc_5", number: 5, name: "Душевая кабина / Ванна", consumerType: "shower", pipeType: "PEX-a 20x2.8", pipeLengthMeters: 4.5, hasShutoffValve: true },
        { id: "circ_wc_6", number: 6, name: "Скрытая база робота-пылесоса (автонаполнение)", consumerType: "robot_dock", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 8.0, hasShutoffValve: true },
        { id: "circ_wc_7", number: 7, name: "Насосная станция увлажнения воздуха", consumerType: "boiler", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 5.0, hasShutoffValve: true }
      ]
    },
    {
      id: "collector_water_hot_1",
      type: "water_hot",
      title: "Коллекторный узел ГВС (Горячая вода / Рециркуляция)",
      cabinetLocation: "Сантехнический шкаф",
      circuitsCount: 4,
      equipment: {
        hasShutoffValves: true,
        hasAirVents: false,
        hasLeakProtectionValve: true,
        hasFineFilter: true,
        hasPressureRegulator: true,
        hasWaterHammerArrestor: true,
        hasDrainValves: true
      },
      circuits: [
        { id: "circ_wh_1", number: 1, name: "Кухонная мойка (ГВС)", consumerType: "sink", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 6.5, hasShutoffValve: true },
        { id: "circ_wh_2", number: 2, name: "Умывальник в санузле (ГВС)", consumerType: "sink", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 3.5, hasShutoffValve: true },
        { id: "circ_wh_3", number: 3, name: "Душевая кабина / Ванна (ГВС)", consumerType: "shower", pipeType: "PEX-a 20x2.8", pipeLengthMeters: 4.5, hasShutoffValve: true },
        { id: "circ_wh_4", number: 4, name: "Гигиенический душ / биде", consumerType: "toilet", pipeType: "PEX-a 16x2.2", pipeLengthMeters: 2.5, hasShutoffValve: true }
      ]
    }
  ];
}

export function createDefaultFloorPlan(wMeters: number, hMeters: number, subType?: string): BuildingFloorPlan {
  const w = Math.max(3, Math.round(wMeters * 10) / 10);
  const h = Math.max(3, Math.round(hMeters * 10) / 10);

  const defaultFloors = [
    { level: 1, name: "1 этаж", heightMeters: 2.8 },
  ];

  if (subType === "house") {
    defaultFloors.push({ level: 2, name: "2 этаж", heightMeters: 2.7 });
  }

  const partitions: FloorPartition[] = [];
  const rooms: PlanRoom[] = [];
  const openings: FloorOpening[] = [];
  const elements: FloorPlanElement[] = [];
  const routes: EngineeringRoute[] = [];
  const heatingLoops: UnderfloorHeatingLoop[] = [];

  if (subType === "house") {
    const halfW = Math.round((w / 2) * 10) / 10;
    const halfH = Math.round((h / 2) * 10) / 10;

    // Partitions
    partitions.push(
      {
        id: "part_v1_" + Date.now(),
        floorLevel: 1,
        orientation: "vertical",
        x1: halfW,
        y1: 0,
        x2: halfW,
        y2: h,
        thicknessMeters: 0.15,
        wallType: "bearing",
        label: "Центральная перегородка"
      },
      {
        id: "part_h1_" + Date.now(),
        floorLevel: 1,
        orientation: "horizontal",
        x1: halfW,
        y1: halfH,
        x2: w,
        y2: halfH,
        thicknessMeters: 0.12,
        wallType: "partition",
        label: "Перегородка санузла"
      }
    );

    // Formed Rooms
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
        color: "#fef3c7",
        floorFinish: "Ламинат 33 класс",
        ceilingHeight: 2.8
      },
      {
        id: "room_kitchen_" + (Date.now() + 1),
        name: "Кухня-столовая",
        type: "kitchen",
        xMeters: halfW,
        yMeters: 0,
        wMeters: Math.round((w - halfW) * 10) / 10,
        hMeters: halfH,
        floorLevel: 1,
        color: "#fed7aa",
        floorFinish: "Керамогранит",
        ceilingHeight: 2.8
      },
      {
        id: "room_bath_" + (Date.now() + 2),
        name: "Ванная комната",
        type: "bathroom",
        xMeters: halfW,
        yMeters: halfH,
        wMeters: Math.round((w - halfW) * 10) / 10,
        hMeters: Math.round((h - halfH) * 10) / 10,
        floorLevel: 1,
        color: "#bae6fd",
        floorFinish: "Керамогранит антискользящий",
        ceilingHeight: 2.8
      }
    );

    // Doors
    openings.push(
      {
        id: "door_ent_" + Date.now(),
        floorLevel: 1,
        type: "door_entrance",
        xMeters: 1.0,
        yMeters: 0,
        widthMeters: 1.0,
        orientation: "horizontal",
        swingDirection: "right_in",
        label: "Входная дверь"
      },
      {
        id: "door_in_1_" + Date.now(),
        floorLevel: 1,
        type: "door_interior",
        xMeters: halfW,
        yMeters: 1.2,
        widthMeters: 0.85,
        orientation: "vertical",
        swingDirection: "right_in",
        label: "Дверь в кухню"
      },
      {
        id: "door_in_2_" + Date.now(),
        floorLevel: 1,
        type: "door_interior",
        xMeters: halfW,
        yMeters: halfH + 0.8,
        widthMeters: 0.8,
        orientation: "vertical",
        swingDirection: "right_in",
        label: "Дверь в с/у"
      },
      {
        id: "win_1_" + Date.now(),
        floorLevel: 1,
        type: "window_standard",
        xMeters: halfW / 2 - 0.7,
        yMeters: h,
        widthMeters: 1.4,
        orientation: "horizontal",
        label: "Окно гостиной"
      },
      {
        id: "win_2_" + Date.now(),
        floorLevel: 1,
        type: "window_standard",
        xMeters: halfW + (w - halfW) / 2 - 0.7,
        yMeters: 0,
        widthMeters: 1.4,
        orientation: "horizontal",
        label: "Окно кухни"
      }
    );

    // Initial electrical & plumbing points
    elements.push(
      {
        id: "el_pnl_" + Date.now(),
        type: "electric_panel",
        floorLevel: 1,
        xMeters: 0.3,
        yMeters: 0.3,
        wMeters: 0.6,
        hMeters: 0.3,
        rotation: 0,
        label: "Электрощит ВРУ",
        circuitNumber: "ЩР-1"
      },
      {
        id: "el_jbox_1_" + Date.now(),
        type: "junction_box",
        floorLevel: 1,
        xMeters: 1.5,
        yMeters: 0.3,
        wMeters: 0.25,
        hMeters: 0.25,
        rotation: 0,
        label: "Распредкоробка РК-1",
        circuitNumber: "Гр.1-Розетки"
      },
      {
        id: "el_sock_1_" + Date.now(),
        type: "socket_double",
        floorLevel: 1,
        xMeters: halfW - 0.7,
        yMeters: 0.3,
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
      },
      {
        id: "furn_sofa_" + Date.now(),
        type: "sofa",
        floorLevel: 1,
        xMeters: 0.5,
        yMeters: 1.5,
        wMeters: 2.2,
        hMeters: 0.95,
        rotation: 0,
        label: "Диван"
      },
      {
        id: "furn_bath_" + Date.now(),
        type: "bathtub",
        floorLevel: 1,
        xMeters: w - 1.9,
        yMeters: halfH + 0.3,
        wMeters: 1.7,
        hMeters: 0.75,
        rotation: 0,
        label: "Ванна"
      }
    );

    // Initial electrical routes & plumbing
    routes.push(
      {
        id: "route_el_1_" + Date.now(),
        floorLevel: 1,
        system: "electric",
        name: "ВВГнг-LS 3x2.5 (ЩР-1 → РК-1 → ТВ)",
        cableCores: "3x2.5",
        color: "#f59e0b",
        points: [
          { x: 0.6, y: 0.3, z: 2.5 },
          { x: 1.5, y: 0.3, z: 2.5 },
          { x: halfW - 0.7, y: 0.3, z: 2.5 },
          { x: halfW - 0.7, y: 0.3, z: 0.3 }
        ]
      },
      {
        id: "route_plumb_1_" + Date.now(),
        floorLevel: 1,
        system: "plumbing_cold",
        name: "ХВС PEX-a Ø16 к ванне",
        diameterMm: 16,
        color: "#0284c7",
        points: [
          { x: halfW + 0.3, y: halfH + 0.3, z: 0.2 },
          { x: w - 1.0, y: halfH + 0.3, z: 0.2 },
          { x: w - 1.0, y: halfH + 0.7, z: 0.6 }
        ]
      }
    );

    // Initial underfloor heating loop in bathroom with real pitch
    heatingLoops.push({
      id: "heat_bath_" + Date.now(),
      floorLevel: 1,
      name: "Контур 1 (Ванная)",
      roomId: "room_bath_" + (Date.now() + 2),
      xMeters: halfW,
      yMeters: halfH,
      wMeters: Math.round((w - halfW) * 10) / 10,
      hMeters: Math.round((h - halfH) * 10) / 10,
      stepMm: 150,
      wallOffsetMm: 150,
      pattern: "snail",
      pipeDiameterMm: 16,
      color: "#ef4444"
    });
  } else if (subType === "banya") {
    const partW = Math.round((w * 0.55) * 10) / 10;
    const splitH = Math.round((h * 0.55) * 10) / 10;

    partitions.push(
      {
        id: "part_v1_" + Date.now(),
        floorLevel: 1,
        orientation: "vertical",
        x1: partW,
        y1: 0,
        x2: partW,
        y2: h,
        thicknessMeters: 0.15,
        wallType: "bearing",
        label: "Стена парилки / мойки"
      },
      {
        id: "part_h1_" + Date.now(),
        floorLevel: 1,
        orientation: "horizontal",
        x1: partW,
        y1: splitH,
        x2: w,
        y2: splitH,
        thicknessMeters: 0.12,
        wallType: "partition",
        label: "Перегородка между мойкой и парной"
      }
    );

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
        color: "#fef3c7",
        floorFinish: "Шпунтованная лиственница",
        ceilingHeight: 2.6
      },
      {
        id: "room_steam_" + (Date.now() + 1),
        name: "Парная",
        type: "bathroom",
        xMeters: partW,
        yMeters: 0,
        wMeters: Math.round((w - partW) * 10) / 10,
        hMeters: splitH,
        floorLevel: 1,
        color: "#fed7aa",
        floorFinish: "Липовый трап",
        ceilingHeight: 2.4
      },
      {
        id: "room_wash_" + (Date.now() + 2),
        name: "Помывочная",
        type: "bathroom",
        xMeters: partW,
        yMeters: splitH,
        wMeters: Math.round((w - partW) * 10) / 10,
        hMeters: Math.round((h - splitH) * 10) / 10,
        floorLevel: 1,
        color: "#bae6fd",
        floorFinish: "Керамогранит с уклоном",
        ceilingHeight: 2.5
      }
    );

    openings.push(
      {
        id: "door_ent_" + Date.now(),
        floorLevel: 1,
        type: "door_entrance",
        xMeters: 0.8,
        yMeters: 0,
        widthMeters: 0.9,
        orientation: "horizontal",
        swingDirection: "right_in",
        label: "Входная дверь"
      },
      {
        id: "door_wash_" + Date.now(),
        floorLevel: 1,
        type: "door_interior",
        xMeters: partW,
        yMeters: splitH + 0.4,
        widthMeters: 0.8,
        orientation: "vertical",
        swingDirection: "right_in",
        label: "Дверь в помывочную"
      },
      {
        id: "door_steam_" + Date.now(),
        floorLevel: 1,
        type: "door_interior",
        xMeters: partW + 0.3,
        yMeters: splitH,
        widthMeters: 0.7,
        orientation: "horizontal",
        swingDirection: "right_in",
        label: "Стеклянная дверь в парную"
      }
    );
  } else {
    // Default: Open Single Space spanning the whole building footprint
    rooms.push({
      id: "room_main_" + Date.now(),
      name: "Свободная планировка",
      type: "living_room",
      xMeters: 0,
      yMeters: 0,
      wMeters: w,
      hMeters: h,
      floorLevel: 1,
      color: "#f1f5f9",
      floorFinish: "Черновая стяжка",
      ceilingHeight: 2.8
    });

    openings.push({
      id: "door_ent_" + Date.now(),
      floorLevel: 1,
      type: "door_entrance",
      xMeters: Math.max(0.5, Math.round((w / 2 - 0.5) * 10) / 10),
      yMeters: 0,
      widthMeters: 1.0,
      orientation: "horizontal",
      swingDirection: "right_in",
      label: "Входная дверь"
    });
  }

  return {
    currentFloor: 1,
    floors: defaultFloors,
    outerWallThicknessMeters: 0.35,
    partitions,
    rooms,
    openings,
    elements,
    routes,
    heatingLoops,
    electricalPanels: createDefaultElectricalPanels(),
    collectorSchemes: createDefaultCollectorSchemes()
  };
}
