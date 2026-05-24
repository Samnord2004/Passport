import fs from 'fs';
import path from 'path';
import { 
  User, 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog, 
  SystemSettings 
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'server', 'db.json');

// Ensure parent directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

interface DatabaseSchema {
  users: User[];
  objects: BuildingObject[];
  schedules: ScheduleItem[];
  templates: ChecklistTemplate[];
  completed: CompletedChecklist[];
  notificationLogs: NotificationLog[];
  settings: SystemSettings;
}

// Default Seed Data
const DEFAULT_DB: DatabaseSchema = {
  users: [
    {
      id: "usr_admin",
      email: "admin@service.ru",
      fullname: "Алексей Петров (Администратор)",
      role: "admin",
      telegramChatId: "555123456",
      maxChatId: "max_admin_999",
      vkUserId: "1234567"
    },
    {
      id: "usr_owner",
      email: "owner@building.ru",
      fullname: "Иван Сидоров (Собственник ООО 'Спектр')",
      role: "owner",
      telegramChatId: "987654321",
      maxChatId: "max_owner_888",
      vkUserId: "7654321",
      phone: "+7-921-987-65-43"
    },
    {
      id: "usr_spec",
      email: "spec@tech.ru",
      fullname: "Сергей Иванов (Инженер ТО)",
      role: "specialist",
      phone: "+7-999-123-45-67",
      company: "ТехАльянс Сервис"
    }
  ],
  objects: [
    {
      id: "obj_atrium",
      name: "Торгово-развлекательный комплекс 'Атриум'",
      address: "г. Санкт-Петербург, Невский проспект, д. 25",
      description: "Современный торгово-развлекательный комплекс, общая площадь 12 500 кв.м.",
      ownerId: "usr_owner",
      yandexDiskPath: "Цифровой паспорт объекта/ТРК Атриум/Обслуживание/service_bot"
    },
    {
      id: "obj_north_peak",
      name: "Бизнес-центр 'Северная Вершина'",
      address: "г. Санкт-Петербург, ул. Профессора Попова, д. 12",
      description: "Офисный центр класса A, 8 этажей, автономное отопление.",
      ownerId: "usr_owner",
      yandexDiskPath: "Цифровой паспорт объекта/БЦ Северная Вершина/Обслуживание/service_bot"
    }
  ],
  templates: [
    {
      id: "tpl_itp",
      name: "Обслуживание ИТП (Вводный узел)",
      description: "Ежедневная инспекция индивидуального теплового пункта здания, замер параметров давления и температуры.",
      questions: [
        {
          id: "q_pressure",
          text: "Давление в контуре отопления в пределах нормы (2.5 - 4.0 бар)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_temp",
          text: "Температура подачи теплоносителя со стороны ТЭЦ (°C):",
          type: "number",
          required: true
        },
        {
          id: "q_valves",
          text: "Общее внешнее состояние запорной арматуры (протечки, износ):",
          type: "select",
          options: ["Отличное - сухо, без окислов", "Удовлетворительное - есть следы накипи", "Критическое - течь, требует замены"],
          required: true
        },
        {
          id: "q_photo_gauge",
          text: "Сделайте фото манометра с текущими показаниями:",
          type: "photo",
          required: true
        },
        {
          id: "q_comments",
          text: "Примечания и дополнительные замечания специалиста:",
          type: "text",
          required: false
        }
      ]
    },
    {
      id: "tpl_vent",
      name: "Осмотр вентиляционных установок",
      description: "Ежемесячный осмотр систем вентиляции и кондиционирования воздуха.",
      questions: [
        {
          id: "q_filters_replaced",
          text: "Фильтры приточных установок очищены/заменены?",
          type: "boolean",
          required: true
        },
        {
          id: "q_fan_curr",
          text: "Потребляемый ток электродвигателя вентилятора (А):",
          type: "number",
          required: true
        },
        {
          id: "q_belt_state",
          text: "Состояние и натяжение приводных ремней:",
          type: "select",
          options: ["Нормальное натяжение", "Ослаблено (требуется регулировка)", "Критический износ/Надрывы"],
          required: true
        },
        {
          id: "q_photo_unit",
          text: "Прикрепите фото внутренней камеры установки:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_fire",
      name: "Проверка пожарной автоматики (СПЗ)",
      description: "Ежеквартальное тестирование извещателей, линий связи и резервного питания пожарного щита.",
      questions: [
        {
          id: "q_smoke_test",
          text: "Тестовое срабатывание извещателей в контурах выполнено успешно?",
          type: "boolean",
          required: true
        },
        {
          id: "q_smoke_count",
          text: "Количество проверенных датчиков дыма (шт):",
          type: "number",
          required: true
        },
        {
          id: "q_backup_bat",
          text: "Резервное электропитание от АКБ держит нагрузку (12В/24В)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_photo_act",
          text: "Фото акта проверки систем безопасности:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_boiler",
      name: "Обслуживание газового котла",
      description: "Ежегодное/поддерживающее техническое обслуживание отопительного газового котла, проверка давления и герметичности.",
      questions: [
        {
          id: "q_boiler_gas_press",
          text: "Давление газа на входе в котел (мбар):",
          type: "number",
          required: true
        },
        {
          id: "q_boiler_leak_test",
          text: "Проверка герметичности газовых соединений выполнена (протечки отсутствуют)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_boiler_burner_state",
          text: "Состояние теплообменника и горелки:",
          type: "select",
          options: ["Очищены от сажи и нагара", "Незначительное загрязнение, чистка не требуется", "Требуется механическая чистка"],
          required: true
        },
        {
          id: "q_boiler_photo",
          text: "Фото горелки во время работы:",
          type: "photo",
          required: true
        },
        {
          id: "q_boiler_comment",
          text: "Замечания инженера по работе автоматики безопасности:",
          type: "text",
          required: false
        }
      ]
    },
    {
      id: "tpl_heating",
      name: "Обслуживание системы отопления",
      description: "Комплексный осмотр циркуляционных контуров, распределительных коллекторов и давления в расширительных баках.",
      questions: [
        {
          id: "q_heat_expansion_press",
          text: "Давление в расширительном баке отопительного контура (бар):",
          type: "number",
          required: true
        },
        {
          id: "q_heat_pumps",
          text: "Работа циркуляционных насосов (посторонние шумы, вибрация):",
          type: "select",
          options: ["Работают штатно, посторонних шумов нет", "Присутствует слабый гул/вибрация", "Перегрев насоса или сильный металлический шум"],
          required: true
        },
        {
          id: "q_heat_leak_check",
          text: "Проверка герметичности резьбовых соединений и радиаторов (протечек нет)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_heat_photo",
          text: "Фото коллекторного узла:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_pool",
      name: "Обслуживание бассейна",
      description: "Регулярный контроль качества воды, калибровка дозирующих насосов и промывка фильтра чаши.",
      questions: [
        {
          id: "q_pool_ph",
          text: "Уровень pH воды в бассейне (норма 7.2 - 7.6):",
          type: "number",
          required: true
        },
        {
          id: "q_pool_cl",
          text: "Концентрация свободного хлора в воде (мг/л):",
          type: "number",
          required: true
        },
        {
          id: "q_pool_filters",
          text: "Состояние фильтрационного оборудования и промывка песчаного фильтра:",
          type: "select",
          options: ["Промывка выполнена, давление в норме", "Промывка не требуется (давление в зеленой зоне)", "Требуется замена кварцевого песка"],
          required: true
        },
        {
          id: "q_pool_calib",
          text: "Датчики дозирования химических реагентов откалиброваны?",
          type: "boolean",
          required: true
        },
        {
          id: "q_pool_photo",
          text: "Фото чаши бассейна и прозрачности воды:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_electrical",
      name: "Обслуживание электрощитовой",
      description: "Контроль состояния распределительных щитов, замер вводных напряжений и тепловизионное обследование.",
      questions: [
        {
          id: "q_elec_thermal",
          text: "Проверка состояния контактов и автоматов тепловизором (перегревы отсутствуют):",
          type: "boolean",
          required: true
        },
        {
          id: "q_elec_voltage",
          text: "Напряжение по фазам на вводе (В):",
          type: "number",
          required: true
        },
        {
          id: "q_elec_grounding",
          text: "Состояние заземляющих проводников и шин:",
          type: "select",
          options: ["В норме, затяжка контактов проверена", "Есть следы окисления, требуется зачистка", "Нарушено заземление/отсутствует контакт"],
          required: true
        },
        {
          id: "q_elec_photo",
          text: "Фото электрощита в открытом состоянии:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_irrigation_start",
      name: "Запуск системы полива",
      description: "Весенняя расконсервация, заполнение системы автополива водой, регулировка секторов дождевателей.",
      questions: [
        {
          id: "q_irr_start_press",
          text: "Давление воды в системе автополива (бар):",
          type: "number",
          required: true
        },
        {
          id: "q_irr_start_valves",
          text: "Герметичность электромагнитных клапанов и узла подключения (протечек нет)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_irr_start_sprinklers",
          text: "Состояние веерных и роторных дождевателей:",
          type: "select",
          options: ["Все форсунки работают и сектор полива настроен", "Некоторые форсунки забиты (требуется прочистка)", "Обнаружены механические повреждения дождевателей"],
          required: true
        },
        {
          id: "q_irr_start_program",
          text: "Настройка и запуск программы на пульте управления выполнена?",
          type: "boolean",
          required: true
        },
        {
          id: "q_irr_start_photo",
          text: "Фото контроллера и узла наполнения водой:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_irrigation_stop",
      name: "Система консервации полива",
      description: "Осенняя подготовка автополива к зиме: продувка трубопроводов сжатым воздухом, слив накопительных баков.",
      questions: [
        {
          id: "q_irr_stop_blowout",
          text: "Продувка сети трубопроводов сжатым воздухом завершена (до полного отсутствия воды)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_irr_stop_controller",
          text: "Контроллер автополива отключен/переведен в режим OFF, питание снято?",
          type: "boolean",
          required: true
        },
        {
          id: "q_irr_stop_station",
          text: "Состояние насосной станции и слив воды из накопительной емкости:",
          type: "select",
          options: ["Вода полностью слита, насос демонтирован/утеплен", "Насос выключен, но вода не полностью слита", "Требуется ремонт насоса перед следующим сезоном"],
          required: true
        },
        {
          id: "q_irr_stop_sensor",
          text: "Датчик дождя укрыт/защищен от зимних осадков?",
          type: "boolean",
          required: true
        },
        {
          id: "q_irr_stop_photo",
          text: "Фото законсервированного коллекторного узла:",
          type: "photo",
          required: true
        }
      ]
    },
    {
      id: "tpl_kns",
      name: "Обслуживание напорной канализационной станции",
      description: "Регулярный регламент КНС: проверка насосов, поплавковых сигнализаторов уровня и герметичности запорной арматуры.",
      questions: [
        {
          id: "q_kns_pressure",
          text: "Давление в напорном коллекторе КНС при работе насоса (бар):",
          type: "number",
          required: true
        },
        {
          id: "q_kns_pumps_state",
          text: "Состояние и работа погружных насосов КНС:",
          type: "select",
          options: ["Оба насоса исправны, автоматическое чередование настроено", "Один насос исправен, второй требует прочистки/находится в резерве", "Аварийное состояние КНС, требуется аварийная откачка и замена насосов"],
          required: true
        },
        {
          id: "q_kns_floats",
          text: "Поплавковые датчики уровня проверены, очищены от жирового налета и висят свободно?",
          type: "boolean",
          required: true
        },
        {
          id: "q_kns_valves",
          text: "Обратные клапаны и запорные задвижки герметичны (протечек и обратного тока нет)?",
          type: "boolean",
          required: true
        },
        {
          id: "q_kns_photo",
          text: "Фото приемного резервуара КНС и датчиков уровня при инспекции:",
          type: "photo",
          required: true
        }
      ]
    }
  ],
  schedules: [
    {
      id: "sch_1",
      objectId: "obj_atrium",
      category: "Отопление",
      title: "Осмотр ИТП ТРК Атриум",
      intervalDays: 1,
      lastDoneDate: "2026-05-23", // Compliant setup
      responsibleUserId: "usr_spec",
      notes: "Контур А и Контур Б обслуживаются одновременно",
      checklistTemplateId: "tpl_itp"
    },
    {
      id: "sch_2",
      objectId: "obj_atrium",
      category: "Вентиляция",
      title: "Обслуживание приточных систем СВ-1, СВ-2 ТРК Атриум",
      intervalDays: 30,
      lastDoneDate: "2026-04-30", // Re-evaluation soon
      responsibleUserId: "usr_spec",
      notes: "Использовать фильтры класса G4",
      checklistTemplateId: "tpl_vent"
    },
    {
      id: "sch_3",
      objectId: "obj_atrium",
      category: "Безопасность",
      title: "Проверка систем пожаротушения ТРК Атриум",
      intervalDays: 90,
      lastDoneDate: "2026-03-01", // Due soon (approx 6 days to be overdue since current date 2026-05-24)
      responsibleUserId: "usr_spec",
      notes: "Тестировать строго во внерабочее время ТРК",
      checklistTemplateId: "tpl_fire"
    },
    {
      id: "sch_4",
      objectId: "obj_north_peak",
      category: "Отопление",
      title: "Проверка ИТП БЦ Северная Вершина",
      intervalDays: 1,
      lastDoneDate: "2026-05-21", // 3 days ago. For daily task, this is overdue!
      responsibleUserId: "usr_spec",
      notes: "Показания манометров дублировать в журнал БЦ",
      checklistTemplateId: "tpl_itp"
    },
    {
      id: "sch_5",
      objectId: "obj_north_peak",
      category: "Вентиляция",
      title: "Сезонный осмотр фанкойлов",
      intervalDays: 30,
      lastDoneDate: null, // Never done!
      responsibleUserId: "usr_spec",
      notes: "Проверка дренажной системы",
      checklistTemplateId: "tpl_vent"
    }
  ],
  completed: [
    {
      id: "rep_101",
      objectId: "obj_atrium",
      scheduleItemId: "sch_1",
      checklistTemplateId: "tpl_itp",
      dateDone: "2026-05-23T09:15:30Z",
      answers: [
        { questionId: "q_pressure", value: "true" },
        { questionId: "q_temp", value: "58.5" },
        { questionId: "q_valves", value: "Отличное - сухо, без окислов" },
        { questionId: "q_photo_gauge", value: "https://cloud-api.yandex.net/disk/resources/img_manometer_atrium_23_05.jpg" },
        { questionId: "q_comments", value: "Все параметры в идеальном рабочем состоянии." }
      ],
      specialistInfo: {
        fullname: "Сергей Иванов (Инженер ТО)",
        company: "ТехАльянс Сервис",
        phone: "+7-999-123-45-67",
        email: "spec@tech.ru"
      },
      specialistUserId: "usr_spec",
      pdfUrl: "/api/reports/rep_101/pdf"
    },
    {
      id: "rep_102",
      objectId: "obj_north_peak",
      scheduleItemId: "sch_4",
      checklistTemplateId: "tpl_itp",
      dateDone: "2026-05-21T08:45:00Z",
      answers: [
        { questionId: "q_pressure", value: "true" },
        { questionId: "q_temp", value: "61.2" },
        { questionId: "q_valves", value: "Удовлетворительное - есть следы накипи" },
        { questionId: "q_photo_gauge", value: "https://cloud-api.yandex.net/disk/resources/img_manometer_north_21_05.jpg" },
        { questionId: "q_comments", value: "Имеется налет солей на фланцевом соединении задвижки №3. Рекомендуется подтяжка болтов на следующем ТО." }
      ],
      specialistInfo: {
        fullname: "Сергей Иванов (Инженер ТО)",
        company: "ТехАльянс Сервис",
        phone: "+7-999-123-45-67",
        email: "spec@tech.ru"
      },
      specialistUserId: "usr_spec",
      pdfUrl: "/api/reports/rep_102/pdf"
    }
  ],
  notificationLogs: [
    {
      id: "log_1",
      timestamp: "2026-05-23T09:16:00Z",
      channel: "telegram",
      recipient: "987654321", // Ivan Sidorov (Owner)
      message: "🔔 Отчет о ТО: 'Осмотр ИТП ТРК Атриум' выполнен инженером Сергей Иванов. Параметры в норме.",
      type: "incoming_report",
      status: "sent"
    },
    {
      id: "log_2",
      timestamp: "2026-05-23T09:16:05Z",
      channel: "email",
      recipient: "owner@building.ru", // Ivan Sidorov
      message: "Тема: [ТО объекта] Выполнены работы по ТО ТРК Атриум\n\nЗдравствуйте! Инженер Сергей Иванов успешно завершил обслуживание 'Осмотр ИТП ТРК Атриум'. Чек-лист полностью пройден.",
      type: "incoming_report",
      status: "sent"
    },
    {
      id: "log_3",
      timestamp: "2026-05-24T06:00:00Z", // Morning daily digest
      channel: "telegram",
      recipient: "555123456", // Admin
      message: "⚠️ Ежедневная сводка ТО на 24.05.2026:\n- Просрочено: 'Проверка ИТП БЦ Северная Вершина' (Просрочено на 2 дня)\n- Предстоит выполнить в течение 3 дней: 'Проверка систем пожаротушения ТРК Атриум'",
      type: "reminder_overdue",
      status: "sent"
    }
  ],
  settings: {
    yandexDiskToken: "",
    yandexDiskConnected: false,
    reminderDaysBefore: 3,
    logoUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyMCIgZmlsbD0iIzBmMTcyYSIvPgogIDxwYXRoIGQ9Ik01MCAyMCBMMjUgNDUgSDc1IFoiIGZpbGw9IiMzYjgyZjYiIG9wYWNpdHk9IjAuODUiLz4KICA8cmVjdCB4PSIzNSIge0iNDUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzNSIgcng9IjIiIGZpbGw9IiNlMmU4ZjAiLz4KICA8cmVjdCB4PSI0MiIge0iNTIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjMGYxNzJhIi8+CiAgPHJlY3QgeD0iNTIiIHk9IjUyIiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgZmlsbD0iIzBmMTcyYSIvPgogIDxyZWN0IHg9Ijg4IiB5PSI1MiIgLz4KICA8cmVjdCB4PSI0MiIge0iNjIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjMGYxNzJhIi8+CiAgPHJlY3QgeD0iNTIiIHk9IjYyIiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgZmlsbD0iIzBmMTcyYSIvPgogIDxwYXRoIGQ9Ik0yNSA0NSBMNTAgMzUgTDc1IDQ1IiBzdHJva2U9IiM2MGE1ZmEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTQiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjQsMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=",
    customLogoEnabled: true,
    notificationChannels: {
      admin: { telegram: true, max: true, vk: false, email: true },
      owner: { telegram: true, max: false, vk: false, email: true }
    }
  }
};

export class DataStore {
  private static instance: DataStore;
  private data: DatabaseSchema;

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const loaded: DatabaseSchema = JSON.parse(fileContent);
        
        // Ensure templates array exists and contains all default templates
        if (!loaded.templates) {
          loaded.templates = [];
        }
        
        let hasChanges = false;
        for (const defaultTpl of DEFAULT_DB.templates) {
          if (!loaded.templates.some(t => t.id === defaultTpl.id)) {
            loaded.templates.push(defaultTpl);
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          console.log("Migrating database: Added missing default templates to db.json");
          this.save(loaded);
        }
        
        return loaded;
      }
    } catch (e) {
      console.error("Error loading DB, reverting to default seed", e);
    }
    this.save(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  public save(dataToSave: DatabaseSchema = this.data): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error writing to DB file", e);
    }
  }

  // --- GETTERS & CRUD ---
  
  public getUsers(): User[] {
    return this.data.users;
  }

  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(userId: string, updated: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updated };
    this.save();
    return this.data.users[idx];
  }

  public deleteUser(userId: string): boolean {
    const originalLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== userId);
    const deleted = this.data.users.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  public getObjects(): BuildingObject[] {
    return this.data.objects;
  }

  public addObject(obj: BuildingObject): BuildingObject {
    this.data.objects.push(obj);
    this.save();
    return obj;
  }

  public updateObject(objId: string, updated: Partial<BuildingObject>): BuildingObject | null {
    const idx = this.data.objects.findIndex(o => o.id === objId);
    if (idx === -1) return null;
    this.data.objects[idx] = { ...this.data.objects[idx], ...updated };
    this.save();
    return this.data.objects[idx];
  }

  public deleteObject(objId: string): boolean {
    const originalLen = this.data.objects.length;
    this.data.objects = this.data.objects.filter(o => o.id !== objId);
    // Also cleanup matching schedules
    this.data.schedules = this.data.schedules.filter(s => s.objectId !== objId);
    const deleted = this.data.objects.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  public getTemplates(): ChecklistTemplate[] {
    return this.data.templates;
  }

  public addTemplate(tpl: ChecklistTemplate): ChecklistTemplate {
    this.data.templates.push(tpl);
    this.save();
    return tpl;
  }

  public updateTemplate(tplId: string, updated: Partial<ChecklistTemplate>): ChecklistTemplate | null {
    const idx = this.data.templates.findIndex(t => t.id === tplId);
    if (idx === -1) return null;
    this.data.templates[idx] = { ...this.data.templates[idx], ...updated };
    this.save();
    return this.data.templates[idx];
  }

  public deleteTemplate(tplId: string): boolean {
    const originalLen = this.data.templates.length;
    this.data.templates = this.data.templates.filter(t => t.id !== tplId);
    const deleted = this.data.templates.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  public getSchedules(): ScheduleItem[] {
    return this.data.schedules;
  }

  public addSchedule(sch: ScheduleItem): ScheduleItem {
    this.data.schedules.push(sch);
    this.save();
    return sch;
  }

  public updateSchedule(schId: string, updated: Partial<ScheduleItem>): ScheduleItem | null {
    const idx = this.data.schedules.findIndex(s => s.id === schId);
    if (idx === -1) return null;
    this.data.schedules[idx] = { ...this.data.schedules[idx], ...updated };
    this.save();
    return this.data.schedules[idx];
  }

  public deleteSchedule(schId: string): boolean {
    const originalLen = this.data.schedules.length;
    this.data.schedules = this.data.schedules.filter(s => s.id !== schId);
    const deleted = this.data.schedules.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  public getCompleted(): CompletedChecklist[] {
    return this.data.completed;
  }

  public addCompleted(report: CompletedChecklist): CompletedChecklist {
    this.data.completed.push(report);
    this.save();
    return report;
  }

  public deleteCompleted(repId: string): boolean {
    const originalLen = this.data.completed.length;
    this.data.completed = this.data.completed.filter(r => r.id !== repId);
    const deleted = this.data.completed.length < originalLen;
    if (deleted) this.save();
    return deleted;
  }

  public getNotificationLogs(): NotificationLog[] {
    return this.data.notificationLogs;
  }

  public addNotificationLog(log: NotificationLog): void {
    this.data.notificationLogs.unshift(log); // newest first
    if (this.data.notificationLogs.length > 500) {
      this.data.notificationLogs = this.data.notificationLogs.slice(0, 500);
    }
    this.save();
  }

  public getSettings(): SystemSettings {
    return this.data.settings;
  }

  public updateSettings(updated: Partial<SystemSettings>): SystemSettings {
    this.data.settings = { ...this.data.settings, ...updated };
    this.save();
    return this.data.settings;
  }
}
