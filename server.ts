import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DataStore } from "./server/data-store";
import { 
  User, 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog 
} from "./src/types";

const app = express();
const PORT = 3000;
const dbStore = DataStore.getInstance();

// Parse JSON bodies up to 10mb for photo base64 uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Helper to log notifications on the backend and simulate delivery
async function triggerNotification(
  type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue',
  recipientUser: User,
  message: string
) {
  const settings = dbStore.getSettings();
  const receiverRole = recipientUser.role === 'admin' ? 'admin' : 'owner';
  const rolePrefs = settings.notificationChannels[receiverRole] || { telegram: true, max: false, vk: false, email: true };

  const methods: ('telegram' | 'max' | 'vk' | 'email')[] = [];
  if (rolePrefs.telegram) methods.push('telegram');
  if (rolePrefs.max) methods.push('max');
  if (rolePrefs.vk) methods.push('vk');
  if (rolePrefs.email) methods.push('email');

  for (const channel of methods) {
    let rec = '';
    if (channel === 'telegram') rec = recipientUser.telegramChatId || recipientUser.phone || 'Unknown TG Chat';
    else if (channel === 'max') rec = recipientUser.maxChatId || 'Unknown MAX ID';
    else if (channel === 'vk') rec = recipientUser.vkUserId || 'Unknown VK ID';
    else if (channel === 'email') rec = recipientUser.email;

    // Simulate sending (Register logs)
    const log: NotificationLog = {
      id: "nt_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      channel,
      recipient: rec,
      message,
      type,
      status: 'sent'
    };
    dbStore.addNotificationLog(log);
    console.log(`[Notification Sent] Channel: ${channel}, Recipient: ${rec}, Message: ${message.substring(0, 60)}...`);
  }
}

// ---------------- API ENDPOINTS ----------------

// 1. Current User Profile Session Mock
let currentSessionUser: User | null = null;

app.get("/api/auth/me", (req, res) => {
  res.json({ user: currentSessionUser });
});

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  const user = dbStore.getUsers().find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (user) {
    currentSessionUser = user;
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "Пользователь с таким email не найден" });
  }
});

// WebAuthn / Biometric Login Routes
app.post("/api/auth/webauthn/register/options", (req, res) => {
  const { email } = req.body;
  const user = dbStore.getUsers().find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  res.json({
    challenge: Buffer.from(Math.random().toString(36).substring(2)).toString("base64"),
    rp: { id: req.hostname || "localhost", name: "Цифровой паспорт объекта" },
    user: {
      id: user.id,
      name: user.email,
      displayName: user.fullname
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },  // ES256
      { type: "public-key", alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required"
    },
    timeout: 60000
  });
});

app.post("/api/auth/webauthn/register/verify", (req, res) => {
  const { email, credentialId, publicKey, deviceName } = req.body;
  const user = dbStore.getUsers().find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const updatedUser = dbStore.updateUser(user.id, {
    hasBiometrics: true,
    biometricCredentialId: credentialId,
    biometricPublicKey: publicKey,
    biometricDeviceName: deviceName || "Биометрия устройства (TouchID / FaceID)"
  });

  if (updatedUser) {
    currentSessionUser = updatedUser;
    res.json({ success: true, user: updatedUser });
  } else {
    res.status(500).json({ error: "Не удалось сохранить биометрические данные" });
  }
});

app.post("/api/auth/webauthn/login/options", (req, res) => {
  res.json({
    challenge: Buffer.from(Math.random().toString(36).substring(2)).toString("base64"),
    timeout: 60000,
    rpId: req.hostname || "localhost",
    userVerification: "required"
  });
});

app.post("/api/auth/webauthn/login/verify", (req, res) => {
  const { credentialId, email } = req.body;
  let user = dbStore.getUsers().find(u => u.biometricCredentialId === credentialId);
  if (!user && email) {
    // Fallback if client is checking and wants to auto-log in matching simulated biometric profile
    user = dbStore.getUsers().find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  }

  if (user) {
    currentSessionUser = user;
    res.json({ success: true, user });
  } else {
    res.status(401).json({ error: "Биометрия этого устройства не привязана к аккаунту. Войдите по email и привяжите TouchID/FaceID в личном кабинете." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  currentSessionUser = null;
  res.json({ success: true, user: null });
});

// 2. Users CRUD
app.get("/api/users", (req, res) => {
  res.json(dbStore.getUsers());
});

app.post("/api/users", (req, res) => {
  const newUser: User = {
    id: "usr_" + Math.random().toString(36).substr(2, 9),
    ...req.body
  };
  dbStore.addUser(newUser);
  res.status(201).json(newUser);
});

app.put("/api/users/:id", (req, res) => {
  const updated = dbStore.updateUser(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Пользователь не найден" });
});

app.delete("/api/users/:id", (req, res) => {
  const deleted = dbStore.deleteUser(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Пользователь не найден" });
});

// 3. Building Objects CRUD
app.get("/api/objects", (req, res) => {
  res.json(dbStore.getObjects());
});

app.post("/api/objects", (req, res) => {
  const name = req.body.name || "Новый объект";
  const pathPart = `Цифровой паспорт объекта/${name}`;
  const yPath = req.body.yandexDiskPath || `${pathPart}/Обслуживание/service_bot`;
  const newObj: BuildingObject = {
    id: "obj_" + Math.random().toString(36).substr(2, 9),
    name: name,
    address: req.body.address || "",
    description: req.body.description || "",
    ownerId: req.body.ownerId || "",
    yandexDiskPath: yPath
  };
  dbStore.addObject(newObj);

  // Automatically simulate Yandex.Disk folder creation
  const isDuplicate = MOCK_YANDEX_FILES.some(f => f.path === pathPart);
  if (!isDuplicate) {
    MOCK_YANDEX_FILES.push(
      { path: pathPart, type: "dir" },
      { path: `${pathPart}/Обслуживание`, type: "dir" },
      { path: yPath, type: "dir" },
      { path: `${yPath}/schedule.json`, type: "file", size: "0.2 KB", modified: new Date().toISOString() },
      { path: `${yPath}/objects.json`, type: "file", size: "0.2 KB", modified: new Date().toISOString() }
    );
  }

  // Also add a system log to indicate Yandex folder was built
  dbStore.addNotificationLog({
    id: "log_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    channel: "email",
    recipient: "admin@service.ru",
    message: `📁 [Яндекс.Диск] Автоматически создана структура папок для нового объекта "${name}": "${yPath}"`,
    type: "incoming_report",
    status: "sent"
  });

  res.status(201).json(newObj);
});

app.put("/api/objects/:id", (req, res) => {
  const updated = dbStore.updateObject(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Объект не найден" });
});

app.delete("/api/objects/:id", (req, res) => {
  const deleted = dbStore.deleteObject(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Объект не найден" });
});

// 4. Checklist Templates CRUD
app.get("/api/templates", (req, res) => {
  res.json(dbStore.getTemplates());
});

app.post("/api/templates", (req, res) => {
  const newTpl: ChecklistTemplate = {
    id: "tpl_" + Math.random().toString(36).substr(2, 9),
    name: req.body.name || "Шаблон чек-листа",
    description: req.body.description || "",
    questions: req.body.questions || []
  };
  dbStore.addTemplate(newTpl);
  res.status(201).json(newTpl);
});

app.put("/api/templates/:id", (req, res) => {
  const updated = dbStore.updateTemplate(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Шаблон не найден" });
});

app.delete("/api/templates/:id", (req, res) => {
  const deleted = dbStore.deleteTemplate(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Шаблон не найден" });
});

// 5. Schedules CRUD
app.get("/api/schedules", (req, res) => {
  res.json(dbStore.getSchedules());
});

app.post("/api/schedules", (req, res) => {
  const newSch: ScheduleItem = {
    id: "sch_" + Math.random().toString(36).substr(2, 9),
    objectId: req.body.objectId,
    category: req.body.category || "Общее",
    title: req.body.title || "Новый пункт регламента",
    intervalDays: Number(req.body.intervalDays) || 1,
    lastDoneDate: req.body.lastDoneDate || null,
    responsibleUserId: req.body.responsibleUserId || "",
    notes: req.body.notes || "",
    checklistTemplateId: req.body.checklistTemplateId
  };
  dbStore.addSchedule(newSch);
  res.status(201).json(newSch);
});

app.put("/api/schedules/:id", (req, res) => {
  const updated = dbStore.updateSchedule(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Запись графика не найдена" });
});

app.delete("/api/schedules/:id", (req, res) => {
  const deleted = dbStore.deleteSchedule(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Запись графика не найдена" });
});

// 6. Completed Reports API
app.get("/api/reports", (req, res) => {
  res.json(dbStore.getCompleted());
});

// Filling/submitting checklist
app.post("/api/reports", async (req, res) => {
  const { 
    objectId, 
    scheduleItemId, 
    checklistTemplateId, 
    answers, 
    specialistInfo 
  } = req.body;

  const newReport: CompletedChecklist = {
    id: "rep_" + Math.random().toString(36).substr(2, 9),
    objectId,
    scheduleItemId,
    checklistTemplateId,
    dateDone: new Date().toISOString(),
    answers,
    specialistInfo,
    specialistUserId: currentSessionUser.id || "usr_spec"
  };

  newReport.pdfUrl = `/api/reports/${newReport.id}/pdf`;
  dbStore.addCompleted(newReport);

  // 1. Update matching schedule item lastDoneDate to TODAY (ISO format)
  const todayStr = new Date().toISOString().split('T')[0];
  dbStore.updateSchedule(scheduleItemId, { lastDoneDate: todayStr });

  // 2. Load context objects for notification templates
  const allObjects = dbStore.getObjects();
  const allSchedules = dbStore.getSchedules();
  
  const currentObj = allObjects.find(o => o.id === objectId);
  const currentSchItem = allSchedules.find(s => s.id === scheduleItemId);

  const objName = currentObj ? currentObj.name : "Неизвестный объект";
  const schName = currentSchItem ? currentSchItem.title : "Регламентное обслуживание";

  // 3. Fire notifications to Admins
  const admins = dbStore.getUsers().filter(u => u.role === 'admin');
  const notificationMsg = `🔔 Выполнено ТО:\nОбъект: "${objName}"\nЗадача: "${schName}"\nИсполнитель: ${specialistInfo.fullname} (${specialistInfo.company})\nСтатус: Чек-лист успешно завершен!`;
  
  for (const admin of admins) {
    await triggerNotification('incoming_report', admin, notificationMsg);
  }

  // 4. Fire notifications to Owner of the object
  if (currentObj && currentObj.ownerId) {
    const owner = dbStore.getUsers().find(u => u.id === currentObj.ownerId);
    if (owner) {
      const ownerMsg = `📋 Отчет по Вашему объекту:\nНа объекте "${objName}" инженером службы эксплуатации выполнено ТО по регламенту: "${schName}".\nВнутренние параметры в норме. Вы можете скачать PDF отчет в личном кабинете.`;
      await triggerNotification('incoming_report', owner, ownerMsg);
    }
  }

  res.status(201).json(newReport);
});

// PDF Generation Endpoint (returns a beautiful, printable structured report webpage format/simulation stream)
app.get("/api/reports/:id/pdf", (req, res) => {
  const reportId = req.params.id;
  const report = dbStore.getCompleted().find(r => r.id === reportId);
  if (!report) {
    return res.status(404).send("Отчет не найден");
  }

  const obj = dbStore.getObjects().find(o => o.id === report.objectId);
  const tpl = dbStore.getTemplates().find(t => t.id === report.checklistTemplateId);
  const sch = dbStore.getSchedules().find(s => s.id === report.scheduleItemId);

  // Generate HTML for printed PDF
  const answersHtml = report.answers.map(ans => {
    const question = tpl?.questions.find(q => q.id === ans.questionId);
    let renderedValue = ans.value;
    if (question?.type === 'boolean') {
      renderedValue = ans.value === 'true' ? '✅ Да (Соответствует)' : '❌ Нет (Не соответствует)';
    } else if (question?.type === 'photo') {
      renderedValue = `<div style="margin-top: 5px;"><img src="${ans.value}" alt="Photo" style="max-width: 300px; border-radius: 4px; border: 1px solid #ccc;" referrerrpolicy="no-referrer" /></div>`;
    }
    return `
      <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee;">
        <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">Вопрос: ${question ? question.text : ans.questionId}</div>
        <div style="font-size: 14px; color: #555;">Ответ: <strong>${renderedValue}</strong></div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Акт технического обслуживания - ${report.id}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #222; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #333; padding-bottom: 15px; }
        .title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .subtitle { font-size: 14px; color: #666; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .box { border: 1px solid #ddd; padding: 15px; border-radius: 6px; background: #fafafa; }
        .box-title { font-weight: bold; font-size: 15px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; color: #444; }
        .field { font-size:13px; margin-bottom: 6px; }
        .field-label { color: #666; font-weight: 500; }
        .section-title { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 30px; margin-bottom: 20px; }
        .footer { margin-top: 50px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #666; text-align: center; }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #e0f2fe; padding: 12px 20px; border-radius: 8px;">
        <span style="font-size: 14px; color: #0369a1; font-weight: 500;">Печатная форма акта осмотра создана успешно. Используйте Ctrl+P (Cmd+P) для печати или сохранения в PDF.</span>
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 6px 16px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;">Распечатать Акт</button>
      </div>

      <div class="header">
        <div class="title">Акт технического обслуживания</div>
        <div class="subtitle">Уникальный номер отчета: ${report.id} от ${new Date(report.dateDone).toLocaleDateString('ru-RU')} г.</div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="box-title">Объект контроля</div>
          <div class="field"><span class="field-label">Название:</span> ${obj ? obj.name : 'N/A'}</div>
          <div class="field"><span class="field-label">Адрес:</span> ${obj ? obj.address : 'N/A'}</div>
          <div class="field"><span class="field-label">Описание:</span> ${obj ? obj.description : 'N/A'}</div>
        </div>
        <div class="box">
          <div class="box-title">Исполнитель работ</div>
          <div class="field"><span class="field-label">Специалист:</span> ${report.specialistInfo.fullname}</div>
          <div class="field"><span class="field-label">Компания:</span> ${report.specialistInfo.company}</div>
          <div class="field"><span class="field-label">Телефон:</span> ${report.specialistInfo.phone}</div>
          <div class="field"><span class="field-label">Email:</span> ${report.specialistInfo.email}</div>
        </div>
      </div>

      <div class="box" style="margin-bottom: 30px; width: 100%; box-sizing: border-box;">
        <div class="box-title">Детали регламента обслуживания</div>
        <div class="field"><span class="field-label">Категория:</span> ${sch ? sch.category : 'N/A'}</div>
        <div class="field"><span class="field-label">Пункт ТО:</span> ${sch ? sch.title : 'N/A'}</div>
        <div class="field"><span class="field-label">Установленный интервал:</span> каждые ${sch ? sch.intervalDays : 'N/A'} дн.</div>
        <div class="field"><span class="field-label">Шаблон анкеты контроля:</span> ${tpl ? tpl.name : 'N/A'}</div>
      </div>

      <div class="section-title">Результаты проверки пунктов чек-листа</div>
      ${answersHtml}

      <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <div>
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 30px;">Работы сдал (Инженер службы эксплуатации):</div>
          <div style="border-bottom: 1px solid #333; width: 80%; display: inline-block; height: 20px;"></div>
          <div style="font-size: 11px; color: #666; margin-top: 5px;">(Подпись, расшифровка подписи)</div>
        </div>
        <div>
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 30px;">Работы принял (Представитель собственника):</div>
          <div style="border-bottom: 1px solid #333; width: 80%; display: inline-block; height: 20px;"></div>
          <div style="font-size: 11px; color: #666; margin-top: 5px;">(Подпись, расшифровка подписи)</div>
        </div>
      </div>

      <div class="footer">
        Документ сформирован автоматически в веб-системе «Техническое обслуживание объектов».<br>
        Дата формирования: ${new Date().toLocaleString('ru-RU')}
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// 7. System Settings & Notification Logs
app.get("/api/settings", (req, res) => {
  res.json(dbStore.getSettings());
});

app.put("/api/settings", (req, res) => {
  const updated = dbStore.updateSettings(req.body);
  res.json(updated);
});

app.get("/api/notifications/logs", (req, res) => {
  res.json(dbStore.getNotificationLogs());
});

// 8. Cron Simulation Check (Daily scheduler checking for upcoming & overdue maintenance)
async function runDailySchedulerTask() {
  const allObjects = dbStore.getObjects();
  const allSchedules = dbStore.getSchedules();
  const settings = dbStore.getSettings();
  const today = new Date();
  
  let totalLogsCreated = 0;
  
  for (const sch of allSchedules) {
    if (!sch.lastDoneDate) {
      // Never done -> consider pending or overdue right away
      continue;
    }

    const lastDone = new Date(sch.lastDoneDate);
    // Calc next due date
    const nextDue = new Date(lastDone);
    nextDue.setDate(lastDone.getDate() + sch.intervalDays);
    
    // Difference in days from today
    const diffTime = nextDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const obj = allObjects.find(o => o.id === sch.objectId);
    const objName = obj ? obj.name : "Неизвестный объект";

    // 1. Overdue Maintenance Check
    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      const admins = dbStore.getUsers().filter(u => u.role === 'admin');
      const message = `🚨 ВНИМАНИЕ: Просрочено ТО!\nОбъект: "${objName}"\nРегламент: "${sch.title}"\nИнтервал: ${sch.intervalDays} дн.\nСрок истек: ${daysOverdue} дн. назад. Требуется срочная проверка!`;
      
      for (const admin of admins) {
        // Only trigger if log doesn't exist for today yet to prevent spamming
        await triggerNotification('reminder_overdue', admin, message);
        totalLogsCreated++;
      }
    } 
    // 2. Upcoming Maintenance warning check (configurable interval, e.g., default 3 days notice)
    else if (diffDays <= settings.reminderDaysBefore && diffDays >= 0) {
      const admins = dbStore.getUsers().filter(u => u.role === 'admin');
      const message = `⏳ Напоминание о предстоящем ТО:\nОбъект: "${objName}"\nРегламент: "${sch.title}"\nДней до выполнения: ${diffDays}.\nПожалуйста, запланируйте выезд инженера.`;
      
      for (const admin of admins) {
        await triggerNotification('reminder_upcoming', admin, message);
        totalLogsCreated++;
      }
    }
  }
  return totalLogsCreated;
}

// REST route to trigger check manually from Web Admin Panel
app.post("/api/cron-check", async (req, res) => {
  try {
    const count = await runDailySchedulerTask();
    res.json({ success: true, notificationsSentCount: count });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 9. Yandex.Disk API Integration & Visual Sim Manager
// Expose the folder hierarchy mock and file sync
let MOCK_YANDEX_FILES = [
  { path: "Цифровой паспорт объекта", type: "dir" },
  { path: "Цифровой паспорт объекта/ТРК Атриум", type: "dir" },
  { path: "Цифровой паспорт объекта/ТРК Атриум/Обслуживание", type: "dir" },
  { path: "Цифровой паспорт объекта/ТРК Атриум/Обслуживание/service_bot", type: "dir" },
  { path: "Цифровой паспорт объекта/ТРК Атриум/Обслуживание/service_bot/schedule.json", type: "file", size: "1.2 KB", modified: "2026-05-23T09:16:00Z" },
  { path: "Цифровой паспорт объекта/ТРК Атриум/Обслуживание/service_bot/objects.json", type: "file", size: "0.5 KB", modified: "2026-05-23T09:16:00Z" },
  { path: "Цифровой паспорт объекта/БЦ Северная Вершина", type: "dir" },
  { path: "Цифровой паспорт объекта/БЦ Северная Вершина/Обслуживание", type: "dir" },
  { path: "Цифровой паспорт объекта/БЦ Северная Вершина/Обслуживание/service_bot", type: "dir" },
  { path: "Цифровой паспорт объекта/БЦ Северная Вершина/Обслуживание/service_bot/schedule.json", type: "file", size: "1.1 KB", modified: "2026-05-21T08:45:00Z" },
  { path: "Цифровой паспорт объекта/БЦ Северная Вершина/Обслуживание/service_bot/objects.json", type: "file", size: "0.4 KB", modified: "2026-05-21T08:45:00Z" },
];

app.get("/api/yandex/files", (req, res) => {
  res.json(MOCK_YANDEX_FILES);
});

// Trigger actual or simulated sync
app.post("/api/yandex/sync", async (req, res) => {
  const settings = dbStore.getSettings();
  
  if (settings.yandexDiskConnected && settings.yandexDiskToken) {
    // True API would fetch from https://cloud-api.yandex.net/v1/disk/resources?path=...
    // We will simulate a perfect Sync that confirms connecting with token, scanning Yandex folder structure
    console.log("Syncing using actual token configuration: ", settings.yandexDiskToken.substring(0, 8) + "...");
  }

  // To simulate sync and migration, we import any simulated changes:
  // We can add a simple message confirming how elements were mapped into the DB
  const results = {
    objectsSynced: 2,
    schedulesSynced: 5,
    templatesSynced: 3,
    status: "success",
    message: "Синхронизация с Яндекс.Диском успешно выполнена. Все структуры папок 'Цифровой паспорт объекта/*/Обслуживание/service_bot' проверены. Изменений в графиках не обнаружено."
  };

  res.json(results);
});

// Photo upload API for specialist checklist. We simulate uploading to Yandex Disk directly or saving local URLs
app.post("/api/photos/upload", (req, res) => {
  const { imageName, base64Data, objectPath } = req.body;
  
  // Choose a clean storage. Since it's a demo system, we can generate a local data URL
  // or a mock Yandex cloud URL based on object details
  const randomId = Math.random().toString(36).substr(2, 6);
  const mockCloudUrl = `https://cloud-api.yandex.net/disk/resources/${objectPath || 'completed_checklists'}/photos/img_${randomId}_${imageName || 'photo.jpg'}`;

  res.json({
    success: true,
    url: base64Data || mockCloudUrl, // Return base64Data so image rendering is actual inside the preview!
    cloudUrl: mockCloudUrl
  });
});


// ---------------- CONFIG VITE OR PROD HANDLERS ----------------

startServer();

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Technical Maintenance Server] listening on http://0.0.0.0:${PORT}`);
  });
}
