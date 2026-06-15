import React, { useState, useEffect, useRef } from "react";
import { 
  Sprout, 
  History, 
  Home, 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Calendar, 
  Droplet, 
  FileText, 
  Clock, 
  CheckCircle,
  HelpCircle,
  UserCheck,
  Smartphone,
  X,
  MapPin,
  Camera,
  Hammer,
  Share2,
  Eye,
  Settings,
  Users,
  Search,
  User,
  Heart,
  Compass,
  Star,
  Sparkles
} from "lucide-react";
import { User as UserType, BuildingObject, ScheduleItem, CompletedChecklist } from "../types";

interface EcosystemPortalProps {
  currentUser: UserType;
  objects: BuildingObject[];
  schedules: ScheduleItem[];
  reports: CompletedChecklist[];
  onNavigateToObjects: () => void;
  onNavigateToSchedules: () => void;
  currentTheme?: string;
}

// Sub-interfaces for extended features
interface MyGarden {
  id: string;
  name: string;
  address: string;
  coords: string;
  designer: string;
  creationHistory: string;
  linkedObjectId?: string; // ID of the BuildingObject this garden/landscape is linked to
}

interface PlantNode {
  id: string;
  name: string;
  category: "bush" | "flowerbed" | "conifer" | "deciduous" | "bed";
  x: number; // Percent on map
  y: number; // Percent on map
  xMeters?: number;
  yMeters?: number;
  diameterMeters?: number;
  plantingYear: string;
  specs: string;
  careGuidance: string;
  frequency: string;
  growthPhotos: Array<{ date: string; url: string; notes: string }>;
  remarks: string;
  linkedObjectId?: string; // ID of the BuildingObject this plant belongs to
}

// Custom boundaries for drawing
interface BoundaryLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthLabel: string; // e.g., "Северная граница: 45м"
  linkedObjectId?: string; // ID of the BuildingObject this boundary belongs to
}

// Custom structures on the planogram
interface PlanogramBuilding {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xMeters?: number;
  yMeters?: number;
  wMeters?: number;
  hMeters?: number;
  itemType?: string;
  subType?: string;
  rotation?: number;
  label: string;
  color: string;
  emoji?: string;
  linkedObjectId?: string; // ID of the BuildingObject this outbuilding belongs to
}

interface SecondaryBuilding {
  id: string;
  parentId: string; // Target primary object (land plot, house or admin building)
  type: "banya" | "shed" | "gazebo" | "bonfire" | "bbq" | "playground" | "garage" | "security_house" | "guest_house" | "observatory" | "admin_building" | "boiler_room" | "other";
  name: string;
  builderType: "contractor" | "self";
  contractorName?: string;
  materials: string;
  completionYear: string;
  operationNotes: string;
  wishes: string;
  growthTimeline: Array<{ title: string; date: string; photoUrl: string }>;
}

interface GreenhouseBed {
  id: string;
  greenhouseId: string;
  label: string;
  plantName: string;
  emoji: string;
  xMeters: number;
  yMeters: number;
  wMeters: number;
  hMeters: number;
  irrigationSystem?: string; // e.g. "drip" | "manual" | "sprinkler" | "none"
  irrigationSchedule?: string; // watering schedule text
  zones?: Array<{
    id: string;
    emoji: string;
    plantName: string;
    ratio: number; // e.g. share of space (0-100 or relative weight)
  }>;
}

interface SeedCatalogItem {
  id: string;
  name: string;             // Сорт / название, e.g. "Кураж F1"
  emoji: string;            // e.g. "🥒"
  category: string;         // e.g. "Томаты", "Огурцы", "Перцы", "Зелень", "Ягоды", "Другое"
  characteristics: string;  // Характеристики сорта
  fruitDescription: string; // Свойства / Описания плодов
  careInstructions: string;  // Специфика ухода
  rating: number;           // Оценка (1-5 звезд)
  plantAgain: "yes" | "no" | "maybe"; // Решение: Сажать ли снова?
  notes?: string;           // Исторический отзыв / Личные заметки
}

interface ChronicleDiaryEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  memories: string; // why chosen, reviewed options etc
  ideaProcess: string;
  designMoodboardUrl: string;
  boughtFurniture: Array<{ item: string; storeName: string; storeAddress: string }>;
  photoUrl: string;
  objectId?: string; // ID of the BuildingObject this history log is associated with
}

export interface ServiceCompany {
  id: string;
  name: string;
  description: string;
  phone: string;
  belongingType: "garden" | "building" | "equipment";
  belongingId?: string;
  belongingName: string;
  accessType: "temporary" | "permanent";
  status: "active" | "blocked";
  tempActiveUntil?: string;
  pinCode: string;
}

export default function EcosystemPortal({
  currentUser,
  objects,
  schedules,
  reports,
  onNavigateToObjects,
  onNavigateToSchedules,
  currentTheme
}: EcosystemPortalProps) {
  // Ordered by user request: "История & Хроники" is now FIRST
  const [activeSubApp, setActiveSubApp] = useState<"chronicles" | "passport" | "garden" | "buildings">("chronicles");

  // Local state persistence
  const [gardens, setGardens] = useState<MyGarden[]>(() => {
    const saved = localStorage.getItem("eco_my_gardens_v2");
    if (saved) return JSON.parse(saved);
    return [
      { 
        id: "gar_1", 
        name: "Усадебный сад Раменское", 
        address: "Московская обл., Раменский р-н, д. Заболотье, уч. 45", 
        coords: "55.5772, 38.2125", 
        designer: "Мастерская ландшафта 'Елки и Камни'", 
        creationHistory: "Проект разработан осенью 2024 года. Высадка хвойных крупномеров произведена весной 2025." 
      }
    ];
  });

  // Boundary lines state
  const [boundaryLines, setBoundaryLines] = useState<BoundaryLine[]>(() => {
    const saved = localStorage.getItem("eco_boundary_lines");
    if (saved) return JSON.parse(saved);
    return [
      { id: "b_1", startX: 10, startY: 10, endX: 90, endY: 10, lengthLabel: "Забор Север (55 метров)", linkedObjectId: "1" },
      { id: "b_2", startX: 90, startY: 10, endX: 90, endY: 90, lengthLabel: "Забор Восток (40 метров)", linkedObjectId: "1" },
      { id: "b_3", startX: 90, startY: 90, endX: 10, endY: 90, lengthLabel: "Забор Юг (55 метров)", linkedObjectId: "1" },
      { id: "b_4", startX: 10, startY: 90, endX: 10, endY: 10, lengthLabel: "Забор Запад (40 метров)", linkedObjectId: "1" }
    ];
  });

  // Plot dimensions mapping objectId => { width, height } in meters
  const [plotDimensions, setPlotDimensions] = useState<Record<string, { width: number; height: number }>>(() => {
    const saved = localStorage.getItem("eco_plot_dimensions_v2");
    if (saved) return JSON.parse(saved);
    return {
      "1": { width: 45, height: 30 },
      "gar_1": { width: 60, height: 40 }
    };
  });

  // Custom plot corners for irregular shapes
  const [plotCorners, setPlotCorners] = useState<Record<string, Array<{ x: number; y: number }>>>(() => {
    const saved = localStorage.getItem("eco_plot_corners_v2");
    if (saved) return JSON.parse(saved);
    return {};
  });
  const [activeCornerIndex, setActiveCornerIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem("eco_plot_dimensions_v2", JSON.stringify(plotDimensions));
  }, [plotDimensions]);

  // Active template selected in palette for single-click creation
  const [activeTemplate, setActiveTemplate] = useState<{
    type: "building" | "path" | "light" | "plant";
    subType: string;
    label: string;
    wMeters: number;
    hMeters: number;
    color?: string;
  } | null>(null);

  // Selected item on map
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  const [selectedCanvasItemType, setSelectedCanvasItemType] = useState<"building" | "plant" | null>(null);

  // Buildings drawn on plot planogram
  const [planBuildings, setPlanBuildings] = useState<PlanogramBuilding[]>(() => {
    const saved = localStorage.getItem("eco_plan_buildings");
    if (saved) return JSON.parse(saved);
    return [
      { id: "pb_1", x: 25, y: 25, width: 25, height: 25, label: "Основной Дом", color: "rgba(59, 130, 246, 0.2)", linkedObjectId: "1" },
      { id: "pb_2", x: 65, y: 65, width: 20, height: 18, label: "Баня-Кедр", color: "rgba(245, 158, 11, 0.2)", linkedObjectId: "1" }
    ];
  });

  // Target plants state
  const [plantNodes, setPlantNodes] = useState<PlantNode[]>(() => {
    const saved = localStorage.getItem("eco_plant_nodes_v2");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "p_1",
        name: "Сибирская пихта 'Экстра'",
        category: "conifer",
        x: 60,
        y: 25,
        plantingYear: "2025",
        specs: "Высота 3.2м при посадке, пушистая хвоя, отличная приживаемость.",
        careGuidance: "Полив 40 литров в засуху, весенний комплекс удобрений.",
        frequency: "Каждые 12 дней летом",
        growthPhotos: [
          { date: "Май 2025", url: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=400&auto=format&fit=crop&q=60", notes: "Свежая посадка специалистами." },
          { date: "Июнь 2026", url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&auto=format&fit=crop&q=60", notes: "Дал свежие ветки." }
        ],
        remarks: "Закрывает баню от холодного северного ветра.",
        linkedObjectId: "1"
      },
      {
        id: "p_2",
        name: "Кустовая гортензия 'Грандифлора'",
        category: "flowerbed",
        x: 75,
        y: 40,
        plantingYear: "2025",
        specs: "Крупные белые соцветия, кислая почвенная смесь.",
        careGuidance: "Регулярный полив, санитарная весенняя обрезка.",
        frequency: "Раз в неделю",
        growthPhotos: [
          { date: "Август 2025", url: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&auto=format&fit=crop&q=60", notes: "Период обильного красивого цветения." }
        ],
        remarks: "Посажена около главного входа.",
        linkedObjectId: "1"
      }
    ];
  });

  // Secondary building auxiliary units
  const [secondaryBuildings, setSecondaryBuildings] = useState<SecondaryBuilding[]>(() => {
    const saved = localStorage.getItem("eco_secondary_buildings_v2");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "sb_1",
        parentId: objects[0]?.id || "obj_1",
        type: "banya",
        name: "Русская кедровая баня на дровах",
        builderType: "contractor",
        contractorName: "Сибирская Лесная Компания",
        materials: "Дикий сибирский кедр диаметром 280-320мм, лиственница под венцами",
        completionYear: "2025",
        operationNotes: "Стоит дровяная печь каменка в талькохлорите. Вентиляция Басту. Требуется усадочный контроль раз в полгода.",
        wishes: "Покрасить защитным маслом Osmo веранду следующим летом.",
        growthTimeline: [
          { title: "Заливка фундамента", date: "Апрель 2025", photoUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&auto=format&fit=crop&q=60" },
          { title: "Готовый сруб для отдыха", date: "Сентябрь 2025", photoUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&auto=format&fit=crop&q=60" }
        ]
      },
      {
        id: "sb_2",
        parentId: objects[0]?.id || "obj_1",
        type: "gazebo",
        name: "Всесезонная теплая беседка с камином",
        builderType: "self",
        materials: "Несущий каркас из клееного бруса, раздвижное безрамное стекло Lumon",
        completionYear: "2025",
        operationNotes: "Кирпичный гриль-камин. Электрический подвесной обогреватель.",
        wishes: "Провести дополнительное контурное ретро-освещение.",
        growthTimeline: [
          { title: "Завершение остекления", date: "Ноябрь 2025", photoUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=60" }
        ]
      }
    ];
  });

  // Greenhouses mapping to their planting beds/plots
  const [greenhouseBeds, setGreenhouseBeds] = useState<GreenhouseBed[]>(() => {
    const saved = localStorage.getItem("eco_greenhouse_beds");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "ghb_1",
        greenhouseId: "pb_greenhouse_default",
        label: "Левый ряд томатов",
        plantName: "Черри 'Сладкий фонтан'",
        emoji: "🍅",
        xMeters: 0.5,
        yMeters: 0.5,
        wMeters: 0.8,
        hMeters: 2.0
      },
      {
        id: "ghb_2",
        greenhouseId: "pb_greenhouse_default",
        label: "Правый ряд огурцов",
        plantName: "Огурец 'Герман F1'",
        emoji: "🥒",
        xMeters: 2.5,
        yMeters: 0.5,
        wMeters: 0.8,
        hMeters: 2.0
      }
    ];
  });

  const [seedCatalog, setSeedCatalog] = useState<SeedCatalogItem[]>(() => {
    const saved = localStorage.getItem("eco_seed_catalog");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "seed_1",
        name: "Бычье Сердце",
        emoji: "🍅",
        category: "Томаты",
        characteristics: "Индетерминантный (высокорослый), среднепоздний сорт. Высота куста до 1.5–1.8 м. Требует прочной опоры.",
        fruitDescription: "Плоды очень крупные (300-500 г), мясистые, сердцевидной формы, малиново-красные. Вкус сладкий, сочный, с выраженной кислинкой.",
        careInstructions: "Формирование в 1-2 стебля. Обязательное пасынкование. Умеренный полив под корень, регулярные подкормки.",
        rating: 5,
        plantAgain: "yes",
        notes: "Урожай 2025 года превзошел ожидания. Самые крупные плоды весили до 600г. Отлично для свежих салатов и сока!"
      },
      {
        id: "seed_2",
        name: "Герман F1",
        emoji: "🥒",
        category: "Огурцы",
        characteristics: "Партенокарпический (самоопыляемый) ультраранний гибрид кустового типа. Пучковая завязь.",
        fruitDescription: "Корнишоны длиной 10-12 см, плотные хрустящие, абсолютно без горечи, с частыми бугорками.",
        careInstructions: "Полив теплой водой через день. Светолюбивый, отзывчив на регулярные подкормки.",
        rating: 5,
        plantAgain: "yes",
        notes: "Очень надежный гибрид, устойчив к мучнистой росе. Идеален для засолки на зиму — огурцы остаются твердыми."
      },
      {
        id: "seed_3",
        name: "Калифорнийское чудо",
        emoji: "🫑",
        category: "Перцы",
        characteristics: "Среднеранний сорт сладкого болгарского перца. Куст компактный, высотой 60-70 см.",
        fruitDescription: "Плоды кубовидные, четырехгранные, весом 120-150 г, толщина стенок до 8 мм. Сладкие и ароматные.",
        careInstructions: "Светолюбив и теплолюбив. Полив регулярный теплой водой. Требуется подвязка побегов.",
        rating: 4,
        plantAgain: "maybe",
        notes: "Стенки сочные. Из-за холодного начала лета долго вызревали. Стоит сажать рассадой в теплицу посвежее."
      },
      {
        id: "seed_4",
        name: "Альбион",
        emoji: "🍓",
        category: "Клубника",
        characteristics: "Ремонтантный сорт клубники (плодоносит волнами все лето с мая до заморозков). Мощный куст.",
        fruitDescription: "Ягоды крупные (30-50 г), продолговатые, глянцевые, темно-красные. Мякоть плотная, ароматная.",
        careInstructions: "Регулярный полив, мульчирование соломой или агроволокном, удаление усов.",
        rating: 5,
        plantAgain: "yes",
        notes: "Давал потрясающие ягоды до самого октября! Плотные плоды хорошо транспортируются."
      },
      {
        id: "seed_5",
        name: "Фиолетовый Ереванский",
        emoji: "🥬",
        category: "Зелень",
        characteristics: "Среднеспелый сорт базилика. Куст раскидистый, высотой 40-60 см со множеством побегов.",
        fruitDescription: "Листья гладкие, фиолетовые, ароматные, с пикантным гвоздично-перечным вкусом.",
        careInstructions: "Любит тепло и солнце. Регулярная срезка верхушек побегов увеличивает урожайность.",
        rating: 4,
        plantAgain: "yes",
        notes: "Шикарный сорт базилика. Быстро отрастает после срезки, чудесен для свежих салатов и соуса песто."
      }
    ];
  });

  const [seedEditingId, setSeedEditingId] = useState<string | null>(null);
  const [seedSearchQuery, setSeedSearchQuery] = useState<string>("");
  const [seedCategoryFilter, setSeedCategoryFilter] = useState<string>("all");
  const [isAddingSeed, setIsAddingSeed] = useState<boolean>(false);
  const [seedForm, setSeedForm] = useState<Partial<SeedCatalogItem>>({
    name: "",
    emoji: "🍅",
    category: "Томаты",
    characteristics: "",
    fruitDescription: "",
    careInstructions: "",
    rating: 5,
    plantAgain: "yes",
    notes: ""
  });

  useEffect(() => {
    localStorage.setItem("eco_seed_catalog", JSON.stringify(seedCatalog));
  }, [seedCatalog]);

  const [selectedGreenhouseIdForEditor, setSelectedGreenhouseIdForEditor] = useState<string | null>(null);
  const [selectedGreenhouseBedId, setSelectedGreenhouseBedId] = useState<string | null>(null);

  const [activeGhDragId, setActiveGhDragId] = useState<string | null>(null);
  const [activeGhResizeId, setActiveGhResizeId] = useState<string | null>(null);
  const [activeGhResizeDir, setActiveGhResizeDir] = useState<string | null>(null);
  const ghDragStartRef = useRef<{
    initMouseX: number;
    initMouseY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({ initMouseX: 0, initMouseY: 0, initX: 0, initY: 0, initW: 0, initH: 0 });
  const ghCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("eco_greenhouse_beds", JSON.stringify(greenhouseBeds));
  }, [greenhouseBeds]);

  useEffect(() => {
    if (!activeGhDragId && !activeGhResizeId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasEl = ghCanvasRef.current;
      if (!canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      const gh = planBuildings.find(item => item.id === selectedGreenhouseIdForEditor);
      if (!gh) return;

      const W_gh = gh.wMeters || 4;
      const H_gh = gh.hMeters || 3;

      const currentMouseX = e.clientX;
      const currentMouseY = e.clientY;

      const startMouseX = ghDragStartRef.current.initMouseX;
      const startMouseY = ghDragStartRef.current.initMouseY;

      const deltaXPixels = currentMouseX - startMouseX;
      const deltaYPixels = currentMouseY - startMouseY;

      const deltaXMeters = (deltaXPixels / rect.width) * W_gh;
      const deltaYMeters = -(deltaYPixels / rect.height) * H_gh;

      const startX = ghDragStartRef.current.initX;
      const startY = ghDragStartRef.current.initY;
      const startW = ghDragStartRef.current.initW;
      const startH = ghDragStartRef.current.initH;

      if (activeGhDragId) {
        let newX = startX + deltaXMeters;
        let newY = startY + deltaYMeters;

        newX = parseFloat(Math.max(0, Math.min(W_gh - startW, newX)).toFixed(1));
        newY = parseFloat(Math.max(0, Math.min(H_gh - startH, newY)).toFixed(1));

        setGreenhouseBeds(prev => prev.map(b => {
          if (b.id === activeGhDragId) {
            return { ...b, xMeters: newX, yMeters: newY };
          }
          return b;
        }));
      } else if (activeGhResizeId) {
        let newX = startX;
        let newY = startY;
        let newW = startW;
        let newH = startH;

        const dir = activeGhResizeDir || "";

        if (dir.includes("e")) {
          newW = startW + deltaXMeters;
        }
        if (dir.includes("w")) {
          newW = startW - deltaXMeters;
          newX = startX + deltaXMeters;
        }
        if (dir.includes("n")) {
          newH = startH + deltaYMeters;
        }
        if (dir.includes("s")) {
          newH = startH - deltaYMeters;
          newY = startY + deltaYMeters;
        }

        const minSize = 0.2;
        if (newW < minSize) {
          if (dir.includes("w")) {
            newX = startX + (startW - minSize);
          }
          newW = minSize;
        }
        if (newH < minSize) {
          if (dir.includes("s")) {
            newY = startY + (startH - minSize);
          }
          newH = minSize;
        }

        if (newX < 0) {
          newW += newX;
          newX = 0;
        }
        if (newY < 0) {
          newH += newY;
          newY = 0;
        }
        if (newX + newW > W_gh) {
          newW = W_gh - newX;
        }
        if (newY + newH > H_gh) {
          newH = H_gh - newY;
        }

        newX = parseFloat(newX.toFixed(1));
        newY = parseFloat(newY.toFixed(1));
        newW = parseFloat(newW.toFixed(1));
        newH = parseFloat(newH.toFixed(1));

        setGreenhouseBeds(prev => prev.map(b => {
          if (b.id === activeGhResizeId) {
            return {
              ...b,
              xMeters: newX,
              yMeters: newY,
              wMeters: newW,
              hMeters: newH
            };
          }
          return b;
        }));
      }
    };

    const handleMouseUp = () => {
      setActiveGhDragId(null);
      setActiveGhResizeId(null);
      setActiveGhResizeDir(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeGhDragId, activeGhResizeId, activeGhResizeDir, selectedGreenhouseIdForEditor, planBuildings]);

  // Chronicles
  const [chronicles, setChronicles] = useState<ChronicleDiaryEntry[]>(() => {
    const saved = localStorage.getItem("eco_chronicles_v2");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "ch_1",
        date: "2024-04-10",
        title: "Покупка участка: Выбор места для очага",
        description: "Оформили договор купли-продажи на прилесной участок.",
        memories: "Мы осмотрели более десяти дачных поселков и деревень. Но этот покорил сразу — вековые сосны по границе, полное ощущение тишины и чистейший воздух Раменского. Семейный совет постановил: строим здесь родовое гнездо!",
        ideaProcess: "Долго спорили о размере дома — разумный минимализм победил. Заказали проект у индивидуального архитектора.",
        designMoodboardUrl: "https://images.unsplash.com/photo-1464146072144-62488898240b?w=400&auto=format&fit=crop&q=60",
        boughtFurniture: [],
        photoUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&auto=format&fit=crop&q=60",
        objectId: "1"
      },
      {
        id: "ch_2",
        date: "2025-07-20",
        title: "Обустройство убранства террасы",
        description: "Первые посиделки под мягким светом ламп.",
        memories: "Завершили заливку веранды и выложили ее декингом. Купили шикарные деревянные стулья и обустроили чайную зону. Теперь встречаем закаты с видом на сосны.",
        ideaProcess: "Хотелось теплые кофейные оттенки и натуральный ротанг, чтобы стилистика мягко вливалась в природу вокруг.",
        designMoodboardUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=60",
        boughtFurniture: [
          { item: "Плетеный угловой диван 'Палисандр'", storeName: "Аутлет Ротанг-Декор", storeAddress: "Москва, Новорязанское ш., д. 21" },
          { item: "Уличный газовый обогреватель Enders", storeName: "Мир Грилей на МКАД", storeAddress: "Москва, 41-й км МКАД" }
        ],
        photoUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&auto=format&fit=crop&q=60",
        objectId: "1"
      }
    ];
  });

  // Save to localStorage
  useEffect(() => { localStorage.setItem("eco_my_gardens_v2", JSON.stringify(gardens)); }, [gardens]);
  useEffect(() => { localStorage.setItem("eco_boundary_lines", JSON.stringify(boundaryLines)); }, [boundaryLines]);
  useEffect(() => { localStorage.setItem("eco_plan_buildings", JSON.stringify(planBuildings)); }, [planBuildings]);
  useEffect(() => { localStorage.setItem("eco_plant_nodes_v2", JSON.stringify(plantNodes)); }, [plantNodes]);
  useEffect(() => { localStorage.setItem("eco_secondary_buildings_v2", JSON.stringify(secondaryBuildings)); }, [secondaryBuildings]);
  useEffect(() => { localStorage.setItem("eco_chronicles_v2", JSON.stringify(chronicles)); }, [chronicles]);
  useEffect(() => { localStorage.setItem("eco_plot_corners_v2", JSON.stringify(plotCorners)); }, [plotCorners]);

  // Selected Building Object
  const [selectedObjectId, setSelectedObjectId] = useState<string>(() => {
    const cached = localStorage.getItem("eco_selected_object_id_cache");
    if (cached && objects.some(o => o.id === cached)) return cached;
    return "";
  });

  useEffect(() => {
    if (selectedObjectId) {
      localStorage.setItem("eco_selected_object_id_cache", selectedObjectId);
    } else {
      localStorage.removeItem("eco_selected_object_id_cache");
    }
  }, [selectedObjectId]);

  const getPlotDimForObject = (objId: string) => {
    const defaults: Record<string, { width: number; height: number }> = {
      "1": { width: 45, height: 30 },
      "gar_1": { width: 60, height: 40 }
    };
    return plotDimensions[objId] || defaults[objId] || { width: 40, height: 25 };
  };

  const getPlotCorners = (objId: string, width: number, height: number): Array<{ x: number; y: number }> => {
    if (plotCorners[objId] && plotCorners[objId].length >= 3) {
      return plotCorners[objId];
    }
    // Return standard 4 corners
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];
  };

  const calculatePolygonArea = (corners: Array<{ x: number; y: number }>) => {
    let numSum = 0;
    for (let i = 0; i < corners.length; i++) {
      const nextIndex = (i + 1) % corners.length;
      numSum += (corners[i].x * corners[nextIndex].y) - (corners[nextIndex].x * corners[i].y);
    }
    return Math.abs(numSum / 2);
  };

  const normalizeItems = (objId: string) => {
    const dim = getPlotDimForObject(objId);
    const W = dim.width;
    const H = dim.height;

    // Normalize planBuildings
    let changedBuilds = false;
    const updatedBuilds = planBuildings.map(b => {
      // Only modify matching object or if match property is missing select-all
      if (b.linkedObjectId && b.linkedObjectId !== objId) return b;
      
      let updated = { ...b };
      let bChanged = false;
      
      if (updated.xMeters === undefined) {
        updated.xMeters = Math.max(0, Math.min(W, Math.round(((b.x || 0) / 100) * W)));
        bChanged = true;
      }
      if (updated.yMeters === undefined) {
        const yTop = b.y || 20;
        const hPct = b.height || 15;
        updated.yMeters = Math.max(0, Math.min(H, Math.round(H * (1 - (yTop + hPct) / 100))));
        bChanged = true;
      }
      if (updated.wMeters === undefined) {
        updated.wMeters = Math.max(1, Math.round(((b.width || 20) / 100) * W));
        bChanged = true;
      }
      if (updated.hMeters === undefined) {
        updated.hMeters = Math.max(1, Math.round(((b.height || 16) / 100) * H));
        bChanged = true;
      }
      if (!updated.itemType) {
        updated.itemType = b.label?.toLowerCase().includes("дорожка") || b.label?.toLowerCase().includes("тропа") ? "path" : "building";
        updated.subType = b.label?.toLowerCase().includes("баня") ? "banya" : "house";
        bChanged = true;
      }
      if (updated.rotation === undefined) {
        updated.rotation = 0;
        bChanged = true;
      }
      if (!b.linkedObjectId) {
        updated.linkedObjectId = objId;
        bChanged = true;
      }
      
      if (bChanged) {
        changedBuilds = true;
      }
      return updated;
    });

    if (changedBuilds) {
      setPlanBuildings(updatedBuilds);
    }

    // Normalize plantNodes
    let changedPlants = false;
    const updatedPlants = plantNodes.map(p => {
      if (p.linkedObjectId && p.linkedObjectId !== objId) return p;
      
      let updated = { ...p };
      let pChanged = false;
      
      if (updated.xMeters === undefined) {
        updated.xMeters = Math.max(0, Math.min(W, Math.round(((p.x || 0) / 100) * W)));
        pChanged = true;
      }
      if (updated.yMeters === undefined) {
        updated.yMeters = Math.max(0, Math.min(H, Math.round(H * (1 - (p.y || 0) / 100))));
        pChanged = true;
      }
      if (updated.diameterMeters === undefined) {
        updated.diameterMeters = p.category === "conifer" ? 3 : p.category === "deciduous" ? 4 : p.category === "bush" ? 2 : 1.5;
        pChanged = true;
      }
      if (!p.linkedObjectId) {
        updated.linkedObjectId = objId;
        pChanged = true;
      }
      if (pChanged) {
        changedPlants = true;
      }
      return updated;
    });

    if (changedPlants) {
      setPlantNodes(updatedPlants);
    }
  };

  useEffect(() => {
    if (selectedObjectId) {
      normalizeItems(selectedObjectId);
    }
  }, [selectedObjectId]);

  // Selection states
  const [selectedPlant, setSelectedPlant] = useState<PlantNode | null>(null);
  const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
  
  // History Selection & Edit Mode
  const [selectedChronicle, setSelectedChronicle] = useState<ChronicleDiaryEntry | null>(null);
  const [isInEditChronicleMode, setIsInEditChronicleMode] = useState<boolean>(false);
  const [chronicleEditForm, setChronicleEditForm] = useState<ChronicleDiaryEntry | null>(null);
  const [isAddingChronicle, setIsAddingChronicle] = useState<boolean>(false);
  
  // Local temporary states for Chronicle furniture sub-form
  const [newChFurnitureItem, setNewChFurnitureItem] = useState<string>("");
  const [newChFurnitureStore, setNewChFurnitureStore] = useState<string>("");
  const [newChFurnitureAddr, setNewChFurnitureAddr] = useState<string>("");

  // Secondary building edit mode states
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [buildingEditForm, setBuildingEditForm] = useState<SecondaryBuilding | null>(null);
  const [isAddingSecondaryBuilding, setIsAddingSecondaryBuilding] = useState<boolean>(false);

  // Service Companies state
  const [serviceCompanies, setServiceCompanies] = useState<any[]>(() => {
    const saved = localStorage.getItem("eco_service_companies_v2");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: "srv_1",
        name: "Служба дезинсекции «Анти-Клещ Москва»",
        specialistName: "Дмитрий Семенов",
        phone: "+7 (999) 123-45-67",
        scopeType: "garden", // 'garden' | 'building' | 'equipment'
        scopeId: "gar_1",
        scopeName: "Усадебный сад Раменское",
        scheduleDescription: "Две сезонных весенне-летних обработки участка",
        accessType: "onetime", // 'permanent' | 'onetime'
        tokenStatus: "inactive",
        temporalToken: "ONETIME-DEZ-4471",
        linkedScheduleId: schedules[0]?.id || ""
      },
      {
        id: "srv_2",
        name: "ИП Григорий — Автополив и Водоснабжение",
        specialistName: "Григорий Назаров",
        phone: "+7 (912) 777-88-99",
        scopeType: "equipment",
        scopeId: "equip_irrigation",
        scopeName: "Автополив Hunter",
        scheduleDescription: "Ежегодно весенний пуск и осенняя зазимовка системы",
        accessType: "permanent",
        tokenStatus: "active",
        temporalToken: "PERM-IRRI-9922",
        linkedScheduleId: schedules[1]?.id || ""
      },
      {
        id: "srv_3",
        name: "Мастер Кроны «Садовник-Плюс»",
        specialistName: "Егор Соболев",
        phone: "+7 (905) 555-44-22",
        scopeType: "building",
        scopeId: "sb_1",
        scopeName: "Русская кедровая баня на дровах",
        scheduleDescription: "Квартальная фигурная обрезка плодовых кустарников, побелка яблонь",
        accessType: "onetime",
        tokenStatus: "inactive",
        temporalToken: "ONETIME-KRN-1205",
        linkedScheduleId: schedules[0]?.id || ""
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("eco_service_companies_v2", JSON.stringify(serviceCompanies));
  }, [serviceCompanies]);

  const [activeQrCompany, setActiveQrCompany] = useState<any | null>(null);
  const [isAddingServiceCompany, setIsAddingServiceCompany] = useState<boolean>(false);
  const [editingServiceCompanyId, setEditingServiceCompanyId] = useState<string | null>(null);
  const [companyEditForm, setCompanyEditForm] = useState<any>({
    id: "",
    name: "",
    specialistName: "",
    phone: "",
    scopeType: "garden",
    scopeId: "",
    scopeName: "",
    scheduleDescription: "",
    accessType: "onetime",
    tokenStatus: "inactive",
    temporalToken: "",
    linkedScheduleId: ""
  });

  // Planogram state extensions
  const [selectedPlanBuildingId, setSelectedPlanBuildingId] = useState<string | null>(null);
  const [selectedBoundaryLineId, setSelectedBoundaryLineId] = useState<string | null>(null);

  // Dragging and resizing states
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<"building" | "plant" | null>(null);
  const [activeResizeId, setActiveResizeId] = useState<string | null>(null);
  const [activeResizeDirection, setActiveResizeDirection] = useState<string | null>(null); // "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se" | "plant_diameter"

  const dragStartRef = useRef<{
    initMouseX: number;
    initMouseY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({ initMouseX: 0, initMouseY: 0, initX: 0, initY: 0, initW: 0, initH: 0 });

  const [isEditingPlanogram, setIsEditingPlanogram] = useState<boolean>(false);

  // States for adding precise plant growth logs and state updates
  const [isAddingPlantPhotoForm, setIsAddingPlantPhotoForm] = useState<boolean>(false);
  const [newPlantPhotoNotes, setNewPlantPhotoNotes] = useState<string>("");
  const [newPlantPhotoPreset, setNewPlantPhotoPreset] = useState<string>("https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=400&auto=format&fit=crop&q=60");

  // Social share preview modal state
  const [shareEntry, setShareEntry] = useState<ChronicleDiaryEntry | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Property Handover / Transfer Modal State for sale
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferEmail, setTransferEmail] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [transferSuccess, setTransferSuccess] = useState<boolean>(false);

  // Sub-tabs for the garden app section
  const [gardenSubTab, setGardenSubTab] = useState<"planogram" | "gardens" | "services" | "branding" | "support">("planogram");

  // Drawing Canvas Tools
  const [canvasTool, setCanvasTool] = useState<"select" | "boundary" | "building" | "plant">("select");
  const [selectedPlantCategoryIcon, setSelectedPlantCategoryIcon] = useState<PlantNode["category"]>("conifer");
  const [newBuildingLabel, setNewBuildingLabel] = useState<string>("Навес для авто");
  const [newBoundaryLength, setNewBoundaryLength] = useState<string>("Забор (15 метров)");
  const [drawingStartPoint, setDrawingStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Ref to planogram bounding rectangle
  const canvasRef = useRef<HTMLDivElement>(null);

  // Global mouse coordination engine for dragging & resizing planogram elements
  useEffect(() => {
    if (!activeDragId && !activeResizeId && activeCornerIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const currentDim = getPlotDimForObject(selectedObjectId || "1");
      const W = currentDim.width;
      const H = currentDim.height;

      if (activeCornerIndex !== null) {
        const mouseXCanvas = ((e.clientX - rect.left) / rect.width) * W;
        const mouseYCanvas = (1 - (e.clientY - rect.top) / rect.height) * H;
        
        const targetX = Math.max(0, Math.min(W, Math.round(mouseXCanvas)));
        const targetY = Math.max(0, Math.min(H, Math.round(mouseYCanvas)));
        
        setPlotCorners(prev => {
          const corners = [...getPlotCorners(selectedObjectId || "1", W, H)];
          if (corners[activeCornerIndex]) {
            corners[activeCornerIndex] = { x: targetX, y: targetY };
            return {
              ...prev,
              [selectedObjectId || "1"]: corners
            };
          }
          return prev;
        });
        return;
      }

      const currentMouseX = e.clientX;
      const currentMouseY = e.clientY;
      const startMouseX = dragStartRef.current.initMouseX;
      const startMouseY = dragStartRef.current.initMouseY;

      const deltaXPixels = currentMouseX - startMouseX;
      const deltaYPixels = currentMouseY - startMouseY;

      const deltaXMeters = (deltaXPixels / rect.width) * W;
      const deltaYMeters = -(deltaYPixels / rect.height) * H;

      const startX = dragStartRef.current.initX;
      const startY = dragStartRef.current.initY;
      const startW = dragStartRef.current.initW;
      const startH = dragStartRef.current.initH;

      if (activeDragId) {
        if (activeDragType === "building") {
          let newX = Math.round(startX + deltaXMeters);
          let newY = Math.round(startY + deltaYMeters);

          newX = Math.max(0, Math.min(W - startW, newX));
          newY = Math.max(0, Math.min(H - startH, newY));

          setPlanBuildings(prev => prev.map(b => {
            if (b.id === activeDragId) {
              const xPct = Math.round((newX / W) * 100);
              const yPct = Math.round((newY / H) * 100);
              return { ...b, xMeters: newX, yMeters: newY, x: xPct, y: yPct };
            }
            return b;
          }));
        } else if (activeDragType === "plant") {
          let newX = Math.round(startX + deltaXMeters);
          let newY = Math.round(startY + deltaYMeters);

          newX = Math.max(0, Math.min(W, newX));
          newY = Math.max(0, Math.min(H, newY));

          setPlantNodes(prev => prev.map(p => {
            if (p.id === activeDragId) {
              const xPct = Math.round((newX / W) * 100);
              const yPct = Math.round((newY / H) * 100);
              return { ...p, xMeters: newX, yMeters: newY, x: xPct, y: yPct };
            }
            return p;
          }));

          setSelectedPlant(prev => {
            if (prev?.id === activeDragId) {
              const xPct = Math.round((newX / W) * 100);
              const yPct = Math.round((newY / H) * 100);
              return { ...prev, xMeters: newX, yMeters: newY, x: xPct, y: yPct };
            }
            return prev;
          });
        }
      } else if (activeResizeId) {
        if (activeResizeDirection === "plant_diameter") {
          const currentMouseXCanvas = ((e.clientX - rect.left) / rect.width) * W;
          const currentMouseYCanvas = (1 - (e.clientY - rect.top) / rect.height) * H;

          const plant = plantNodes.find(p => p.id === activeResizeId);
          if (plant) {
            const centerX = plant.xMeters || 0;
            const centerY = plant.yMeters || 0;
            const dist = Math.sqrt(Math.pow(currentMouseXCanvas - centerX, 2) + Math.pow(currentMouseYCanvas - centerY, 2));

            let newDiam = Math.round(dist * 2);
            newDiam = Math.max(1, Math.min(30, newDiam));

            setPlantNodes(prev => prev.map(p => {
              if (p.id === activeResizeId) {
                return { ...p, diameterMeters: newDiam };
              }
              return p;
            }));

            setSelectedPlant(prev => {
              if (prev?.id === activeResizeId) {
                return { ...prev, diameterMeters: newDiam };
              }
              return prev;
            });
          }
        } else {
          let newX = startX;
          let newY = startY;
          let newW = startW;
          let newH = startH;

          const dir = activeResizeDirection || "";

          if (dir.includes("e")) {
            newW = startW + deltaXMeters;
          }
          if (dir.includes("w")) {
            newW = startW - deltaXMeters;
            newX = startX + deltaXMeters;
          }
          if (dir.includes("n")) {
            newH = startH + deltaYMeters;
          }
          if (dir.includes("s")) {
            newH = startH - deltaYMeters;
            newY = startY + deltaYMeters;
          }

          const minSize = 1;
          if (newW < minSize) {
            if (dir.includes("w")) {
               newX = startX + (startW - minSize);
            }
            newW = minSize;
          }
          if (newH < minSize) {
            if (dir.includes("s")) {
               newY = startY + (startH - minSize);
            }
            newH = minSize;
          }

          if (newX < 0) {
            newW += newX;
            newX = 0;
          }
          if (newY < 0) {
            newH += newY;
            newY = 0;
          }
          if (newX + newW > W) {
            newW = W - newX;
          }
          if (newY + newH > H) {
            newH = H - newY;
          }

          newX = Math.round(newX);
          newY = Math.round(newY);
          newW = Math.round(newW);
          newH = Math.round(newH);

          setPlanBuildings(prev => prev.map(b => {
            if (b.id === activeResizeId) {
              const xPct = Math.round((newX / W) * 100);
              const yPct = Math.round((newY / H) * 100);
              const wPct = Math.round((newW / W) * 100);
              const hPct = Math.round((newH / H) * 100);
              return {
                ...b,
                xMeters: newX,
                yMeters: newY,
                wMeters: newW,
                hMeters: newH,
                x: xPct,
                y: yPct,
                width: wPct,
                height: hPct
              };
            }
            return b;
          }));
        }
      }
    };

    const handleMouseUp = () => {
      setActiveDragId(null);
      setActiveDragType(null);
      setActiveResizeId(null);
      setActiveResizeDirection(null);
      setActiveCornerIndex(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeDragId, activeDragType, activeResizeId, activeResizeDirection, activeCornerIndex, selectedObjectId, plantNodes, plotCorners]);

  // Forms states for creating new entities
  // Add Garden
  const [newGardenForm, setNewGardenForm] = useState({
    name: "", address: "", coords: "", designer: "", creationHistory: "", linkedObjectId: ""
  });
  // Add Plant
  const [newPlantForm, setNewPlantForm] = useState({
    name: "", plantingYear: "2026", specs: "", careGuidance: "", frequency: "Раз в неделю", remarks: ""
  });

  // Handlers for chronicles
  const handleStartEditChronicle = (entry: ChronicleDiaryEntry) => {
    setChronicleEditForm({ ...entry });
    setIsInEditChronicleMode(true);
  };

  const handleSaveChronicleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chronicleEditForm) return;

    setChronicles(prev => prev.map(ch => ch.id === chronicleEditForm.id ? chronicleEditForm : ch));
    setSelectedChronicle(chronicleEditForm);
    setIsInEditChronicleMode(false);
    setChronicleEditForm(null);
  };

  const handleCreateChronicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chronicleEditForm) return;

    const newCh: ChronicleDiaryEntry = {
      ...chronicleEditForm,
      id: "ch_" + Date.now(),
      date: chronicleEditForm.date || new Date().toISOString().split("T")[0],
      objectId: selectedObjectId
    };

    setChronicles(prev => [newCh, ...prev]);
    setIsAddingChronicle(false);
    setChronicleEditForm(null);
    setSelectedChronicle(newCh);
  };

  const handleDeleteChronicle = (id: string) => {
    setChronicles(prev => prev.filter(ch => ch.id !== id));
    if (selectedChronicle?.id === id) {
      setSelectedChronicle(null);
    }
  };

  // Service Companies dynamic helpers
  const startNewCompanyForm = () => {
    const parentId = gardens[0]?.id || "gar_1";
    const parentName = gardens[0]?.name || "Усадебный сад Раменское";
    setCompanyEditForm({
      id: "",
      name: "",
      specialistName: "",
      phone: "",
      scopeType: "garden",
      scopeId: parentId,
      scopeName: parentName,
      scheduleDescription: "Регулярный сезонный уход",
      accessType: "onetime",
      tokenStatus: "inactive",
      temporalToken: "ONETIME-" + Math.floor(1000 + Math.random() * 9000),
      linkedScheduleId: schedules[0]?.id || ""
    });
    setEditingServiceCompanyId(null);
    setIsAddingServiceCompany(true);
  };

  const startEditCompanyForm = (company: any) => {
    setCompanyEditForm({ ...company });
    setEditingServiceCompanyId(company.id);
    setIsAddingServiceCompany(true);
  };

  const handleSaveCompanyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyEditForm.name) return;

    // Auto resolve descriptive title based on selection
    let resolvedScopeName = companyEditForm.scopeName;
    if (companyEditForm.scopeType === "garden") {
      const g = gardens.find(x => x.id === companyEditForm.scopeId);
      if (g) resolvedScopeName = g.name;
    } else if (companyEditForm.scopeType === "building") {
      const b = secondaryBuildings.find(x => x.id === companyEditForm.scopeId);
      if (b) resolvedScopeName = b.name;
    } else if (companyEditForm.scopeType === "equipment") {
      if (!companyEditForm.scopeId || companyEditForm.scopeId === "custom") {
        resolvedScopeName = companyEditForm.scopeName || "Инженерные системы";
      } else {
        resolvedScopeName = companyEditForm.scopeId === "equip_heating" ? "Отопление и Котел" :
                             companyEditForm.scopeId === "equip_irrigation" ? "Автополив Hunter" :
                             companyEditForm.scopeId === "equip_septic" ? "Септик Топас" : "Электрика и Вентиляция";
      }
    }

    const payload = {
      ...companyEditForm,
      scopeName: resolvedScopeName
    };

    if (editingServiceCompanyId) {
      setServiceCompanies(prev => prev.map(c => c.id === editingServiceCompanyId ? payload : c));
    } else {
      setServiceCompanies(prev => [...prev, { ...payload, id: "srv_" + Date.now() }]);
    }

    setIsAddingServiceCompany(false);
    setEditingServiceCompanyId(null);
  };

  const handleDeleteCompany = (id: string) => {
    setServiceCompanies(prev => prev.filter(c => c.id !== id));
    if (activeQrCompany?.id === id) setActiveQrCompany(null);
  };

  const handleTriggerOnetimeAccess = (companyId: string) => {
    const updatedToken = "SMS-PIN-" + Math.floor(1000 + Math.random() * 9000);
    setServiceCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const updated = { ...c, tokenStatus: "active", temporalToken: updatedToken };
        setActiveQrCompany(updated);
        return updated;
      }
      return c;
    }));
  };

  const handleRevokeAccess = (companyId: string) => {
    setServiceCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        return { ...c, tokenStatus: "inactive" };
      }
      return c;
    }));
    alert("Доступ для специалиста аннулирован.");
  };

  const startNewChronicleForm = () => {
    setChronicleEditForm({
      id: "",
      date: new Date().toISOString().split("T")[0],
      title: "",
      description: "",
      memories: "",
      ideaProcess: "",
      designMoodboardUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=60",
      photoUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&auto=format&fit=crop&q=60",
      boughtFurniture: []
    });
    setIsAddingChronicle(true);
  };

  // Service Companies CRUD Handlers
  const handleToggleServiceAccess = (id: string) => {
    setServiceCompanies(prev => prev.map(company => {
      if (company.id === id) {
        const nextStatus = company.tokenStatus === "active" ? "inactive" : "active";
        return { ...company, tokenStatus: nextStatus };
      }
      return company;
    }));
  };

  const handleStartAddServiceCompany = () => {
    setCompanyEditForm({
      id: "",
      name: "",
      specialistName: "",
      phone: "",
      scopeType: "garden",
      scopeId: gardens[0]?.id || "",
      scopeName: gardens[0]?.name || "Усадебный сад",
      scheduleDescription: "",
      accessType: "onetime",
      tokenStatus: "inactive",
      temporalToken: "ONETIME-" + Math.floor(1000 + Math.random() * 9000),
      linkedScheduleId: schedules[0]?.id || ""
    });
    setEditingServiceCompanyId(null);
    setIsAddingServiceCompany(true);
  };

  const handleStartEditServiceCompany = (company: any) => {
    setCompanyEditForm({ ...company });
    setEditingServiceCompanyId(company.id);
    setIsAddingServiceCompany(true);
  };

  const handleSaveServiceCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyEditForm.name) {
      alert("Название службы обязательно!");
      return;
    }

    // Determine scope name based on scope type and scope ID selection
    let resolvedScopeName = "";
    if (companyEditForm.scopeType === "garden") {
      const g = gardens.find(item => item.id === companyEditForm.scopeId);
      resolvedScopeName = g ? g.name : "Усадебный сад";
    } else if (companyEditForm.scopeType === "building") {
      const b = secondaryBuildings.find(item => item.id === companyEditForm.scopeId);
      resolvedScopeName = b ? b.name : "Строение";
    } else if (companyEditForm.scopeType === "equipment") {
      resolvedScopeName = companyEditForm.scopeName || "Инженерная система";
    }

    const payload = {
      ...companyEditForm,
      scopeName: resolvedScopeName || "Связанный объект"
    };

    if (editingServiceCompanyId) {
      setServiceCompanies(prev => prev.map(item => item.id === editingServiceCompanyId ? payload : item));
    } else {
      setServiceCompanies(prev => [...prev, { ...payload, id: "srv_" + Date.now() }]);
    }

    setIsAddingServiceCompany(false);
    setEditingServiceCompanyId(null);
  };

  const handleDeleteServiceCompany = (id: string) => {
    setServiceCompanies(prev => prev.filter(item => item.id !== id));
  };

  // Handlers for Planogram Drawing Interaction
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (canvasTool === "boundary") {
      if (!drawingStartPoint) {
        setDrawingStartPoint({ x: clickX, y: clickY });
      } else {
        const newLine: BoundaryLine = {
          id: "BL_" + Date.now(),
          startX: drawingStartPoint.x,
          startY: drawingStartPoint.y,
          endX: clickX,
          endY: clickY,
          lengthLabel: newBoundaryLength
        };
        setBoundaryLines(prev => [...prev, newLine]);
        setDrawingStartPoint(null);
      }
    } 
    else if (canvasTool === "building") {
      const newB: PlanogramBuilding = {
        id: "PB_" + Date.now(),
        x: clickX - 10 < 0 ? 0 : clickX - 10,
        y: clickY - 8 < 0 ? 0 : clickY - 8,
        width: 20,
        height: 16,
        label: newBuildingLabel,
        color: "rgba(16, 185, 129, 0.2)"
      };
      setPlanBuildings(prev => [...prev, newB]);
    } 
    else if (canvasTool === "plant") {
      const newP: PlantNode = {
        id: "Pl_" + Date.now(),
        name: `Контрольная метка: ${selectedPlantCategoryIcon === "conifer" ? "Хвойное" : selectedPlantCategoryIcon === "deciduous" ? "Лиственное" : selectedPlantCategoryIcon === "bush" ? "Куст" : selectedPlantCategoryIcon === "flowerbed" ? "Клумба" : "Грядка"}`,
        category: selectedPlantCategoryIcon,
        x: clickX,
        y: clickY,
        plantingYear: "2026",
        specs: "Характеристики растения вносятся вручную.",
        careGuidance: "Обильный полив в весенне-летний период.",
        frequency: "1 раз в неделю",
        growthPhotos: [
          { date: "Июнь 2026", url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&auto=format&fit=crop&q=60", notes: "Отметка установлена на электронной карте." }
        ],
        remarks: "Посадка произведена согласно ландшафтному календарю."
      };
      setPlantNodes(prev => [...prev, newP]);
      setSelectedPlant(newP);
    }
  };

  const handleRemoveBoundary = (id: string) => {
    setBoundaryLines(prev => prev.filter(l => l.id !== id));
  };

  const handleRemovePlanBuilding = (id: string) => {
    setPlanBuildings(prev => prev.filter(b => b.id !== id));
  };

  const handleAddPhotosToPlant = (plantId: string) => {
    const urls = [
      "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=400&auto=format&fit=crop&q=60"
    ];
    const pickUrl = urls[Math.floor(Math.random() * urls.length)];
    const dateStr = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    setPlantNodes(prev => prev.map(p => {
      if (p.id === plantId) {
        const updatedPhotos = [...p.growthPhotos, { date: dateStr, url: pickUrl, notes: "Обновлено хозяином через фотоархив Мой цифровой дом" }];
        const updated = { ...p, growthPhotos: updatedPhotos };
        if (selectedPlant?.id === plantId) setSelectedPlant(updated);
        return updated;
      }
      return p;
    }));
  };

  const handleUpdatePlantFields = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlant) return;
    setPlantNodes(prev => prev.map(p => p.id === selectedPlant.id ? selectedPlant : p));
    setEditingPlantId(null);
  };

  const handleDeletePlant = (plantId: string) => {
    setPlantNodes(prev => prev.filter(p => p.id !== plantId));
    setSelectedPlant(null);
  };

  // Handlers for "Мои постройки"
  const startEditingBuilding = (b: SecondaryBuilding) => {
    setBuildingEditForm({ ...b });
    setEditingBuildingId(b.id);
  };

  const handleSaveBuildingEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingEditForm) return;
    setSecondaryBuildings(prev => prev.map(b => b.id === buildingEditForm.id ? buildingEditForm : b));
    setEditingBuildingId(null);
    setBuildingEditForm(null);
  };

  const handleCreateSecondaryBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingEditForm) return;

    const completeNewBuilding: SecondaryBuilding = {
      ...buildingEditForm,
      id: "sb_" + Date.now(),
      parentId: selectedObjectId
    };

    setSecondaryBuildings(prev => [...prev, completeNewBuilding]);
    setIsAddingSecondaryBuilding(false);
    setBuildingEditForm(null);
  };

  const startNewBuildingForm = () => {
    setBuildingEditForm({
      id: "",
      parentId: selectedObjectId,
      type: "banya",
      name: "",
      builderType: "contractor",
      contractorName: "",
      materials: "",
      completionYear: "2026",
      operationNotes: "",
      wishes: "",
      growthTimeline: [
        { title: "Заливка площадки фундамента", date: "Май 2026", photoUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&auto=format&fit=crop&q=60" }
      ]
    });
    setIsAddingSecondaryBuilding(true);
  };

  const handleDeleteSecondaryBuilding = (id: string) => {
    setSecondaryBuildings(prev => prev.filter(b => b.id !== id));
  };

  const appendPhotoToBuilding = (buildingId: string) => {
    const urls = [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=60"
    ];
    const pickUrl = urls[Math.floor(Math.random() * urls.length)];
    const titleUser = prompt("Как назвать фотографию процесса или результата?", "Этап отделочных работ");
    if (!titleUser) return;

    setSecondaryBuildings(prev => prev.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          growthTimeline: [...b.growthTimeline, {
            title: titleUser,
            date: new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
            photoUrl: pickUrl
          }]
        };
      }
      return b;
    }));
  };

  // Handler for direct property passport transmission (sale handover)
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail) return;
    setTransferSuccess(true);
    setTimeout(() => {
      setTransferSuccess(false);
      setIsTransferModalOpen(false);
      setTransferEmail("");
    }, 5000);
  };

  // Auxiliary category renders
  const getPlantIconStyle = (cat: PlantNode["category"]) => {
    switch(cat) {
      case "conifer": return "bg-emerald-600 text-white rounded-full ring-2 ring-emerald-300";
      case "deciduous": return "bg-green-600 text-white rounded-full ring-2 ring-green-300";
      case "bush": return "bg-teal-500 text-white rounded-full ring-2 ring-teal-200";
      case "flowerbed": return "bg-pink-500 text-white rounded-full ring-2 ring-pink-200";
      case "bed": return "bg-amber-600 text-white rounded-full ring-2 ring-amber-300";
    }
  };

  const getPlantLabel = (cat: PlantNode["category"]) => {
    switch(cat) {
      case "conifer": return "🌲 Хвойное дерево";
      case "deciduous": return "🌳 Лиственное дерево";
      case "bush": return "🌿 Кустарник";
      case "flowerbed": return "🌸 Клумба с цветами";
      case "bed": return "🥬 Гряда / Огород";
    }
  };

  const availableObjects = currentUser.role === 'owner'
    ? objects.filter(o => o.ownerId === currentUser.id)
    : objects;

  const activeObject = objects.find(o => o.id === selectedObjectId);

  // Return the Selection Portal if no object is selected
  if (!selectedObjectId) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-neutral-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none select-none">
            🌲
          </div>

      {activeObject && (
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-300/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-1 bg-neutral-100 dark:bg-zinc-800 rounded-lg">
              {activeObject.objectType === "house" ? "🏠" : 
               activeObject.objectType === "admin_building" ? "🏢" : 
               activeObject.objectType === "land" ? "🗺️" : 
               activeObject.objectType === "dacha" ? "🏡" : "📦"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-neutral-900 dark:text-neutral-50">{activeObject.name}</span>
                <span className="text-[10px] bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-500 font-bold">
                  ID: {activeObject.id}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  ● Активный объект экосистемы
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">📍 {activeObject.address}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedObjectId("")}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-black text-neutral-800 dark:text-zinc-100 rounded-xl flex items-center gap-1.5 transition cursor-pointer self-stretch sm:self-auto justify-center"
          >
            ⇄ Сменить объект недвижимости
          </button>
        </div>
      )}
          <div className="space-y-3 relative z-10">
            <span className="text-[10px] bg-emerald-500 text-neutral-950 font-black px-2 py-1 rounded-md uppercase tracking-wider">
              Цифровая Экосистема Усадьбы
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Вход в Личную Экосистему и Ландшафт
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Вы входите в интерактивный пульт управления вашим земельным участком и сооружениями. Выберите конкретный объект недвижимости, чтобы вести личный фотодневник («История»), просматривать технические спецификации котлов и фильтров («Цифровой паспорт»), проектировать планограмму насаждений («Мой сад») и вести учет второстепенных строений («Мои постройки»).
            </p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 space-y-5">
          <div>
            <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <span>🏡 Укажите объект недвижимости для работы:</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Каждый объект имеет изолированный технический паспорт, историю семейных событий и собственную электронную карту участка.
            </p>
          </div>

          {availableObjects.length === 0 ? (
            <div className="p-10 border border-dashed rounded-2xl text-center space-y-3">
              <div className="text-3xl">🏜️</div>
              <p className="text-xs text-zinc-500 font-bold">У вас пока нет зарегистрированных объектов недвижимости.</p>
              <button 
                onClick={onNavigateToObjects}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl cursor-pointer transition shadow"
              >
                + Зарегистрировать первый объект
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableObjects.map((obj) => {
                const matchedSchedules = schedules.filter(s => s.objectId === obj.id);
                const matchedReports = reports.filter(r => r.objectId === obj.id);
                const matchedGardens = gardens.filter(g => g.linkedObjectId === obj.id);
                const matchedOuts = planBuildings.filter(pb => pb.linkedObjectId === obj.id);

                return (
                  <button
                    key={obj.id}
                    onClick={() => {
                      setSelectedObjectId(obj.id);
                      setActiveSubApp("chronicles");
                    }}
                    className="p-5 text-left rounded-xl transition-all duration-200 border bg-neutral-55 hover:bg-white dark:bg-black/15 dark:hover:bg-zinc-800/40 hover:shadow-lg hover:border-emerald-500 group relative block w-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-2xl p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-neutral-300/10 shrink-0 group-hover:scale-105 transition-transform duration-200">
                        {obj.objectType === "house" ? "🏠" : 
                         obj.objectType === "admin_building" ? "🏢" : 
                         obj.objectType === "land" ? "🗺️" : 
                         obj.objectType === "dacha" ? "🏡" : "📦"}
                      </div>
                      
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-neutral-850 dark:text-neutral-50 tracking-tight block truncate">
                            {obj.name}
                          </span>
                          <span className="text-[9px] bg-neutral-200 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                            ID: {obj.id}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium truncate">
                          📍 {obj.address}
                        </p>
                        
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800/60 mt-3">
                          <span className="text-[10px] bg-purple-500/10 text-purple-650 dark:text-purple-400 font-bold px-2 py-0.5 rounded-md">
                            📋 {matchedSchedules.length} регламентов
                          </span>
                          {matchedGardens.length > 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md">
                              🌿 {matchedGardens.length} садов
                            </span>
                          )}
                          {matchedOuts.length > 0 && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-650 dark:text-blue-400 font-bold px-2 py-0.5 rounded-md">
                              🛖 {matchedOuts.length} построек
                            </span>
                          )}
                          {matchedReports.length > 0 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-650 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md">
                              📑 {matchedReports.length} актов
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-4 top-4 text-zinc-300 group-hover:text-emerald-500 transition-colors text-lg">
                      ➔
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ECOSYSTEM TOP APP FRAME */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl text-neutral-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-black text-xl">
              🏡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">МОЙ ЦИФРОВОЙ ДОМ</span>
                <span className="text-[9px] bg-emerald-500 text-neutral-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Информационный Портал</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Цифровой журнал усадьбы: ведение истории, планограммы, параметров и передача архива при продаже
              </p>
            </div>
          </div>
        </div>

        {/* Selected Object bar and actions - inside active object header */}
        {activeObject && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-2xl p-1 bg-white/5 dark:bg-black/20 rounded-lg">
                {activeObject.objectType === "house" ? "🏠" : 
                 activeObject.objectType === "admin_building" ? "🏢" : 
                 activeObject.objectType === "land" ? "🗺️" : 
                 activeObject.objectType === "dacha" ? "🏡" : "📦"}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-white">{activeObject.name}</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-mono text-zinc-300 font-bold">
                    ID: {activeObject.id}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
                    ● Активный объект
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium font-sans">📍 {activeObject.address}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer justify-center flex-1 sm:flex-none"
                title="Передать объект новому собственнику (при продаже/передаче)"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Передать объект новому собственнику</span>
              </button>
              <button
                onClick={() => setSelectedObjectId("")}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-black text-white rounded-xl flex items-center gap-1.5 transition cursor-pointer justify-center flex-1 sm:flex-none"
              >
                ⇄ Сменить объект
              </button>
            </div>
          </div>
        )}

        {/* RE-ORDERED APP NAVIGATION (Chronicles first!) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <button
            onClick={() => setActiveSubApp("chronicles")}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-start h-full ${
              activeSubApp === "chronicles" 
                ? "bg-gradient-to-br from-purple-600 to-purple-800 text-white border-purple-500 shadow-lg" 
                : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/5"
            }`}
          >
            <History className="w-5 h-5 mb-2.5 text-purple-400 shrink-0" />
            <span className="font-extrabold text-xs block leading-tight min-h-[32px] flex items-center">
              1. История & Хроники усадьбы
            </span>
            <span className="text-[9px] opacity-70 block leading-normal mt-1 border-t border-white/5 pt-1">
              Фотодневник, вехи построек и идеи
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubApp("passport");
            }}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-start h-full ${
              activeSubApp === "passport" 
                ? "bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-500 shadow-lg" 
                : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/5"
            }`}
          >
            <Home className="w-5 h-5 mb-2.5 text-blue-400 shrink-0" />
            <span className="font-extrabold text-xs block leading-tight min-h-[32px] flex items-center">
              2. Цифровой паспорт объекта
            </span>
            <span className="text-[9px] opacity-70 block leading-normal mt-1 border-t border-white/5 pt-1">
              Оборудование, регламенты, акты
            </span>
          </button>

          <button
            onClick={() => setActiveSubApp("garden")}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-start h-full ${
              activeSubApp === "garden" 
                ? "bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-500 shadow-lg" 
                : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/5"
            }`}
          >
            <Sprout className="w-5 h-5 mb-2.5 text-emerald-400 shrink-0" />
            <span className="font-extrabold text-xs block leading-tight min-h-[32px] flex items-center">
              3. Мой Сад & Территория
            </span>
            <span className="text-[9px] opacity-70 block leading-normal mt-1 border-t border-white/5 pt-1">
              Интерактивный чертеж, уход, аудит
            </span>
          </button>

          <button
            onClick={() => setActiveSubApp("buildings")}
            className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-start h-full ${
              activeSubApp === "buildings" 
                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white border-amber-500 shadow-lg" 
                : "bg-white/5 hover:bg-white/10 text-zinc-200 border-white/5"
            }`}
          >
            <Hammer className="w-5 h-5 mb-2.5 text-amber-400 shrink-0" />
            <span className="font-extrabold text-xs block leading-tight min-h-[32px] flex items-center">
              4. Дополнительные строения
            </span>
            <span className="text-[9px] opacity-70 block leading-normal mt-1 border-t border-white/5 pt-1">
              Паспорт бань, беседок и хозблоков
            </span>
          </button>
        </div>
      </div>


      {/* ======================================================= */}
      {/* APP MODULE 1: ИСТОРИЯ & ХРОНИКИ (CHRONICLES) */}
      {activeSubApp === "chronicles" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Timeline Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-neutral-800 dark:text-neutral-100">Летопись усадьбы и семейная история</h3>
              </div>
              <button
                onClick={startNewChronicleForm}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить событие</span>
              </button>
            </div>

            {/* List of chronicles */}
            <div className="space-y-4">
              {chronicles.filter(ch => !ch.objectId || ch.objectId === selectedObjectId).length === 0 ? (
                <div className="p-10 border border-dashed rounded-xl text-center text-zinc-500 dark:text-zinc-400 space-y-2 bg-neutral-50/50 dark:bg-black/10">
                  <p className="text-sm font-bold">📖 Бортовой журнал пуст</p>
                  <p className="text-xs text-neutral-500">Для этого объекта еще не зарегистрировано исторических событий или вех строительства. Нажмите «Добавить событие» выше, чтобы начать семейную летопись.</p>
                </div>
              ) : (
                chronicles.filter(ch => !ch.objectId || ch.objectId === selectedObjectId).map(ch => (
                  <div 
                    key={ch.id} 
                    className={`p-5 rounded-xl bg-white dark:bg-zinc-900 border transition-all ${
                      selectedChronicle?.id === ch.id ? "border-purple-500 shadow-md ring-1 ring-purple-100 dark:ring-purple-950" : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                  <div className="flex flex-col md:flex-row gap-5">
                    
                    {/* Visual Media banner inside chronic */}
                    {ch.photoUrl && (
                      <div className="w-full md:w-44 h-28 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative group shrink-0">
                        <img 
                          src={ch.photoUrl} 
                          alt={ch.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold text-xs text-purple-600 font-mono tracking-wider">{ch.date}</span>
                          <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-50 mb-1">{ch.title}</h4>
                          <p className="text-xs text-zinc-500">{ch.description}</p>
                        </div>

                        <div className="flex items-center gap-1.5 ml-4 shrink-0">
                          <button
                            onClick={() => setShareEntry(ch)}
                            className="p-1 px-2 text-[11px] font-bold text-neutral-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded transition-colors"
                            title="Поделиться в соцсетях"
                          >
                            <Share2 className="w-3.5 h-3.5 inline mr-1" /> Поделиться
                          </button>
                          
                          <button
                            onClick={() => handleStartEditChronicle(ch)}
                            className="p-1 px-2 text-[11px] font-bold text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors"
                          >
                            Редактировать
                          </button>

                          <button
                            onClick={() => {
                              handleDeleteChronicle(ch.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Удалить запись из хронологии"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detailed collapse info if clicked */}
                      <div className="pt-2 border-t border-dotted border-neutral-200 dark:border-neutral-800 space-y-2.5">
                        {ch.memories && (
                          <div className="text-xs text-neutral-700 dark:text-zinc-300 italic pl-3 border-l-2 border-purple-500/40">
                            <strong>Воспоминания о выборе объекта:</strong> {ch.memories}
                          </div>
                        )}

                        {ch.ideaProcess && (
                          <div className="text-xs text-neutral-600 dark:text-zinc-400 text-[11px]">
                            <strong>Идея создания / Дизайн-проект:</strong> {ch.ideaProcess}
                          </div>
                        )}

                        {ch.boughtFurniture && ch.boughtFurniture.length > 0 && (
                          <div className="bg-neutral-50 dark:bg-black/30 p-2.5 rounded-lg border border-neutral-300/10 text-[11px] space-y-1">
                            <span className="font-bold text-neutral-600 dark:text-zinc-400 block">🛒 Приобретенная мебель и инвентарь:</span>
                            {ch.boughtFurniture.map((item, id) => (
                              <div key={id} className="flex justify-between border-b border-neutral-200/40 dark:border-neutral-850 py-0.5 last:border-0">
                                <span>• <strong className="text-neutral-800 dark:text-zinc-200">{item.item}</strong></span>
                                <span className="text-[10px] text-zinc-400 font-mono">{item.storeName} ({item.storeAddress})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )))}
            </div>
          </div>

          {/* Right sidebar: Adding/Editing form */}
          <div className="lg:col-span-1">
            
            {/* Show Edit or Add form */}
            {(isInEditChronicleMode || isAddingChronicle) && chronicleEditForm ? (
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-zinc-800">
                  <h4 className="font-black text-xs uppercase tracking-wider text-purple-600">
                    {isAddingChronicle ? "Новое событие хроники" : "Редактор летописи"}
                  </h4>
                  <button 
                    onClick={() => {
                      setIsInEditChronicleMode(false);
                      setIsAddingChronicle(false);
                      setChronicleEditForm(null);
                    }}
                    className="p-1 hover:bg-neutral-100 rounded text-zinc-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={isAddingChronicle ? handleCreateChronicle : handleSaveChronicleEdit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Дата события</label>
                    <input 
                      type="date" required
                      value={chronicleEditForm.date}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, date: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Заголовок события</label>
                    <input 
                      type="text" required placeholder="Кладка первого костровища, рождение идеи"
                      value={chronicleEditForm.title}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, title: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Краткое описание события</label>
                    <textarea 
                      rows={2} placeholder="Пара ознакомительных фраз для ленты..."
                      value={chronicleEditForm.description}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, description: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Воспоминания (почему выбрали, просмотренные варианты)</label>
                    <textarea 
                      rows={4} placeholder="Помню как осматривали участки, искали идеальные сосны, затаив дыхание под проливным дождем..."
                      value={chronicleEditForm.memories}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, memories: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Идея внешнего вида / дизайн-проект / мудборд</label>
                    <textarea 
                      rows={3} placeholder="Решили остановиться на стиле Сканди или Мид-сенчури, добавить больше панорамного остекления."
                      value={chronicleEditForm.ideaProcess}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, ideaProcess: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-400 text-[10px] uppercase mb-1">Ссылка на фотоиллюстрацию (Unsplash)</label>
                    <input 
                      type="text" 
                      value={chronicleEditForm.photoUrl}
                      onChange={(e) => setChronicleEditForm({...chronicleEditForm, photoUrl: e.target.value})}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-100"
                    />
                  </div>

                  {/* Purchased Furniture Add Section */}
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/10 border border-purple-500/10 space-y-2">
                    <span className="font-bold text-[10px] text-purple-700 block uppercase">Мебель / гриль / инвентарь к записи</span>
                    <div className="space-y-2">
                      <input 
                        type="text" placeholder="Уличный газовый гриль Weber"
                        value={newChFurnitureItem}
                        onChange={(e) => setNewChFurnitureItem(e.target.value)}
                        className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border border-neutral-200 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <input 
                          type="text" placeholder="Магазин ГрильМаркет"
                          value={newChFurnitureStore}
                          onChange={(e) => setNewChFurnitureStore(e.target.value)}
                          className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border border-neutral-200 text-xs"
                        />
                        <input 
                          type="text" placeholder="ТВК Экспострой"
                          value={newChFurnitureAddr}
                          onChange={(e) => setNewChFurnitureAddr(e.target.value)}
                          className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border border-neutral-200 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newChFurnitureItem.trim()) return;
                          const currentArr = chronicleEditForm.boughtFurniture || [];
                          const updatedArr = [...currentArr, {
                            item: newChFurnitureItem.trim(),
                            storeName: newChFurnitureStore.trim() || "Супермаркет",
                            storeAddress: newChFurnitureAddr.trim() || "Центр"
                          }];
                          setChronicleEditForm({ ...chronicleEditForm, boughtFurniture: updatedArr });
                          setNewChFurnitureItem("");
                          setNewChFurnitureStore("");
                          setNewChFurnitureAddr("");
                        }}
                        className="w-full py-1 bg-purple-600 text-white font-bold text-[11px] rounded"
                      >
                        Привязать мебель к событию
                      </button>
                    </div>

                    {/* Display already staged furniture */}
                    {chronicleEditForm.boughtFurniture && chronicleEditForm.boughtFurniture.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {chronicleEditForm.boughtFurniture.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] bg-white dark:bg-zinc-950 p-1 rounded">
                            <span>{item.item}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const filter = chronicleEditForm.boughtFurniture.filter((_, i) => i !== idx);
                                setChronicleEditForm({ ...chronicleEditForm, boughtFurniture: filter });
                              }}
                              className="text-red-500 font-bold hover:underline"
                            >
                              Удалить
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-lg cursor-pointer hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isAddingChronicle ? "Создать запись в летописи" : "Сохранить изменения"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent border border-neutral-300/10 text-neutral-800 dark:text-neutral-100 space-y-4">
                <span className="text-[10px] font-black uppercase text-purple-600 block">💡 Семейный Дневник Мечты</span>
                <p className="text-xs opacity-85 leading-relaxed">
                  Полноценное ведение событий на вашем участке. Вы всегда сможете заглянуть в прошлое: посмотреть, почему вы выбрали именно этот усадебный участок, как созревала идея теплой беседки, какие концепции рассматривались в дизайнерском мудборде, а также где и когда вы покупали уличную эксклюзивную мебель.
                </p>

                <div className="p-4 rounded-xl border border-dashed border-purple-500/25 bg-purple-600/5 text-xs space-y-2">
                  <h5 className="font-extrabold text-neutral-900 dark:text-neutral-50 mb-0.5 flex items-center gap-1.5">
                    <span>📢 Функция «Поделиться в Сети»</span>
                  </h5>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Любым важным днем строительства или прекрасной фотографией с террасы можно делиться в ваших социальных профилях! Нажмите кнопку «Поделиться» для генерации стильной карточки.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>
      )}


      {/* ======================================================= */}
      {/* APP MODULE 2: ЦИФРОВОЙ ПАСПОРТ ОБЪЕКТА */}
      {activeSubApp === "passport" && activeObject && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Main Grid: Data & Schedules consolidated */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: General Spec & Equipment */}
            <div className="lg:col-span-1 space-y-5">
              
              {/* Engineering Profile */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-805">
                  <span className="text-lg">📑</span>
                  <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 uppercase tracking-tight">Технический паспорт здания</h4>
                </div>

                <div className="space-y-3.5 text-xs text-neutral-800 dark:text-zinc-300">
                  <div>
                    <span className="font-bold text-[10px] text-zinc-400 uppercase block mb-0.5">Тип недвижимости</span>
                    <span className="font-extrabold text-neutral-900 dark:text-white">
                      {activeObject.objectType === "house" ? "Загородный Коттедж для ПМЖ" : 
                       activeObject.objectType === "admin_building" ? "Административно-бытовой комплекс" : 
                       activeObject.objectType === "land" ? "Земельный участок без застройки" : 
                       activeObject.objectType === "dacha" ? "Дачный дом сезонного проживания" : "Вспомогательный объект"}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-[10px] text-zinc-400 uppercase block mb-0.5">Координаты и геолокация</span>
                    <span className="font-mono text-[11px] font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded">
                      {activeObject.address}
                    </span>
                  </div>

                  {activeObject.info && (
                    <div>
                      <span className="font-bold text-[10px] text-zinc-400 uppercase block mb-0.5">Описание и конструктив</span>
                      <p className="bg-neutral-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-neutral-300/10 italic text-zinc-650 dark:text-zinc-400">
                        {activeObject.info}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="font-bold text-[10px] text-zinc-400 uppercase block mb-0.5">Характеристики систем жизнеобеспечения</span>
                    <div className="bg-neutral-50 dark:bg-zinc-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {activeObject.specs ? activeObject.specs : (
                        <span className="text-zinc-400 italic font-medium">Технические спецификации отопления и вентиляции не заданы. Вы можете внести их в карточке объекта.</span>
                      )}
                    </div>
                  </div>

                  {/* Cloud folder link if any */}
                  <div>
                    <span className="font-bold text-[10px] text-zinc-400 uppercase block mb-1">Электронный архив документов</span>
                    {activeObject.yandexDiskUrl ? (
                      <a 
                        href={activeObject.yandexDiskUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-3 rounded-xl border border-blue-500/15 bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-between transition-all"
                      >
                        <span className="flex items-center gap-1.5">💾 Перейти в облачную папку</span>
                        <span>🔍 {activeObject.yandexDiskPath || "Документы БТИ & Чеки"}</span>
                      </a>
                    ) : (
                      <div className="p-3 border border-dashed rounded-xl bg-neutral-50 dark:bg-black/10 text-center text-[11px] text-neutral-550 dark:text-zinc-400">
                        ☁️ Облачное папочное хранилище не привязано
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Equipment Spec Cards */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-805">
                  <span className="text-lg">⚙️</span>
                  <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 uppercase tracking-tight">Реестр оборудования</h4>
                </div>

                <div className="text-xs space-y-3">
                  <div className="p-3.5 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-300/10 space-y-2">
                    <div className="flex justify-between items-center bg-blue-500/10 p-1 px-2 rounded col-span-2 text-blue-600 font-extrabold text-[10px] uppercase">
                      <span>КОТЕЛ & ОТОПЛЕНИЕ</span>
                    </div>
                    <p className="font-mono text-[11px] text-neutral-800 dark:text-neutral-100 leading-relaxed font-semibold">
                      {activeObject.equipmentSpecs ? activeObject.equipmentSpecs : "Спецификации оборудования (серийный номер котла, фильтры водоснабжения, автоматика) не заполнены."}
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-300/10 text-[11px] text-zinc-500 leading-normal">
                    💡 <strong>Памятка собственника:</strong> Сохранение серийных номеров оборудования в цифровом паспорте позволяет инженерам удаленно комплектовать материалы, а также мгновенно подбирать детали для проведения технического обслуживания без повторных замеров.
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Technical Schedules (ТО) & Inspector Reports (Акты) */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Linked Maintenance Schedules Section */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-805">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 uppercase tracking-tight">Техническое обслуживание (ТО) оборудования</h4>
                  </div>
                  <button
                    onClick={onNavigateToSchedules}
                    className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Создать регламент</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {schedules.filter(s => s.objectId === selectedObjectId).length === 0 ? (
                    <div className="p-8 border border-dashed rounded-xl bg-neutral-50/50 dark:bg-black/10 text-center space-y-3">
                      <div className="text-2xl">⏳</div>
                      <p className="text-xs text-zinc-500 font-bold">Для этого объекта не запланировано плановых задач ТО.</p>
                      <button 
                        onClick={onNavigateToSchedules}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg shadow transition cursor-pointer"
                      >
                        Перейти в Календарь регламентов
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {schedules.filter(s => s.objectId === selectedObjectId).map(s => {
                        const getHelperScheduleStatus = (sch: ScheduleItem) => {
                          if (!sch.lastDoneDate) {
                            return { label: "Ни разу не проводилось", isOverdue: true, nextDueLabel: sch.commissioningDate || "Требуется проведение" };
                          }
                          const lastDone = new Date(sch.lastDoneDate);
                          const nextDue = new Date(lastDone);
                          nextDue.setDate(lastDone.getDate() + sch.intervalDays);
                          
                          const formattedNext = nextDue.toISOString().split("T")[0];
                          
                          const today = new Date();
                          today.setHours(0,0,0,0);
                          const diffTime = nextDue.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          if (diffDays < 0) {
                            return { label: `Просрочено на ${Math.abs(diffDays)} дн.`, isOverdue: true, nextDueLabel: formattedNext };
                          } else if (diffDays === 0) {
                            return { label: "Требуется сегодня!", isOverdue: true, nextDueLabel: formattedNext };
                          } else {
                            return { label: `В норме (осталось ${diffDays} дн.)`, isOverdue: false, nextDueLabel: formattedNext };
                          }
                        };

                        const statusObj = getHelperScheduleStatus(s);

                        return (
                          <div key={s.id} className="p-4 rounded-xl bg-neutral-50 dark:bg-black/25 border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between space-y-3 hover:border-blue-500/30 transition-all duration-200">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] bg-neutral-200 dark:bg-zinc-800 text-neutral-700 dark:text-zinc-300 font-extrabold px-2 py-0.5 rounded-md uppercase font-mono">
                                  {s.category === "heating" ? "🔥 Отопление" : 
                                   s.category === "water" ? "💧 Вода" : 
                                   s.category === "electrical" ? "⚡ Электрика" : 
                                   s.category === "ventilation" ? "🍃 Вент" : 
                                   s.category === "structural" ? "🧱 Строй" : "⚙️ Общее"}
                                </span>
                                
                                {statusObj.isOverdue ? (
                                  <span className="text-[9px] bg-red-500/15 text-red-650 dark:text-red-400 font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                    ● {statusObj.label}
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-emerald-500/15 text-emerald-650 dark:text-emerald-450 font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                    ✓ {statusObj.label}
                                  </span>
                                )}
                              </div>

                              <h5 className="font-extrabold text-xs text-neutral-850 dark:text-neutral-100 line-clamp-1">
                                {s.title}
                              </h5>
                              <p className="text-[10px] text-zinc-500 font-bold mt-1 font-mono font-medium">Интервал: {s.intervalDays} дн.</p>
                            </div>

                            <div className="pt-2.5 border-t border-dashed border-neutral-250 dark:border-neutral-850 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="text-zinc-400 block text-[9px] font-bold uppercase">Следующее ТО</span>
                                <span className={`font-black ${statusObj.isOverdue ? "text-red-500" : "text-neutral-800 dark:text-zinc-200"}`}>{statusObj.nextDueLabel}</span>
                              </div>
                              <span className="text-zinc-400 text-[10px] font-bold">
                                {s.responsibleUserId ? "👷 Специалист" : "🏡 Сам"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Inspector Checklists Acts (Акты сдачи-приемки работ) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-805">
                  <span className="text-lg">📑</span>
                  <h4 className="font-extrabold text-sm text-neutral-850 dark:text-neutral-100 uppercase tracking-tight">Подтвержденные акты усадьбы и чек-листы ухода</h4>
                </div>

                <div className="space-y-3">
                  {reports.filter(r => r.objectId === selectedObjectId).length === 0 ? (
                    <div className="p-8 border border-dashed rounded-xl bg-neutral-50/50 dark:bg-black/10 text-center text-xs text-zinc-500 font-medium">
                      📭 Акты инспекций и подтвержденные чек-листы обслуживания отсутствуют. Копии актов генерируются при завершении проверок сервисными инженерами.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {reports.filter(r => r.objectId === selectedObjectId).map(r => {
                        const relatedSch = schedules.find(sc => sc.id === r.scheduleItemId);
                        const displayTaskTitle = relatedSch ? relatedSch.title : "Техническое инспектирование";

                        return (
                          <div key={r.id} className="p-4 rounded-xl bg-neutral-50 dark:bg-black/20 border border-neutral-200 dark:border-neutral-800 space-y-3.5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-neutral-900 dark:text-white">
                                  📜 {displayTaskTitle}
                                </span>
                                <span className="text-[9px] bg-blue-500/15 text-blue-600 font-black px-1.5 py-0.5 rounded uppercase font-mono">
                                  АКТ №{r.id.substring(r.id.length - 4).toUpperCase()}
                                </span>
                              </div>

                              <p className="text-xs text-neutral-600 dark:text-zinc-400 font-medium pt-1">
                                <strong>Результаты проверки:</strong> {r.ownerRatingComment || "Инспекция завершена, все узлы проверены и исправно работают согласно регламенту ухода."}
                              </p>

                              <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-semibold pt-1">
                                <span>📅 Проведено: {new Date(r.dateDone).toLocaleDateString('ru-RU')}</span>
                                <span>👷 Специалист: {r.specialistInfo?.fullname || "Служба эксплуатации"}</span>
                              </div>
                            </div>

                            {/* Render signed checkmark */}
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-550/20 text-emerald-650 px-2.5 py-1.5 rounded-lg text-[10px] font-black shrink-0 self-start">
                              <span>✓</span>
                              <span>ПОДПИСАНО В БАЗЕ</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}


      {/* ======================================================= */}
      {/* APP MODULE 3: МОЙ САД & ТЕРРИТОРИЯ */}
      {activeSubApp === "garden" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Garden Subapp tabs */}
          <div className="p-1.5 bg-neutral-100 dark:bg-black/35 rounded-xl border border-neutral-300/10 max-w-sm sm:max-w-max flex flex-wrap gap-1">
            <button
              onClick={() => { setGardenSubTab("planogram"); setSelectedPlant(null); }}
              className={`p-2 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer ${gardenSubTab === "planogram" ? "bg-emerald-600 text-white" : "hover:text-emerald-500"}`}
            >
              🗺️ Электронная планограмма
            </button>
            <button
              onClick={() => setGardenSubTab("gardens")}
              className={`p-2 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer ${gardenSubTab === "gardens" ? "bg-emerald-600 text-white" : "hover:text-emerald-500"}`}
            >
              🌿 Мои Сады ({gardens.length})
            </button>
            <button
              onClick={() => setGardenSubTab("services")}
              className={`p-2 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer ${gardenSubTab === "services" ? "bg-emerald-600 text-white" : "hover:text-emerald-500"}`}
            >
              🚜 Сервисы & Садовники
            </button>
            <button
              onClick={() => setGardenSubTab("seeds")}
              className={`p-2 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer ${gardenSubTab === "seeds" ? "bg-emerald-600 text-white" : "hover:text-emerald-500"}`}
            >
              🎒 Каталог семян & сортов
            </button>
          </div>

          {/* GARDENS TAB SUB 1: RICH DRAWING PLANOGRAM INTERACTIVE VISUAL */}
          {gardenSubTab === "planogram" && (() => {
            const currentPlotDim = getPlotDimForObject(selectedObjectId || "1");
            const W = currentPlotDim.width;
            const H = currentPlotDim.height;
            const activeBuildings = planBuildings.filter(b => b.linkedObjectId === (selectedObjectId || "1"));
            const activePlants = plantNodes.filter(p => p.linkedObjectId === (selectedObjectId || "1"));

            const templates = [
              { type: "building", subType: "house", label: "Дом", wMeters: 10, hMeters: 10, color: "rgba(59, 130, 246, 0.25)", emoji: "🏠" },
              { type: "building", subType: "banya", label: "Баня", wMeters: 6, hMeters: 6, color: "rgba(245, 158, 11, 0.25)", emoji: "🛁" },
              { type: "building", subType: "garage", label: "Гараж", wMeters: 6, hMeters: 4, color: "rgba(107, 114, 128, 0.25)", emoji: "🚗" },
              { type: "building", subType: "gazebo", label: "Беседка", wMeters: 4, hMeters: 4, color: "rgba(16, 185, 129, 0.25)", emoji: "⛺" },
              { type: "building", subType: "playground", label: "Детская площадка", wMeters: 6, hMeters: 6, color: "rgba(168, 85, 247, 0.25)", emoji: "🛝" },
              { type: "building", subType: "sports_ground", label: "Спортивная площадка", wMeters: 8, hMeters: 5, color: "rgba(236, 72, 153, 0.25)", emoji: "🏀" },
              { type: "building", subType: "greenhouse", label: "Теплица", wMeters: 4, hMeters: 3, color: "rgba(34, 197, 94, 0.25)", emoji: "🌱" },
              { type: "building", subType: "bbq", label: "Зона барбекю", wMeters: 4, hMeters: 3, color: "rgba(239, 68, 68, 0.25)", emoji: "🍢" },
              { type: "building", subType: "firepit", label: "Костровище", wMeters: 3, hMeters: 3, color: "rgba(249, 115, 22, 0.25)", emoji: "🔥" },
              { type: "building", subType: "shed", label: "Сарайка", wMeters: 4, hMeters: 3, color: "rgba(120, 113, 108, 0.25)", emoji: "🛖" },
              { type: "building", subType: "toilet", label: "Уличный туалет", wMeters: 1.5, hMeters: 1.5, color: "rgba(139, 92, 246, 0.25)", emoji: "🧻" },
              { type: "building", subType: "shower", label: "Уличный душ", wMeters: 1.5, hMeters: 1.5, color: "rgba(56, 189, 248, 0.25)", emoji: "🚿" },
              { type: "building", subType: "pool", label: "Бассейн", wMeters: 7, hMeters: 4, color: "rgba(14, 165, 233, 0.3)", emoji: "🏊" },
              { type: "building", subType: "observatory", label: "Обсерватория", wMeters: 5, hMeters: 5, color: "rgba(99, 102, 241, 0.25)", emoji: "🔭" },
              { type: "building", subType: "treehouse", label: "Домик на дереве", wMeters: 4, hMeters: 4, color: "rgba(161, 98, 7, 0.25)", emoji: "🪵🏡" },
              { type: "building", subType: "boiler_room", label: "Котельная", wMeters: 4, hMeters: 4, color: "rgba(244, 63, 94, 0.25)", emoji: "🔥" },
              { type: "building", subType: "security_house", label: "Дом охраны", wMeters: 3, hMeters: 3, color: "rgba(239, 68, 68, 0.25)", emoji: "👮" },
              { type: "building", subType: "guesthouse", label: "Гостевой дом", wMeters: 8, hMeters: 6, color: "rgba(34, 197, 94, 0.25)", emoji: "🏡" },
              { type: "building", subType: "admin_building", label: "Админ. здание", wMeters: 12, hMeters: 8, color: "rgba(79, 70, 229, 0.25)", emoji: "🏢" },
              { type: "path", subType: "straight_x", label: "Тропа X", wMeters: 5, hMeters: 1.2, color: "rgba(120, 113, 108, 0.35)", emoji: "🛣️" },
              { type: "path", subType: "straight_y", label: "Тропа Y", wMeters: 1.2, hMeters: 5, color: "rgba(120, 113, 108, 0.35)", emoji: "↕️" },
              { type: "path", subType: "round", label: "Площадка", wMeters: 4, hMeters: 4, color: "rgba(120, 113, 108, 0.35)", emoji: "💮" },
              { type: "light", subType: "lantern", label: "Фонарь", wMeters: 1.5, hMeters: 1.5, color: "rgba(253, 224, 71, 0.15)", emoji: "💡" },
              { type: "plant", subType: "conifer", label: "Хвойное", wMeters: 3, hMeters: 3, color: "rgba(16, 185, 129, 0.3)", emoji: "🌲" },
              { type: "plant", subType: "deciduous", label: "Лиственное", wMeters: 4, hMeters: 4, color: "rgba(34, 197, 94, 0.3)", emoji: "🌳" },
              { type: "plant", subType: "bush", label: "Кустарник", wMeters: 2, hMeters: 2, color: "rgba(74, 222, 128, 0.3)", emoji: "🌿" },
              { type: "plant", subType: "bed", label: "Грядка", wMeters: 3, hMeters: 1, color: "rgba(120, 53, 4, 0.3)", emoji: "🥬" }
            ];

            const handleInsertTemplate = (tpl: any) => {
              const itemW = tpl.wMeters;
              const itemH = tpl.hMeters;
              const itemX = Math.max(0, Math.round(W / 2 - itemW / 2));
              const itemY = Math.max(0, Math.round(H / 2 - itemH / 2));

              if (tpl.type === "plant") {
                const newId = "Pl_" + Date.now();
                const newP: PlantNode = {
                  id: newId,
                  name: tpl.label,
                  category: tpl.subType as any,
                  x: Math.round((itemX / W) * 100),
                  y: Math.round(((H - itemY) / H) * 100),
                  xMeters: itemX,
                  yMeters: itemY,
                  diameterMeters: itemW,
                  plantingYear: new Date().getFullYear().toString(),
                  specs: "Укажите сорт и возраст саженца.",
                  careGuidance: "Регулярный полив.",
                  frequency: "1 раз в неделю",
                  growthPhotos: [
                    { date: "Июнь 2026", url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&auto=format&fit=crop&q=60", notes: "Отметка установлена." }
                  ],
                  remarks: "Плановая высадка.",
                  linkedObjectId: selectedObjectId || "1"
                };
                setPlantNodes(prev => [...prev, newP]);
                setSelectedPlant(newP);
                setSelectedPlanBuildingId(null);
              } else {
                const newId = "PB_" + Date.now();
                const newB: PlanogramBuilding = {
                  id: newId,
                  label: tpl.label,
                  color: tpl.color,
                  x: Math.round((itemX / W) * 100),
                  y: Math.round(((H - itemY - itemH) / H) * 100),
                  width: Math.round((itemW / W) * 100),
                  height: Math.round((itemH / H) * 100),
                  xMeters: itemX,
                  yMeters: itemY,
                  wMeters: itemW,
                  hMeters: itemH,
                  itemType: tpl.type,
                  subType: tpl.subType,
                  rotation: 0,
                  emoji: tpl.emoji,
                  linkedObjectId: selectedObjectId || "1"
                };
                setPlanBuildings(prev => [...prev, newB]);
                setSelectedPlanBuildingId(newId);
                setSelectedPlant(null);
              }
            };

            const handleCanvasClickWithMeters = (e: React.MouseEvent<HTMLDivElement>) => {
              if (!canvasRef.current) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const clickedXPercent = (e.clientX - rect.left) / rect.width;
              const clickedYPercent = 1 - (e.clientY - rect.top) / rect.height;
              const clickXMeters = Math.max(0, Math.min(W, Math.round(clickedXPercent * W)));
              const clickYMeters = Math.max(0, Math.min(H, Math.round(clickedYPercent * H)));

              if (isEditingPlanogram && activeTemplate) {
                const itemW = activeTemplate.wMeters;
                const itemH = activeTemplate.hMeters;
                const itemX = Math.max(0, Math.min(W - itemW, Math.round(clickXMeters - itemW / 2)));
                const itemY = Math.max(0, Math.min(H - itemH, Math.round(clickYMeters - itemH / 2)));
                handleInsertTemplate({ ...activeTemplate, wMeters: itemW, hMeters: itemH });
              } else {
                setSelectedPlanBuildingId(null);
                setSelectedPlant(null);
              }
            };

            const handleDragMouseDown = (e: React.MouseEvent, type: "building" | "plant", item: any) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDragId(item.id);
              setActiveDragType(type);
              dragStartRef.current = {
                initMouseX: e.clientX,
                initMouseY: e.clientY,
                initX: item.xMeters || 0,
                initY: item.yMeters || 0,
                initW: item.wMeters || item.diameterMeters || 4,
                initH: item.hMeters || item.diameterMeters || 4,
              };

              if (type === "building") {
                setSelectedPlanBuildingId(item.id);
                setSelectedPlant(null);
                setActiveTemplate(null);
              } else {
                setSelectedPlant(item);
                setSelectedPlanBuildingId(null);
                setActiveTemplate(null);
              }
            };

            const handleResizeMouseDown = (e: React.MouseEvent, dir: string, item: any) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveResizeId(item.id);
              setActiveResizeDirection(dir);
              dragStartRef.current = {
                initMouseX: e.clientX,
                initMouseY: e.clientY,
                initX: item.xMeters || 0,
                initY: item.yMeters || 0,
                initW: item.wMeters || item.diameterMeters || 4,
                initH: item.hMeters || item.diameterMeters || 4,
              };
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {/* Mode Selector Panel */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-zinc-900/60 dark:to-zinc-950/60 border border-neutral-300/30 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-neutral-800 dark:text-neutral-100 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        {isEditingPlanogram ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        )}
                        Режим планограммы:
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        {isEditingPlanogram 
                          ? "🛠️ Конструирование активно — передвигайте объекты и растягивайте размеры за крайние точки."
                          : "👁️ Просмотр активен — кликайте на растение или объект на карте для просмотра истории и паспорта."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPlanogram(!isEditingPlanogram);
                        // Reset interactions
                        setActiveTemplate(null);
                        setActiveDragId(null);
                        setActiveResizeId(null);
                      }}
                      className={`px-4 py-2 text-xs font-black rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                        isEditingPlanogram 
                          ? "bg-amber-500 hover:bg-amber-600 text-neutral-900 border border-amber-600/30" 
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isEditingPlanogram ? "👁️ Завершить редактирование" : "🛠️ Редактировать планограмму"}
                    </button>
                  </div>

                  {/* Plot Dimensions (Only during active editing) */}
                  {isEditingPlanogram && (
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Размер Участка</span>
                          <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-105">
                            📏 Изменение длины сторон участка (граница прямоугольником)
                          </h4>
                        </div>
                        <span className="text-xs bg-neutral-100 dark:bg-zinc-800/80 p-1 px-2.5 rounded-lg font-bold font-mono text-zinc-600 dark:text-zinc-400">
                          {plotCorners[selectedObjectId || "1"] ? "Сложная форма (Area)" : "Площадь"} S ≈ {
                            plotCorners[selectedObjectId || "1"] 
                              ? calculatePolygonArea(plotCorners[selectedObjectId || "1"]).toFixed(1)
                              : (W * H).toFixed(0)
                          } м² ({
                            ((plotCorners[selectedObjectId || "1"] 
                              ? calculatePolygonArea(plotCorners[selectedObjectId || "1"])
                              : (W * H)) / 100).toFixed(1)
                          } сот.)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1">Ширина участка (в метрах):</label>
                          <input
                            type="number"
                            min="5"
                            max="350"
                            value={W}
                            onChange={(e) => {
                              const val = Math.max(5, parseInt(e.target.value) || 0);
                              setPlotDimensions(prev => ({ ...prev, [selectedObjectId || "1"]: { width: val, height: H } }));
                            }}
                            className="w-full p-2 bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1">Длина участка (в метрах):</label>
                          <input
                            type="number"
                            min="5"
                            max="350"
                            value={H}
                            onChange={(e) => {
                              const val = Math.max(5, parseInt(e.target.value) || 0);
                              setPlotDimensions(prev => ({ ...prev, [selectedObjectId || "1"]: { width: W, height: val } }));
                            }}
                            className="w-full p-2 bg-neutral-50 dark:bg-black/30 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 items-center pt-1.5 border-t border-dashed border-neutral-100 dark:border-zinc-805">
                        <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mr-1">Шаблоны:</span>
                        {[
                          { l: "6 сот (30x20м)", w: 30, h: 20 },
                          { l: "10 сот (40x25м)", w: 40, h: 25 },
                          { l: "15 сот (50x30м)", w: 50, h: 30 },
                          { l: "20 сот (50x40м)", w: 50, h: 40 }
                        ].map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setPlotDimensions(prev => ({ ...prev, [selectedObjectId || "1"]: { width: p.w, height: p.h } }));
                            }}
                            className="text-[9px] font-bold p-1 px-2 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-300 hover:bg-emerald-500 hover:text-white transition-all border border-neutral-200 dark:border-zinc-700/50"
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>

                      {/* Polygon Plot Corners Management for Irregular Shapes */}
                      <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-zinc-800 space-y-2 mt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-left">
                          <label className="block text-[10px] uppercase font-extrabold text-zinc-400">Вершины забора (для сложной формы) :</label>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const corners = [...getPlotCorners(selectedObjectId || "1", W, H)];
                                corners.push({ x: Math.round(W / 2), y: Math.round(H / 2) });
                                setPlotCorners(prev => ({ ...prev, [selectedObjectId || "1"]: corners }));
                              }}
                              className="text-[9px] font-bold p-1 px-2 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-200 dark:border-emerald-800/30"
                            >
                              + Добавить вершину (угол)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPlotCorners(prev => {
                                  const updated = { ...prev };
                                  delete updated[selectedObjectId || "1"];
                                  return updated;
                                });
                              }}
                              className="text-[9px] font-bold p-1 px-2 rounded bg-neutral-100 dark:bg-zinc-800 text-neutral-800 dark:text-zinc-300 hover:bg-red-500 hover:text-white transition-all border border-neutral-200 dark:border-zinc-700/50"
                            >
                              Сбросить в прямоугольник
                            </button>
                          </div>
                        </div>

                        {/* List of active corners */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {getPlotCorners(selectedObjectId || "1", W, H).map((corner, idx) => (
                            <div key={idx} className="p-1 px-2 rounded-lg bg-neutral-50 dark:bg-black/20 border border-neutral-150 dark:border-zinc-800 flex items-center justify-between gap-1 text-[10px]">
                              <span className="font-mono text-zinc-600 dark:text-zinc-405">Угол {idx + 1}: <strong className="text-neutral-900 dark:text-zinc-200">{corner.x}x{corner.y}м</strong></span>
                              {getPlotCorners(selectedObjectId || "1", W, H).length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const corners = getPlotCorners(selectedObjectId || "1", W, H).filter((_, i) => i !== idx);
                                    setPlotCorners(prev => ({ ...prev, [selectedObjectId || "1"]: corners }));
                                  }}
                                  className="text-[10px] font-bold text-red-500 hover:text-red-700 p-0.5 px-1 leading-none"
                                  title="Удалить этот угол"
                                >
                                  ❌
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stamp Template Selection Palette (Only during active editing) */}
                  {isEditingPlanogram && (
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-extrabold text-xs text-neutral-900 dark:text-zinc-150">🎨 Панель конструирования (активные шаблоны)</h5>
                          <p className="text-[10px] text-zinc-400">Выберите элемент для мгновенной расстановки. Можно копировать или двигать точно в метрах</p>
                        </div>
                        {activeTemplate && (
                          <button
                            onClick={() => setActiveTemplate(null)}
                            className="text-[9px] font-black text-red-500 border border-red-500/20 bg-red-500/5 px-2 py-0.5 rounded-lg hover:bg-red-500/10 cursor-pointer"
                          >
                            Сбросить выбор
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {templates.map((tpl, i) => {
                          const isMatch = activeTemplate?.subType === tpl.subType;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setActiveTemplate(tpl);
                                handleInsertTemplate(tpl);
                              }}
                              className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all relative select-none hover:shadow-md cursor-pointer ${
                                isMatch 
                                  ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 ring-2 ring-amber-500/20" 
                                  : "border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-black/15 hover:border-emerald-500/40"
                              }`}
                            >
                              <span className="text-lg mb-1">{tpl.emoji}</span>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black leading-tight text-neutral-800 dark:text-zinc-200 truncate">{tpl.label}</p>
                                <p className="text-[8px] font-mono text-zinc-500 leading-none">{tpl.wMeters}x{tpl.hMeters}м</p>
                              </div>
                              {isMatch && (
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CAD Visual Coordinate Map Grid */}
                  <div className="relative p-2.5 bg-neutral-50 dark:bg-zinc-950/60 rounded-2xl border border-neutral-300/15 overflow-hidden">
                    {/* Scale rulers */}
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 dark:text-zinc-500 px-3 mb-1 select-none">
                      <span>Западная межа</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-200/50 dark:bg-zinc-800/50 p-0.5 px-1.5 rounded">Северная граница: {W} м</span>
                      <span>Восточная межа</span>
                    </div>

                    <div className="flex">
                      {/* Left ruler */}
                      <div className="w-6 flex flex-col justify-between text-[9px] font-mono text-zinc-500 select-none py-4 text-left leading-none">
                        <span>{H}м</span>
                        <span>{(H/2).toFixed(0)}м</span>
                        <span>0м</span>
                      </div>

                      <div 
                        ref={canvasRef}
                        onClick={handleCanvasClickWithMeters}
                        className="flex-1 relative border border-neutral-305 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl shadow-inner overflow-hidden select-none cursor-crosshair transition-all duration-300 min-h-[300px]"
                        style={{
                          aspectRatio: `${W} / ${H}`,
                          maxHeight: "500px"
                        }}
                      >
                        {/* grid background patterns */}
                        <div 
                          className="absolute inset-0 opacity-10 pointer-events-none"
                          style={{
                            backgroundImage: `
                              linear-gradient(to right, #10b981 1px, transparent 1px),
                              linear-gradient(to bottom, #10b981 1px, transparent 1px)
                            `,
                            backgroundSize: `${(5 / W) * 100}% ${(5 / H) * 100}%`
                          }}
                        />

                        {/* Beautiful custom irregular boundary polygon fence rendering */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon 
                            points={getPlotCorners(selectedObjectId || "1", W, H).map(c => `${(c.x / W) * 100},${100 - (c.y / H) * 100}`).join(" ")}
                            className="fill-emerald-500/[0.04] dark:fill-emerald-500/[0.07] stroke-emerald-600/50 dark:stroke-emerald-500/50 stroke-[0.3]"
                            strokeDasharray="0.6,0.6"
                          />
                        </svg>

                        {/* Stamped Building/Path Layers */}
                        {activeBuildings.map((b) => {
                          const left = ((b.xMeters || 0) / W) * 100;
                          const bottom = ((b.yMeters || 0) / H) * 100;
                          const w = ((b.wMeters || 4) / W) * 100;
                          const h = ((b.hMeters || 4) / H) * 100;
                          const isSel = selectedPlanBuildingId === b.id;
                          const color = b.color || "rgba(224, 224, 224, 0.3)";

                          return (
                            <div
                              key={b.id}
                              onMouseDown={isEditingPlanogram ? (e) => handleDragMouseDown(e, "building", b) : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlanBuildingId(b.id);
                                setSelectedPlant(null);
                                setActiveTemplate(null);
                              }}
                              className={`absolute rounded-lg border-2 select-none flex flex-col justify-between shadow-sm ${
                                isEditingPlanogram ? "cursor-move" : "cursor-pointer hover:scale-[1.01]"
                              } ${
                                !isEditingPlanogram ? "transition-all duration-200" : ""
                              } ${
                                isSel 
                                  ? "ring-2 ring-amber-500 bg-amber-500/10 border-amber-500 z-30 scale-[1.02] overflow-visible" 
                                  : "hover:border-emerald-500/60 dark:hover:border-zinc-500 z-10 overflow-hidden"
                              }`}
                              style={{
                                left: `${left}%`,
                                bottom: `${bottom}%`,
                                width: `${w}%`,
                                height: `${h}%`,
                                backgroundColor: color,
                                borderColor: isSel ? undefined : color.replace(/[^,]+(?=\))/, "0.7")
                              }}
                            >
                              <div className="p-1 h-full flex flex-col justify-between overflow-hidden">
                                <div className="flex items-start justify-between whitespace-nowrap overflow-hidden">
                                  <span className="text-[10px] font-black text-neutral-900 dark:text-zinc-100 leading-tight truncate">
                                    {b.label}
                                  </span>
                                  <span className="text-[10px] font-mono select-none bg-black/5 rounded p-0.5 shrink-0 ml-1">
                                    {b.emoji || (b.itemType === "path" ? "🛣️" : b.subType === "banya" ? "🛁" : b.subType === "garage" ? "🚗" : "🏠")}
                                  </span>
                                </div>
                                <div className="flex justify-between items-end text-[7.5px] font-mono opacity-80 text-zinc-650 dark:text-zinc-400">
                                  <span>{b.wMeters}x{b.hMeters}м</span>
                                  <span>X:{b.xMeters} Y:{b.yMeters}</span>
                                </div>
                              </div>

                              {/* Interactive Resize Handles for Building (Only in Editing mode) */}
                              {isSel && isEditingPlanogram && (
                                <>
                                  {/* Corner handles */}
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "nw", b)}
                                    className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-nwse-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вверх-Влево"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "ne", b)}
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-nesw-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вверх-Вправо"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "sw", b)}
                                    className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-nesw-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вниз-Влево"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "se", b)}
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-nwse-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вниз-Вправо"
                                  />

                                  {/* Edge handles */}
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "n", b)}
                                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-ns-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вверх"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "s", b)}
                                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-ns-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вниз"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "w", b)}
                                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-ew-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Влево"
                                  />
                                  <div
                                    onMouseDown={(e) => handleResizeMouseDown(e, "e", b)}
                                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-amber-500 rounded-sm cursor-ew-resize z-40 hover:scale-125 transition-transform"
                                    title="Изменить размер: Вправо"
                                  />
                                </>
                              )}
                            </div>
                          );
                        })}

                        {/* Stamped Plants Circles Layers */}
                        {activePlants.map((p) => {
                          const diam = p.diameterMeters || 3;
                          const left = ((p.xMeters || 0) / W) * 100;
                          const bottom = ((p.yMeters || 0) / H) * 100;
                          const wPct = (p.diameterMeters / W) * 100;
                          const hPct = (p.diameterMeters / H) * 100;

                          const offsetLeft = left - (wPct / 2);
                          const offsetBottom = bottom - (hPct / 2);
                          const isSel = selectedPlant?.id === p.id;

                          const bg = p.category === "conifer" ? "rgba(16, 185, 129, 0.25)" 
                                   : p.category === "deciduous" ? "rgba(34, 197, 94, 0.25)" 
                                   : p.category === "dark:bg-lime-950/20 bg-lime-500/10" ? "rgba(163, 230, 53, 0.25)" 
                                   : p.category === "bush" ? "rgba(163, 230, 53, 0.25)" 
                                   : "rgba(244, 114, 182, 0.25)";

                          const border = p.category === "conifer" ? "border-emerald-600/70" 
                                       : p.category === "deciduous" ? "border-green-600/70" 
                                       : p.category === "bush" ? "border-lime-500/70" 
                                       : "border-pink-500/70";

                          const emoji = p.category === "conifer" ? "🌲" : p.category === "deciduous" ? "🌳" : p.category === "bush" ? "🌿" : "🌸";

                          return (
                            <div
                              key={p.id}
                              onMouseDown={isEditingPlanogram ? (e) => handleDragMouseDown(e, "plant", p) : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlant(p);
                                setSelectedPlanBuildingId(null);
                                setActiveTemplate(null);
                              }}
                              className={`absolute rounded-full border flex flex-col items-center justify-center select-none hover:scale-105 z-20 ${
                                isEditingPlanogram ? "cursor-move" : "cursor-pointer"
                              } ${
                                !isEditingPlanogram ? "transition-all duration-200" : ""
                              } ${border} ${
                                isSel ? "ring-2 ring-amber-500 bg-amber-500/15 border-amber-500 z-30 scale-110 overflow-visible" : ""
                              }`}
                              style={{
                                left: `${offsetLeft}%`,
                                bottom: `${offsetBottom}%`,
                                width: `${wPct}%`,
                                height: `${hPct}%`,
                                backgroundColor: bg
                              }}
                            >
                              <span className="text-xs">{emoji}</span>
                              {diam >= 2.5 && (
                                <span className="text-[7.5px] font-black text-zinc-800 dark:text-zinc-200 select-none leading-none mt-0.5 truncate max-w-full px-0.5">
                                  {p.name.replace("Контрольная метка: ", "")}
                                </span>
                              )}

                              {/* Interactive Diameter Resize Handle for Plant */}
                              {isSel && isEditingPlanogram && (
                                <div
                                  onMouseDown={(e) => handleResizeMouseDown(e, "plant_diameter", p)}
                                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-full cursor-ew-resize z-40 flex items-center justify-center shadow-md hover:scale-125 transition-transform"
                                  title="Изменить диаметр кроны (растянуть крону)"
                                >
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Interactive Draggable Corner Nodes (Visible & interactive only when isEditingPlanogram is active) */}
                        {isEditingPlanogram && getPlotCorners(selectedObjectId || "1", W, H).map((corner, index) => {
                          const leftPct = (corner.x / W) * 100;
                          const bottomPct = (corner.y / H) * 100;
                          return (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setActiveCornerIndex(index);
                              }}
                              className="absolute w-5 h-5 -ml-2.5 -mb-2.5 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border-2 border-white dark:border-zinc-900 rounded-full cursor-grab active:cursor-grabbing z-50 flex items-center justify-center shadow-lg transition-transform hover:scale-125 group"
                              style={{
                                left: `${leftPct}%`,
                                bottom: `${bottomPct}%`
                              }}
                              title={`Переместить вершину забора ${index + 1}: ${corner.x}м x ${corner.y}м`}
                            >
                              <span className="text-[9px] font-black text-white leading-none pointer-events-none select-none">{index + 1}</span>
                              {/* Sleek coordinate tooltip overlay */}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap text-[9px] font-mono font-bold bg-neutral-900 text-white dark:bg-zinc-800 dark:border dark:border-zinc-700/60 p-1 px-2 rounded-md shadow-md leading-none z-50 transition-all">
                                Угол {index + 1}: {corner.x}м x {corner.y}м
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-center text-[9px] font-mono text-zinc-500 select-none mt-1 ml-6 leading-none">
                      <span>Южная граница: {W} м</span>
                    </div>

                    {activeTemplate && (
                      <div className="mt-2.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center text-[10px] text-amber-600 dark:text-amber-400 animate-pulse font-bold">
                        🎯 Режим активного штампования: Кликните в любом месте на сетке, чтобы установить «{activeTemplate.label}»
                      </div>
                    )}
                  </div>

                </div>


              {/* Sidebar inspector column */}
              <div className="lg:col-span-1 space-y-4">
                
                {selectedPlant ? (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 space-y-4 shadow-sm animate-fadeIn text-xs text-neutral-850 dark:text-neutral-100">
                    
                    <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">{getPlantLabel(selectedPlant.category)}</span>
                        <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-5s flex items-center gap-1">
                          🌿 {selectedPlant.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => { setSelectedPlant(null); setEditingPlantId(null); }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded text-zinc-400 cursor-pointer"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {editingPlantId === selectedPlant.id ? (
                      <form onSubmit={handleUpdatePlantFields} className="space-y-3">
                        <div>
                          <label className="block font-bold text-[10px] uppercase mb-1">Название Сорта</label>
                          <input 
                            type="text" required
                            value={selectedPlant.name}
                            onChange={(e) => setSelectedPlant({...selectedPlant, name: e.target.value})}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[10px] uppercase mb-1">Год высадки на участке</label>
                          <input 
                            type="text"
                            value={selectedPlant.plantingYear}
                            onChange={(e) => setSelectedPlant({...selectedPlant, plantingYear: e.target.value})}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[10px] uppercase mb-1">Характеристики саженца</label>
                          <textarea 
                            rows={3}
                            value={selectedPlant.specs}
                            onChange={(e) => setSelectedPlant({...selectedPlant, specs: e.target.value})}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[10px] uppercase mb-1">Способы ухода</label>
                          <input 
                            type="text"
                            value={selectedPlant.careGuidance}
                            onChange={(e) => setSelectedPlant({...selectedPlant, careGuidance: e.target.value})}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs"
                          />
                        </div>

                        {/* Plant Meter-Based Sizing and Positions */}
                        <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-100/60 dark:bg-zinc-850 rounded-xl border border-neutral-200 dark:border-zinc-800">
                          <div>
                            <label className="block font-bold text-[9px] uppercase text-zinc-500 mb-1">Крона (диаметр, м)</label>
                            <input 
                              type="number"
                              min="1"
                              max="15"
                              value={selectedPlant.diameterMeters || 3}
                              onChange={(e) => setSelectedPlant({
                                ...selectedPlant,
                                diameterMeters: parseInt(e.target.value) || 1
                              })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[9px] uppercase text-zinc-500 mb-1">Периодичность</label>
                            <input 
                              type="text"
                              value={selectedPlant.frequency}
                              onChange={(e) => setSelectedPlant({...selectedPlant, frequency: e.target.value})}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2 bg-neutral-100/60 dark:bg-zinc-850 rounded-xl border border-neutral-205 dark:border-zinc-800">
                          <div>
                            <label className="block font-bold text-[9px] uppercase text-emerald-650 dark:text-emerald-400 mb-1">Координата X (м)</label>
                            <input 
                              type="number"
                              min="0"
                              max={W}
                              value={selectedPlant.xMeters || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const clampedVal = Math.max(0, Math.min(W, val));
                                setSelectedPlant({
                                  ...selectedPlant,
                                  xMeters: clampedVal,
                                  x: Math.round((clampedVal / W) * 100)
                                });
                              }}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-955 border text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-[9px] uppercase text-emerald-655 dark:text-emerald-400 mb-1">Координата Y (м)</label>
                            <input 
                              type="number"
                              min="0"
                              max={H}
                              value={selectedPlant.yMeters || 0}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const clampedVal = Math.max(0, Math.min(H, val));
                                setSelectedPlant({
                                  ...selectedPlant,
                                  yMeters: clampedVal,
                                  y: Math.round(((H - clampedVal) / H) * 100)
                                });
                              }}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-955 border text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-[10px] uppercase mb-1">Примечания по эксплуатации</label>
                          <textarea 
                            rows={2}
                            value={selectedPlant.remarks}
                            onChange={(e) => setSelectedPlant({...selectedPlant, remarks: e.target.value})}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="submit"
                            className="flex-1 py-1.5 px-3 bg-emerald-600 text-white font-extrabold rounded-lg hover:bg-emerald-700 cursor-pointer text-xs"
                          >
                            Сохранить параметры
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingPlantId(null)}
                            className="px-3 bg-neutral-200 dark:bg-zinc-800 rounded-lg font-bold text-xs cursor-pointer"
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4 text-xs">
                        
                        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-neutral-100 dark:border-zinc-800">
                          <div>
                            <span className="text-[10px] text-zinc-400 block font-bold">Год посадки</span>
                            <span className="font-extrabold text-neutral-800 dark:text-zinc-200">{selectedPlant.plantingYear} год</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-400 block font-bold">Размеры & Координаты</span>
                            <span className="font-semibold text-neutral-800 dark:text-zinc-200 block font-mono">
                              Ø кроны: {selectedPlant.diameterMeters || 3}м (X: {selectedPlant.xMeters}м, Y: {selectedPlant.yMeters}м)
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 font-bold block">📋 Основные характеристики сорта:</span>
                          <p className="text-neutral-700 dark:text-zinc-300 leading-relaxed bg-neutral-50 dark:bg-black/20 p-2.5 rounded-lg border border-neutral-200 dark:border-zinc-800">
                            {selectedPlant.specs}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-400 font-bold block">💦 Формула и способы ухода:</span>
                          <p className="text-neutral-700 dark:text-zinc-300 leading-relaxed font-semibold">
                            {selectedPlant.careGuidance}
                          </p>
                        </div>

                        {selectedPlant.remarks && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-400 font-bold block">💡 Особые примечания собственника:</span>
                            <p className="text-zinc-500 italic">
                              « {selectedPlant.remarks} »
                            </p>
                          </div>
                        )}

                        {/* Plant growth photo timeline */}
                        <div className="space-y-3 border-t pt-3.5 border-neutral-100 dark:border-zinc-805">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">🗓️ Журнал состояния и динамика роста</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingPlantPhotoForm(!isAddingPlantPhotoForm);
                                setNewPlantPhotoNotes("");
                              }}
                              className="text-[10px] font-black text-emerald-600 hover:underline cursor-pointer"
                            >
                              {isAddingPlantPhotoForm ? "Закрыть запись" : "+ Новая запись состояния"}
                            </button>
                          </div>

                          {/* Interactive Expandable Sub Form to add record */}
                          {isAddingPlantPhotoForm && (
                            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">📝 Новая фиксация ухода</span>
                              
                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Фотоснимок состояния (выберите пресет):</label>
                                <div className="grid grid-cols-4 gap-1">
                                  {[
                                    { l: "🌲 Пихта/Ель", url: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=400&auto=format&fit=crop&q=60" },
                                    { l: "🌳 Дуб/Крона", url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400&auto=format&fit=crop&q=65" },
                                    { l: "🌸 Цветы", url: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&auto=format&fit=crop&q=60" },
                                    { l: "🌱 Росток", url: "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&auto=format&fit=crop&q=60" }
                                  ].map((opt, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      onClick={() => setNewPlantPhotoPreset(opt.url)}
                                      className={`p-1 text-[8px] font-bold rounded border text-center truncate cursor-pointer ${
                                        newPlantPhotoPreset === opt.url 
                                          ? "bg-emerald-650 text-white border-emerald-650" 
                                          : "bg-white dark:bg-zinc-800 border-neutral-200 dark:border-zinc-700 hover:border-emerald-500 text-neutral-800 dark:text-zinc-300"
                                      }`}
                                    >
                                      {opt.l}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Или вставьте ссылку на ваше фото"
                                  value={newPlantPhotoPreset}
                                  onChange={(e) => setNewPlantPhotoPreset(e.target.value)}
                                  className="w-full text-[9px] p-1 bg-white dark:bg-black/35 rounded border border-neutral-250 dark:border-zinc-850 mt-1 font-mono text-neutral-800 dark:text-zinc-200"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[9px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Заметка по уходу / Описание состояния:</label>
                                <textarea
                                  placeholder="Например: 'Дал сильный прирост хвои за сезон. Успешно перезимовал без укрытия.'"
                                  rows={2}
                                  value={newPlantPhotoNotes}
                                  onChange={(e) => setNewPlantPhotoNotes(e.target.value)}
                                  className="w-full text-xs p-1.5 bg-white dark:bg-black/35 rounded border border-neutral-250 dark:border-zinc-850 text-neutral-800 dark:text-zinc-250"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const dateStr = new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
                                  const newEntry = {
                                    date: dateStr,
                                    url: newPlantPhotoPreset,
                                    notes: newPlantPhotoNotes.trim() || "Состояние посадки зафиксировано владельцем."
                                  };
                                  
                                  const updatedPhotos = [...(selectedPlant.growthPhotos || []), newEntry];
                                  const updatedPlant = { ...selectedPlant, growthPhotos: updatedPhotos };
                                  setSelectedPlant(updatedPlant);
                                  setPlantNodes(prev => prev.map(p => p.id === selectedPlant.id ? updatedPlant : p));
                                  
                                  // Reset Status State
                                  setIsAddingPlantPhotoForm(false);
                                  setNewPlantPhotoNotes("");
                                }}
                                className="w-full py-1 text-center text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm cursor-pointer"
                              >
                                Сохранить в историю посадки
                              </button>
                            </div>
                          )}

                          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {(selectedPlant.growthPhotos || []).map((ph, index) => (
                              <div key={index} className="rounded-lg overflow-hidden border border-neutral-200/60 dark:border-zinc-800 bg-neutral-50/50 dark:bg-black/25 p-2 space-y-1.5 shadow-sm">
                                <div className="rounded overflow-hidden">
                                  <img src={ph.url} alt={ph.date} className="w-full h-24 object-cover hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                                </div>
                                <div className="space-y-1.5 pt-1.5">
                                  <div className="flex justify-between items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold font-mono leading-none">
                                    <span>🗓️ {ph.date}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedPhotos = selectedPlant.growthPhotos.filter((_, i) => i !== index);
                                        const updatedPlant = { ...selectedPlant, growthPhotos: updatedPhotos };
                                        setSelectedPlant(updatedPlant);
                                        setPlantNodes(prev => prev.map(p => p.id === selectedPlant.id ? updatedPlant : p));
                                      }}
                                      className="text-red-500 hover:text-red-700 font-black cursor-pointer bg-red-500/5 hover:bg-red-500/10 px-1 py-0.5 rounded leading-none text-[8px]"
                                      title="Удалить запись истории"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-zinc-700 dark:text-zinc-350 leading-relaxed font-semibold">
                                    {ph.notes || "Состояние посадки в норме, плановый вегетационный уход."}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Meta control button triggers */}
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingPlantId(selectedPlant.id)}
                            className="flex-1 py-1 px-2 text-center text-xs bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 hover:text-emerald-600 rounded font-bold transition-all cursor-pointer"
                          >
                            📝 Редактировать характеристики
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeletePlant(selectedPlant.id);
                              setSelectedPlant(null);
                            }}
                            className="px-2 py-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-all cursor-pointer"
                            title="Убрать растение с карты"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>

                      </div>
                    )}
                  </div>
                ) : selectedPlanBuildingId ? (() => {
                  const b = planBuildings.find(item => item.id === selectedPlanBuildingId);
                  if (!b) return null;

                  const handleUpdateBuildingMeters = (fields: Partial<PlanogramBuilding>) => {
                    setPlanBuildings(prev => prev.map(item => {
                      if (item.id !== selectedPlanBuildingId) return item;
                      const merged = { ...item, ...fields };
                      const wVal = Math.max(1, merged.wMeters || 1);
                      const hVal = Math.max(1, merged.hMeters || 1);
                      const xVal = Math.max(0, Math.min(W - wVal, merged.xMeters || 0));
                      const yVal = Math.max(0, Math.min(H - hVal, merged.yMeters || 0));
                      return {
                        ...merged,
                        wMeters: wVal,
                        hMeters: hVal,
                        xMeters: xVal,
                        yMeters: yVal,
                        // sync percent values
                        x: Math.round((xVal / W) * 100),
                        y: Math.round(((H - yVal - hVal) / H) * 100),
                        width: Math.round((wVal / W) * 100),
                        height: Math.round((hVal / H) * 100)
                      };
                    }));
                  };

                  const handleDuplicateItem = () => {
                    const newId = "PB_dup_" + Date.now();
                    const nextX = Math.min(W - (b.wMeters || 4), (b.xMeters || 0) + 2);
                    const nextY = Math.min(H - (b.hMeters || 4), (b.yMeters || 0) + 2);
                    const duplicated: PlanogramBuilding = {
                      ...b,
                      id: newId,
                      xMeters: nextX,
                      yMeters: nextY,
                      x: Math.round((nextX / W) * 100),
                      y: Math.round(((H - nextY - (b.hMeters || 4)) / H) * 100),
                      label: b.label + " (Копия)"
                    };
                    setPlanBuildings(prev => [...prev, duplicated]);
                    setSelectedPlanBuildingId(newId);
                  };

                  return (
                    <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-205 dark:border-zinc-800 space-y-4 shadow-sm animate-fadeIn text-xs text-neutral-850 dark:text-neutral-100">
                      <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-zinc-805">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Инспектор постройки</span>
                          <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-51 flex items-center gap-1">
                            🏢 {b.label}
                          </h4>
                        </div>
                        <button
                          onClick={() => setSelectedPlanBuildingId(null)}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded text-zinc-400 cursor-pointer"
                          type="button"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3.5">
                        {/* Name Input */}
                        <div>
                          <label className="block font-bold text-zinc-400 text-[9px] uppercase mb-1">Название усадебного строения / дорожки:</label>
                          <input 
                            type="text" 
                            value={b.label}
                            onChange={(e) => handleUpdateBuildingMeters({ label: e.target.value })}
                            className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-800 font-bold"
                          />
                        </div>

                        {/* Direct Meters Dimensions */}
                        <div className="grid grid-cols-2 gap-3 p-2.5 bg-neutral-50/50 dark:bg-black/20 rounded-xl border border-neutral-200/50 dark:border-zinc-800/50">
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Ширина (в метрах):</label>
                            <input 
                              type="number" 
                              min="1" 
                              max={W}
                              value={b.wMeters || 4}
                              onChange={(e) => handleUpdateBuildingMeters({ wMeters: parseInt(e.target.value) || 1 })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-450 uppercase mb-1">Высота / Длина (в метрах):</label>
                            <input 
                              type="number" 
                              min="1" 
                              max={H}
                              value={b.hMeters || 4}
                              onChange={(e) => handleUpdateBuildingMeters({ hMeters: parseInt(e.target.value) || 1 })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Direct Meters Positions */}
                        <div className="grid grid-cols-2 gap-3 p-2.5 bg-neutral-50/50 dark:bg-black/20 rounded-xl border border-neutral-200/50 dark:border-zinc-800/50">
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">Сдвиг от левого края X (м):</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={W - (b.wMeters || 4)}
                              value={b.xMeters || 0}
                              onChange={(e) => handleUpdateBuildingMeters({ xMeters: parseInt(e.target.value) || 0 })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-455 uppercase mb-1">Сдвиг от нижнего края Y (м):</label>
                            <input 
                              type="number" 
                              min="0" 
                              max={H - (b.hMeters || 4)}
                              value={b.yMeters || 0}
                              onChange={(e) => handleUpdateBuildingMeters({ yMeters: parseInt(e.target.value) || 0 })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>

                        {/* Linked Property Object */}
                        <div>
                          <label className="block font-bold text-zinc-400 text-[9px] uppercase mb-1">Связь с объектом из реестра имущества:</label>
                          <select
                            value={b.linkedObjectId || ""}
                            onChange={(e) => handleUpdateBuildingMeters({ linkedObjectId: e.target.value || undefined })}
                            className="w-full p-2 rounded bg-neutral-105 dark:bg-black/35 border text-xs text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-805"
                          >
                            <option value="">-- Вспомогательное строение / дорожка --</option>
                            {(currentUser.role === 'admin' ? objects : objects.filter(o => o.ownerId === currentUser.id)).map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Special Greenhouse planting layout button */}
                        {b.subType === "greenhouse" && (
                          <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 block uppercase font-mono">
                              🌱 Доступен интерактивный план
                            </span>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                              Для этой теплицы можно спроектировать внутренние грядки, распределить сорта посадок (томаты, огурцы, зелень) и зафиксировать их координаты.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const matchedBeds = greenhouseBeds.filter(x => x.greenhouseId === b.id);
                                if (matchedBeds.length === 0) {
                                  const defaultBeds = greenhouseBeds.filter(x => x.greenhouseId === "pb_greenhouse_default");
                                  if (defaultBeds.length > 0) {
                                    const copiedBeds = defaultBeds.map(db => ({
                                      ...db,
                                      id: `ghb_${db.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                      greenhouseId: b.id
                                    }));
                                    setGreenhouseBeds(prev => [...prev, ...copiedBeds]);
                                  }
                                }
                                setSelectedGreenhouseIdForEditor(b.id);
                                setSelectedGreenhouseBedId(null);
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                            >
                              <span>🌿 Спланировать посадки ({greenhouseBeds.filter(x => x.greenhouseId === b.id).length || 0})</span>
                            </button>
                          </div>
                        )}

                        {/* Style / Fill Presets */}
                        <div>
                          <label className="block font-bold text-zinc-400 text-[9px] uppercase mb-1">Цветовая гамма на схеме:</label>
                          <div className="grid grid-cols-4 gap-1 mt-1">
                            {[
                              { name: "Камень", code: "rgba(107, 114, 128, 0.25)" },
                              { name: "Баня", code: "rgba(245, 158, 11, 0.25)" },
                              { name: "Зелень", code: "rgba(16, 185, 129, 0.25)" },
                              { name: "Вода", code: "rgba(59, 130, 246, 0.25)" },
                              { name: "Котельная", code: "rgba(244, 63, 94, 0.25)" },
                              { name: "Красивый", code: "rgba(99, 102, 241, 0.25)" }
                            ].map(colorOpt => (
                              <button
                                key={colorOpt.name}
                                type="button"
                                onClick={() => handleUpdateBuildingMeters({ color: colorOpt.code })}
                                className={`p-1 text-[9px] font-bold border rounded text-center truncate cursor-pointer ${
                                  b.color === colorOpt.code
                                    ? "border-emerald-500 bg-emerald-505/15 text-emerald-600 font-bold"
                                    : "border-neutral-200 dark:border-zinc-800"
                                }`}
                              >
                                {colorOpt.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Coping & Duplicating items quickly */}
                        <div className="flex gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800/80">
                          <button
                            type="button"
                            onClick={handleDuplicateItem}
                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-650 text-white rounded-lg transition-all font-black text-center cursor-pointer text-xs flex items-center justify-center gap-1"
                          >
                            <span>👥 Копировать / Дублировать</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setPlanBuildings(prev => prev.filter(item => item.id !== selectedPlanBuildingId));
                              setSelectedPlanBuildingId(null);
                            }}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-bold text-center cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
                : selectedBoundaryLineId ? (
                  // Boundary Line inspector
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 space-y-4 shadow-sm animate-fadeIn text-xs text-neutral-850 dark:text-neutral-100">
                    <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Протяженность забора</span>
                        <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-50">
                          {boundaryLines.find(l => l.id === selectedBoundaryLineId)?.lengthLabel || "Граница"}
                        </h4>
                      </div>
                      <button
                        onClick={() => setSelectedBoundaryLineId(null)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded text-zinc-400"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block font-semibold text-zinc-500 text-[10px] uppercase mb-1">Размер вектора (подпись)</label>
                        <input 
                          type="text" 
                          value={boundaryLines.find(l => l.id === selectedBoundaryLineId)?.lengthLabel || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBoundaryLines(prev => prev.map(l => l.id === selectedBoundaryLineId ? { ...l, lengthLabel: val } : l));
                          }}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 border text-xs text-neutral-900 dark:text-white border-neutral-200 dark:border-zinc-800"
                        />
                      </div>

                      <div className="p-2.5 bg-neutral-50 dark:bg-black/20 rounded border border-neutral-200 dark:border-zinc-800 text-[11px] space-y-1">
                        <span className="text-[9px] text-zinc-500 font-extrabold uppercase">Координатная привязка:</span>
                        <div className="font-mono text-[10px] opacity-80 grid grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-400">
                          <span>A: ({boundaryLines.find(l => l.id === selectedBoundaryLineId)?.startX}%, {boundaryLines.find(l => l.id === selectedBoundaryLineId)?.startY}%)</span>
                          <span>B: ({boundaryLines.find(l => l.id === selectedBoundaryLineId)?.endX}%, {boundaryLines.find(l => l.id === selectedBoundaryLineId)?.endY}%)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setBoundaryLines(prev => prev.filter(l => l.id !== selectedBoundaryLineId));
                          setSelectedBoundaryLineId(null);
                        }}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-bold text-center mt-2 cursor-pointer text-xs"
                      >
                        Стереть вектор забора
                      </button>
                    </div>
                  </div>
                ) : (
                  // Default view: Interactive Registry list of ALL elements on plan!
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 space-y-4 shadow-sm text-xs text-neutral-850 dark:text-neutral-100">
                    <span className="text-[10px] font-black uppercase text-emerald-600 block border-b pb-2">📋 Реестр объектов усадьбы</span>
                    
                    {/* BOUNDARIES LIST */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center bg-neutral-50 dark:bg-black/30 p-1 px-2 rounded">
                        <span className="font-extrabold text-[9px] text-zinc-500 uppercase">Показатели забора ({boundaryLines.length})</span>
                      </div>
                      {boundaryLines.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 italic">Сетка границ еще отсутствует.</p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {boundaryLines.map(line => (
                            <div 
                              onClick={() => {
                                setSelectedBoundaryLineId(line.id);
                                setSelectedPlanBuildingId(null);
                                setSelectedPlant(null);
                              }}
                              key={line.id} 
                              className={`p-1.5 rounded border flex justify-between items-center transition-all cursor-pointer text-[11px] ${
                                selectedBoundaryLineId === line.id ? "border-amber-400 bg-amber-500/5 ring-1 ring-amber-500/20 font-bold text-amber-600" : "border-neutral-100 dark:border-zinc-800 hover:bg-neutral-50/50"
                              }`}
                            >
                              <span className="truncate flex items-center gap-1">
                                📐 {line.lengthLabel}
                              </span>
                              <span className="text-[8px] px-1 bg-neutral-100 dark:bg-zinc-800 font-mono text-zinc-400 rounded select-none">
                                ред.
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BUILDINGS LIST */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center bg-neutral-50 dark:bg-black/30 p-1 px-2 rounded">
                        <span className="font-extrabold text-[9px] text-zinc-500 uppercase">Строения и навесы ({planBuildings.length})</span>
                      </div>
                      {planBuildings.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 italic">Строений на схеме не обозначено.</p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {planBuildings.map(b => (
                            <div 
                              onClick={() => {
                                setSelectedPlanBuildingId(b.id);
                                setSelectedBoundaryLineId(null);
                                setSelectedPlant(null);
                              }}
                              key={b.id} 
                              className={`p-1.5 rounded border flex justify-between items-center transition-all cursor-pointer ${
                                selectedPlanBuildingId === b.id ? "border-amber-400 bg-amber-500/5 ring-1 ring-amber-500/20 font-bold text-amber-600" : "border-neutral-100 dark:border-zinc-800 hover:bg-neutral-50/50"
                              }`}
                            >
                              <span className="truncate flex items-center gap-1">
                                🏠 {b.label}
                              </span>
                              <span className="text-[8px] px-1 bg-neutral-100 dark:bg-zinc-800 font-mono text-zinc-400 rounded select-none">
                                {b.width}x{b.height}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* PLANTS LIST */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center bg-neutral-50 dark:bg-black/30 p-1 px-2 rounded">
                        <span className="font-extrabold text-[9px] text-zinc-500 uppercase">Высаженная флора ({plantNodes.length})</span>
                      </div>
                      {plantNodes.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 italic">Саженцев на схему не добавлено.</p>
                      ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {plantNodes.map(p => (
                            <div 
                              onClick={() => {
                                setSelectedPlant(p);
                                setSelectedPlanBuildingId(null);
                                setSelectedBoundaryLineId(null);
                              }}
                              key={p.id} 
                              className="p-1.5 rounded border border-neutral-100 dark:border-zinc-800 hover:bg-neutral-50/50 flex justify-between items-center transition-all cursor-pointer text-[11px]"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span>
                                  {p.category === "conifer" ? "🌲" : p.category === "deciduous" ? "🌳" : p.category === "bush" ? "🌿" : p.category === "flowerbed" ? "🌸" : "🥬"}
                                </span>
                                <span className="font-semibold text-neutral-800 dark:text-zinc-200 truncate">{p.name}</span>
                              </div>
                              <span className="text-[8px] font-mono text-zinc-400 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-600 p-0.5 px-1 rounded shrink-0">
                                {p.plantingYear}г
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

              </div>

            </div>
          );
        })()}

          {/* GARDENS TAB SUB 2: GARDENS REGISTRY LIST */}
          {gardenSubTab === "gardens" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-4">
                <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <h4 className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100">Картотека ландшафтных проектов</h4>

                  <div className="space-y-4">
                    {gardens.map(g => (
                      <div key={g.id} className="p-4 rounded-xl bg-neutral-50 dark:bg-black/35 border border-neutral-300/10 relative">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          <span className="font-black text-sm text-neutral-900 dark:text-white">{g.name}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{g.address} · <span className="font-mono text-[10px]">{g.coords}</span></p>
                        
                        <div className="text-xs space-y-1.5 pt-2.5 border-t border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-zinc-300">
                          <p>🎨 <strong>Автор проекта планировки:</strong> {g.designer}</p>
                          <p className="text-zinc-500">📖 <strong>История освоения участка:</strong> {g.creationHistory}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setGardens(prev => prev.filter(x => x.id !== g.id));
                          }}
                          className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 cursor-pointer"
                          title="Удалить этот садовый проект"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add Garden Form */}
              <div className="lg:col-span-1">
                <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
                  <h4 className="font-bold text-xs uppercase text-emerald-600">Зарегистрировать новый Сад</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!newGardenForm.name) return;
                    const bG: MyGarden = {
                      id: "g_" + Date.now(),
                      name: newGardenForm.name,
                      address: newGardenForm.address || "Не указан",
                      coords: newGardenForm.coords || "55.772, 38.455",
                      designer: newGardenForm.designer || "Личный проект владельца",
                      creationHistory: newGardenForm.creationHistory || "Создан весной силами семьи.",
                      linkedObjectId: newGardenForm.linkedObjectId || undefined
                    };
                    setGardens(prev => [...prev, bG]);
                    setNewGardenForm({ name: "", address: "", coords: "", designer: "", creationHistory: "", linkedObjectId: "" });
                  }} className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Привязать к объекту недвижимости</label>
                      <select 
                        value={newGardenForm.linkedObjectId}
                        onChange={(e) => setNewGardenForm({...newGardenForm, linkedObjectId: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35 text-xs text-neutral-900 dark:text-white"
                      >
                        <option value="">-- Без привязки (Самостоятельный сад) --</option>
                        {(currentUser.role === 'admin' ? objects : objects.filter(o => o.ownerId === currentUser.id)).map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Название сада</label>
                      <input 
                        type="text" required placeholder="Японский каменный вишневый сад"
                        value={newGardenForm.name}
                        onChange={(e) => setNewGardenForm({...newGardenForm, name: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Кадастровый адрес</label>
                      <input 
                        type="text" placeholder="ДНП Хвойный берег, уч. 98"
                        value={newGardenForm.address}
                        onChange={(e) => setNewGardenForm({...newGardenForm, address: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Координаты участка</label>
                      <input 
                        type="text" placeholder="55.8824, 38.1255"
                        value={newGardenForm.coords}
                        onChange={(e) => setNewGardenForm({...newGardenForm, coords: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Дизайнер / Архитектурное бюро</label>
                      <input 
                        type="text" placeholder="Индивидуальный эскиз студии 'Green'"
                        value={newGardenForm.designer}
                        onChange={(e) => setNewGardenForm({...newGardenForm, designer: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-zinc-450 mb-1">Краткая хроника создания</label>
                      <textarea 
                        rows={3} placeholder="Деревья высажены в два этапа..."
                        value={newGardenForm.creationHistory}
                        onChange={(e) => setNewGardenForm({...newGardenForm, creationHistory: e.target.value})}
                        className="w-full p-2 rounded border bg-neutral-50 dark:bg-black/35"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2 bg-emerald-600 text-white font-extrabold rounded-lg hover:bg-emerald-700 cursor-pointer"
                    >
                      Внести садовый объект
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}


          {/* GARDENS TAB SUB 3: SERVICE PROVIDERS */}
          {gardenSubTab === "services" && (
            <div className="space-y-6 animate-fadeIn text-xs text-neutral-800 dark:text-neutral-100">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-850">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-neutral-950 dark:text-white flex items-center gap-2">
                    🚜 Сервисные службы и сторонние специалисты
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Управляйте доступом компаний и специалистов. Вносите данные обслуживания по разовым или постоянным пропускам.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={handleStartAddServiceCompany}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Зарегистрировать службу</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 space-y-4">
                  {serviceCompanies.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-zinc-900 border rounded-xl space-y-3">
                      <p className="text-zinc-500 font-bold">Ни одной сервисной службы пока не добавлено.</p>
                      <button
                        type="button"
                        onClick={handleStartAddServiceCompany}
                        className="text-emerald-500 font-extrabold hover:underline"
                      >
                        Добавить первого специалиста сейчас
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {serviceCompanies.map((company) => {
                        // Find matching reports in system for this company/specialist
                        const matchedReports = reports.filter(rep => 
                          (rep.specialistInfo?.company?.toLowerCase().includes((company.name || "").toLowerCase())) ||
                          (rep.specialistInfo?.fullname?.toLowerCase().includes((company.specialistName || "").toLowerCase()))
                        );

                        return (
                          <div 
                            key={company.id}
                            className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 space-y-4 relative shadow-sm hover:shadow transition-all"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-[13px] text-neutral-900 dark:text-neutral-50">{company.name}</h4>
                                  <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                                    company.accessType === "permanent" 
                                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 border border-amber-200/30" 
                                      : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200/30"
                                  }`}>
                                    {company.accessType === "permanent" ? "♾️ Постоянный" : "🕒 Временный"}
                                  </span>

                                  <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider ${
                                    company.tokenStatus === "active"
                                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200/30"
                                      : "bg-red-100 dark:bg-red-950/40 text-red-600 border border-red-200/30"
                                  }`}>
                                    {company.tokenStatus === "active" ? "✓ Допуск открыт" : "✕ Заблокирован"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-500 font-medium">Ответственный мастер: <strong>{company.specialistName}</strong> · Тел: {company.phone}</p>
                              </div>

                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditServiceCompany(company)}
                                  className="p-1 px-2 border border-neutral-300 dark:border-neutral-700 hover:border-emerald-600 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 text-[10px] font-bold rounded-lg transition"
                                >
                                  Редактировать
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteServiceCompany(company.id)}
                                  className="p-1 text-zinc-400 hover:text-red-500 transition"
                                  title="Удалить службу"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Belonging of service */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                              <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/30 border border-neutral-200/60 dark:border-neutral-800/80 space-y-1.5">
                                <div className="text-zinc-400 uppercase tracking-widest font-black text-[9px] font-mono">Принадлежность и Сфера:</div>
                                <div className="flex items-center gap-1.5">
                                  <span>
                                    {company.scopeType === "garden" ? "🌲 Садовый участок" : company.scopeType === "building" ? "🏠 Строение / Паспорт" : "⚙️ Инженерное оборудование"}
                                  </span>
                                  <span className="text-zinc-400 font-mono">→</span>
                                  <strong className="text-emerald-700 dark:text-emerald-400">{company.scopeName}</strong>
                                </div>
                                <p className="text-zinc-500 italic mt-1 font-medium">{company.scheduleDescription || "Регулярный уход и обслуживание по регламенту"}</p>
                              </div>

                              <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-black/30 border border-neutral-200/60 dark:border-neutral-800/80 space-y-1.5 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="text-zinc-400 uppercase tracking-widest font-black text-[9px] font-mono">Учетные ключи и ПИН:</div>
                                  <div className="font-mono text-zinc-600 dark:text-zinc-400 font-bold flex items-center gap-2">
                                    <span>ПИН-Код:</span>
                                    <span className="bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-800 dark:text-neutral-100 font-extrabold text-[10px]">
                                      {company.temporalToken || company.id.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                
                                {matchedReports.length > 0 && (
                                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 p-1 px-2 rounded-md self-start">
                                    ✓ Выполнено ТО в системе: {matchedReports.length} шт.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Service actions block for simulated, 100% interactive controls */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-850">
                              
                              <button
                                type="button"
                                onClick={() => handleToggleServiceAccess(company.id)}
                                className={`p-2 px-3.5 font-bold rounded-lg cursor-pointer transition text-[10px] uppercase tracking-wide flex items-center gap-1 ${
                                  company.tokenStatus === "active" 
                                    ? "bg-red-500 hover:bg-red-600 text-white" 
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                }`}
                              >
                                {company.tokenStatus === "active" ? "Отозвать доступ" : "Восстановить доступ"}
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveQrCompany(company)}
                                className="p-1.5 px-3 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 font-bold rounded-lg text-[10px] uppercase tracking-wide transition flex items-center gap-1 cursor-pointer text-neutral-800 dark:text-neutral-200"
                              >
                                📲 Разовый QR и ссылка
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  alert(`[СИМУЛЯЦИЯ СМС] Идет отправка СМС на телефон ${company.phone}.\nСообщение: "Ваш код допуска в систему обслуживания Мой Сад: ${company.temporalToken}. Ссылка: ${window.location.origin}${window.location.pathname}?flow=specialist&registered=false&objId=${company.scopeId || 'obj_1'}&schId=${company.linkedScheduleId || 'sch_1'}"`);
                                }}
                                className="p-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 font-bold rounded-lg text-[10px] uppercase tracking-wide transition flex items-center gap-1 cursor-pointer"
                              >
                                💬 Запустить по разовому СМС-паролю
                              </button>

                              {matchedReports.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const alertText = matchedReports.map(rep => 
                                      `- Акт от ${new Date(rep.dateDone).toLocaleDateString()}: ${rep.answers.length} проверенных пунктов. Выполнил: ${rep.specialistInfo.fullname}, Оценка собственника: ${rep.ownerRating || "не оценено"} звёзд.`
                                    ).join("\n");
                                    alert(`Журнал занесенных данных службы "${company.name}":\n\n${alertText}`);
                                  }}
                                  className="p-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold rounded-lg text-[10px] uppercase tracking-wide transition ml-auto flex items-center gap-1 cursor-pointer"
                                >
                                  📜 Журнал ({matchedReports.length})
                                </button>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Info side column explaining safety, logic, non-impact of mechanical valves */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-neutral-50 to-neutral-100/50 dark:from-zinc-900 dark:to-transparent border border-neutral-250 dark:border-neutral-800 text-xs space-y-3.5 shadow-sm">
                    <span className="font-black text-[10.5px] text-emerald-600 uppercase tracking-widest block font-mono">🔒 Безопасность и Делегирование</span>
                    <p className="leading-relaxed opacity-85 text-neutral-600 dark:text-neutral-300">
                      Приложение «Мой цифровой дом» является **чисто информативным сервером и удобным цифровым журналом** усадьбы. Оно **не управляет** напрямую механическими клапанами, электросетью или котлом загородного дома.
                    </p>
                    <p className="leading-relaxed opacity-85 text-neutral-600 dark:text-neutral-300">
                      Это гарантирует 100% устойчивость и физическую безопасность: мастера, садовники и инспекторы получают доступ только к **внесению отчетов, фотографий и заполнению инспекционных чек-листов (актов)**.
                    </p>
                    <div className="p-3 bg-white dark:bg-black/30 border border-neutral-200/50 rounded-lg space-y-1">
                      <strong className="block text-emerald-700 dark:text-emerald-400 text-[10.5px]">Как работает Разовый гостевой допуск:</strong>
                      <p className="opacity-75 text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
                        Сгенерированный QR-код содержит в себе зашифрованную ссылку на нужный чек-лист. Специалисту достаточно навести камеру телефона, внести фотоотчет и кликнуть «Сохранить». Данные немедленно заносятся в систему и отправляются собственнику.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {gardenSubTab === "seeds" && (
            <div className="space-y-6 animate-fadeIn text-xs text-neutral-850 dark:text-neutral-100">
              
              {/* Top Banner and Filter Row */}
              <div className="p-5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-850 rounded-xl space-y-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-base text-neutral-950 dark:text-white flex items-center gap-2">
                      🎒 Электронный реестр семян, сортов и саженцев
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Сохраняйте характеристики сортов, особенности ухода и личные отзывы о плодах. Оценивайте успешность выращивания, чтобы сформировать идеальный план посадок на будущие сезоны.
                    </p>
                  </div>
                  
                  {!isAddingSeed && !seedEditingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeedForm({
                          name: "",
                          emoji: "🍅",
                          category: "Томаты",
                          characteristics: "",
                          fruitDescription: "",
                          careInstructions: "",
                          rating: 5,
                          plantAgain: "yes",
                          notes: ""
                        });
                        setIsAddingSeed(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Добавить новый сорт</span>
                    </button>
                  )}
                </div>

                {/* Filters view */}
                {!isAddingSeed && !seedEditingId && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-100 dark:border-zinc-850">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Поиск по сорту или заметкам..."
                        value={seedSearchQuery}
                        onChange={(e) => setSeedSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-neutral-900 dark:text-neutral-50"
                      />
                    </div>

                    <div>
                      <select
                        value={seedCategoryFilter}
                        onChange={(e) => setSeedCategoryFilter(e.target.value)}
                        className="w-full text-xs p-2 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-neutral-800 dark:text-neutral-100 cursor-pointer"
                      >
                        <option value="all">🥦 Все культуры</option>
                        <option value="Томаты">🍅 Томаты</option>
                        <option value="Огурцы">🥒 Огурцы</option>
                        <option value="Перцы">🫑 Перцы</option>
                        <option value="Ягоды">🍓 Ягоды</option>
                        <option value="Зелень">🥬 Зелень</option>
                        <option value="Другое">🌱 Другие культуры</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black text-neutral-400 font-mono shrink-0">Всего в базе:</span>
                      <span className="py-1 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs rounded-lg">
                        {seedCatalog.length} сортов
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form View for Adding / Editing Category seeds */}
              {(isAddingSeed || seedEditingId) && (
                <div className="p-6 bg-white dark:bg-zinc-900 border border-neutral-250 dark:border-neutral-800 rounded-xl space-y-4 shadow-md animate-fadeIn text-left">
                  <div className="flex items-center justify-between border-b border-neutral-150 dark:border-zinc-800 pb-3">
                    <h4 className="font-extrabold text-sm text-neutral-950 dark:text-white flex items-center gap-2">
                      <span>{seedEditingId ? "✏️ Редактирование сорта" : "🌱 Добавление нового сорта в каталог"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSeed(false);
                        setSeedEditingId(null);
                      }}
                      className="text-zinc-400 hover:text-red-500 font-bold text-xs uppercase cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Название / Сорт растения (например, Бычье сердце, Кураж F1):</label>
                      <input
                        type="text"
                        value={seedForm.name || ""}
                        onChange={(e) => setSeedForm({ ...seedForm, name: e.target.value })}
                        placeholder="Например, Генерал F1, Амурский тигр"
                        className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Category & Emoji selectors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase">Категория:</label>
                        <select
                          value={seedForm.category || "Томаты"}
                          onChange={(e) => {
                            const cat = e.target.value;
                            let emo = "🌱";
                            if (cat === "Томаты") emo = "🍅";
                            else if (cat === "Огурцы") emo = "🥒";
                            else if (cat === "Перцы") emo = "🫑";
                            else if (cat === "Ягоды") emo = "🍓";
                            else if (cat === "Зелень") emo = "🥬";
                            setSeedForm({ ...seedForm, category: cat, emoji: emo });
                          }}
                          className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs font-bold text-neutral-900 dark:text-white cursor-pointer"
                        >
                          <option value="Томаты">🍅 Томаты</option>
                          <option value="Огурцы">🥒 Огурцы</option>
                          <option value="Перцы">🫑 Перцы</option>
                          <option value="Ягоды">🍓 Ягоды</option>
                          <option value="Зелень">🥬 Зелень</option>
                          <option value="Другое">🌱 Другое</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-500 uppercase">Иконка (Emoji):</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={seedForm.emoji || "🍅"}
                            onChange={(e) => setSeedForm({ ...seedForm, emoji: e.target.value })}
                            className="w-12 p-2 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-center text-sm font-bold text-neutral-900 dark:text-white"
                          />
                          <div className="flex flex-wrap gap-1 max-w-[120px]">
                            {["🍅", "🥒", "🫑", "🍓", "🥬", "🍆", "🥕", "🌶️", "🍉", "🍈", "🌱"].map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setSeedForm({ ...seedForm, emoji: em })}
                                className={`text-base p-0.5 hover:scale-125 cursor-pointer transition-transform ${seedForm.emoji === em ? "border border-emerald-500 rounded bg-emerald-500/10" : ""}`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Characteristics */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Характеристики сорта (срок созревания, параметры куста):</label>
                      <textarea
                        value={seedForm.characteristics || ""}
                        onChange={(e) => setSeedForm({ ...seedForm, characteristics: e.target.value })}
                        placeholder="Например, Раннеспелый, детерминантный куст до 80 см, не требует пасынкования."
                        rows={3}
                        className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Fruit Description */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Описание плодов (величины, вкус, назначение):</label>
                      <textarea
                        value={seedForm.fruitDescription || ""}
                        onChange={(e) => setSeedForm({ ...seedForm, fruitDescription: e.target.value })}
                        placeholder="Например, Плоды ярко-желтые, массой 100-150г, плотные, сочные, сладкие. Идеальны для маринования."
                        rows={3}
                        className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Special Care */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Особенности ухода (полив, прищипывание, удобрения):</label>
                      <textarea
                        value={seedForm.careInstructions || ""}
                        onChange={(e) => setSeedForm({ ...seedForm, careInstructions: e.target.value })}
                        placeholder="Например, Требует повышенных доз фосфорно-калийных удобрений при цветении, полив по графику 2 раза в неделю."
                        rows={2}
                        className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* History notes */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Личные заметки, история выращивания и отзывы сезона:</label>
                      <textarea
                        value={seedForm.notes || ""}
                        onChange={(e) => setSeedForm({ ...seedForm, notes: e.target.value })}
                        placeholder="Например, Высаживали в теплицу в мае 2025. Урожайность составила 4кг с куста. Из плюсов — не болели фитофторой. Очень довольны."
                        rows={2}
                        className="w-full p-2.5 bg-neutral-50 dark:bg-zinc-950 border border-neutral-250 dark:border-zinc-800 rounded-lg text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* User evaluation rating */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Субъективная оценка сорта (Звёзд):</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((starVal) => (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setSeedForm({ ...seedForm, rating: starVal })}
                            className="p-1 px-1.5 focus:outline-none cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 transition-all ${
                                starVal <= (seedForm.rating || 5)
                                  ? "text-yellow-500 fill-yellow-500 scale-110"
                                  : "text-stone-300 dark:text-zinc-700"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-black font-mono ml-2 text-neutral-900 dark:text-white">({seedForm.rating || 5} из 5 звёзд)</span>
                      </div>
                    </div>

                    {/* Decision to plant again */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase">Решение о повторной высадке в будущем:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSeedForm({ ...seedForm, plantAgain: "yes" })}
                          className={`p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            seedForm.plantAgain === "yes"
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold"
                              : "bg-neutral-50 border-neutral-200 dark:bg-zinc-950 dark:border-zinc-800 text-zinc-500"
                          }`}
                        >
                          👍 Да, сажать снова
                        </button>
                        <button
                          type="button"
                          onClick={() => setSeedForm({ ...seedForm, plantAgain: "maybe" })}
                          className={`p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            seedForm.plantAgain === "maybe"
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                              : "bg-neutral-50 border-neutral-200 dark:bg-zinc-950 dark:border-zinc-800 text-zinc-500"
                          }`}
                        >
                          ❓ Под вопросом
                        </button>
                        <button
                          type="button"
                          onClick={() => setSeedForm({ ...seedForm, plantAgain: "no" })}
                          className={`p-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                            seedForm.plantAgain === "no"
                              ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 font-extrabold"
                              : "bg-neutral-50 border-neutral-200 dark:bg-zinc-950 dark:border-zinc-800 text-zinc-500"
                          }`}
                        >
                          👎 Нет, больше не сажать
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-neutral-150 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSeed(false);
                        setSeedEditingId(null);
                      }}
                      className="px-4 py-2 border rounded-lg text-neutral-600 font-bold hover:bg-neutral-50 dark:border-zinc-700 dark:text-neutral-350 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!seedForm.name) {
                          alert("Пожалуйста, введите название или сорт растения.");
                          return;
                        }
                        if (seedEditingId) {
                          // Update
                          setSeedCatalog(prev => prev.map(item => item.id === seedEditingId ? { ...item, ...seedForm } as SeedCatalogItem : item));
                        } else {
                          // Add new
                          const newItem: SeedCatalogItem = {
                            id: `seed_${Date.now()}`,
                            name: seedForm.name,
                            emoji: seedForm.emoji || "🍅",
                            category: seedForm.category || "Томаты",
                            characteristics: seedForm.characteristics || "",
                            fruitDescription: seedForm.fruitDescription || "",
                            careInstructions: seedForm.careInstructions || "",
                            rating: seedForm.rating || 5,
                            plantAgain: seedForm.plantAgain || "yes",
                            notes: seedForm.notes || ""
                          };
                          setSeedCatalog(prev => [...prev, newItem]);
                        }
                        setIsAddingSeed(false);
                        setSeedEditingId(null);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold cursor-pointer transition-all"
                    >
                      💾 Сохранить в каталог
                    </button>
                  </div>
                </div>
              )}

              {/* Catalog Grid of Varieties */}
              {!isAddingSeed && !seedEditingId && (() => {
                const filteredSeeds = seedCatalog.filter(seed => {
                  const matchSearch = seed.name.toLowerCase().includes(seedSearchQuery.toLowerCase()) || 
                                     (seed.characteristics || "").toLowerCase().includes(seedSearchQuery.toLowerCase()) ||
                                     (seed.fruitDescription || "").toLowerCase().includes(seedSearchQuery.toLowerCase()) ||
                                     (seed.notes || "").toLowerCase().includes(seedSearchQuery.toLowerCase());
                  const matchCat = seedCategoryFilter === "all" || seed.category === seedCategoryFilter;
                  return matchSearch && matchCat;
                });

                if (filteredSeeds.length === 0) {
                  return (
                    <div className="p-12 text-center bg-white dark:bg-zinc-900 border rounded-xl space-y-3">
                      <p className="text-zinc-500 font-bold text-sm">Сорта с такими критериями не найдены в картотеке.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSeedSearchQuery("");
                          setSeedCategoryFilter("all");
                        }}
                        className="text-emerald-500 font-extrabold hover:underline"
                      >
                        Сбросить фильтры поиска
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                    {filteredSeeds.map((seed) => {
                      return (
                        <div
                          key={seed.id}
                          className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 space-y-4 relative shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Header details: emoji, category, name, and decision */}
                            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 dark:border-zinc-850 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl select-none" role="img">{seed.emoji}</span>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-50">{seed.name}</h4>
                                    <span className="px-2 py-0.5 rounded-full font-mono text-[8px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300">
                                      {seed.category}
                                    </span>
                                  </div>
                                  
                                  {/* Star row */}
                                  <div className="flex items-center gap-0.5 mt-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-3.5 h-3.5 ${
                                          i < (seed.rating || 5)
                                            ? "text-yellow-400 fill-yellow-400"
                                            : "text-stone-200 dark:text-zinc-700"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div>
                                {seed.plantAgain === "yes" ? (
                                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase font-mono flex items-center gap-1">
                                    <span>💚 Сажать снова</span>
                                  </span>
                                ) : seed.plantAgain === "no" ? (
                                  <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-[9px] font-black uppercase font-mono flex items-center gap-1">
                                    <span>❌ Больше не сажать</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-[9px] font-black uppercase font-mono flex items-center gap-1">
                                    <span>🌗 Под вопросом</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Specifications breakdown */}
                            <div className="space-y-2.5 pt-2.5">
                              {seed.characteristics && (
                                <div className="space-y-0.5">
                                  <span className="block text-[8px] text-neutral-400 uppercase font-black tracking-wider">📋 Характеристики куста:</span>
                                  <p className="text-[10.5px] text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed bg-zinc-500/5 p-2 px-2.5 rounded-lg">
                                    {seed.characteristics}
                                  </p>
                                </div>
                              )}

                              {seed.fruitDescription && (
                                <div className="space-y-0.5">
                                  <span className="block text-[8px] text-neutral-400 uppercase font-black tracking-wider">🍎 Описание и вкус плодов:</span>
                                  <p className="text-[10.5px] text-neutral-850 dark:text-neutral-100 font-medium leading-relaxed bg-emerald-500/5 dark:bg-emerald-500/10 p-2 px-2.5 rounded-lg border border-emerald-500/10">
                                    {seed.fruitDescription}
                                  </p>
                                </div>
                              )}

                              {seed.careInstructions && (
                                <div className="space-y-0.5">
                                  <span className="block text-[8px] text-neutral-400 uppercase font-black tracking-wider">🩺 Режим ухода и особенности:</span>
                                  <p className="text-[10.5px] text-cyan-700 dark:text-sky-305 font-medium leading-relaxed bg-sky-500/5 p-2 px-2.5 rounded-lg">
                                    {seed.careInstructions}
                                  </p>
                                </div>
                              )}

                              {seed.notes && (
                                <div className="space-y-0.5 border-t border-dashed border-stone-200 dark:border-zinc-800 pt-2 bg-amber-500/5 p-2 px-2.5 rounded-lg">
                                  <span className="block text-[8.5px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider flex items-center gap-1">
                                    <span>📝 История выращивания и отзывы:</span>
                                  </span>
                                  <p className="text-[10.5px] text-neutral-700 dark:text-zinc-300 italic leading-snug">
                                    « {seed.notes} »
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions: Edit / Delete */}
                          <div className="flex items-center justify-between border-t border-neutral-100 dark:border-zinc-850 pt-3 mt-2.5">
                            <span className="text-[8px] font-mono text-zinc-400">ID: {seed.id}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSeedForm(seed);
                                  setSeedEditingId(seed.id);
                                }}
                                className="px-2.5 py-1 text-[10px] font-bold text-neutral-600 dark:text-neutral-350 hover:text-emerald-500 dark:hover:text-emerald-400 border border-neutral-200 hover:border-emerald-500/20 dark:border-zinc-800 rounded-lg bg-neutral-50/50 dark:bg-black/20 cursor-pointer transition-colors"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Вы уверены, что хотите удалить сорт "${seed.name}" из картотеки?`)) {
                                    setSeedCatalog(prev => prev.filter(item => item.id !== seed.id));
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-lg cursor-pointer transition-colors"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      )}


      {/* ======================================================= */}
      {/* APP MODULE 4: МОИ ПОСТРОЙКИ (SECONDARY BUILDINGS) */}
      {activeSubApp === "buildings" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Main selection and stats header */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-300/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-50">Паспорт дополнительных строений</h3>
              <p className="text-[11px] text-zinc-500">
                Загородные бани, беседки, гаражи, дома охраны, гостевые дома, котельные и другие вспомогательные постройки
              </p>
            </div>

            {/* CRITICAL: Primary Object Dropdown as requested by point 4! */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto max-w-full shrink-0">
              <label className="text-xs font-black text-neutral-500 text-zinc-500 uppercase shrink-0 font-mono">Выбранный участок / объект:</label>
              <select
                value={selectedObjectId}
                onChange={(e) => setSelectedObjectId(e.target.value)}
                className="p-2 bg-neutral-100 dark:bg-zinc-950 border border-neutral-300 dark:border-neutral-850 rounded-lg text-xs font-bold text-neutral-800 dark:text-neutral-100 w-full sm:w-64 max-w-full truncate focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {objects.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.name} · {obj.address.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* List and add form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Displaying secondary structures belonging to SELECTED object */}
            <div className="lg:col-span-2 space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider font-mono">
                  Выявленные дополнительные постройки ({secondaryBuildings.filter(b => b.parentId === selectedObjectId).length})
                </span>
                
                <button
                  onClick={startNewBuildingForm}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-lg cursor-pointer flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Добавить постройку</span>
                </button>
              </div>

              {secondaryBuildings.filter(b => b.parentId === selectedObjectId).length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-zinc-900 border rounded-xl space-y-2">
                  <p className="text-xs text-zinc-500 font-bold">На этом объекте пока нет учтенных дополнительных построек.</p>
                  <button 
                    onClick={startNewBuildingForm}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    Зарегистрировать баню или беседку
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {secondaryBuildings.filter(b => b.parentId === selectedObjectId).map((b) => (
                    <div 
                      key={b.id}
                      className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800 relative space-y-4 shadow-sm text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {b.type === "banya" ? "🛁" : 
                             b.type === "gazebo" ? "🏡" : 
                             b.type === "shed" ? "🪵" : 
                             b.type === "bonfire" ? "🔥" : 
                             b.type === "bbq" ? "🍖" : 
                             b.type === "playground" ? "🛝" : 
                             b.type === "garage" ? "🚗" : 
                             b.type === "security_house" ? "👮" : 
                             b.type === "guest_house" ? "🏘️" : 
                             b.type === "observatory" ? "🔭" : 
                             b.type === "admin_building" ? "🏢" : 
                             b.type === "boiler_room" ? "⚙️" : "🛖"}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-50">{b.name}</h4>
                            <p className="text-[10px] text-zinc-400">В эксплуатацию: {b.completionYear} год</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingBuilding(b)}
                            className="p-1 px-2 border rounded hover:border-amber-600 text-neutral-600 hover:text-amber-600 text-[11px] font-bold"
                          >
                            Редактировать
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteSecondaryBuilding(b.id)}
                            className="text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Specs card in grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-50 dark:bg-black/20 p-3.5 rounded-lg border">
                        <div>
                          <span className="text-[10px] text-zinc-400 block font-bold uppercase">Застройщик</span>
                          <span className="font-semibold text-neutral-800 dark:text-zinc-200">
                            {b.builderType === "contractor" ? `Строительная компания: ${b.contractorName}` : "Построено силами хозяев дома"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block font-bold uppercase">Материалы сборки</span>
                          <span className="font-semibold text-neutral-800 dark:text-zinc-200">{b.materials || "Не указаны"}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pl-2.5 border-l-2 border-amber-500/50 text-[11px]">
                        <div>
                          <strong>Особые условия в процессе использования:</strong> {b.operationNotes}
                        </div>
                        {b.wishes && (
                          <div className="text-zinc-500 italic">
                            <strong>Планы к достройке и доделкам:</strong> {b.wishes}
                          </div>
                        )}
                      </div>

                      {/* Timeline Photo process container */}
                      <div className="space-y-2 border-t pt-3 border-neutral-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Хронологический фотоархив стройки</span>
                          <button
                            type="button"
                            onClick={() => appendPhotoToBuilding(b.id)}
                            className="text-[10px] font-extrabold text-amber-600 hover:underline"
                          >
                            + Приложить фото/видео процесса
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {b.growthTimeline.map((img, idx) => (
                            <div key={idx} className="rounded border overflow-hidden p-1 bg-neutral-50 dark:bg-zinc-950 space-y-1">
                              <img src={img.photoUrl} alt={img.title} className="w-full h-16 object-cover rounded" />
                              <div className="text-[9px]">
                                <span className="font-bold text-neutral-800 dark:text-zinc-200 block truncate">{img.title}</span>
                                <span className="text-zinc-500 text-[8px] font-mono">{img.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>


            {/* Left sidebar forms (Construct building specifications editor) */}
            <div className="lg:col-span-1 space-y-4 text-xs">
              
              {(editingBuildingId || isAddingSecondaryBuilding) && buildingEditForm ? (
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-neutral-300/15 space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-zinc-800">
                    <h4 className="font-extrabold text-xs text-amber-600 uppercase tracking-wider">
                      {isAddingSecondaryBuilding ? "Параметры строения" : "Редактор характеристик"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBuildingId(null);
                        setIsAddingSecondaryBuilding(false);
                        setBuildingEditForm(null);
                      }}
                      className="text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 p-1 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={isAddingSecondaryBuilding ? handleCreateSecondaryBuilding : handleSaveBuildingEdit} className="space-y-3">
                    <div>
                      <label className="block font-bold text-[10px] uppercase mb-1">Порядковое Название</label>
                      <input 
                        type="text" required placeholder="Кедровая баня, Открытая беседка"
                        value={buildingEditForm.name}
                        onChange={(e) => setBuildingEditForm({ ...buildingEditForm, name: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs text-neutral-800 dark:text-neutral-100 border"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-[10px] uppercase mb-1">Тип строения</label>
                        <select
                          value={buildingEditForm.type}
                          onChange={(e) => setBuildingEditForm({ ...buildingEditForm, type: e.target.value as SecondaryBuilding["type"] })}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs text-neutral-800 dark:text-neutral-100 border"
                        >
                          <option value="banya">🛁 Русская баня</option>
                          <option value="gazebo">🏡 Летняя беседка</option>
                          <option value="shed">🪵 Хозблок / Навес</option>
                          <option value="bonfire">🔥 Зона костровища</option>
                          <option value="bbq">🍖 Зона барбекю</option>
                          <option value="playground">🛝 Детская площадка</option>
                          <option value="garage">🚗 Гараж</option>
                          <option value="security_house">👮 Дом охраны</option>
                          <option value="guest_house">🏘️ Гостевой дом</option>
                          <option value="observatory">🔭 Абсерватория</option>
                          <option value="admin_building">🏢 Административное здание</option>
                          <option value="boiler_room">⚙️ Котельная</option>
                          <option value="other">🛖 Другое строение</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-[10px] uppercase mb-1">Год постройки</label>
                        <input 
                          type="text" placeholder="2025"
                          value={buildingEditForm.completionYear}
                          onChange={(e) => setBuildingEditForm({ ...buildingEditForm, completionYear: e.target.value })}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs text-neutral-800 dark:text-neutral-100 border"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-amber-50/40 dark:bg-black/20 border border-amber-500/10 space-y-2">
                      <span className="font-bold text-[10px] uppercase text-zinc-400 block">Разработчик / Исполнители</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1">
                          <input 
                            type="radio" 
                            checked={buildingEditForm.builderType === "contractor"}
                            onChange={() => setBuildingEditForm({ ...buildingEditForm, builderType: "contractor" })}
                          />
                          <span>Подрядная фирма</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input 
                            type="radio" 
                            checked={buildingEditForm.builderType === "self"}
                            onChange={() => setBuildingEditForm({ ...buildingEditForm, builderType: "self", contractorName: undefined })}
                          />
                          <span>Своими силами</span>
                        </label>
                      </div>

                      {buildingEditForm.builderType === "contractor" && (
                        <div>
                          <input 
                            type="text" required placeholder="Назовите Компанию-Застройщика"
                            value={buildingEditForm.contractorName || ""}
                            onChange={(e) => setBuildingEditForm({ ...buildingEditForm, contractorName: e.target.value })}
                            className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 text-[11px] border"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-[10px] uppercase mb-1">Сорта материалов (из чего построено)</label>
                      <input 
                        type="text" placeholder="Клееный брус сосны, кирпич Lode, крыша Ruflex"
                        value={buildingEditForm.materials}
                        onChange={(e) => setBuildingEditForm({ ...buildingEditForm, materials: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs border"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[10px] uppercase mb-1">Заметки по эксплуатации (приборы, печь)</label>
                      <textarea 
                        rows={3} placeholder="Дровяная печь каменка, ревизия стыков дымохода..."
                        value={buildingEditForm.operationNotes}
                        onChange={(e) => setBuildingEditForm({ ...buildingEditForm, operationNotes: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs border"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[10px] uppercase mb-1">Пожелания / Планы доделок / Ошибки стройки</label>
                      <textarea 
                        rows={2} placeholder="Хотелось бы остеклить веранду следующей осенью..."
                        value={buildingEditForm.wishes}
                        onChange={(e) => setBuildingEditForm({ ...buildingEditForm, wishes: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs border"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition shadow"
                    >
                      {isAddingSecondaryBuilding ? "Внести и привязать строение" : "Сохранить характеристики"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent border border-neutral-300/10 text-neutral-800 dark:text-neutral-100 space-y-4">
                  <span className="text-[10px] font-black uppercase text-amber-605 block font-mono">🧱 Назначение дополнительного реестра</span>
                  <p className="leading-relaxed opacity-85">
                    Участки загородного поместья наполняются постройками годами. Этот подраздел позволяет вести реестр таких строений (баня, беседка, хозблок, садовый туалет, кострище), аккумулировать чертежи их сооружения, паспорта сортов бревен и кровли, а также сохранять фотографии со стройки.
                  </p>
                  <p className="leading-relaxed opacity-85 text-[11px] text-zinc-500">
                    Благодаря выбору родительского объекта в выпадающем меню сверху, вы можете быстро переключать журнал между вашими земельными участками или коммерческими постройками!
                  </p>
                </div>
              )}

            </div>

          </div>

        </div>
      )}


      {/* ======================================================= */}
      {/* SOCIAL SHARE DIARY MODAL (SIMULATION) */}
      {shareEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full border border-neutral-300/15 shadow-2xl p-6 text-neutral-850 dark:text-neutral-50 space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <h3 className="font-extrabold text-sm text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                <span>Генератор публикации</span>
              </h3>
              <button 
                onClick={() => { setShareEntry(null); setCopiedSuccess(false); }}
                className="p-1.5 hover:bg-neutral-100 rounded text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs opacity-75">
              Сформирована готовая веб-страница события для публикации в ваших соцсетях (Telegram, VK, WhatsApp).
            </p>

            {/* Social Post Mock Box */}
            <div className="p-4 rounded-xl border bg-neutral-900 text-white space-y-3 text-xs">
              
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500 font-bold flex items-center justify-center text-zinc-950 text-[10px]">🏡</span>
                <div>
                  <span className="font-black block text-[11px]">Цифровой Паспорт: {currentUser.fullname}</span>
                  <span className="text-[9px] text-zinc-400">@my_digital_estate · {shareEntry.date}</span>
                </div>
              </div>

              {shareEntry.photoUrl && (
                <div className="rounded overflow-hidden h-36 bg-zinc-900">
                  <img src={shareEntry.photoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-1">
                <h4 className="font-extrabold text-xs text-purple-400">{shareEntry.title}</h4>
                <p className="text-[11px] opacity-90 leading-relaxed truncate">{shareEntry.description}</p>
                <p className="text-[10px] text-zinc-400 italic">« {shareEntry.memories ? shareEntry.memories.substring(0, 100) + "..." : "Воспоминания..."} »</p>
              </div>

              <div className="p-2 rounded bg-white/5 border border-white/5 text-[9px] text-zinc-400 flex justify-between">
                <span>Прочитано: 125 раз</span>
                <span className="text-purple-400 font-extrabold">Летопись усадьбы</span>
              </div>
            </div>

            {/* Real Active Web Link */}
            <div className="p-3 bg-neutral-50 dark:bg-black/25 rounded-2xl border border-neutral-100 dark:border-zinc-800 text-center space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono text-left pl-1">Активная веб-ссылка публикации:</span>
              <a 
                href={`https://digital-diary.estate/p/${shareEntry.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-extrabold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline break-all inline-block hover:scale-[1.01] transition-transform"
                title="Открыть публикацию на новой вкладке"
              >
                https://digital-diary.estate/p/{shareEntry.id}
              </a>
            </div>

            {/* Copy button */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setCopiedSuccess(true);
                  navigator.clipboard.writeText(`https://digital-diary.estate/p/${shareEntry.id}`);
                  setTimeout(() => setCopiedSuccess(false), 2500);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer transition-colors"
              >
                {copiedSuccess ? "✓ Ссылка скопирована в буфер!" : "Скопировать веб-ссылку публикации"}
              </button>

              <div className="flex gap-1.5">
                <button 
                  onClick={() => alert("Симулирована отправка поста в Telegram канал садоводов!")}
                  className="flex-1 py-1 px-2 border rounded font-bold hover:bg-neutral-50 hover:text-blue-500 text-[10px]"
                >
                  Telegram
                </button>
                <button 
                  onClick={() => alert("Симулирован экспорт карточки на стену ВКонтакте!")}
                  className="flex-1 py-1 px-2 border rounded font-bold hover:bg-neutral-50 hover:text-blue-600 text-[10px]"
                >
                  ВКонтакте
                </button>
                <button 
                  onClick={() => alert("Сформировано красивое сообщение с QR-кодом для WhatsApp!")}
                  className="flex-1 py-1 px-2 border rounded font-bold hover:bg-neutral-50 hover:text-green-500 text-[10px]"
                >
                  WhatsApp
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ======================================================= */}
      {/* MODAL: ADD / EDIT SERVICE COMPANY */}
      {isAddingServiceCompany && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 text-neutral-850 dark:text-neutral-50 space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b pb-3 border-neutral-150 dark:border-neutral-800">
              <h3 className="font-extrabold text-sm text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚙️ {editingServiceCompanyId ? "Редактирование сервисной службы" : "Регистрация сервисной службы"}</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setIsAddingServiceCompany(false); setEditingServiceCompanyId(null); }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-850 rounded text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveServiceCompany} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Название Организации / Сервиса *</label>
                  <input
                    type="text" required placeholder="Например: Служба дезинсекции «Анти-Клещ»"
                    value={companyEditForm.name || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-black/35 border text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Имя ответственного мастера *</label>
                  <input
                    type="text" required placeholder="Например: Григорий Назаров"
                    value={companyEditForm.specialistName || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, specialistName: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-black/35 border text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Номер телефона специалиста</label>
                  <input
                    type="text" placeholder="+7 (912) 777-88-99"
                    value={companyEditForm.phone || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-black/35 border text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Регламент и вид работ</label>
                  <input
                    type="text" placeholder="Например: Сезонная продувка, проверка насоса"
                    value={companyEditForm.scheduleDescription || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, scheduleDescription: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-black/35 border text-xs"
                  />
                </div>
              </div>

              {/* BELONGING (Принадлежность) SECTIONS */}
              <div className="p-4 rounded-xl border bg-neutral-50 dark:bg-black/25 space-y-3.5">
                <span className="block text-[10px] font-black uppercase text-emerald-600 tracking-wider font-mono">Принадлежность оборудования/сферы обслуживания</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Тип принадлежности</label>
                    <select
                      value={companyEditForm.scopeType || "garden"}
                      onChange={(e) => {
                        const nextType = e.target.value as "garden" | "building" | "equipment";
                        let defaultId = "";
                        let defaultName = "";
                        
                        if (nextType === "garden") {
                          defaultId = gardens[0]?.id || "";
                          defaultName = gardens[0]?.name || "Усадебный сад";
                        } else if (nextType === "building") {
                          defaultId = secondaryBuildings[0]?.id || "";
                          defaultName = secondaryBuildings[0]?.name || "Строение";
                        } else {
                          defaultId = "equip_pump";
                          defaultName = "Инженерная скважина & Насосная станция";
                        }

                        setCompanyEditForm({
                          ...companyEditForm,
                          scopeType: nextType,
                          scopeId: defaultId,
                          scopeName: defaultName
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-zinc-950 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold"
                    >
                      <option value="garden">🌲 Садовый участок / Ландшафт</option>
                      <option value="building">🏠 Строение / Хозблок / Баня</option>
                      <option value="equipment">⚙️ Инженерное оборудование / Сети</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Связанный инвентарный элемент</label>
                    
                    {companyEditForm.scopeType === "garden" && (
                      <select
                        value={companyEditForm.scopeId || ""}
                        onChange={(e) => {
                          const matched = gardens.find(x => x.id === e.target.value);
                          setCompanyEditForm({
                            ...companyEditForm,
                            scopeId: e.target.value,
                            scopeName: matched ? matched.name : ""
                          });
                        }}
                        className="w-full p-2 bg-white dark:bg-zinc-950 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold"
                      >
                        {gardens.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                        {gardens.length === 0 && <option value="">Сады отсутствуют</option>}
                      </select>
                    )}

                    {companyEditForm.scopeType === "building" && (
                      <select
                        value={companyEditForm.scopeId || ""}
                        onChange={(e) => {
                          const matchedSec = secondaryBuildings.find(x => x.id === e.target.value);
                          const matchedPrim = objects.find(x => x.id === e.target.value);
                          const name = matchedSec ? matchedSec.name : (matchedPrim ? matchedPrim.name : "Строение");
                          setCompanyEditForm({
                            ...companyEditForm,
                            scopeId: e.target.value,
                            scopeName: name
                          });
                        }}
                        className="w-full p-2 bg-white dark:bg-zinc-950 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold"
                      >
                        <optgroup label="Второстепенные строения">
                          {secondaryBuildings.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Основные объекты (Кап. строения)">
                          {objects.map(obj => (
                            <option key={obj.id} value={obj.id}>{obj.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    )}

                    {companyEditForm.scopeType === "equipment" && (
                      <select
                        value={companyEditForm.scopeName || ""}
                        onChange={(e) => {
                          setCompanyEditForm({
                            ...companyEditForm,
                            scopeId: "equip_" + Date.now(),
                            scopeName: e.target.value
                          });
                        }}
                        className="w-full p-2 bg-white dark:bg-zinc-950 border border-neutral-250 dark:border-neutral-800 rounded-lg text-xs font-bold"
                      >
                        <option value="Система автоматического полива Hunter">Система автоматического полива Hunter</option>
                        <option value="Отопительный газовый котел & Бойлер Будерус">Отопительный газовый котел & Бойлер Будерус</option>
                        <option value="Вводной электрощит & Автоматика и ИБП">Вводной электрощит & Автоматика и ИБП</option>
                        <option value="Система глубокой водоочистки (Аэрация)">Система глубокой водоочистки (Аэрация)</option>
                        <option value="Канализационная станция удаления запаха (Септик)">Канализационная станция удаления запаха (Септик)</option>
                        <option value="Инженерная скважина & Скважинный насос">Инженерная скважина & Скважинный насос</option>
                        <option value="Система приточно-вытяжной вентиляции воздуха">Система приточно-вытяжной вентиляции воздуха</option>
                      </select>
                    )}

                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Регламентный регламент ТО (Задача инспекции)</label>
                  <select
                    value={companyEditForm.linkedScheduleId || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, linkedScheduleId: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-950 border text-xs"
                  >
                    {schedules.map(sch => (
                      <option key={sch.id} value={sch.id}>{sch.title} (Период: {sch.intervalDays} дн.)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Тип доступа в систему</label>
                  <select
                    value={companyEditForm.accessType || "onetime"}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, accessType: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-950 border text-xs font-bold"
                  >
                    <option value="onetime">🕒 Разовый гостевой доступ (Чек-лист по СМС и QR)</option>
                    <option value="permanent">♾️ Постоянный допуск (Закрепленный аккаунт)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Код допуска (ПИН-код)</label>
                  <input
                    type="text" required placeholder="Например: GO-FLOW-771B"
                    value={companyEditForm.temporalToken || ""}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, temporalToken: e.target.value })}
                    className="w-full p-2.5 rounded-lg bg-neutral-50 dark:bg-black/35 border text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Статус допуска</label>
                  <select
                    value={companyEditForm.tokenStatus || "inactive"}
                    onChange={(e) => setCompanyEditForm({ ...companyEditForm, tokenStatus: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-950 border text-xs font-bold"
                  >
                    <option value="active">Активен (Свободный вход)</option>
                    <option value="inactive">Заблокирован / Отозван</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAddingServiceCompany(false); setEditingServiceCompanyId(null); }}
                  className="px-4 py-2 border rounded-lg text-neutral-600 hover:bg-neutral-100 font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg shadow cursor-pointer"
                >
                  {editingServiceCompanyId ? "Сохранить изменения" : "Зарегистрировать службу"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* ======================================================= */}
      {/* MODAL: QR-CODE ISSUING FOR INSPECTIONS */}
      {activeQrCompany && (() => {
        // Find current schedule/object details for generating links
        const targetObjId = activeQrCompany.scopeId || objects[0]?.id || "obj_1";
        const targetSchId = activeQrCompany.linkedScheduleId || schedules[0]?.id || "sch_1";
        const qrLink = `${window.location.origin}${window.location.pathname}?flow=specialist&registered=false&objId=${targetObjId}&schId=${targetSchId}`;
        const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(qrLink)}`;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full border border-neutral-300/15 shadow-2xl p-6 text-neutral-850 dark:text-neutral-50 space-y-4 animate-scaleUp">
              
              <div className="flex items-center justify-between border-b pb-3 border-neutral-150 dark:border-neutral-800">
                <h3 className="font-extrabold text-xs text-emerald-600 uppercase tracking-wider">
                  📲 Разовый доступ по QR-коду
                </h3>
                <button 
                  type="button"
                  onClick={() => setActiveQrCompany(null)}
                  className="p-1 hover:bg-neutral-100 rounded text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-3">
                <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                  QR-код обслуживания для:
                  <strong className="block text-emerald-600 text-xs mt-1">{activeQrCompany.name}</strong>
                </p>

                {/* QR Code Container */}
                <div className="p-4 bg-white border border-neutral-200 rounded-xl inline-block shadow-sm">
                  <img 
                    src={qrImageSrc} 
                    alt="Scan service QR" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 leading-snug">
                    Специалист ухода сканирует этот код мобильным телефоном, чтобы мгновенно заполнить регламентную инспекцию по привязанному оборудованию / саду:
                    <strong className="block text-neutral-700 dark:text-neutral-300 font-mono mt-0.5">{activeQrCompany.scopeName}</strong>
                  </p>
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrLink);
                        alert("Ссылка принудительно скопирована!");
                      }}
                      className="w-full py-2 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 font-bold text-[10px] rounded-lg border transition"
                    >
                      Скопировать прямую ссылку доступа
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t text-center">
                <button
                  type="button"
                  onClick={() => setActiveQrCompany(null)}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Закрыть окно
                </button>
              </div>

            </div>
          </div>
        );
      })()}


      {/* ======================================================= */}
      {/* HANDOVER PASSPORT MODAL (Property sale handover tool) */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full border shadow-2xl p-6 text-neutral-850 dark:text-neutral-50 space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-850">
              <h3 className="font-extrabold text-sm text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4" />
                <span>Передача Цифрового Паспорта</span>
              </h3>
              <button 
                onClick={() => { setIsTransferModalOpen(false); setTransferSuccess(false); }}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              <strong>Сделка купли-продажи недвижимости:</strong> Вы можете полностью передать все накопленные данные — журнал сервисного оборудования, спецификации установленных котлов, хроники высадки пихт, чертежи бани и личную цифровую летопись усадьбы новому собственнику.
            </p>

            {transferSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl space-y-2 text-xs">
                <h4 className="font-black flex items-center gap-1">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                  <span>Пакет передачи сформирован успешно!</span>
                </h4>
                <p className="leading-relaxed text-[11px] opacity-90">
                  Информационный зашифрованный архив усадьбы передан на почтовый шлюз. На электронный адрес <strong>{transferEmail}</strong> отправлено приглашение с защищенным кодом активации усадьбы. При логине права на объект будут делегированы новому Владельцу.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">E-mail адрес нового Владельца</label>
                  <input
                    type="email" required placeholder="new-owner@estate.ru"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/35 text-xs border"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Дата вступления в права на объект</label>
                  <input
                    type="date" required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-black/35 text-xs border"
                  />
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-black/20 rounded-lg border space-y-2 text-[11px] opacity-90">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" required defaultChecked id="transfer_p" className="w-3.5 h-3.5 text-amber-600" />
                    <label htmlFor="transfer_p" className="font-semibold text-neutral-800 dark:text-zinc-200">Передать полную Хронологию & Летопись</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" required defaultChecked id="transfer_g" className="w-3.5 h-3.5 text-amber-600" />
                    <label htmlFor="transfer_g" className="font-semibold text-neutral-800 dark:text-zinc-200">Передать чертеж и саженцы планограммы</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" required defaultChecked id="transfer_e" className="w-3.5 h-3.5 text-amber-600" />
                    <label htmlFor="transfer_e" className="font-semibold text-neutral-800 dark:text-zinc-200">Передать все инвентарные постройки и акты</label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-lg shadow cursor-pointer transition-colors"
                >
                  Сформировать и отправить пакет передачи прав
                </button>
              </form>
            )}

          </div>
        </div>
      )}


      {/* ======================================================= */}
      {/* INTERACTIVE GREENHOUSE PLANTING PLAN MODAL */}
      {selectedGreenhouseIdForEditor && (() => {
        const gh = planBuildings.find(item => item.id === selectedGreenhouseIdForEditor);
        if (!gh) return null;

        const W_gh = gh.wMeters || 4;
        const H_gh = gh.hMeters || 3;

        // Filter beds belonging to this greenhouse
        const beds = greenhouseBeds.filter(b => b.greenhouseId === selectedGreenhouseIdForEditor);
        const selectedBed = beds.find(b => b.id === selectedGreenhouseBedId);

        const cropPresets = [
          { emoji: "🍅", name: "Томат Черри", label: "Томаты" },
          { emoji: "🥒", name: "Огурец Корнишон", label: "Огурцы" },
          { emoji: "🫑", name: "Перец Сладкий", label: "Перцы" },
          { emoji: "🍓", name: "Клубника Садовая", label: "Клубника" },
          { emoji: "🥬", name: "Листовой Салат", label: "Зелень" },
          { emoji: "🍆", name: "Баклажан Рома", label: "Баклажаны" },
          { emoji: "🥕", name: "Редис Красный", label: "Редис / Морковь" },
        ];

        const handleAddBed = (emoji: string, defaultName: string, labelText: string) => {
          const wVal = 0.8;
          const hVal = 1.2;
          // sequence offset
          const offset = (beds.length % 3) * 0.5;
          const newBed: GreenhouseBed = {
            id: `ghb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            greenhouseId: selectedGreenhouseIdForEditor,
            label: `${labelText} грядка`,
            plantName: defaultName,
            emoji: emoji,
            xMeters: Math.min(W_gh - wVal, 0.5 + offset),
            yMeters: Math.min(H_gh - hVal, 0.5 + offset),
            wMeters: wVal,
            hMeters: hVal
          };
          setGreenhouseBeds(prev => [...prev, newBed]);
          setSelectedGreenhouseBedId(newBed.id);
        };

        const handleUpdateBed = (bedId: string, fields: Partial<GreenhouseBed>) => {
          setGreenhouseBeds(prev => prev.map(item => {
            if (item.id !== bedId) return item;
            const merged = { ...item, ...fields };
            const wVal = Math.max(0.2, Math.min(W_gh, merged.wMeters || 0.2));
            const hVal = Math.max(0.2, Math.min(H_gh, merged.hMeters || 0.2));
            const xVal = Math.max(0, Math.min(W_gh - wVal, merged.xMeters || 0));
            const yVal = Math.max(0, Math.min(H_gh - hVal, merged.yMeters || 0));
            return {
              ...merged,
              wMeters: parseFloat(wVal.toFixed(1)),
              hMeters: parseFloat(hVal.toFixed(1)),
              xMeters: parseFloat(xVal.toFixed(1)),
              yMeters: parseFloat(yVal.toFixed(1))
            };
          }));
        };

        const handleNudgeBed = (direction: "left" | "right" | "up" | "down") => {
          if (!selectedBed) return;
          let dx = 0;
          let dy = 0;
          if (direction === "left") dx = -0.1;
          if (direction === "right") dx = 0.1;
          if (direction === "down") dy = -0.1;
          if (direction === "up") dy = 0.1;

          handleUpdateBed(selectedBed.id, {
            xMeters: (selectedBed.xMeters || 0) + dx,
            yMeters: (selectedBed.yMeters || 0) + dy
          });
        };

        const handleDeleteBed = (bedId: string) => {
          setGreenhouseBeds(prev => prev.filter(x => x.id !== bedId));
          if (selectedGreenhouseBedId === bedId) setSelectedGreenhouseBedId(null);
        };

        const handleClearAllBeds = () => {
          if (confirm("Вы действительно хотите полностью очистить схему посадок в этой теплице?")) {
            setGreenhouseBeds(prev => prev.filter(x => x.greenhouseId !== selectedGreenhouseIdForEditor));
            setSelectedGreenhouseBedId(null);
          }
        };

        // Click on greenhouse dirt grid
        const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
          // ensure we only trigger on main container click, not children
          if (e.target !== e.currentTarget) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;

          // Convert to meters
          const xM = parseFloat(((clickX / rect.width) * W_gh).toFixed(1));
          const yM = parseFloat((((rect.height - clickY) / rect.height) * H_gh).toFixed(1));

          const wVal = 0.8;
          const hVal = 1.2;

          // Place tomato bed as default on empty click
          const newBed: GreenhouseBed = {
            id: `ghb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            greenhouseId: selectedGreenhouseIdForEditor,
            label: `Грядка ${beds.length + 1}`,
            plantName: "Томат Черри",
            emoji: "🍅",
            xMeters: Math.max(0, Math.min(W_gh - wVal, xM - wVal / 2)),
            yMeters: Math.max(0, Math.min(H_gh - hVal, yM - hVal / 2)),
            wMeters: wVal,
            hMeters: hVal
          };

          setGreenhouseBeds(prev => [...prev, newBed]);
          setSelectedGreenhouseBedId(newBed.id);
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl max-w-5xl w-full border border-neutral-200 dark:border-zinc-800 shadow-2xl flex flex-col md:flex-row overflow-hidden animate-scaleUp max-h-[96vh] md:max-h-[90vh]">
              
              {/* LEFT COLUMN: INTERACTIVE DESIGNER MAP */}
              <div className="flex-grow flex-shrink p-4 sm:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-black/10 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-emerald-600 block">🌱</span>
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-neutral-50 flex items-center gap-1 flex-wrap">
                        <span>Схема посадок: {gh.label}</span>
                        <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          {W_gh}м x {H_gh}м
                        </span>
                      </h3>
                      <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight">
                        Координатная сетка (шаг 0.5м). Зажмите грядку для перемещения или потяните маркеры на углах для изменения размеров.
                      </p>
                    </div>
                  </div>

                  {/* Visual Grid Area */}
                  <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto border-4 border-amber-940/30 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-inner bg-[#f3ede3] dark:bg-zinc-950/70 p-0.5" style={{ touchAction: "none" }}>
                    
                    {/* The click target container for soil */}
                    <div 
                      ref={ghCanvasRef}
                      onClick={handleGridClick}
                      className="relative w-full cursor-crosshair overflow-hidden rounded-xl transition-all"
                      style={{ 
                        aspectRatio: `${W_gh}/${H_gh}`,
                        backgroundSize: '20px 20px',
                        backgroundImage: 'radial-gradient(circle, rgba(139, 92, 26, 0.15) 1px, transparent 1px)' 
                      }}
                    >
                      {/* Grid Lines Overlay representing actual meters */}
                      <div className="absolute inset-0 pointer-events-none opacity-25 border border-amber-900/10">
                        {Array.from({ length: Math.ceil(W_gh * 2) }).map((_, i) => (
                          <div 
                            key={`grid_x_${i}`}
                            className="absolute bg-amber-900/30"
                            style={{ 
                              left: `${(i * 0.5 / W_gh) * 100}%`, 
                              width: '1px', 
                              top: 0, 
                              bottom: 0 
                            }}
                          />
                        ))}
                        {Array.from({ length: Math.ceil(H_gh * 2) }).map((_, i) => (
                          <div 
                            key={`grid_y_${i}`}
                            className="absolute bg-amber-900/30"
                            style={{ 
                              bottom: `${(i * 0.5 / H_gh) * 100}%`, 
                              height: '1px', 
                              left: 0, 
                              right: 0 
                            }}
                          />
                        ))}
                      </div>

                      {/* Placed Beds on Greenhouse Layout */}
                      {beds.map((bItem) => {
                        const isSelected = selectedGreenhouseBedId === bItem.id;
                        const lPercent = (bItem.xMeters / W_gh) * 100;
                        const wPercent = (bItem.wMeters / W_gh) * 100;
                        const hPercent = (bItem.hMeters / H_gh) * 100;
                        const tPercent = ((H_gh - bItem.yMeters - bItem.hMeters) / H_gh) * 100;

                        return (
                          <div
                            key={bItem.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedGreenhouseBedId(bItem.id);
                            }}
                            onMouseDown={(e) => {
                              // start dragging the bed
                              e.stopPropagation();
                              setSelectedGreenhouseBedId(bItem.id);
                              setActiveGhDragId(bItem.id);
                              setActiveGhResizeId(null);
                              ghDragStartRef.current = {
                                initMouseX: e.clientX,
                                initMouseY: e.clientY,
                                initX: bItem.xMeters,
                                initY: bItem.yMeters,
                                initW: bItem.wMeters,
                                initH: bItem.hMeters
                              };
                            }}
                            className={`absolute rounded-xl border-2 select-none flex flex-col justify-between p-1.5 transition-all text-neutral-800 dark:text-neutral-100 ${
                              isSelected 
                                ? "border-emerald-500 bg-emerald-50/95 dark:bg-emerald-950/40 shadow-lg ring-2 ring-emerald-300 dark:ring-emerald-800 scale-[1.01] z-20 cursor-move" 
                                : "border-stone-450 bg-stone-100/90 dark:bg-zinc-900/90 hover:border-stone-500 z-10 cursor-pointer"
                            }`}
                            style={{
                              left: `${lPercent}%`,
                              top: `${tPercent}%`,
                              width: `${wPercent}%`,
                              height: `${hPercent}%`
                            }}
                          >
                            {bItem.zones && bItem.zones.length > 0 ? (
                              <div className="absolute inset-0 flex flex-col rounded-[10px] overflow-hidden bg-white/40 dark:bg-zinc-950/40">
                                {bItem.zones.map((zone, zIdx) => {
                                  const totalZRatio = bItem.zones?.reduce((acc, curr) => acc + curr.ratio, 0) || 1;
                                  const zPercent = ((zone.ratio || 10) / totalZRatio) * 100;
                                  return (
                                    <div
                                      key={zone.id || zIdx}
                                      className="flex-grow flex items-center justify-between px-1.5 border-b last:border-b-0 border-dashed border-stone-300 dark:border-zinc-700 min-h-0 overflow-hidden"
                                      style={{ height: `${zPercent}%` }}
                                    >
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="text-xs shrink-0 select-none">{zone.emoji || "🌱"}</span>
                                        <span className="text-[8px] font-black truncate max-w-[65px] text-neutral-900 dark:text-neutral-50 leading-none">
                                          {zone.plantName}
                                        </span>
                                      </div>
                                      <span className="text-[7px] font-mono text-zinc-500 shrink-0">
                                        {Math.round(zPercent)}%
                                      </span>
                                    </div>
                                  );
                                })}
                                {/* Overlay name & size */}
                                <div className="absolute -bottom-0.5 right-0.5 bg-neutral-900/80 text-white text-[7px] font-mono px-1 rounded origin-bottom-right scale-[0.8] select-none pointer-events-none whitespace-nowrap">
                                  {bItem.label} ({bItem.wMeters}x{bItem.hMeters}м)
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between min-w-0">
                                  <span className="text-sm font-bold block shrink-0">{bItem.emoji || "🌱"}</span>
                                  <span className="text-[8px] font-mono text-stone-500 dark:text-zinc-400 truncate ml-1">
                                    {bItem.wMeters}x{bItem.hMeters}м
                                  </span>
                                </div>
                                
                                <div className="text-left mt-auto overflow-hidden leading-tight">
                                  <span className="font-extrabold text-[9px] block text-neutral-900 dark:text-neutral-200 truncate leading-none mb-0.5">
                                    {bItem.label}
                                  </span>
                                  <span className="text-[8px] text-zinc-500 dark:text-zinc-400 truncate leading-none block">
                                    {bItem.plantName || "Пусто"}
                                  </span>
                                </div>
                              </>
                            )}

                            {/* Water irrigation icon overlay if set */}
                            {bItem.irrigationSystem && bItem.irrigationSystem !== "none" && (
                              <div
                                className="absolute top-0.5 right-1 bg-sky-500/15 border border-sky-400/20 text-sky-650 dark:text-sky-400 px-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 pointer-events-none z-10"
                                title={`Полив: ${bItem.irrigationSystem} - ${bItem.irrigationSchedule || "по расписанию"}`}
                              >
                                <span className="text-[7px]">💧</span>
                                <span className="text-[6.5px] font-mono font-black uppercase tracking-tighter shrink-0">
                                  {bItem.irrigationSystem === "drip" ? "Кап" : bItem.irrigationSystem === "sprinkler" ? "Спр" : bItem.irrigationSystem === "subsurface" ? "Вну" : "Руч"}
                                </span>
                              </div>
                            )}

                            {/* Resize Corner Anchors and Direct Delete Action */}
                            {isSelected && (
                              <>
                                {/* NW corner */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveGhResizeId(bItem.id);
                                    setActiveGhResizeDir("nw");
                                    setActiveGhDragId(null);
                                    ghDragStartRef.current = {
                                      initMouseX: e.clientX,
                                      initMouseY: e.clientY,
                                      initX: bItem.xMeters,
                                      initY: bItem.yMeters,
                                      initW: bItem.wMeters,
                                      initH: bItem.hMeters
                                    };
                                  }}
                                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white hover:bg-emerald-500 border-2 border-emerald-500 rounded-full cursor-nwse-resize z-30 hover:scale-125 transition-transform"
                                  title="Растянуть: Вверх-Влево"
                                />
                                {/* NE corner */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveGhResizeId(bItem.id);
                                    setActiveGhResizeDir("ne");
                                    setActiveGhDragId(null);
                                    ghDragStartRef.current = {
                                      initMouseX: e.clientX,
                                      initMouseY: e.clientY,
                                      initX: bItem.xMeters,
                                      initY: bItem.yMeters,
                                      initW: bItem.wMeters,
                                      initH: bItem.hMeters
                                    };
                                  }}
                                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white hover:bg-emerald-500 border-2 border-emerald-500 rounded-full cursor-nesw-resize z-30 hover:scale-125 transition-transform"
                                  title="Растянуть: Вверх-Вправо"
                                />
                                {/* SW corner */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveGhResizeId(bItem.id);
                                    setActiveGhResizeDir("sw");
                                    setActiveGhDragId(null);
                                    ghDragStartRef.current = {
                                      initMouseX: e.clientX,
                                      initMouseY: e.clientY,
                                      initX: bItem.xMeters,
                                      initY: bItem.yMeters,
                                      initW: bItem.wMeters,
                                      initH: bItem.hMeters
                                    };
                                  }}
                                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white hover:bg-emerald-500 border-2 border-emerald-500 rounded-full cursor-nesw-resize z-30 hover:scale-125 transition-transform"
                                  title="Растянуть: Вниз-Влево"
                                />
                                {/* SE corner */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setActiveGhResizeId(bItem.id);
                                    setActiveGhResizeDir("se");
                                    setActiveGhDragId(null);
                                    ghDragStartRef.current = {
                                      initMouseX: e.clientX,
                                      initMouseY: e.clientY,
                                      initX: bItem.xMeters,
                                      initY: bItem.yMeters,
                                      initW: bItem.wMeters,
                                      initH: bItem.hMeters
                                    };
                                  }}
                                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white hover:bg-emerald-500 border-2 border-emerald-500 rounded-full cursor-nwse-resize z-30 hover:scale-125 transition-transform"
                                  title="Растянуть: Вниз-Вправо"
                                />

                                {/* Quick Direct Delete Button atop the selected Bed */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBed(bItem.id);
                                  }}
                                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-650 hover:bg-red-500 text-white rounded-full shadow-md z-40 cursor-pointer flex items-center justify-center border border-white hover:scale-110 active:scale-95 transition-all"
                                  title="Удалить эту грядку"
                                >
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-4 pt-4 border-t border-neutral-200 dark:border-zinc-800">
                  <span className="flex items-center gap-1">
                    💡 <em>Выделите грядку, чтобы растянуть её по сетке, переместить мышкой или удалить</em>
                  </span>
                  <button
                    onClick={handleClearAllBeds}
                    type="button"
                    className="px-2 py-1 hover:bg-red-500/10 text-red-500 font-bold rounded cursor-pointer transition-colors"
                  >
                    🗑 Очистить схему
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: ACTION CONTROLS & INSPECTOR */}
              <div className="w-full md:w-80 p-4 sm:p-6 flex flex-col justify-between gap-4 sm:gap-5 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 overflow-y-auto max-h-[45vh] md:max-h-full min-h-0 border-t md:border-t-0 border-neutral-200 dark:border-zinc-800 shrink-0">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono">
                      Палитра & Инспектор
                    </span>
                    <button 
                      onClick={() => { setSelectedGreenhouseIdForEditor(null); setSelectedGreenhouseBedId(null); }}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded text-zinc-450 cursor-pointer"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {selectedBed ? (
                    /* BED PROPERTIES INSPECTOR */
                    <div className="space-y-4 animate-fadeIn text-xs">
                      <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block font-mono">
                          Настройки грядки
                        </span>
                        <h4 className="font-extrabold text-sm flex items-center gap-1.5 mt-0.5">
                          <span>{selectedBed.emoji}</span>
                          <span>{selectedBed.label}</span>
                        </h4>
                      </div>

                      {/* Bed Label */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-450 uppercase">Название грядки на схеме:</label>
                        <input
                          type="text"
                          value={selectedBed.label}
                          onChange={(e) => handleUpdateBed(selectedBed.id, { label: e.target.value })}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-black/35 text-xs text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-800 font-bold"
                          placeholder="например, Левый ряд черри"
                        />
                      </div>

                      {/* Plant / Crop Variety Name */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-455 uppercase">Сорт посевной культуры:</label>
                        <input
                          type="text"
                          value={selectedBed.plantName}
                          onChange={(e) => handleUpdateBed(selectedBed.id, { plantName: e.target.value })}
                          className="w-full p-2 rounded bg-neutral-55 dark:bg-black/35 text-xs text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-800"
                          placeholder="например, Томат 'Бычье Сердце'"
                        />
                      </div>

                      {/* Catalog Quick Pick */}
                      {seedCatalog && seedCatalog.length > 0 && (
                        <div className="space-y-1 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/15">
                          <label className="block text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 font-mono">
                            🏷️ Связать сортом из Вашего Каталога Семян:
                          </label>
                          <select
                            value=""
                            onChange={(e) => {
                              const sItem = seedCatalog.find(item => item.id === e.target.value);
                              if (sItem) {
                                handleUpdateBed(selectedBed.id, {
                                  plantName: `${sItem.category} '${sItem.name}'`,
                                  emoji: sItem.emoji,
                                });
                              }
                            }}
                            className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 text-[10.5px] text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-zinc-800 font-bold cursor-pointer"
                          >
                            <option value="">-- Быстрый выбор сорта --</option>
                            {seedCatalog.map((sItem) => (
                              <option key={sItem.id} value={sItem.id}>
                                {sItem.emoji} {sItem.category} · {sItem.name} ({sItem.plantAgain === 'yes' ? '👍' : sItem.plantAgain === 'no' ? '👎' : '🌗'})
                              </option>
                            ))}
                          </select>
                          
                          {/* If current plantName matches a seed in catalog, show quick care note! */}
                          {(() => {
                            const matchedSeed = seedCatalog.find(s => 
                              selectedBed.plantName.toLowerCase().includes(s.name.toLowerCase())
                            );
                            if (matchedSeed) {
                              return (
                                <div className="mt-1.5 pt-1.5 border-t border-emerald-500/15 text-[9.5px] text-emerald-700 dark:text-emerald-400 leading-tight space-y-1 text-left">
                                  <div className="font-extrabold flex items-center gap-1">
                                    <span>🌟 Совпадение в каталоге: {matchedSeed.emoji} {matchedSeed.name}</span>
                                    <span className="text-[8px] bg-emerald-500/20 px-1 py-0.5 rounded origin-left scale-90 font-mono">Оценка: {matchedSeed.rating}★</span>
                                  </div>
                                  {matchedSeed.careInstructions && (
                                    <p className="opacity-85 font-medium"><strong>Режим ухода:</strong> {matchedSeed.careInstructions}</p>
                                  )}
                                  {matchedSeed.fruitDescription && (
                                    <p className="opacity-80"><strong>О плодах:</strong> {matchedSeed.fruitDescription}</p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Emoji select */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1">Выращиваемая культура (иконка):</label>
                        <div className="grid grid-cols-4 gap-1">
                          {cropPresets.map((crop) => (
                            <button
                              key={crop.emoji}
                              type="button"
                              onClick={() => {
                                handleUpdateBed(selectedBed.id, { 
                                  emoji: crop.emoji,
                                  plantName: selectedBed.plantName.includes("'") ? selectedBed.plantName : crop.name
                                });
                              }}
                              className={`p-1 text-center rounded border text-sm hover:bg-neutral-50/50 cursor-pointer ${
                                selectedBed.emoji === crop.emoji 
                                  ? "border-emerald-500 bg-emerald-500/10 font-bold" 
                                  : "border-neutral-200 dark:border-zinc-800"
                              }`}
                              title={crop.label}
                            >
                              {crop.emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* --- MULTI-CROP ZONING --- */}
                      <div className="space-y-2 border-t border-b border-neutral-100 dark:border-zinc-800 py-3 bg-zinc-500/5 p-2 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase font-mono">🌿 Сложное зонирование грядки:</span>
                          <span className="text-[10px] bg-neutral-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-bold font-mono">
                            {(selectedBed.zones || []).length > 0 ? `${(selectedBed.zones || []).length} сорт.` : "Единая"}
                          </span>
                        </div>

                        {(!selectedBed.zones || selectedBed.zones.length === 0) ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-zinc-450 dark:text-zinc-400 leading-tight">
                              Вы можете разделить одну грядку на несколько секторов под разные сорта или культуры на одной площади.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const initialZones = [
                                  { id: `z_${Date.now()}_1`, emoji: selectedBed.emoji || "🍅", plantName: selectedBed.plantName || "Основной сорт", ratio: 50 },
                                  { id: `z_${Date.now()}_2`, emoji: "🥬", plantName: "Салат / Зелень", ratio: 50 }
                                ];
                                handleUpdateBed(selectedBed.id, { zones: initialZones });
                              }}
                              className="w-full py-1.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 font-bold text-[10px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>✨ Разделить на 2 зоны</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              {selectedBed.zones.map((zone, idx) => (
                                <div key={zone.id} className="p-2 bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-lg space-y-1.5 text-left">
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-bold justify-between">
                                    <span>Зона #{idx + 1} ({Math.round((zone.ratio / (selectedBed.zones?.reduce((s, z) => s + z.ratio, 0) || 100)) * 100)}%)</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (selectedBed.zones || []).filter(z => z.id !== zone.id);
                                        handleUpdateBed(selectedBed.id, { zones: updated.length <= 1 ? [] : updated });
                                      }}
                                      className="text-red-500 hover:text-red-650 font-bold uppercase text-[8px] cursor-pointer"
                                      title="Удалить зону"
                                    >
                                      Удалить
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <select
                                      value={zone.emoji}
                                      onChange={(e) => {
                                        const updated = (selectedBed.zones || []).map(z => z.id === zone.id ? { ...z, emoji: e.target.value } : z);
                                        handleUpdateBed(selectedBed.id, { zones: updated });
                                      }}
                                      className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[11px] p-1 rounded font-bold cursor-pointer"
                                    >
                                      <option value="🍅">🍅 Томаты</option>
                                      <option value="🥒">🥒 Огурцы</option>
                                      <option value="🥬">🥬 Зелень</option>
                                      <option value="🫑">🫑 Перцы</option>
                                      <option value="🍓">🍓 Ягоды</option>
                                      <option value="🍆">🍆 Баклажаны</option>
                                      <option value="🥕">🥕 Морковь</option>
                                      <option value="🌿">🌿 Травы</option>
                                      <option value="🌱">🌱 Саженец</option>
                                    </select>

                                    <input
                                      type="text"
                                      value={zone.plantName}
                                      onChange={(e) => {
                                        const updated = (selectedBed.zones || []).map(z => z.id === zone.id ? { ...z, plantName: e.target.value } : z);
                                        handleUpdateBed(selectedBed.id, { zones: updated });
                                      }}
                                      className="flex-1 p-1 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[10px] rounded leading-none text-neutral-900 dark:text-neutral-100 font-medium"
                                      placeholder="Культура/сорт"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-neutral-100 dark:border-zinc-900">
                                    <span className="text-[8px] text-zinc-400 uppercase font-bold">Пропорция:</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = (selectedBed.zones || []).map(z => z.id === zone.id ? { ...z, ratio: Math.max(10, z.ratio - 10) } : z);
                                          handleUpdateBed(selectedBed.id, { zones: updated });
                                        }}
                                        className="w-4 h-4 border rounded bg-white hover:bg-neutral-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-[10px] font-black flex items-center justify-center cursor-pointer select-none"
                                      >
                                        -
                                      </button>
                                      <span className="text-[10px] font-mono font-bold px-1 min-w-[20px] text-center">{zone.ratio}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = (selectedBed.zones || []).map(z => z.id === zone.id ? { ...z, ratio: Math.min(200, z.ratio + 10) } : z);
                                          handleUpdateBed(selectedBed.id, { zones: updated });
                                        }}
                                        className="w-4 h-4 border rounded bg-white hover:bg-neutral-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-[10px] font-black flex items-center justify-center cursor-pointer select-none"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const newZone = { id: `z_${Date.now()}`, emoji: "🌱", plantName: "Доп. сорт", ratio: 30 };
                                  handleUpdateBed(selectedBed.id, { zones: [...(selectedBed.zones || []), newZone] });
                                }}
                                className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                              >
                                ＋ Добавить зону
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateBed(selectedBed.id, { zones: [] });
                                }}
                                className="py-1 px-2 border hover:bg-red-500 hover:text-white border-red-500 bg-red-500/10 text-red-500 text-[9px] font-bold rounded-lg cursor-pointer transition-all"
                              >
                                Сбросить
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* --- IRRIGATION & WATERING RULES --- */}
                      <div className="space-y-2 border-b border-neutral-100 dark:border-zinc-800 pb-3 bg-sky-500/5 p-2 rounded-xl">
                        <label className="block text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 font-mono flex items-center gap-1">
                          <span>💧 Настройка полива грядки:</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="block text-[8px] text-zinc-450 font-bold uppercase">Система полива:</span>
                            <select
                              value={selectedBed.irrigationSystem || "none"}
                              onChange={(e) => handleUpdateBed(selectedBed.id, { irrigationSystem: e.target.value })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 text-[10px] text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-800 font-bold cursor-pointer"
                            >
                              <option value="none">❌ Без полива</option>
                              <option value="drip">💧 Капельная</option>
                              <option value="sprinkler">🚿 Спринклер</option>
                              <option value="subsurface">🪱 Подземная</option>
                              <option value="manual">🪣 Вручную</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[8px] text-zinc-455 font-bold uppercase">Режим по умолчанию:</span>
                            <select
                              value={selectedBed.irrigationSchedule || "Ежедневно вечером"}
                              onChange={(e) => handleUpdateBed(selectedBed.id, { irrigationSchedule: e.target.value })}
                              className="w-full p-1.5 rounded bg-white dark:bg-zinc-950 text-[10px] text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-800 font-bold cursor-pointer"
                            >
                              <option value="Ежедневно вечером">🌇 Вечером</option>
                              <option value="2 раза в день (утро/вечер)">🌅 2 р. в день</option>
                              <option value="Каждые 2 дня по 15 мин">⏰ Раз в 2 дня</option>
                              <option value="По датчику влажности (<45%)">🩺 По датчику</option>
                              <option value="По требованию (вручную)">👤 Вручную</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="block text-[8px] text-zinc-450 font-bold uppercase">Своя заметка о частоте / объеме полива:</span>
                          <input
                            type="text"
                            value={selectedBed.irrigationSchedule || ""}
                            onChange={(e) => handleUpdateBed(selectedBed.id, { irrigationSchedule: e.target.value })}
                            placeholder="например, Раз в три дня по 5 л"
                            className="w-full p-1 border rounded bg-white dark:bg-zinc-950 text-[10px] border-neutral-200 dark:border-zinc-800"
                          />
                        </div>
                      </div>

                      {/* Dimensions meters details */}
                      <div className="grid grid-cols-2 gap-2.5 bg-neutral-50/50 dark:bg-black/20 p-2.5 rounded-xl border">
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-450 uppercase mb-0.5">Ширина (W):</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.2"
                            max={W_gh}
                            value={selectedBed.wMeters}
                            onChange={(e) => handleUpdateBed(selectedBed.id, { wMeters: parseFloat(e.target.value) || 0.5 })}
                            className="w-full p-1 border rounded font-mono font-bold text-center text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-450 uppercase mb-0.5">Высота/Длина (H):</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.2"
                            max={H_gh}
                            value={selectedBed.hMeters}
                            onChange={(e) => handleUpdateBed(selectedBed.id, { hMeters: parseFloat(e.target.value) || 0.5 })}
                            className="w-full p-1 border rounded font-mono font-bold text-center text-xs"
                          />
                        </div>
                      </div>

                      {/* Position in meters details */}
                      <div className="grid grid-cols-2 gap-2.5 bg-neutral-50/50 dark:bg-black/20 p-2.5 rounded-xl border">
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-450 uppercase mb-0.5">Позиция X (м):</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={W_gh - selectedBed.wMeters}
                            value={selectedBed.xMeters}
                            onChange={(e) => handleUpdateBed(selectedBed.id, { xMeters: parseFloat(e.target.value) || 0 })}
                            className="w-full p-1 border rounded font-mono text-center text-xs text-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-zinc-455 uppercase mb-0.5">Позиция Y (м):</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max={H_gh - selectedBed.hMeters}
                            value={selectedBed.yMeters}
                            onChange={(e) => handleUpdateBed(selectedBed.id, { yMeters: parseFloat(e.target.value) || 0 })}
                            className="w-full p-1 border rounded font-mono text-center text-xs text-emerald-500"
                          />
                        </div>
                      </div>

                      {/* PRECISION SHIFT CONTROLS - NUDGE */}
                      <div className="space-y-1 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-xl border">
                        <span className="block text-[9px] font-bold text-zinc-450 uppercase text-center mb-1">
                          Точное смещение грядки по сетке (шаг 0.1м):
                        </span>
                        <div className="grid grid-cols-3 gap-1 max-w-[130px] mx-auto text-center">
                          <div />
                          <button
                            type="button"
                            onClick={() => handleNudgeBed("up")}
                            className="p-1 px-2 border rounded hover:bg-neutral-50 dark:bg-black/25 font-black text-xs cursor-pointer select-none"
                            title="Сместить вверх"
                          >
                            ↑
                          </button>
                          <div />

                          <button
                            type="button"
                            onClick={() => handleNudgeBed("left")}
                            className="p-1 px-2 border rounded hover:bg-neutral-50 dark:bg-black/25 font-black text-xs cursor-pointer select-none"
                            title="Сместить влево"
                          >
                            ←
                          </button>
                          <div />
                          <button
                            type="button"
                            onClick={() => handleNudgeBed("right")}
                            className="p-1 px-2 border rounded hover:bg-neutral-50 dark:bg-black/25 font-black text-xs cursor-pointer select-none"
                            title="Сместить вправо"
                          >
                            →
                          </button>

                          <div />
                          <button
                            type="button"
                            onClick={() => handleNudgeBed("down")}
                            className="p-1 px-2 border rounded hover:bg-neutral-50 dark:bg-black/25 font-black text-xs cursor-pointer select-none"
                            title="Сместить вниз"
                          >
                            ↓
                          </button>
                          <div />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setSelectedGreenhouseBedId(null)}
                          className="flex-1 py-1.5 bg-neutral-150 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors"
                        >
                          Снять выделение
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBed(selectedBed.id)}
                          className="p-1.5 bg-red-650 hover:bg-red-700 text-white hover:bg-red-500 rounded-lg cursor-pointer text-[10px]"
                          title="Удалить эту грядку"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* PALETTE FOR STAMPING NEW BEDS */
                    <div className="space-y-4 animate-fadeIn text-xs">
                      <div className="p-3 bg-neutral-50/80 dark:bg-black/20 rounded-xl border text-zinc-500">
                        <p className="leading-tight text-[11px]">
                          Выберите культуру из палитры ниже для мгновенной высадки её на свободное место:
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <span className="block text-[10px] uppercase font-bold text-zinc-400">Каталог семян / растений:</span>
                        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                          {cropPresets.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleAddBed(preset.emoji, preset.name, preset.label)}
                              className="w-full p-2 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-black/10 hover:bg-emerald-500/5 hover:border-emerald-500/30 text-left transition-all cursor-pointer flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{preset.emoji}</span>
                                <div>
                                  <span className="font-extrabold text-[11px] block text-neutral-850 dark:text-white leading-none">
                                    {preset.label}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 leading-none">
                                    Размер по умолчанию: 0.8 х 1.2м
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                                ＋ Высадить
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddBed("🌱", "Зеленый саженец", "Дополнительная")}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-[11px] rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить пустую грядку</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-220 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setSelectedGreenhouseIdForEditor(null); setSelectedGreenhouseBedId(null); }}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-black rounded-xl cursor-pointer transition-colors shadow"
                  >
                    Вернуться к карте участка
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}


    </div>
  );
}
