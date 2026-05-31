import React, { useState, useEffect } from "react";

export interface LegalDoc {
  title: string;
  lastUpdated: string;
  content: string[];
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  user_agreement: {
    title: "Пользовательское соглашение сервиса «Цифровой паспорт объекта»",
    lastUpdated: "21 мая 2026 г.",
    content: [
      "1. ОБЩИЕ ПОЛОЖЕНИЯ",
      "1.1. Настоящее Пользовательское соглашение (далее — Соглашение) регулирует отношения между Администрацией сервиса «Цифровой паспорт объекта» (далее — Портал / Сервис) и любым физическим или юридическим лицом (далее — Исполнитель, Собственник, Пользователь), осуществляющим использование Сервиса.",
      "1.2. Сервис представляет собой единую информационно-аналитическую систему для ведения цифровых технических паспортов, автоматического формирования календарных планов технического обслуживания (ТО), проведения мобильных инспекций по проверочным чек-листам и хранения верифицированных актов осмотров инженерного оборудования.",
      "1.3. Начало использования Сервиса, включая регистрацию учетной записи, авторизацию, просмотр данных или внесение изменений, означает полное и безоговорочное согласие Пользователя со всеми условиями настоящего Соглашения.",
      "2. УСЛУГИ СЕРВИСА И ПРАВА СТОРОН",
      "2.1. Сервис предоставляет Собственникам зданий удаленный доступ к цифровым картам оборудования, графикам ТО, базе актов в формате PDF, автоматической выгрузке на Яндекс.Диск и оценке работы технических специалистов.",
      "2.2. Сервис предоставляет Сервисным специалистам (инженерам) возможность заполнения цифровых чек-листов, прикрепления фотофиксации выполненных работ, формирования цифровой подписи акта непосредственно на объекте.",
      "2.3. Администрация оставляет за собой право в одностороннем порядке изменять функционал Сервиса, проводить профилактические работы с временным ограничением доступа, а также модерировать учетные записи Пользователей.",
      "3. ОБЯЗАТЕЛЬСТВА ПОЛЬЗОВАТЕЛЕЙ",
      "3.1. Пользователь обязуется предоставлять достоверную и актуальную информацию при регистрации (ФИО, контактный телефон, email, реквизиты компании).",
      "3.2. Пользователь единолично несет ответственность за сохранность своих авторизационных данных (логина и пароля) и конфиденциальность привязаных биометрических ключей (WebAuthn).",
      "3.3. Специалист обязуется гарантировать достоверность вносимых ответов в чек-листах и подлинность загружаемых фотографий проверяемого оборудования.",
      "4. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ",
      "4.1. Сервис предоставляется на условиях «как есть» (as is). Администрация не гарантирует абсолютную бесперебойность или отсутствие ошибок в случае сбоев на стороне хостинг-провайдеров, API внешних платформ, мессенджера Telegram или сервиса Яндекс.Диск.",
      "4.2. Администрация не несет ответственности за прямые или косвенные убытки, возникшие вследствие аварийных ситуаций на объектах недвижимости Пользователя, даже если регламентные работы были зафиксированы в Сервисе."
    ]
  },
  privacy_policy: {
    title: "Политика конфиденциальности персональных данных",
    lastUpdated: "21 мая 2026 г.",
    content: [
      "1. ИДЕНТИФИКАЦИЯ И СОБИРАЕМЫЕ ДАННЫЕ",
      "1.1. Настоящим Пользователь подтверждает сбор, систематизацию и хранение на серверах Сервиса следующих категорий данных: фамилия, имя, отчество, email-адрес, рабочий телефон, наименование организации, Telegram Chat ID, идентификаторы VK, профессиональные навыки инженеров, а также геолокационные метки и технические фотографии входов/выходов оборудования во время прохождения инспекций.",
      "1.2. При желании Пользователя использовать беспарольную аутентификацию (WebAuthn / TouchID / FaceID) собирается и сохраняется публичная часть ключа проверки подлинности и уникальный идентификатор криптографического устройства. Биометрические рисунки отпечатков пальцев напрямую на сервера НЕ передаются и хранятся исключительно в безопасном чипе устройства Пользователя.",
      "2. ЦЕЛИ ОБРАБОТКИ ИНФОРМАЦИИ",
      "2.1. Контактные данные обрабатываются исключительно в целях обеспечения функционала системы: маршрутизация заявок, выгрузка регламентов, отправка автоматических SMS- и Telegram-уведомлений о плановом ТО, а также генерация юридически значимых PDF-отчетов по выполненным инспекциям.",
      "2.2. Оценки и отзывы Собственников объектов формируют публичный рейтинг специалистов ТО в рамках системы, способствуя автоматическому подбору наиболее квалифицированных инженеров на ответственные задачи.",
      "3. ЗАЩИТА И БЕЗОПАСНОСТЬ",
      "3.1. Все личные пароли в базе зашифрованы с применением современных хэш-алгоритмов.",
      "3.2. Передача данных между клиентом, сервером и внешними хранилищами (включая Яндекс.Диск) осуществляется исключительно по протоколам шифрования SSL/TLS.",
      "3.3. Доступ Собственника к техническим регламентам, планировщику ТО, Яндекс.Диску и актам строго изолирован и предоставляется только по авторизованному токену доступа."
    ]
  },
  data_consent: {
    title: "Согласие на обработку персональных данных Пользователей",
    lastUpdated: "21 мая 2026 г.",
    content: [
      "1. В соответствии с требованиями Федерального закона от 27.07.2006 г. № 152-ФЗ «О персональных данных» Пользователь (субъект персональных данных) свободно, своей волей и в своем интересе дает согласие на обработку своих персональных данных Администрации Сервиса.",
      "2. Настоящее согласие дается на обработку как без использования средств автоматизации, так и электронным способом со следующими персональными данными: ФИО, адрес электронной почты, контактные телефоны, место работы и должность, Telegram ID, VK ID, стаж работы, профессиональные сертификаты.",
      "3. Перечень действий с персонающими данными, на совершение которых дается согласие: сбор, запись, систематизация, накопление, использование, хранение на серверах, уточнение (обновление, изменение), извлечение, передача партнерам (только в целях обеспечения ТО здания инженерами), блокирование, удаление.",
      "4. Настоящее согласие действует бессрочно с момента регистрации на Портале и может быть отозвано путем направления письменного заявления в службу поддержки Сервиса по адресу электронной почты."
    ]
  },
  public_offer: {
    title: "Публичная оферта на оказание услуг эксплуатации",
    lastUpdated: "21 мая 2026 г.",
    content: [
      "1. ОБЩИЕ УСЛОВИЯ ОФЕРТЫ",
      "1.1. Настоящий документ представляет собой открытое предложение (Публичную оферту) Сервиса эксплуатации коммерческой недвижимости адресованное Собственникам объектов недвижимости на заключение договора абонентского обслуживания и технического консалтинга.",
      "1.2. Акцептом настоящей Оферты считается прохождение регистрации учетной записи Собственника, добавление первого объекта эксплуатации в базу контроля и внесение ежемесячного сервисного платежа согласно выбранному тарифному плану.",
      "2. ПРЕДМЕТ ДОГОВОРА-ОФЕРТЫ",
      "2.1. Исполнитель обязуется предоставлять программную платформу «Цифровой паспорт объекта», генерировать регламенты технического обслуживания инженерных систем (ИТП, ХВС, ГВС, вентиляция, электроснабжение) в соответствии с нормативами СП и ГОСТР, а также привлекать аккредитованных технических специалистов для инспекций.",
      "2.2. Расчет за выездные инспекции специалистов может производиться на основе согласованного внутри Платформы тарифа за один завершенный проверочный чек-лист с подписанием цифрового Акта.",
      "3. ТАРИФНЫЕ ПЛАНЫ И ВЗАИМОРАСЧЕТЫ",
      "3.1. Абонентская плата включает в себя дисковое пространство для автоматических резервных копий на Яндекс.Диске, ведение плановReminders, аудит SLA специалистов, хранение отчетов в течение 5 лет.",
      "3.2. Споры и разногласия по качеству обслуживания оборудования инженерами разрешаются на основании оценок, поданных Собственником в течение 10 дней с момента фиксации Акта в системе."
    ]
  }
};

interface LegalDocumentsModalProps {
  docType: 'user_agreement' | 'privacy_policy' | 'data_consent' | 'public_offer';
  onClose: () => void;
}

export function LegalDocumentsModal({ docType, onClose }: LegalDocumentsModalProps) {
  const [docs, setDocs] = useState<Record<string, LegalDoc>>(LEGAL_DOCS);

  useEffect(() => {
    const saved = localStorage.getItem("custom_legal_docs");
    if (saved) {
      try {
        setDocs(JSON.parse(saved));
      } catch (e) {
        // use default
      }
    }
  }, []);

  const doc = docs[docType];
  if (!doc) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-neutral-300/15 p-6 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-scaleUp text-neutral-800 dark:text-neutral-100">
        <div className="flex items-center justify-between border-b border-neutral-300/15 pb-3">
          <div>
            <h3 className="font-extrabold text-base text-blue-600 dark:text-blue-400">
              {doc.title}
            </h3>
            <p className="text-[10px] opacity-55 mt-0.5">Редакция действительна с {doc.lastUpdated}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans pr-1">
          {doc.content.map((paragraph, idx) => (
            <p key={idx} className={paragraph.startsWith("1.") || paragraph.startsWith("2.") || paragraph.startsWith("3.") || paragraph.startsWith("4.") || paragraph.toUpperCase() === paragraph ? "font-bold text-neutral-800 dark:text-neutral-100 border-b border-neutral-100 dark:border-zinc-800/40 pb-1 mt-4" : ""}>
              {paragraph}
            </p>
          ))}
        </div>

        <div className="border-t border-neutral-300/15 pt-3.5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow"
          >
            Закрыть документ
          </button>
        </div>
      </div>
    </div>
  );
}

interface LegalTabContentProps {
  currentTheme: string;
  isAdmin?: boolean;
}

export function LegalTabContent({ currentTheme, isAdmin }: LegalTabContentProps) {
  const [docs, setDocs] = useState<Record<string, LegalDoc>>(LEGAL_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<keyof typeof LEGAL_DOCS>('user_agreement');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLastUpdated, setEditLastUpdated] = useState("");
  const [editContent, setEditContent] = useState("");

  const loadDocs = () => {
    const saved = localStorage.getItem("custom_legal_docs");
    if (saved) {
      try {
        setDocs(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  };

  useEffect(() => {
    loadDocs();
    const handleUpdate = () => loadDocs();
    window.addEventListener("legal-docs-updated", handleUpdate);
    return () => window.removeEventListener("legal-docs-updated", handleUpdate);
  }, []);

  const doc = docs[selectedDoc];

  const handleStartEdit = () => {
    setEditTitle(doc.title);
    setEditLastUpdated(doc.lastUpdated);
    setEditContent(doc.content.join("\n\n"));
    setIsEditing(true);
  };

  const handleSave = () => {
    const updatedDocs = {
      ...docs,
      [selectedDoc]: {
        title: editTitle,
        lastUpdated: editLastUpdated,
        content: editContent.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
      }
    };
    setDocs(updatedDocs);
    localStorage.setItem("custom_legal_docs", JSON.stringify(updatedDocs));
    setIsEditing(false);
    window.dispatchEvent(new Event("legal-docs-updated"));
  };

  const handleReset = () => {
    if (confirm("Вы уверены, что хотите сбросить этот документ к исходной версии?")) {
      const updatedDocs = {
        ...docs,
        [selectedDoc]: LEGAL_DOCS[selectedDoc]
      };
      setDocs(updatedDocs);
      localStorage.setItem("custom_legal_docs", JSON.stringify(updatedDocs));
      setIsEditing(false);
      window.dispatchEvent(new Event("legal-docs-updated"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 pb-1 border-b border-neutral-300/10">
        {(Object.keys(docs) as Array<keyof typeof LEGAL_DOCS>).map(key => (
          <button
            key={key}
            onClick={() => {
              setSelectedDoc(key);
              setIsEditing(false);
            }}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedDoc === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            {docs[key].title.split(" сервиса")[0].split(" Пользователей")[0].split(" на ")[0]}
          </button>
        ))}
      </div>

      <div className="p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md">
        {isEditing ? (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Редактирование документа
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-450 uppercase mb-1">
                  Название документа
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-450 uppercase mb-1">
                  Дата последней редакции
                </label>
                <input
                  type="text"
                  value={editLastUpdated}
                  onChange={(e) => setEditLastUpdated(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-450 uppercase mb-1">
                  Текст (разделяйте абзацы пустой строкой / двойным Enter)
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 font-medium font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="py-1.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-all cursor-pointer border border-rose-500/10"
              >
                Сбросить к исходной
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="py-1.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="py-1.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="border-b border-neutral-200 dark:border-zinc-800 pb-3 mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  ⚖️ {doc.title}
                </h3>
                <p className="text-[10px] opacity-55 mt-0.5">Последняя редакция: {doc.lastUpdated}</p>
              </div>
              <div className="flex gap-2 items-center self-start sm:self-auto">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="py-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/15 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all"
                  >
                    📝 Редактировать
                  </button>
                )}
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Официальный документ
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 max-h-[50vh] overflow-y-auto pr-1">
              {doc.content.map((paragraph, idx) => (
                <p key={idx} className={paragraph.startsWith("1.") || paragraph.startsWith("2.") || paragraph.startsWith("3.") || paragraph.startsWith("4.") || paragraph.toUpperCase() === paragraph ? "font-bold text-neutral-800 dark:text-neutral-100 border-b border-neutral-100 dark:border-zinc-800/40 pb-1 mt-4" : ""}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
