import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { 
  User, 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog, 
  SystemSettings 
} from '../src/types';

const { Pool } = pg;
const DB_FILE = path.join(process.cwd(), 'server', 'db.json');

// Ensure parent directory exists for fallback JSON db.json
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

interface DatabaseSchema {
  users: (User & { passwordHash?: string })[];
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
      vkUserId: "1234567",
      passwordHash: bcrypt.hashSync("admin", 10)
    },
    {
      id: "usr_owner",
      email: "owner@building.ru",
      fullname: "Иван Сидоров (Собственник ООО 'Спектр')",
      role: "owner",
      telegramChatId: "987654321",
      maxChatId: "max_owner_888",
      vkUserId: "7654321",
      phone: "+7-921-987-65-43",
      passwordHash: bcrypt.hashSync("owner", 10)
    },
    {
      id: "usr_spec",
      email: "spec@tech.ru",
      fullname: "Сергей Иванов (Инженер ТО)",
      role: "specialist",
      phone: "+7-999-123-45-67",
      company: "ТехАльянс Сервис",
      passwordHash: bcrypt.hashSync("spec", 10)
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
        { id: "q_pressure", text: "Давление в контуре отопления в пределах нормы (2.5 - 4.0 бар)?", type: "boolean", required: true },
        { id: "q_temp", text: "Температура подачи теплоносителя со стороны ТЭЦ (°C):", type: "number", required: true },
        { id: "q_valves", text: "Общее внешнее состояние запорной арматуры (протечки, износ):", type: "select", options: ["Отличное - сухо, без окислов", "Удовлетворительное - есть следы накипи", "Критическое - течь, требует замены"], required: true },
        { id: "q_photo_gauge", text: "Сделайте фото манометра с текущими показаниями:", type: "photo", required: true },
        { id: "q_comments", text: "Примечания и дополнительные замечания специалиста:", type: "text", required: false }
      ]
    },
    {
      id: "tpl_vent",
      name: "Осмотр вентиляционных установок",
      description: "Ежемесячный осмотр систем вентиляции и кондиционирования воздуха.",
      questions: [
        { id: "q_filters_replaced", text: "Фильтры приточных установок очищены/заменены?", type: "boolean", required: true },
        { id: "q_fan_curr", text: "Потребляемый ток электродвигателя вентилятора (А):", type: "number", required: true },
        { id: "q_belt_state", text: "Состояние и натяжение приводных ремней:", type: "select", options: ["Нормальное натяжение", "Ослаблено (требуется регулировка)", "Критический износ/Надрывы"], required: true },
        { id: "q_photo_unit", text: "Прикрепите фото внутренней камеры установки:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_fire",
      name: "Проверка пожарной автоматики (СПЗ)",
      description: "Ежеквартальное тестирование извещателей, линий связи и резервного питания пожарного щита.",
      questions: [
        { id: "q_smoke_test", text: "Тестовое срабатывание извещателей в контурах выполнено успешно?", type: "boolean", required: true },
        { id: "q_smoke_count", text: "Количество проверенных датчиков дыма (шт):", type: "number", required: true },
        { id: "q_backup_bat", text: "Резервное электропитание от АКБ держит нагрузку (12В/24В)?", type: "boolean", required: true },
        { id: "q_photo_act", text: "Фото акта проверки систем безопасности:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_boiler",
      name: "Обслуживание газового котла",
      description: "Ежегодное/поддерживающее техническое обслуживание отопительного газового котла, проверка давления и герметичности.",
      questions: [
        { id: "q_boiler_gas_press", text: "Давление газа на входе в котел (мбар):", type: "number", required: true },
        { id: "q_boiler_leak_test", text: "Проверка герметичности газовых соединений выполнена (протечки отсутствуют)?", type: "boolean", required: true },
        { id: "q_boiler_burner_state", text: "Состояние теплообменника и горелки:", type: "select", options: ["Очищены от сажи и нагара", "Незначительное загрязнение, чистка не требуется", "Требуется механическая чистка"], required: true },
        { id: "q_boiler_photo", text: "Фото горелки во время работы:", type: "photo", required: true },
        { id: "q_boiler_comment", text: "Замечания инженера по работе автоматики безопасности:", type: "text", required: false }
      ]
    },
    {
      id: "tpl_heating",
      name: "Обслуживание системы отопления",
      description: "Комплексный осмотр циркуляционных контуров, распределительных коллекторов и давления в расширительных баках.",
      questions: [
        { id: "q_heat_expansion_press", text: "Давление в расширительном баке отопительного контура (бар):", type: "number", required: true },
        { id: "q_heat_pumps", text: "Работа циркуляционных насосов (посторонние шумы, вибрация):", type: "select", options: ["Работают штатно, посторонних шумов нет", "Присутствует слабый гул/вибрация", "Перегрев насоса или сильный металлический шум"], required: true },
        { id: "q_heat_leak_check", text: "Проверка герметичности резьбовых соединений и радиаторов (протечек нет)?", type: "boolean", required: true },
        { id: "q_heat_photo", text: "Фото коллекторного узла:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_pool",
      name: "Обслуживание бассейна",
      description: "Регулярный контроль качества воды, калибровка дозирующих насосов и промывка фильтра чаши.",
      questions: [
        { id: "q_pool_ph", text: "Уровень pH воды в бассейне (норма 7.2 - 7.6):", type: "number", required: true },
        { id: "q_pool_cl", text: "Концентрация свободного хлора в воде (мг/л):", type: "number", required: true },
        { id: "q_pool_filters", text: "Состояние фильтрационного оборудования и промывка песчаного фильтра:", type: "select", options: ["Промывка выполнена, давление в норме", "Промывка не требуется (давление в зеленой зоне)", "Требуется замена кварцевого песка"], required: true },
        { id: "q_pool_calib", text: "Датчики дозирования химических реагентов откалиброваны?", type: "boolean", required: true },
        { id: "q_pool_photo", text: "Фото чаши бассейна и прозрачности воды:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_electrical",
      name: "Обслуживание электрощитовой",
      description: "Контроль состояния распределительных щитов, замер вводных напряжений и тепловизионное обследование.",
      questions: [
        { id: "q_elec_thermal", text: "Проверка состояния контактов и автоматов тепловизором (перегревы отсутствуют):", type: "boolean", required: true },
        { id: "q_elec_voltage", text: "Напряжение по фазам на вводе (В):", type: "number", required: true },
        { id: "q_elec_grounding", text: "Состояние заземляющих проводников и шин:", type: "select", options: ["В норме, затяжка контактов проверена", "Есть следы окисления, требуется зачистка", "Нарушено заземление/отсутствует контакт"], required: true },
        { id: "q_elec_photo", text: "Фото электрощита в открытом состоянии:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_irrigation_start",
      name: "Запуск системы полива",
      description: "Весенняя расконсервация, заполнение системы автополива водой, регулировка секторов дождевателей.",
      questions: [
        { id: "q_irr_start_press", text: "Давление воды в системе автополива (бар):", type: "number", required: true },
        { id: "q_irr_start_valves", text: "Герметичность электромагнитных клапанов и узла подключения (протечек нет)?", type: "boolean", required: true },
        { id: "q_irr_start_sprinklers", text: "Состояние веерных и роторных дождевателей:", type: "select", options: ["Все форсунки работают и сектор полива настроен", "Некоторые форсунки забиты (требуется прочистка)", "Обнаружены механические повреждения дождевателей"], required: true },
        { id: "q_irr_start_program", text: "Настройка и запуск программы на пульте управления выполнена?", type: "boolean", required: true },
        { id: "q_irr_start_photo", text: "Фото контроллера и узла наполнения водой:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_irrigation_stop",
      name: "Система консервации полива",
      description: "Осенняя подготовка автополива к зиме: продувка трубопроводов сжатым воздухом, слив накопительных баков.",
      questions: [
        { id: "q_irr_stop_blowout", text: "Продувка сети трубопроводов сжатым воздухом завершена (до полного отсутствия воды)?", type: "boolean", required: true },
        { id: "q_irr_stop_controller", text: "Контроллер автополива отключен/переведен в режим OFF, питание снято?", type: "boolean", required: true },
        { id: "q_irr_stop_station", text: "Состояние насосной станции и слив воды из накопительной емкости:", type: "select", options: ["Вода полностью слита, насос демонтирован/утеплен", "Насос выключен, но вода не полностью слита", "Требуется ремонт насоса перед следующим сезоном"], required: true },
        { id: "q_irr_stop_sensor", text: "Датчик дождя укрыт/защищен от зимних осадков?", type: "boolean", required: true },
        { id: "q_irr_stop_photo", text: "Фото законсервированного коллекторного узла:", type: "photo", required: true }
      ]
    },
    {
      id: "tpl_kns",
      name: "Обслуживание напорной канализационной станции",
      description: "Регулярный регламент КНС: проверка насосов, поплавковых сигнализаторов уровня и герметичности запорной арматуры.",
      questions: [
        { id: "q_kns_pressure", text: "Давление в напорном коллекторе КНС при работе насоса (бар):", type: "number", required: true },
        { id: "q_kns_pumps_state", text: "Состояние и работа погружных насосов КНС:", type: "select", options: ["Оба насоса исправны, автоматическое чередование настроено", "Один насос исправен, второй требует прочистки/находится в резерве", "Аварийное состояние КНС, требуется аварийная откачка и замена насосов"], required: true },
        { id: "q_kns_floats", text: "Поплавковые датчики уровня проверены, очищены от жирового налета и висят свободно?", type: "boolean", required: true },
        { id: "q_kns_valves", text: "Обратные клапаны и запорные задвижки герметичны (протечек и обратного тока нет)?", type: "boolean", required: true },
        { id: "q_kns_photo", text: "Фото приемного резервуара КНС и датчиков уровня при инспекции:", type: "photo", required: true }
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
      lastDoneDate: "2026-05-23",
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
      lastDoneDate: "2026-04-30",
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
      lastDoneDate: "2026-03-01",
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
      lastDoneDate: "2026-05-21",
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
      lastDoneDate: null,
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
      recipient: "987654321",
      message: "🔔 Отчет о ТО: 'Осмотр ИТП ТРК Атриум' выполнен инженером Сергей Иванов. Параметры в норме.",
      type: "incoming_report",
      status: "sent"
    },
    {
      id: "log_2",
      timestamp: "2026-05-23T09:16:05Z",
      channel: "email",
      recipient: "owner@building.ru",
      message: "Тема: [ТО объекта] Выполнены работы по ТО ТРК Атриум\n\nЗдравствуйте! Инженер Сергей Иванов успешно завершил обслуживание 'Осмотр ИТП ТРК Атриум'. Чек-лист полностью пройден.",
      type: "incoming_report",
      status: "sent"
    },
    {
      id: "log_3",
      timestamp: "2026-05-24T06:00:00Z",
      channel: "telegram",
      recipient: "555123456",
      message: "⚠️ Ежедневная сводка ТО на 24.05.2026:\n- Просрочено: 'Проверка ИТП БЦ Северная Вершина' (Просрочено на 2 дня)\n- Предстоит выполнить в течение 3 дней: 'Проверка систем пожаротушения ТРК Атриум'",
      type: "reminder_overdue",
      status: "sent"
    }
  ],
  settings: {
    yandexDiskToken: "",
    yandexDiskConnected: false,
    reminderDaysBefore: 3,
    logoUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+CiAgPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyMCIgZmlsbD0iIzBmMTcyYSIvPgogIDxwYXRoIGQ9Ik01MCAyMCBMMjUgNDUgSDc1IFoiIGZpbGw9IiMzYjgyZjYiIG9wYWNpdHk9IjAuODUiLz4KICA8cmVjdCB4PSIzNSIgeT0iNDUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzNSIgcng9IjIiIGZpbGw9IiNlMmU4ZjAiLz4KICA8cmVjdCB4PSI0MiIgeT0iNTIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjMGYxNzJhIi8+CiAgPHJlY3QgeD0iNTIiIHk9IjUyIiB3aWR0aD0iNiIgaGVpZ2h0PSI2IiByeD0iMSIgZmlsbD0iIzBmMTcyYSIvPgogIDxyZWN0IHg9IjQyIiB5PSI2MiIgd2lkdGg9IjYiIGhlaWdodD0iNiIgcng9IjEiIGZpbGw9IiMwZjE3MmEiLz4KICA8cmVjdCB4PSI1MiIgeT0iNjIiIHdpZHRoPSI2IiBoZWlnaHQ9IjYiIHJ4PSIxIiBmaWxsPSIjMGYxNzJhIi8+CiAgPHBhdGggZD0iTTI1IDQ1IEw1MCAzNSBMNzUgNDUiIHN0cm9rZT0iIzYwYWU1ZmEiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSJub25lIi8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTQiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjQsMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=",
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
  private pool: pg.Pool | null = null;
  private usePostgres = false;

  private constructor() {
    this.data = this.loadJSON();
    this.initializePostgres();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  public getPostgresPool(): pg.Pool | null {
    return this.pool;
  }

  public isUsingPostgres(): boolean {
    return this.usePostgres;
  }

  private async initializePostgres() {
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = Number(process.env.DB_PORT) || 5432;
    const dbUser = process.env.DB_USER || "postgres";
    const dbPassword = process.env.DB_PASSWORD || "";
    const dbName = process.env.DB_NAME || "tech_passport";
    const dbUrl = process.env.DATABASE_URL;

    console.log(`[Database] Attempting PostgreSQL connection to: ${dbUrl ? "DATABASE_URL" : `${dbHost}:${dbPort}/${dbName}`}`);

    try {
      this.pool = dbUrl 
        ? new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 })
        : new Pool({
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            connectionTimeoutMillis: 5000
          });

      // Test Connection
      const client = await this.pool.connect();
      console.log("[Database] Successfully connected to PostgreSQL!");
      this.usePostgres = true;
      client.release();

      // Run automatic migrations
      await this.runMigrations();
      await this.seedPostgresIfNeeded();
    } catch (err: any) {
      console.warn(`[Database] PostgreSQL initialization failed: ${err.message}. Falling back to db.json storage.`);
      this.usePostgres = false;
    }
  }

  private async runMigrations() {
    if (!this.pool) return;

    console.log("[Database] Running automatic migrations...");
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(100),
        company VARCHAR(255),
        telegram_chat_id VARCHAR(100),
        max_chat_id VARCHAR(100),
        vk_user_id VARCHAR(100),
        password_hash TEXT NOT NULL,
        has_biometrics BOOLEAN DEFAULT FALSE,
        biometric_credential_id TEXT,
        biometric_public_key TEXT,
        biometric_device_name TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS building_objects (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        description TEXT,
        owner_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
        yandex_disk_path TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS checklist_templates (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        questions JSONB NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR(100) PRIMARY KEY,
        object_id VARCHAR(100) REFERENCES building_objects(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        interval_days INTEGER NOT NULL DEFAULT 1,
        last_done_date VARCHAR(50),
        responsible_user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        checklist_template_id VARCHAR(100) REFERENCES checklist_templates(id) ON DELETE SET NULL,
        last_notification_date VARCHAR(100)
      );`,

      `CREATE TABLE IF NOT EXISTS completed_checklists (
        id VARCHAR(100) PRIMARY KEY,
        object_id VARCHAR(100) NOT NULL,
        schedule_item_id VARCHAR(100) NOT NULL,
        checklist_template_id VARCHAR(100) NOT NULL,
        date_done TEXT NOT NULL,
        answers JSONB NOT NULL,
        specialist_info JSONB NOT NULL,
        specialist_user_id VARCHAR(100) NOT NULL,
        pdf_url TEXT
      );`,

      `CREATE TABLE IF NOT EXISTS notification_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp TEXT NOT NULL,
        channel VARCHAR(100) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(100) PRIMARY KEY,
        yandex_disk_token TEXT,
        yandex_disk_connected BOOLEAN DEFAULT FALSE,
        reminder_days_before INTEGER DEFAULT 3,
        logo_url TEXT,
        custom_logo_enabled BOOLEAN DEFAULT TRUE,
        notificationchannels JSONB NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS "session" (
        "sid" VARCHAR PRIMARY KEY NOT NULL,
        "sess" JSON NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL
      );`
    ];

    for (const q of queries) {
      await this.pool.query(q);
    }
    await this.pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
    try {
      await this.pool.query(`ALTER TABLE building_objects ADD COLUMN IF NOT EXISTS allowed_specialist_ids TEXT;`);
    } catch (e: any) {
      console.warn("[Database] Migration column allowed_specialist_ids check/creation failed:", e.message);
    }
    try {
      await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS key_skills TEXT;`);
      await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;`);
      await this.pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;`);
      await this.pool.query(`ALTER TABLE completed_checklists ADD COLUMN IF NOT EXISTS approved_by_owner BOOLEAN DEFAULT FALSE;`);
      await this.pool.query(`ALTER TABLE completed_checklists ADD COLUMN IF NOT EXISTS owner_rating INTEGER;`);
      await this.pool.query(`ALTER TABLE completed_checklists ADD COLUMN IF NOT EXISTS owner_rating_comment TEXT;`);
      await this.pool.query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS commissioning_date TEXT;`);
      await this.pool.query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS last_notification_date VARCHAR(100);`);
    } catch (e: any) {
      console.warn("[Database] Migration additional rating, skills, and commissioning columns check/creation failed:", e.message);
    }
    console.log("[Database] migrations completed successfully.");
  }

  private async seedPostgresIfNeeded() {
    if (!this.pool) return;

    try {
      // 1. Check users
      const { rowCount: userCount } = await this.pool.query("SELECT id FROM users LIMIT 1");
      if (userCount === 0) {
        console.log("[Database] Seeding users table...");
        for (const u of DEFAULT_DB.users) {
          await this.pool.query(
            `INSERT INTO users (
              id, email, fullname, role, phone, company, telegram_chat_id, max_chat_id, vk_user_id, password_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              u.id, 
              u.email, 
              u.fullname, 
              u.role, 
              u.phone || null, 
              u.company || null, 
              u.telegramChatId || null, 
              u.maxChatId || null, 
              u.vkUserId || null, 
              u.passwordHash || bcrypt.hashSync("password", 10)
            ]
          );
        }
      }

      // 2. Check building objects
      const { rowCount: objCount } = await this.pool.query("SELECT id FROM building_objects LIMIT 1");
      if (objCount === 0) {
        console.log("[Database] Seeding building_objects table...");
        for (const o of DEFAULT_DB.objects) {
          await this.pool.query(
            `INSERT INTO building_objects (id, name, address, description, owner_id, yandex_disk_path) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [o.id, o.name, o.address, o.description, o.ownerId || null, o.yandexDiskPath]
          );
        }
      }

      // 3. Check templates
      console.log("[Database] Synchronizing checklist_templates table...");
      for (const t of DEFAULT_DB.templates) {
        const { rowCount } = await this.pool.query("SELECT id FROM checklist_templates WHERE id = $1", [t.id]);
        if (rowCount === 0) {
          console.log(`[Database] Seeding default template: ${t.name}`);
          await this.pool.query(
            `INSERT INTO checklist_templates (id, name, description, questions) VALUES ($1, $2, $3, $4)`,
            [t.id, t.name, t.description || null, JSON.stringify(t.questions)]
          );
        }
      }

      // 4. Check schedules
      const { rowCount: schCount } = await this.pool.query("SELECT id FROM schedules LIMIT 1");
      if (schCount === 0) {
        console.log("[Database] Seeding schedules table...");
        for (const s of DEFAULT_DB.schedules) {
          await this.pool.query(
            `INSERT INTO schedules (
              id, object_id, category, title, interval_days, last_done_date, responsible_user_id, notes, checklist_template_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              s.id, 
              s.objectId, 
              s.category, 
              s.title, 
              s.intervalDays, 
              s.lastDoneDate, 
              s.responsibleUserId || null, 
              s.notes || null, 
              s.checklistTemplateId
            ]
          );
        }
      }

      // 5. Check completed reports
      const { rowCount: repCount } = await this.pool.query("SELECT id FROM completed_checklists LIMIT 1");
      if (repCount === 0) {
        console.log("[Database] Seeding completed_checklists table...");
        for (const r of DEFAULT_DB.completed) {
          await this.pool.query(
            `INSERT INTO completed_checklists (
              id, object_id, schedule_item_id, checklist_template_id, date_done, answers, specialist_info, specialist_user_id, pdf_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              r.id, 
              r.objectId, 
              r.scheduleItemId, 
              r.checklistTemplateId, 
              r.dateDone, 
              JSON.stringify(r.answers), 
              JSON.stringify(r.specialistInfo), 
              r.specialistUserId, 
              r.pdfUrl || null
            ]
          );
        }
      }

      // 6. Check logs
      const { rowCount: logsCount } = await this.pool.query("SELECT id FROM notification_logs LIMIT 1");
      if (logsCount === 0) {
        console.log("[Database] Seeding notification_logs table...");
        for (const l of DEFAULT_DB.notificationLogs) {
          await this.pool.query(
            `INSERT INTO notification_logs (id, timestamp, channel, recipient, message, type, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [l.id, l.timestamp, l.channel, l.recipient, l.message, l.type, l.status]
          );
        }
      }

      // 7. Check settings
      const { rowCount: settingsCount } = await this.pool.query("SELECT id FROM system_settings LIMIT 1");
      if (settingsCount === 0) {
        console.log("[Database] Seeding system_settings table...");
        const s = DEFAULT_DB.settings;
        await this.pool.query(
          `INSERT INTO system_settings (
            id, yandex_disk_token, yandex_disk_connected, reminder_days_before, logo_url, custom_logo_enabled, notificationchannels
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            "main_settings", 
            s.yandexDiskToken, 
            s.yandexDiskConnected, 
            s.reminderDaysBefore, 
            s.logoUrl || null, 
            s.customLogoEnabled, 
            JSON.stringify(s.notificationChannels)
          ]
        );
      }
    } catch (e) {
      console.error("[Database] Error seeding PostgreSQL:", e);
    }
  }

  private loadJSON(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const loaded: DatabaseSchema = JSON.parse(fileContent);
        
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

        // Ensure default users have password hashes
        for (const defUser of DEFAULT_DB.users) {
          const loadedUser = loaded.users.find(u => u.id === defUser.id);
          if (loadedUser && !loadedUser.passwordHash) {
            loadedUser.passwordHash = defUser.passwordHash;
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          console.log("Migrating JSON database: added templates & password hashes");
          this.saveJSONFile(loaded);
        }
        
        return loaded;
      }
    } catch (e) {
      console.error("Error loading JSON DB, reverting to default seed", e);
    }
    this.saveJSONFile(DEFAULT_DB);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  private saveJSONFile(dataToSave: DatabaseSchema = this.data): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error writing to DB file", e);
    }
  }

  // --- GETTERS & CRUD ---
  
  public async getUsers(): Promise<User[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, email, fullname, role, phone, company, 
          telegram_chat_id AS "telegramChatId", 
          max_chat_id AS "maxChatId", 
          vk_user_id AS "vkUserId",
          has_biometrics AS "hasBiometrics",
          biometric_credential_id AS "biometricCredentialId",
          biometric_public_key AS "biometricPublicKey",
          biometric_device_name AS "biometricDeviceName",
          key_skills AS "keySkills",
          rating,
          rating_count AS "ratingCount"
        FROM users ORDER BY fullname ASC
      `);
      return rows;
    }
    return this.data.users.map(({ passwordHash, ...user }) => user);
  }

  public async getUserWithPassword(email: string): Promise<(User & { passwordHash?: string }) | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, email, fullname, role, phone, company, 
          telegram_chat_id AS "telegramChatId", 
          max_chat_id AS "maxChatId", 
          vk_user_id AS "vkUserId",
          password_hash AS "passwordHash",
          has_biometrics AS "hasBiometrics",
          biometric_credential_id AS "biometricCredentialId",
          biometric_public_key AS "biometricPublicKey",
          biometric_device_name AS "biometricDeviceName",
          key_skills AS "keySkills",
          rating,
          rating_count AS "ratingCount"
        FROM users WHERE LOWER(email) = $1
      `, [cleanEmail]);
      return rows[0] || null;
    }
    const found = this.data.users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    return found || null;
  }

  public async getUserById(userId: string): Promise<User | null> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, email, fullname, role, phone, company, 
          telegram_chat_id AS "telegramChatId", 
          max_chat_id AS "maxChatId", 
          vk_user_id AS "vkUserId",
          has_biometrics AS "hasBiometrics",
          biometric_credential_id AS "biometricCredentialId",
          biometric_public_key AS "biometricPublicKey",
          biometric_device_name AS "biometricDeviceName",
          key_skills AS "keySkills",
          rating,
          rating_count AS "ratingCount"
        FROM users WHERE id = $1
      `, [userId]);
      return rows[0] || null;
    }
    const found = this.data.users.find(u => u.id === userId);
    if (!found) return null;
    const { passwordHash, ...user } = found;
    return user;
  }

  public async getUserWithPasswordById(userId: string): Promise<(User & { passwordHash?: string }) | null> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, email, fullname, role, phone, company, 
          telegram_chat_id AS "telegramChatId", 
          max_chat_id AS "maxChatId", 
          vk_user_id AS "vkUserId",
          password_hash AS "passwordHash",
          has_biometrics AS "hasBiometrics",
          biometric_credential_id AS "biometricCredentialId",
          biometric_public_key AS "biometricPublicKey",
          biometric_device_name AS "biometricDeviceName",
          key_skills AS "keySkills",
          rating,
          rating_count AS "ratingCount"
        FROM users WHERE id = $1
      `, [userId]);
      return rows[0] || null;
    }
    const found = this.data.users.find(u => u.id === userId);
    return found || null;
  }

  public async addUser(user: User & { password?: string, passwordHash?: string }): Promise<User> {
    const hash = user.passwordHash || (user.password ? bcrypt.hashSync(user.password, 10) : bcrypt.hashSync("pass_" + Math.random().toString(36).substr(2, 5), 10));
    
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO users (
          id, email, fullname, role, phone, company, telegram_chat_id, max_chat_id, vk_user_id, password_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          user.id, 
          user.email.trim().toLowerCase(), 
          user.fullname, 
          user.role, 
          user.phone || null, 
          user.company || null, 
          user.telegramChatId || null, 
          user.maxChatId || null, 
          user.vkUserId || null, 
          hash
        ]
      );
      return user;
    }

    this.data.users.push({ ...user, passwordHash: hash });
    this.saveJSONFile();
    return user;
  }

  public async updateUser(userId: string, updated: Partial<User & { password?: string, passwordHash?: string }>): Promise<User | null> {
    const hash = updated.password ? bcrypt.hashSync(updated.password, 10) : updated.passwordHash;

    if (this.usePostgres && this.pool) {
      const user = await this.getUserById(userId);
      if (!user) return null;

      const keys = Object.keys(updated).filter(k => k !== "password" && k !== "passwordHash");
      let setClause = "";
      const values: any[] = [];
      let idx = 1;

      keys.forEach((key) => {
        let col = key;
        if (key === "telegramChatId") col = "telegram_chat_id";
        else if (key === "maxChatId") col = "max_chat_id";
        else if (key === "vkUserId") col = "vk_user_id";
        else if (key === "hasBiometrics") col = "has_biometrics";
        else if (key === "biometricCredentialId") col = "biometric_credential_id";
        else if (key === "biometricPublicKey") col = "biometric_public_key";
        else if (key === "biometricDeviceName") col = "biometric_device_name";
        else if (key === "keySkills") col = "key_skills";
        else if (key === "rating") col = "rating";
        else if (key === "ratingCount") col = "rating_count";

        setClause += `${idx > 1 ? ", " : ""}${col} = $${idx}`;
        values.push((updated as any)[key] === "" ? null : (updated as any)[key]);
        idx++;
      });

      if (hash) {
        setClause += `${idx > 1 ? ", " : ""}password_hash = $${idx}`;
        values.push(hash);
        idx++;
      }

      if (setClause) {
        values.push(userId);
        await this.pool.query(`UPDATE users SET ${setClause} WHERE id = $${idx}`, values);
      }

      return this.getUserById(userId);
    }

    const index = this.data.users.findIndex(u => u.id === userId);
    if (index === -1) return null;
    
    const userToSave = { ...this.data.users[index], ...updated };
    if (hash) {
      userToSave.passwordHash = hash;
    }
    this.data.users[index] = userToSave;
    this.saveJSONFile();
    
    const { passwordHash, ...userClean } = userToSave;
    return userClean;
  }

  public async deleteUser(userId: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const { rowCount } = await this.pool.query("DELETE FROM users WHERE id = $1", [userId]);
      return (rowCount ?? 0) > 0;
    }
    const originalLen = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== userId);
    const deleted = this.data.users.length < originalLen;
    if (deleted) this.saveJSONFile();
    return deleted;
  }

  public async getObjects(): Promise<BuildingObject[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT id, name, address, description, owner_id AS "ownerId", yandex_disk_path AS "yandexDiskPath", allowed_specialist_ids AS "allowedSpecialistIds"
        FROM building_objects ORDER BY name ASC
      `);
      return rows.map((r: any) => ({
        ...r,
        allowedSpecialistIds: r.allowedSpecialistIds ? r.allowedSpecialistIds.split(",").filter((s: string) => s.trim() !== "") : []
      }));
    }
    return this.data.objects.map(o => ({ ...o, allowedSpecialistIds: o.allowedSpecialistIds || [] }));
  }

  public async getObjectById(objId: string): Promise<BuildingObject | null> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT id, name, address, description, owner_id AS "ownerId", yandex_disk_path AS "yandexDiskPath", allowed_specialist_ids AS "allowedSpecialistIds"
        FROM building_objects WHERE id = $1
      `, [objId]);
      if (!rows[0]) return null;
      return {
        ...rows[0],
        allowedSpecialistIds: rows[0].allowedSpecialistIds ? rows[0].allowedSpecialistIds.split(",").filter((s: string) => s.trim() !== "") : []
      };
    }
    const found = this.data.objects.find(o => o.id === objId);
    if (!found) return null;
    return { ...found, allowedSpecialistIds: found.allowedSpecialistIds || [] };
  }

  public async addObject(obj: BuildingObject): Promise<BuildingObject> {
    const allowedSpecStr = obj.allowedSpecialistIds ? obj.allowedSpecialistIds.join(",") : "";
    if (this.usePostgres && this.pool) {
      const ownerVal = obj.ownerId && obj.ownerId.trim() !== "" ? obj.ownerId : null;
      await this.pool.query(
        `INSERT INTO building_objects (id, name, address, description, owner_id, yandex_disk_path, allowed_specialist_ids) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [obj.id, obj.name, obj.address, obj.description, ownerVal, obj.yandexDiskPath, allowedSpecStr]
      );
      return obj;
    }
    this.data.objects.push({ ...obj, allowedSpecialistIds: obj.allowedSpecialistIds || [] });
    this.saveJSONFile();
    return obj;
  }

  public async updateObject(objId: string, updated: Partial<BuildingObject>): Promise<BuildingObject | null> {
    if (this.usePostgres && this.pool) {
      const existing = await this.getObjectById(objId);
      if (!existing) return null;

      const companyOwner = updated.ownerId && updated.ownerId.trim() !== "" ? updated.ownerId : null;
      const allowedSpecStr = updated.allowedSpecialistIds !== undefined 
        ? (updated.allowedSpecialistIds ? updated.allowedSpecialistIds.join(",") : "")
        : (existing.allowedSpecialistIds ? existing.allowedSpecialistIds.join(",") : "");

      await this.pool.query(
        `UPDATE building_objects SET 
          name = COALESCE($1, name), 
          address = COALESCE($2, address), 
          description = COALESCE($3, description), 
          owner_id = $4, 
          yandex_disk_path = COALESCE($5, yandex_disk_path),
          allowed_specialist_ids = $6
         WHERE id = $7`,
        [updated.name, updated.address, updated.description, companyOwner, updated.yandexDiskPath, allowedSpecStr, objId]
      );
      return this.getObjectById(objId);
    }
    const idx = this.data.objects.findIndex(o => o.id === objId);
    if (idx === -1) return null;
    this.data.objects[idx] = { ...this.data.objects[idx], ...updated };
    this.saveJSONFile();
    return this.data.objects[idx];
  }

  public async deleteObject(objId: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const { rowCount } = await this.pool.query("DELETE FROM building_objects WHERE id = $1", [objId]);
      return (rowCount ?? 0) > 0;
    }
    const originalLen = this.data.objects.length;
    this.data.objects = this.data.objects.filter(o => o.id !== objId);
    this.data.schedules = this.data.schedules.filter(s => s.objectId !== objId);
    const deleted = this.data.objects.length < originalLen;
    if (deleted) this.saveJSONFile();
    return deleted;
  }

  public async getTemplates(): Promise<ChecklistTemplate[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query("SELECT id, name, description, questions FROM checklist_templates ORDER BY name ASC");
      return rows.map(r => ({ ...r, questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions }));
    }
    return this.data.templates;
  }

  public async getTemplateById(tplId: string): Promise<ChecklistTemplate | null> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query("SELECT id, name, description, questions FROM checklist_templates WHERE id = $1", [tplId]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return { ...r, questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions };
    }
    return this.data.templates.find(t => t.id === tplId) || null;
  }

  public async addTemplate(tpl: ChecklistTemplate): Promise<ChecklistTemplate> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        "INSERT INTO checklist_templates (id, name, description, questions) VALUES ($1, $2, $3, $4)",
        [tpl.id, tpl.name, tpl.description || null, JSON.stringify(tpl.questions)]
      );
      return tpl;
    }
    this.data.templates.push(tpl);
    this.saveJSONFile();
    return tpl;
  }

  public async updateTemplate(tplId: string, updated: Partial<ChecklistTemplate>): Promise<ChecklistTemplate | null> {
    if (this.usePostgres && this.pool) {
      const existing = await this.getTemplateById(tplId);
      if (!existing) return null;

      const questionsStr = updated.questions ? JSON.stringify(updated.questions) : undefined;
      await this.pool.query(
        `UPDATE checklist_templates SET 
          name = COALESCE($1, name), 
          description = COALESCE($2, description), 
          questions = COALESCE($3, questions::jsonb)
         WHERE id = $4`,
        [updated.name, updated.description, questionsStr, tplId]
      );
      return this.getTemplateById(tplId);
    }
    const idx = this.data.templates.findIndex(t => t.id === tplId);
    if (idx === -1) return null;
    this.data.templates[idx] = { ...this.data.templates[idx], ...updated };
    this.saveJSONFile();
    return this.data.templates[idx];
  }

  public async deleteTemplate(tplId: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const { rowCount } = await this.pool.query("DELETE FROM checklist_templates WHERE id = $1", [tplId]);
      return (rowCount ?? 0) > 0;
    }
    const originalLen = this.data.templates.length;
    this.data.templates = this.data.templates.filter(t => t.id !== tplId);
    const deleted = this.data.templates.length < originalLen;
    if (deleted) this.saveJSONFile();
    return deleted;
  }

  public async getSchedules(): Promise<ScheduleItem[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, object_id AS "objectId", category, title, 
          interval_days AS "intervalDays", 
          last_done_date AS "lastDoneDate", 
          responsible_user_id AS "responsibleUserId", 
          notes, 
          checklist_template_id AS "checklistTemplateId",
          commissioning_date AS "commissioningDate",
          last_notification_date AS "lastNotificationDate"
        FROM schedules ORDER BY category ASC, title ASC
      `);
      return rows;
    }
    return this.data.schedules;
  }

  public async getScheduleById(schId: string): Promise<ScheduleItem | null> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, object_id AS "objectId", category, title, 
          interval_days AS "intervalDays", 
          last_done_date AS "lastDoneDate", 
          responsible_user_id AS "responsibleUserId", 
          notes, 
          checklist_template_id AS "checklistTemplateId",
          commissioning_date AS "commissioningDate",
          last_notification_date AS "lastNotificationDate"
        FROM schedules WHERE id = $1
      `, [schId]);
      return rows[0] || null;
    }
    return this.data.schedules.find(s => s.id === schId) || null;
  }

  public async addSchedule(sch: ScheduleItem): Promise<ScheduleItem> {
    // Section 5 & 8: Пустая строка responsibleUserId заменяется на null, чтобы не нарушать внешний ключ.
    const respId = sch.responsibleUserId && sch.responsibleUserId.trim() !== "" ? sch.responsibleUserId : null;
    const tplId = sch.checklistTemplateId && sch.checklistTemplateId.trim() !== "" ? sch.checklistTemplateId : null;
    const objId = sch.objectId && sch.objectId.trim() !== "" ? sch.objectId : null;

    if (this.usePostgres && this.pool) {
      // Check references exist (avoid FK violation)
      if (objId) {
        const { rowCount: count } = await this.pool.query("SELECT id FROM building_objects WHERE id = $1", [objId]);
        if (!count || count === 0) throw new Error(`Объект с ID ${objId} не найден`);
      }
      if (tplId) {
        const { rowCount: count } = await this.pool.query("SELECT id FROM checklist_templates WHERE id = $1", [tplId]);
        if (!count || count === 0) throw new Error(`Шаблон с ID ${tplId} не найден`);
      }

      await this.pool.query(
        `INSERT INTO schedules (
          id, object_id, category, title, interval_days, last_done_date, responsible_user_id, notes, checklist_template_id, commissioning_date, last_notification_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [sch.id, objId, sch.category, sch.title, sch.intervalDays, sch.lastDoneDate, respId, sch.notes || null, tplId, sch.commissioningDate || null, sch.lastNotificationDate || null]
      );
      return sch;
    }

    // JSON db.json checks
    if (objId) {
      const o = this.data.objects.find(x => x.id === objId);
      if (!o) throw new Error(`Объект с ID ${objId} не найден`);
    }
    if (tplId) {
      const t = this.data.templates.find(x => x.id === tplId);
      if (!t) throw new Error(`Шаблон с ID ${tplId} не найден`);
    }

    this.data.schedules.push({
      ...sch,
      responsibleUserId: respId || undefined
    });
    this.saveJSONFile();
    return sch;
  }

  public async updateSchedule(schId: string, updated: Partial<ScheduleItem>): Promise<ScheduleItem | null> {
    const respId = updated.responsibleUserId && updated.responsibleUserId.trim() !== "" 
      ? updated.responsibleUserId 
      : (updated.responsibleUserId === "" ? null : undefined);
    const tplId = updated.checklistTemplateId && updated.checklistTemplateId.trim() !== "" 
      ? updated.checklistTemplateId 
      : (updated.checklistTemplateId === "" ? null : undefined);
    const objId = updated.objectId && updated.objectId.trim() !== "" 
      ? updated.objectId 
      : (updated.objectId === "" ? null : undefined);

    if (this.usePostgres && this.pool) {
      const existingSch = await this.getScheduleById(schId);
      if (!existingSch) return null;

      if (objId) {
        const { rowCount: count } = await this.pool.query("SELECT id FROM building_objects WHERE id = $1", [objId]);
        if (!count || count === 0) throw new Error(`Объект с ID ${objId} не найден`);
      }
      if (tplId) {
        const { rowCount: count } = await this.pool.query("SELECT id FROM checklist_templates WHERE id = $1", [tplId]);
        if (!count || count === 0) throw new Error(`Шаблон с ID ${tplId} не найден`);
      }

      await this.pool.query(
        `UPDATE schedules SET 
          object_id = COALESCE($1, object_id), 
          category = COALESCE($2, category), 
          title = COALESCE($3, title), 
          interval_days = COALESCE($4, interval_days), 
          last_done_date = COALESCE($5, last_done_date), 
          responsible_user_id = CASE WHEN $6 = 'CLEAR' THEN NULL ELSE COALESCE($7, responsible_user_id) END, 
          notes = COALESCE($8, notes), 
          checklist_template_id = CASE WHEN $9 = 'CLEAR' THEN NULL ELSE COALESCE($10, checklist_template_id) END,
          commissioning_date = COALESCE($11, commissioning_date),
          last_notification_date = COALESCE($12, last_notification_date)
         WHERE id = $13`,
        [
          objId || null, 
          updated.category, 
          updated.title, 
          updated.intervalDays, 
          updated.lastDoneDate, 
          respId === null ? 'CLEAR' : 'KEEP',
          respId || null, 
          updated.notes, 
          tplId === null ? 'CLEAR' : 'KEEP',
          tplId || null, 
          updated.commissioningDate === undefined ? null : updated.commissioningDate,
          updated.lastNotificationDate === undefined ? null : updated.lastNotificationDate,
          schId
        ]
      );
      return this.getScheduleById(schId);
    }

    const idx = this.data.schedules.findIndex(s => s.id === schId);
    if (idx === -1) return null;
    
    const schToSave = { ...this.data.schedules[idx], ...updated };
    if (respId === null) {
      delete schToSave.responsibleUserId;
    } else if (respId !== undefined) {
      schToSave.responsibleUserId = respId;
    }
    
    this.data.schedules[idx] = schToSave;
    this.saveJSONFile();
    return schToSave;
  }

  public async deleteSchedule(schId: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const { rowCount } = await this.pool.query("DELETE FROM schedules WHERE id = $1", [schId]);
      return (rowCount ?? 0) > 0;
    }
    const originalLen = this.data.schedules.length;
    this.data.schedules = this.data.schedules.filter(s => s.id !== schId);
    const deleted = this.data.schedules.length < originalLen;
    if (deleted) this.saveJSONFile();
    return deleted;
  }

  public async getCompleted(): Promise<CompletedChecklist[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query(`
        SELECT 
          id, object_id AS "objectId", schedule_item_id AS "scheduleItemId", 
          checklist_template_id AS "checklistTemplateId", 
          date_done AS "dateDone", answers, specialist_info AS "specialistInfo", 
          specialist_user_id AS "specialistUserId", pdf_url AS "pdfUrl",
          approved_by_owner AS "approvedByOwner",
          owner_rating AS "ownerRating",
          owner_rating_comment AS "ownerRatingComment"
        FROM completed_checklists ORDER BY date_done DESC
      `);
      return rows.map(r => ({
        ...r,
        approvedByOwner: !!r.approvedByOwner,
        answers: typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers,
        specialistInfo: typeof r.specialistInfo === 'string' ? JSON.parse(r.specialistInfo) : r.specialistInfo
      }));
    }
    return this.data.completed.map(c => ({
      ...c,
      approvedByOwner: !!c.approvedByOwner
    }));
  }

  public async addCompleted(report: CompletedChecklist): Promise<CompletedChecklist> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO completed_checklists (
          id, object_id, schedule_item_id, checklist_template_id, date_done, answers, specialist_info, specialist_user_id, pdf_url, approved_by_owner, owner_rating, owner_rating_comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          report.id, 
          report.objectId, 
          report.scheduleItemId, 
          report.checklistTemplateId, 
          report.dateDone, 
          JSON.stringify(report.answers), 
          JSON.stringify(report.specialistInfo), 
          report.specialistUserId, 
          report.pdfUrl || null,
          report.approvedByOwner || false,
          report.ownerRating || null,
          report.ownerRatingComment || null
        ]
      );
      return report;
    }
    this.data.completed.push({
      ...report,
      approvedByOwner: report.approvedByOwner || false,
      ownerRating: report.ownerRating || null,
      ownerRatingComment: report.ownerRatingComment || null
    });
    this.saveJSONFile();
    return report;
  }

  public async updateCompleted(reportId: string, updated: Partial<CompletedChecklist>): Promise<CompletedChecklist | null> {
    if (this.usePostgres && this.pool) {
      const keys = Object.keys(updated);
      let setClause = "";
      const values: any[] = [];
      let idx = 1;

      keys.forEach((key) => {
        let col = key;
        if (key === "objectId") col = "object_id";
        else if (key === "scheduleItemId") col = "schedule_item_id";
        else if (key === "checklistTemplateId") col = "checklist_template_id";
        else if (key === "dateDone") col = "date_done";
        else if (key === "specialistUserId") col = "specialist_user_id";
        else if (key === "pdfUrl") col = "pdf_url";
        else if (key === "approvedByOwner") col = "approved_by_owner";
        else if (key === "ownerRating") col = "owner_rating";
        else if (key === "ownerRatingComment") col = "owner_rating_comment";

        setClause += `${idx > 1 ? ", " : ""}${col} = $${idx}`;
        let val = (updated as any)[key];
        if (key === "answers" || key === "specialistInfo") {
          val = JSON.stringify(val);
        }
        values.push(val);
        idx++;
      });

      if (setClause) {
        values.push(reportId);
        await this.pool.query(`UPDATE completed_checklists SET ${setClause} WHERE id = $${idx}`, values);
      }

      const completed = await this.getCompleted();
      return completed.find(c => c.id === reportId) || null;
    }

    const index = this.data.completed.findIndex(c => c.id === reportId);
    if (index === -1) return null;
    
    this.data.completed[index] = { ...this.data.completed[index], ...updated };
    this.saveJSONFile();
    return this.data.completed[index];
  }

  public async deleteCompleted(repId: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const { rowCount } = await this.pool.query("DELETE FROM completed_checklists WHERE id = $1", [repId]);
      return (rowCount ?? 0) > 0;
    }
    const originalLen = this.data.completed.length;
    this.data.completed = this.data.completed.filter(r => r.id !== repId);
    const deleted = this.data.completed.length < originalLen;
    if (deleted) this.saveJSONFile();
    return deleted;
  }

  public async getNotificationLogs(): Promise<NotificationLog[]> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query("SELECT id, timestamp, channel, recipient, message, type, status FROM notification_logs ORDER BY timestamp DESC LIMIT 500");
      return rows;
    }
    return this.data.notificationLogs;
  }

  public async addNotificationLog(log: NotificationLog): Promise<void> {
    if (this.usePostgres && this.pool) {
      await this.pool.query(
        "INSERT INTO notification_logs (id, timestamp, channel, recipient, message, type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [log.id, log.timestamp, log.channel, log.recipient, log.message, log.type, log.status]
      );
      return;
    }
    this.data.notificationLogs.unshift(log);
    if (this.data.notificationLogs.length > 500) {
      this.data.notificationLogs = this.data.notificationLogs.slice(0, 500);
    }
    this.saveJSONFile();
  }

  public async getSettings(): Promise<SystemSettings> {
    if (this.usePostgres && this.pool) {
      const { rows } = await this.pool.query("SELECT * FROM system_settings WHERE id = 'main_settings'");
      if (rows.length > 0) {
        const r = rows[0];
        // Convert notificationchannels (lowercase) to notificationChannels (camelCase)
        const channels = typeof r.notificationchannels === 'string' 
          ? JSON.parse(r.notificationchannels) 
          : r.notificationchannels;
        return {
          yandexDiskToken: r.yandex_disk_token || "",
          yandexDiskConnected: r.yandex_disk_connected,
          reminderDaysBefore: r.reminder_days_before,
          logoUrl: r.logo_url || undefined,
          customLogoEnabled: r.custom_logo_enabled,
          emailBotAddress: channels.emailBotAddress || "notify-bot@commercial-passport.ru",
          telegramBotUsername: channels.telegramBotUsername || "CommercialPassportNotifyBot",
          maxBotUsername: channels.maxBotUsername || "PassportTechSupportBot",
          notificationChannels: channels
        };
      }
    }
    const s = this.data.settings;
    if (!s.emailBotAddress) s.emailBotAddress = "notify-bot@commercial-passport.ru";
    if (!s.telegramBotUsername) s.telegramBotUsername = "CommercialPassportNotifyBot";
    if (!s.maxBotUsername) s.maxBotUsername = "PassportTechSupportBot";
    return s;
  }

  public async updateSettings(updated: Partial<SystemSettings>): Promise<SystemSettings> {
    if (this.usePostgres && this.pool) {
      const existing = await this.getSettings();
      const nextSettings = { ...existing, ...updated };
      const channelsWithBots = {
        ...nextSettings.notificationChannels,
        emailBotAddress: nextSettings.emailBotAddress,
        telegramBotUsername: nextSettings.telegramBotUsername,
        maxBotUsername: nextSettings.maxBotUsername
      };

      await this.pool.query(
        `UPDATE system_settings SET 
          yandex_disk_token = $1, 
          yandex_disk_connected = $2, 
          reminder_days_before = $3, 
          logo_url = $4, 
          custom_logo_enabled = $5, 
          notificationchannels = $6::jsonb
         WHERE id = 'main_settings'`,
        [
          nextSettings.yandexDiskToken, 
          nextSettings.yandexDiskConnected, 
          nextSettings.reminderDaysBefore, 
          nextSettings.logoUrl || null, 
          nextSettings.customLogoEnabled, 
          JSON.stringify(channelsWithBots)
        ]
      );
      return this.getSettings();
    }
    this.data.settings = { ...this.data.settings, ...updated };
    this.saveJSONFile();
    return this.data.settings;
  }
}
