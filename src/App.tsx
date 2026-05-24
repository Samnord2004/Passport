import React, { useState, useEffect, startTransition, useTransition } from "react";
import { 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog, 
  User, 
  UserRole, 
  Question 
} from "./types";
import ThemeSelector, { ThemeStyle } from "./components/ThemeSelector";
import LoginScreen from "./components/LoginScreen";
import { 
  Building, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Settings, 
  RefreshCw, 
  UserCheck, 
  HardHat, 
  Shield, 
  Trash2, 
  Edit3, 
  Plus, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Image as ImageIcon, 
  Mail, 
  Send, 
  Bell, 
  LogOut, 
  UserPlus, 
  ChevronRight, 
  Copy, 
  Check, 
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Fingerprint,
  ScanFace
} from "lucide-react";

export default function App() {
  // Theme & Layout state
  const [theme, setTheme] = useState<ThemeStyle>('cleanroom');
  const [activeTab, setActiveTab] = useState<'objects' | 'schedule' | 'templates' | 'reports' | 'users' | 'settings'>('objects');
  const [qrModalSchedule, setQrModalSchedule] = useState<ScheduleItem | null>(null);
  
  // Data State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [objects, setObjects] = useState<BuildingObject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [reports, setReports] = useState<CompletedChecklist[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [systemSettings, setSystemSettings] = useState({
    yandexDiskToken: "",
    yandexDiskConnected: false,
    reminderDaysBefore: 3,
    logoUrl: "",
    customLogoEnabled: false,
    notificationChannels: {
      admin: { telegram: true, max: true, vk: false, email: true },
      owner: { telegram: true, max: false, vk: false, email: true }
    }
  });

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Synced status
  const [syncLogs, setSyncLogs] = useState<string>("Синхронизация не производилась");
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Create / Edit Modals and Form states
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  // Specialist Flow States
  const [selectedObjId, setSelectedObjId] = useState<string>("");
  const [selectedSchId, setSelectedSchId] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<ChecklistTemplate | null>(null);
  const [filledAnswers, setFilledAnswers] = useState<Record<string, string>>({});
  const [uploadedPhotos, setUploadedPhotos] = useState<Record<string, string>>({}); // questionId -> base64 or URL
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [specName, setSpecName] = useState("");
  const [specCompany, setSpecCompany] = useState("");
  const [specPhone, setSpecPhone] = useState("");
  const [specEmail, setSpecEmail] = useState("");
  const [checklistCompletedReport, setChecklistCompletedReport] = useState<CompletedChecklist | null>(null);

  // Template Editor form states
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplQuestions, setTplQuestions] = useState<Question[]>([]);
  // Question builder fields
  const [newQText, setNewQText] = useState("");
  const [newQType, setNewQType] = useState<Question['type']>("boolean");
  const [newQOptions, setNewQOptions] = useState("");
  const [newQRequired, setNewQRequired] = useState(true);

  // User modal form
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [usrFullname, setUsrFullname] = useState("");
  const [usrEmail, setUsrEmail] = useState("");
  const [usrRole, setUsrRole] = useState<UserRole>("specialist");
  const [usrPhone, setUsrPhone] = useState("");
  const [usrCompany, setUsrCompany] = useState("");
  const [usrTelegram, setUsrTelegram] = useState("");
  const [usrMax, setUsrMax] = useState("");
  const [usrVk, setUsrVk] = useState("");

  // Object Editor modal form
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [objName, setObjName] = useState("");
  const [objAddress, setObjAddress] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objOwnerId, setObjOwnerId] = useState("");
  const [objDiskPath, setObjDiskPath] = useState("");

  // Schedule Editor modal form
  const [editingSchId, setEditingSchId] = useState<string | null>(null);
  const [schObjId, setSchObjId] = useState("");
  const [schCategory, setSchCategory] = useState("Отопление");
  const [schTitle, setSchTitle] = useState("");
  const [schInterval, setSchInterval] = useState(30);
  const [schResponsible, setSchResponsible] = useState("");
  const [schTemplateId, setSchTemplateId] = useState("");
  const [schNotes, setSchNotes] = useState("");

  // Load Data on startup & refresh
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/objects").then(r => r.json()),
      fetch("/api/schedules").then(r => r.json()),
      fetch("/api/templates").then(r => r.json()),
      fetch("/api/reports").then(r => r.json()),
      fetch("/api/notifications/logs").then(r => r.json()),
      fetch("/api/settings").then(r => r.json())
    ]).then(([authData, usersData, objectsData, schedulesData, templatesData, reportsData, logsData, settingsData]) => {
      setCurrentUser(authData.user);
      setUsers(usersData);
      setObjects(objectsData);
      setSchedules(schedulesData);
      setTemplates(templatesData);
      setReports(reportsData);
      setLogs(logsData);
      setSystemSettings(settingsData);

      // Check incoming QR code query parameters to auto-route Specialist checklist flow
      const params = new URLSearchParams(window.location.search);
      const flowParam = params.get("flow");
      const objParam = params.get("objId");
      const schParam = params.get("schId");
      
      if (flowParam === "specialist" && objParam && schParam) {
        const specialistUser = usersData.find((u: any) => u.role === 'specialist') || authData.user;
        setCurrentUser(specialistUser);
        setSelectedObjId(objParam);
        setSelectedSchId(schParam);
        
        const schItem = schedulesData.find((s: any) => s.id === schParam);
        if (schItem) {
          const tplItem = templatesData.find((t: any) => t.id === schItem.checklistTemplateId);
          if (tplItem) {
            setActiveTemplate(tplItem);
          }
        }
      }
      setIsInitialized(true);
    }).catch(err => {
      console.error("Погрешность загрузки данных API", err);
      setIsInitialized(true);
    });
  }, [refreshTrigger]);

  // Synchronize Yandex.Disk
  const triggerDiskSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/yandex/sync", { method: "POST" });
      const data = await response.json();
      setSyncLogs(`Режим: Симуляция импорта.\nСтатус: ${data.status.toUpperCase()}\nСобытий: ${data.message}\nОбъектов в базе: ${data.objectsSynced}\nРегламентов сверено: ${data.schedulesSynced}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      setSyncLogs("Ошибка запроса синхронизации: " + (e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  // Run Cron Daily schedule simulation
  const checkCronNow = async () => {
    try {
      const response = await fetch("/api/cron-check", { method: "POST" });
      const data = await response.json();
      alert(`Планировщик ТО запущен!\nСгенерировано уведомлений: ${data.notificationsSentCount}\nУведомления направлены по установленным каналам.`);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      alert("Ошибка работы планировщика: " + (e as Error).message);
    }
  };

  // Auth Handlers
  const handleLogin = (user: User) => {
    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        setRefreshTrigger(prev => prev + 1);
      }
    });
  };

  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();
    if (data.success) {
      setCurrentUser(data.user);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // --- CRUD API Calls ---
  // Users CRUD
  const saveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullname: usrFullname,
      email: usrEmail,
      role: usrRole,
      phone: usrPhone,
      company: usrCompany,
      telegramChatId: usrTelegram,
      maxChatId: usrMax,
      vkUserId: usrVk
    };

    if (editingUserId) {
      await fetch(`/api/users/${editingUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    setEditingUserId(null);
    setRefreshTrigger(prev => prev + 1);
    resetUserForm();
  };

  const deleteUser = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const startEditUser = (u: User) => {
    setEditingUserId(u.id);
    setUsrFullname(u.fullname);
    setUsrEmail(u.email);
    setUsrRole(u.role);
    setUsrPhone(u.phone || "");
    setUsrCompany(u.company || "");
    setUsrTelegram(u.telegramChatId || "");
    setUsrMax(u.maxChatId || "");
    setUsrVk(u.vkUserId || "");
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUsrFullname("");
    setUsrEmail("");
    setUsrRole("specialist");
    setUsrPhone("");
    setUsrCompany("");
    setUsrTelegram("");
    setUsrMax("");
    setUsrVk("");
  };

  // Facility / Object CRUD
  const saveObjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: objName,
      address: objAddress,
      description: objDesc,
      ownerId: objOwnerId,
      yandexDiskPath: objDiskPath
    };

    if (editingObjId) {
      await fetch(`/api/objects/${editingObjId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    setEditingObjId(null);
    setRefreshTrigger(prev => prev + 1);
    resetObjectForm();
  };

  const deleteObject = async (id: string) => {
    if (confirm("Удалить этот объект со всей привязанной схемой регламентов?")) {
      await fetch(`/api/objects/${id}`, { method: "DELETE" });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const startEditObject = (o: BuildingObject) => {
    setEditingObjId(o.id);
    setObjName(o.name);
    setObjAddress(o.address);
    setObjDesc(o.description);
    setObjOwnerId(o.ownerId || "");
    setObjDiskPath(o.yandexDiskPath);
  };

  const resetObjectForm = () => {
    setEditingObjId(null);
    setObjName("");
    setObjAddress("");
    setObjDesc("");
    setObjOwnerId("");
    setObjDiskPath("");
  };

  // Schedule Grid CRUD
  const saveScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      objectId: schObjId,
      category: schCategory,
      title: schTitle,
      intervalDays: schInterval,
      responsibleUserId: schResponsible,
      checklistTemplateId: schTemplateId,
      notes: schNotes
    };

    if (editingSchId) {
      await fetch(`/api/schedules/${editingSchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }
    setEditingSchId(null);
    setRefreshTrigger(prev => prev + 1);
    resetScheduleForm();
  };

  const deleteSchedule = async (id: string) => {
    if (confirm("Удалить этот регламент обслуживания из графика?")) {
      await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const startEditSchedule = (s: ScheduleItem) => {
    setEditingSchId(s.id);
    setSchObjId(s.objectId);
    setSchCategory(s.category);
    setSchTitle(s.title);
    setSchInterval(s.intervalDays);
    setSchResponsible(s.responsibleUserId || "");
    setSchTemplateId(s.checklistTemplateId);
    setSchNotes(s.notes || "");
  };

  const resetScheduleForm = () => {
    setEditingSchId(null);
    setSchObjId("");
    setSchCategory("Отопление");
    setSchTitle("");
    setSchInterval(30);
    setSchResponsible("");
    setSchTemplateId("");
    setSchNotes("");
  };

  // Checklist Template Builder Handlers
  const addQuestionToTemplate = () => {
    if (!newQText.trim()) return;
    const newQ: Question = {
      id: "q_" + Math.random().toString(36).substr(2, 5),
      text: newQText,
      type: newQType,
      options: newQOptions ? newQOptions.split(',').map(o => o.trim()) : undefined,
      required: newQRequired
    };
    setTplQuestions([...tplQuestions, newQ]);
    setNewQText("");
    setNewQOptions("");
  };

  const removeQuestionFromTemplate = (qid: string) => {
    setTplQuestions(tplQuestions.filter(q => q.id !== qid));
  };

  const saveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      alert("Пожалуйста, укажите имя шаблона чек-листа");
      return;
    }

    const payload = {
      name: tplName,
      description: tplDesc,
      questions: tplQuestions
    };

    if (editingTemplateId) {
      await fetch(`/api/templates/${editingTemplateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    setEditingTemplateId(null);
    setRefreshTrigger(prev => prev + 1);
    resetTemplateForm();
  };

  const deleteTemplate = async (id: string) => {
    if (confirm("Удалить этот шаблон? Будет утерян во всех привязанных графиках.")) {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const startEditTemplate = (t: ChecklistTemplate) => {
    setEditingTemplateId(t.id);
    setTplName(t.name);
    setTplDesc(t.description || "");
    setTplQuestions(t.questions);
  };

  const copyTemplate = async (t: ChecklistTemplate) => {
    const payload = {
      name: `${t.name} (Копия)`,
      description: t.description || "",
      questions: t.questions
    };
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const resetTemplateForm = () => {
    setEditingTemplateId(null);
    setTplName("");
    setTplDesc("");
    setTplQuestions([]);
    setNewQText("");
    setNewQType("boolean");
    setNewQOptions("");
    setNewQRequired(true);
  };

  // Yandex.Disk Settings Save
  const saveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(systemSettings)
    });
    alert("Настройки системы сохранены!");
    setRefreshTrigger(prev => prev + 1);
  };

  // --- SPECIALIST WORKPLACE LOGIC ---
  const handleObjectSelectForChecklist = (objId: string) => {
    setSelectedObjId(objId);
    setSelectedSchId("");
    setActiveTemplate(null);
    setFilledAnswers({});
    setUploadedPhotos({});
    setChecklistCompletedReport(null);
  };

  const handleScheduleSelectForChecklist = (schId: string) => {
    setSelectedSchId(schId);
    const schItem = schedules.find(s => s.id === schId);
    if (schItem) {
      const template = templates.find(t => t.id === schItem.checklistTemplateId);
      if (template) {
        setActiveTemplate(template);
        // Pre-fill answers dictionary
        const initialAnswers: Record<string, string> = {};
        template.questions.forEach(q => {
          if (q.type === 'boolean') initialAnswers[q.id] = "true";
          else if (q.type === 'select') initialAnswers[q.id] = q.options ? q.options[0] : "";
          else initialAnswers[q.id] = "";
        });
        setFilledAnswers(initialAnswers);
      }
    }
  };

  // Image Simulation upload
  const handlePhotoUpload = (questionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhotoId(questionId);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const response = await fetch("/api/photos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageName: file.name,
            base64Data: base64,
            objectPath: objects.find(o => o.id === selectedObjId)?.yandexDiskPath || "completed_checklists"
          })
        });
        const uploadResult = await response.json();
        setUploadedPhotos(prev => ({
          ...prev,
          [questionId]: uploadResult.url
        }));
      } catch (err) {
        console.error("Simulation upload fail, saving local base64 instead", err);
        setUploadedPhotos(prev => ({
          ...prev,
          [questionId]: base64 // Fallback
        }));
      } finally {
        setUploadingPhotoId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitCompletedChecklist = async () => {
    // Validate required fields
    if (!activeTemplate) return;
    
    for (const q of activeTemplate.questions) {
      if (q.required) {
        if (q.type === 'photo' && !uploadedPhotos[q.id]) {
          alert(`Пожалуйста, загрузите обязательное фото для поля: "${q.text}"`);
          return;
        }
        if (q.type !== 'photo' && !filledAnswers[q.id]?.trim()) {
          alert(`Пожалуйста, заполните обязательный ответ на вопрос: "${q.text}"`);
          return;
        }
      }
    }

    // Spec Identity
    if (!specName.trim() || !specCompany.trim() || !specPhone.trim()) {
      alert("Укажите Ваши фамилию, компанию и контактный телефон перед отправкой!");
      return;
    }

    const payloadAnswers = activeTemplate.questions.map(q => {
      return {
        questionId: q.id,
        value: q.type === 'photo' ? (uploadedPhotos[q.id] || "") : (filledAnswers[q.id] || ""),
      };
    });

    const bodyPay = {
      objectId: selectedObjId,
      scheduleItemId: selectedSchId,
      checklistTemplateId: activeTemplate.id,
      answers: payloadAnswers,
      specialistInfo: {
        fullname: specName,
        company: specCompany,
        phone: specPhone,
        email: specEmail || currentUser?.email || "spec@tech.ru"
      }
    };

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPay)
      });
      const data = await response.json();
      setChecklistCompletedReport(data);
      alert("Чек-лист успешно сохранен, дата регламента обновлена, отправлены уведомления собственникам!");
      setRefreshTrigger(prev => prev + 1);
      
      // Auto pre-fill spec defaults in future
      if (currentUser && currentUser.role === 'specialist') {
        await fetch(`/api/users/${currentUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullname: specName,
            company: specCompany,
            phone: specPhone
          })
        });
      }
    } catch (e) {
      alert("Произошла ошибка при сохранении чек-листа " + (e as Error).message);
    }
  };

  // If not initialized yet, show setup/loading screen
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
        <div className="text-center p-6 bg-neutral-800 rounded-xl max-w-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-4" />
          <h3 className="font-bold">Инициализация веб-приложения...</h3>
          <p className="text-xs text-neutral-400 mt-2">База данных SQLite/JSON и экспресс сервер запускаются в контейнере.</p>
        </div>
      </div>
    );
  }

  // If initialized, but no logged-in user session, render the interactive login and register screen
  if (!currentUser) {
    const loginThemeWrapper = 
      theme === 'japanese' ? 'bg-[#faf7f0] text-[#2d2d2d] font-sans min-h-screen selection:bg-[#bc1c24]/15 py-10' :
      theme === 'crisp_minimal' ? 'bg-[#fafafa] text-neutral-900 font-sans min-h-screen selection:bg-neutral-200 py-10' :
      theme === 'modern' ? 'bg-zinc-950 text-zinc-100 font-sans min-h-screen selection:bg-sky-500/30 py-10' :
      theme === 'terminal' ? 'bg-black text-green-400 font-mono min-h-screen selection:bg-green-500/40 py-10' :
      theme === 'warm' ? 'bg-[#f8f1e5] text-amber-950 font-serif min-h-screen selection:bg-amber-100 py-10' :
      'bg-slate-50 text-slate-800 font-sans min-h-screen selection:bg-blue-100 py-10';

    return (
      <div className={loginThemeWrapper}>
        <LoginScreen 
          usersList={users} 
          currentTheme={theme}
          logoUrl={systemSettings.logoUrl}
          customLogoEnabled={systemSettings.customLogoEnabled}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setRefreshTrigger(prev => prev + 1);
          }} 
        />
      </div>
    );
  }

  // Define some lookups
  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return "Администрация";
    const found = users.find(u => u.id === ownerId);
    return found ? found.fullname : "Неизвестный собственник";
  };

  const getTemplateName = (tplId: string) => {
    const found = templates.find(t => t.id === tplId);
    return found ? found.name : "Шаблон удален или не привязан";
  };

  const getObjectName = (objId: string) => {
    const found = objects.find(o => o.id === objId);
    return found ? found.name : "Неизвестный объект";
  };

  const getScheduleName = (schId: string) => {
    const found = schedules.find(s => s.id === schId);
    return found ? found.title : "Регламентное обслуживание";
  };

  // Calculate days difference and statuses
  const getScheduleStatus = (sch: ScheduleItem) => {
    if (!sch.lastDoneDate) {
      return { label: "Ни разу не проводилось", class: "bg-red-100 text-red-800 border-red-300", overdue: true };
    }
    const lastDone = new Date(sch.lastDoneDate);
    const nextDue = new Date(lastDone);
    nextDue.setDate(lastDone.getDate() + sch.intervalDays);
    const today = new Date("2026-05-24"); // Simulated static current date
    const diffTime = nextDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Просрочено на ${Math.abs(diffDays)} дн.`, class: "bg-rose-100 text-rose-700 border-rose-300 font-bold", overdue: true };
    } else if (diffDays === 0) {
      return { label: "Требуется выполнить сегодня!", class: "bg-amber-100 text-amber-700 border-amber-300 font-bold animate-pulse", overdue: true };
    } else if (diffDays <= systemSettings.reminderDaysBefore) {
      return { label: `Предстоит выполнить через ${diffDays} дн.`, class: "bg-amber-50 text-amber-600 border-amber-200", overdue: false };
    } else {
      return { label: `В норме (Осталось ${diffDays} дн.)`, class: "bg-emerald-50 text-emerald-700 border-emerald-200", overdue: false };
    }
  };

  // Pre-fill active profile info on specialist load
  const triggerLoadProfileDefaults = () => {
    if (currentUser) {
      setSpecName(currentUser.fullname);
      setSpecCompany(currentUser.company || "Служба эксплуатации");
      setSpecPhone(currentUser.phone || "+7-900-000-0000");
      setSpecEmail(currentUser.email);
    }
  };

  // Styles based on theme
  const getThemeWrapperStyle = () => {
    switch (theme) {
      case 'modern':
        return 'bg-zinc-950 text-zinc-100 font-sans min-h-screen selection:bg-sky-500/30';
      case 'terminal':
        return 'bg-black text-green-400 font-mono min-h-screen selection:bg-green-500/40';
      case 'warm':
        return 'bg-[#f8f1e5] text-amber-950 font-serif min-h-screen selection:bg-amber-100';
      case 'japanese':
        return 'bg-[#faf7f0] text-[#2d2d2d] font-sans min-h-screen selection:bg-[#bc1c24]/15';
      case 'crisp_minimal':
        return 'bg-[#fafafa] text-neutral-900 font-sans min-h-screen selection:bg-neutral-200';
      case 'cleanroom':
      default:
        return 'bg-slate-50 text-slate-800 font-sans min-h-screen selection:bg-blue-100';
    }
  };

  const getCardStyle = () => {
    switch (theme) {
      case 'modern':
        return 'bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-lg';
      case 'terminal':
        return 'bg-black border border-green-500/30 rounded-none p-5 text-green-400';
      case 'warm':
        return 'bg-[#fdf6e2] border border-amber-900/15 rounded-2xl p-6 shadow-sm';
      case 'japanese':
        return 'bg-white border border-[#d6cfbe] rounded-none p-6 shadow-sm relative after:absolute after:bottom-1.5 after:right-1.5 after:w-1.5 after:h-1.5 after:bg-[#bc1c24]';
      case 'crisp_minimal':
        return 'bg-white border border-neutral-200 rounded-sm p-5 shadow-none';
      case 'cleanroom':
      default:
        return 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm';
    }
  };

  const getSubHeaderStyle = () => {
    switch (theme) {
      case 'modern':
        return 'border-b border-zinc-800 pb-4 mb-4';
      case 'terminal':
        return 'border-b-2 border-dashed border-green-500/30 pb-3 mb-4';
      case 'warm':
        return 'border-b-2 border-amber-900/10 pb-4 mb-5';
      case 'japanese':
        return 'border-b border-[#bc1c24]/20 pb-3 mb-4';
      case 'crisp_minimal':
        return 'border-b border-neutral-200 pb-3 mb-4';
      case 'cleanroom':
      default:
        return 'border-b border-slate-100 pb-3 mb-4';
    }
  };

  const getAccentBtn = () => {
    switch (theme) {
      case 'modern':
        return 'bg-white hover:bg-neutral-100 text-black font-semibold rounded-lg px-4 py-2 transition-colors duration-200';
      case 'terminal':
        return 'bg-transparent border border-green-400 hover:bg-green-400/10 text-green-400 font-bold rounded-none px-4 py-2 uppercase tracking-widest';
      case 'warm':
        return 'bg-amber-900 hover:bg-amber-950 text-white font-medium rounded-xl px-4 py-2.5 shadow-sm';
      case 'japanese':
        return 'bg-[#bc1c24] hover:bg-[#a01319] text-white font-semibold rounded-none px-4 py-2 transition-colors duration-200';
      case 'crisp_minimal':
        return 'bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-sm px-4 py-2 transition-colors duration-200';
      case 'cleanroom':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-4 py-2 transition-colors duration-200';
    }
  };

  const getMutedBtn = () => {
    switch (theme) {
      case 'modern':
        return 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg px-3 py-2';
      case 'terminal':
        return 'border border-green-500/20 text-green-500 hover:bg-green-500/5 rounded-none px-3 py-2 text-xs uppercase';
      case 'warm':
        return 'bg-amber-100/60 hover:bg-amber-200/60 text-amber-900 rounded-lg px-3 py-2';
      case 'japanese':
        return 'bg-[#f4efe2] hover:bg-[#eae2cf] text-[#4a3a29] border border-[#d6cfbe] rounded-none px-3 py-1.5 text-xs font-semibold';
      case 'crisp_minimal':
        return 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-sm px-3 py-1.5 text-xs font-semibold';
      case 'cleanroom':
      default:
        return 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md px-3 py-1.5 text-xs font-semibold';
    }
  };

  const getRedBtn = () => {
    return 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg p-1.5 transition-all';
  };

  const getInputStyle = () => {
    switch (theme) {
      case 'modern':
        return 'bg-zinc-800/60 border border-zinc-700 text-white rounded-lg p-2 focus:ring-1 focus:ring-sky-500 focus:outline-none';
      case 'terminal':
        return 'bg-black border border-green-500 text-green-400 rounded-none p-2 focus:outline-none placeholder-green-700';
      case 'warm':
        return 'bg-[#faf6eb] border border-amber-900/20 text-amber-950 rounded-xl p-3 focus:outline-none focus:border-amber-900/50';
      case 'japanese':
        return 'bg-white border border-[#d6cfbe] text-[#2d2d2d] rounded-none p-2 focus:border-[#bc1c24] focus:outline-none';
      case 'crisp_minimal':
        return 'bg-white border border-neutral-300 text-neutral-900 rounded-sm p-2 focus:ring-1 focus:ring-neutral-400 focus:outline-none';
      case 'cleanroom':
      default:
        return 'bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-blue-400 focus:outline-none';
    }
  };

  const getTableHeadStyle = () => {
    switch (theme) {
      case 'modern':
        return 'bg-zinc-900 text-zinc-400 text-xs font-semibold uppercase tracking-wider';
      case 'terminal':
        return 'bg-green-500/10 text-green-400 border-b border-green-500/30 text-[11px] uppercase tracking-wider font-bold';
      case 'warm':
        return 'bg-amber-100/40 text-amber-900 font-serif text-sm border-b border-amber-900/10';
      case 'japanese':
        return 'bg-[#f4efe2] text-[#4a3a29] text-xs font-semibold uppercase tracking-widest border-b border-[#d6cfbe]';
      case 'crisp_minimal':
        return 'bg-neutral-100 text-neutral-600 text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200';
      case 'cleanroom':
      default:
        return 'bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider';
    }
  };

  return (
    <div className={getThemeWrapperStyle()}>
      
      {/* Main Structural Container */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation & Brand Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            {systemSettings.logoUrl && systemSettings.customLogoEnabled ? (
              <img 
                src={systemSettings.logoUrl} 
                alt="Логотип" 
                className="w-10 h-10 object-contain rounded-xl shadow-md border border-neutral-250 bg-white"
                referrerPolicy="no-referrer"
              />
            ) : theme === 'japanese' ? (
              <div className="w-10 h-10 bg-[#bc1c24] rounded-none flex items-center justify-center text-white font-bold text-xl shadow-md">
                ⛩️
              </div>
            ) : theme === 'crisp_minimal' ? (
              <div className="w-10 h-10 bg-black rounded-none border border-black flex items-center justify-center text-white font-bold text-base">
                ЦП
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                S
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Цифровой паспорт объекта
              </h1>
              <p className="text-xs opacity-60">
                Замена Telegram-бота • Система инспекций & графиков ТО
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Theme Selector inclusion */}
            <ThemeSelector currentTheme={theme} onChangeTheme={(t) => setTheme(t)} />

            {/* Account quick badge */}
            <div className={`p-2 px-3 rounded-lg border text-xs flex items-center gap-2.5 ${
              theme === 'modern' ? 'bg-zinc-900 border-zinc-800' : theme === 'terminal' ? 'border-green-500/20' : theme === 'warm' ? 'bg-[#fdf6e2] border-amber-900/10' : 'bg-white border-slate-200'
            }`}>
              <div className="relative">
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse"></span>
                {currentUser.role === 'admin' ? <Shield className="w-3.5 h-3.5 text-emerald-500" /> : currentUser.role === 'owner' ? <UserCheck className="w-3.5 h-3.5 text-sky-500" /> : <HardHat className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="text-left">
                <div className="font-bold leading-none">{currentUser.fullname}</div>
                <div className="text-[10px] opacity-60 mt-1 uppercase tracking-wider">{currentUser.role === 'admin' ? 'Администратор' : currentUser.role === 'owner' ? 'Собственник здания' : 'Тех. Специалист'}</div>
              </div>
              <button 
                onClick={handleLogout} 
                title="Сменить профиль" 
                className="hover:text-red-500 transition-colors p-1"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ======================= ROLE 1: ADMINISTRATOR SYSTEM DESK ======================= */}
        {currentUser.role === 'admin' && (
          <div className="space-y-6">
            
            {/* Status Bento Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={getCardStyle()}>
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Всего объектов</span>
                  <Building className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <div className="text-3xl font-black mt-2">{objects.length}</div>
                <div className="text-[10px] opacity-60 mt-1">Коммерческие комплексы на Яндекс.Диске</div>
              </div>

              <div className={getCardStyle()}>
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Пунктов регламента</span>
                  <Calendar className="w-4.5 h-4.5 text-teal-500" />
                </div>
                <div className="text-3xl font-black mt-2">{schedules.length}</div>
                <div className="text-[10px] text-red-500 font-semibold mt-1">
                  {schedules.filter(s => getScheduleStatus(s).overdue).length} пунктов просрочено
                </div>
              </div>

              <div className={getCardStyle()}>
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider">Пройдено чек-листов</span>
                  <CheckSquare className="w-4.5 h-4.5 text-emerald-500" />
                </div>
                <div className="text-3xl font-black mt-2">{reports.length}</div>
                <div className="text-[10px] opacity-60 mt-1">С актами контроля в PDF</div>
              </div>

              {/* Yandex.Disk Status controller Box */}
              <div className={`${getCardStyle()} bg-gradient-to-br from-blue-500/5 to-emerald-500/5 border-blue-500/25`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-600 uppercase">Синхронизация Яндекс.Диск</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] leading-snug opacity-75">{systemSettings.yandexDiskConnected ? "Диск подключен (.env)" : "Облачное хранилище активно"}</p>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={triggerDiskSync}
                    disabled={syncing}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Поиск...' : 'Синхронизировать'}
                  </button>
                  <button 
                    onClick={checkCronNow}
                    title="Запустить утренний планировщик напоминаний"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Проверить Сроки
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Feedback Console Log */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-400">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">[Терминал синхронизации на Яндекс.Диск]</span>
              <pre className="mt-1 whitespace-pre-wrap leading-tight">{syncLogs}</pre>
            </div>

            {/* Admin Panel Sections Toggles */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-dashed border-neutral-300/30">
              <button 
                onClick={() => setActiveTab('objects')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'objects' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                🏢 Объекты ({objects.length})
              </button>
              <button 
                onClick={() => setActiveTab('schedule')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'schedule' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                📅 График ТО / Регламент ({schedules.length})
              </button>
              <button 
                onClick={() => setActiveTab('templates')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'templates' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                📝 Конструктор Чек-листов ({templates.length})
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                📂 Накопленные Акты ({reports.length})
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                👥 Пользователи и Доступы ({users.length})
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                ⚙️ Каналы связи
              </button>
            </div>

            {/* TAB: OBJECTS */}
            {activeTab === 'objects' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* File list database */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base">Список подконтрольных объектов недвижимости</h3>
                      <p className="text-xs opacity-60">Папки синхронизируются в автоматическом режиме с Яндекс.Диска</p>
                    </div>

                    <div className="space-y-3">
                      {objects.map(obj => (
                        <div key={obj.id} className="p-4 rounded-xl border border-neutral-300/15 bg-neutral-100/5 hover:bg-neutral-100/10 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-blue-500" />
                              <span className="font-extrabold text-sm">{obj.name}</span>
                            </div>
                            <p className="text-xs opacity-85">{obj.address}</p>
                            <p className="text-[11px] text-zinc-500 italic">{obj.description}</p>
                            <div className="flex items-center gap-4 pt-1 text-[10px]">
                              <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-medium">Собственник: {getOwnerName(obj.ownerId)}</span>
                              <span className="bg-slate-500/10 text-slate-500 px-1.5 py-0.5 rounded font-mono select-all">Диск: {obj.yandexDiskPath}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => startEditObject(obj)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg border border-amber-200"
                              title="Редактировать объект"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteObject(obj.id)}
                              className={getRedBtn()}
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Create or Edit Object form panel */}
                <div className="space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-sm">
                        {editingObjId ? "✏️ Редактирование объекта" : "➕ Регистрация нового объекта"}
                      </h3>
                      <p className="text-xs opacity-60">Добавление площадки и сопоставление путей Яндекс.Диска</p>
                    </div>

                    <form onSubmit={saveObjectSubmit} className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Название здания *</label>
                        <input 
                          type="text" 
                          required
                          value={objName}
                          onChange={(e) => setObjName(e.target.value)}
                          placeholder="ТРК Атриум"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Фактический адрес *</label>
                        <input 
                          type="text" 
                          required
                          value={objAddress}
                          onChange={(e) => setObjAddress(e.target.value)}
                          placeholder="Невский проспект, 25"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Описание и КТП здания</label>
                        <input 
                          type="text" 
                          value={objDesc}
                          onChange={(e) => setObjDesc(e.target.value)}
                          placeholder="Площадь, особенности ввода коммуникаций"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Привязать Собственника</label>
                        <select 
                          value={objOwnerId} 
                          onChange={(e) => setObjOwnerId(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="">Администрация портала (по умолчанию)</option>
                          {users.filter(u => u.role === 'owner').map(o => (
                            <option key={o.id} value={o.id}>{o.fullname}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Папка Цифрового паспорта (Яндекс.Диск) *</label>
                        <input 
                          type="text" 
                          required
                          value={objDiskPath}
                          onChange={(e) => setObjDiskPath(e.target.value)}
                          placeholder="Цифровой паспорт объекта/ТРК Атриум/Обслуживание/service_bot"
                          className={getInputStyle()} 
                        />
                        <span className="text-[10px] opacity-50">При синхронизации в этой папке будут автоматически созданы служебные файлы schedule.json</span>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button type="submit" className={`flex-1 ${getAccentBtn()}`}>
                          {editingObjId ? "Обновить" : "Зарегистрировать"}
                        </button>
                        {editingObjId && (
                          <button type="button" onClick={resetObjectForm} className={getMutedBtn()}>
                            Отмена
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Schedule list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base">Календарный график и регламенты ТО</h3>
                      <p className="text-xs opacity-60">Контролирует соблюдение интервалов обслуживания с оповещением собственников</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={getTableHeadStyle()}>
                            <th className="p-3 rounded-l-lg">Категория</th>
                            <th className="p-3">Объект / Регламентная задача</th>
                            <th className="p-3">Интервал</th>
                            <th className="p-3">Последний запуск</th>
                            <th className="p-3">Предельный статус</th>
                            <th className="p-3 rounded-r-lg text-right">Элементы</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-zinc-200/10">
                          {schedules.map(sch => {
                            const status = getScheduleStatus(sch);
                            return (
                              <tr key={sch.id} className="hover:bg-neutral-100/10 p-2">
                                <td className="p-3">
                                  <span className="bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold">{sch.category}</span>
                                </td>
                                <td className="p-3">
                                  <div className="font-extrabold text-sm">{sch.title}</div>
                                  <div className="text-[11px] opacity-65 flex items-center gap-1.5 mt-0.5">
                                    <Building className="w-3 h-3.5 text-blue-500" />
                                    {getObjectName(sch.objectId)}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 mt-1 italic">
                                    Чек-лист: {getTemplateName(sch.checklistTemplateId)}
                                  </div>
                                </td>
                                <td className="p-3 font-semibold text-neutral-500">{sch.intervalDays} дн.</td>
                                <td className="p-3 font-mono">
                                  {sch.lastDoneDate ? new Date(sch.lastDoneDate).toLocaleDateString('ru-RU') : "—"}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-[10px] border font-semibold ${status.class}`}>
                                    {status.label}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <div className="inline-flex gap-1.5">
                                    <button 
                                      onClick={() => startEditSchedule(sch)}
                                      className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => deleteSchedule(sch.id)}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Create/Edit schedule item */}
                <div className="space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-sm">
                        {editingSchId ? "✏️ Изменить регламент графика" : "📅 Назначить новый пункт ТО"}
                      </h3>
                      <p className="text-xs opacity-60">Связка объекта, ответственного инженера и опросного листа</p>
                    </div>

                    <form onSubmit={saveScheduleSubmit} className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Объект ТО *</label>
                        <select 
                          required
                          value={schObjId} 
                          onChange={(e) => setSchObjId(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="">Выберите объект из списка...</option>
                          {objects.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Категория регламента *</label>
                        <select 
                          required
                          value={schCategory} 
                          onChange={(e) => setSchCategory(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="Отопление">Отопление</option>
                          <option value="Вентиляция">Вентиляция</option>
                          <option value="Пожарная безопасность">Пожарная безопасность</option>
                          <option value="Водоснабжение">Водоснабжение</option>
                          <option value="Электрика">Электрика</option>
                          <option value="Конструктив здания">Конструктив здания</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Название задачи регламента *</label>
                        <input 
                          type="text" 
                          required
                          value={schTitle}
                          onChange={(e) => setSchTitle(e.target.value)}
                          placeholder="Замер параметров ввода ИТП"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Периодичность обслуживания (Интервал, дн.) *</label>
                        <input 
                          type="number" 
                          required
                          min={1}
                          value={schInterval}
                          onChange={(e) => setSchInterval(Number(e.target.value))}
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Привязать опросный Чек-лист *</label>
                        <select 
                          required
                          value={schTemplateId} 
                          onChange={(e) => setSchTemplateId(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="">Выберите макет чек-листа...</option>
                          {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Ответственный специалист</label>
                        <select 
                          value={schResponsible} 
                          onChange={(e) => setSchResponsible(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="">Свободный выбор дежурным инженером</option>
                          {users.filter(u => u.role === 'specialist').map(u => (
                            <option key={u.id} value={u.id}>{u.fullname}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Технические примечания</label>
                        <textarea 
                          value={schNotes}
                          onChange={(e) => setSchNotes(e.target.value)}
                          placeholder="Инструкции и СНиП для инженера..."
                          className={`${getInputStyle()} h-20 resize-none`} 
                        />
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button type="submit" className={`flex-1 ${getAccentBtn()}`}>
                          {editingSchId ? "Обновить график" : "Добавить в регламент"}
                        </button>
                        {editingSchId && (
                          <button type="button" onClick={resetScheduleForm} className={getMutedBtn()}>
                            Отмена
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: TEMPLATES */}
            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Available templates list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base">Библиотека шаблонов опросных чек-листов</h3>
                      <p className="text-xs opacity-60">Спецификации вопросов с поддержкой ввода текста, логических проверок и фотоподтверждений</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {templates.map(tpl => (
                        <div key={tpl.id} className="p-4 rounded-xl border border-neutral-300/15 bg-neutral-100/5 hover:border-slate-300/70 transition-all space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-sm text-neutral-800">{tpl.name}</h4>
                              <p className="text-[11px] opacity-65 mt-1">{tpl.description || "Нет описания."}</p>
                            </div>
                            <span className="bg-sky-500/10 text-sky-500 text-[10px] px-2 py-0.5 rounded font-bold">
                              {tpl.questions.length} вопр.
                            </span>
                          </div>

                          <div className="border-t border-dashed border-neutral-300/10 pt-2.5">
                            <span className="text-[10px] uppercase font-bold text-zinc-400">Содержание опросника:</span>
                            <ul className="text-[11px] space-y-1 mt-1 text-slate-500 pl-3 list-disc">
                              {tpl.questions.map((q, i) => (
                                <li key={q.id}>
                                  {q.text} <span className="text-[9px] opacity-50">({q.type === 'boolean' ? 'Да/Нет' : q.type === 'photo' ? 'Фото' : q.type === 'select' ? 'Выбор' : q.type === 'number' ? 'Число' : 'Текст'})</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button 
                              onClick={() => copyTemplate(tpl)}
                              title="Дублировать шаблон"
                              className="bg-sky-50 hover:bg-sky-100 text-sky-600 p-1.5 rounded-lg border text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" /> Копия
                            </button>
                            <button 
                              onClick={() => startEditTemplate(tpl)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg border"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteTemplate(tpl.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Template / Question editor form */}
                <div className="space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-sm">
                        {editingTemplateId ? "✏️ Редактирование структуры" : "➕ Конструировать чек-лист"}
                      </h3>
                      <p className="text-xs opacity-60">Добавляйте динамические поля разного типа ввода с предпросмотром</p>
                    </div>

                    <form onSubmit={saveTemplateSubmit} className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Название шаблона *</label>
                        <input 
                          type="text" 
                          required
                          value={tplName}
                          onChange={(e) => setTplName(e.target.value)}
                          placeholder="Пример: Осмотр вентиляционных установок"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Общие сервисные указания</label>
                        <input 
                          type="text" 
                          value={tplDesc}
                          onChange={(e) => setTplDesc(e.target.value)}
                          placeholder="Инструкция по заполнению"
                          className={getInputStyle()} 
                        />
                      </div>

                      {/* Question Adder Subsection */}
                      <div className="border border-dashed border-sky-500/20 p-3 rounded-lg bg-sky-500/[0.02] space-y-2">
                        <span className="text-[11px] font-extrabold uppercase text-sky-500 block">Новый вопрос в чек-лист:</span>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] opacity-75">Текст вопроса/требования контроля</label>
                          <input 
                            type="text" 
                            value={newQText}
                            onChange={(e) => setNewQText(e.target.value)}
                            placeholder="Проверить клапан КР1"
                            className="text-xs p-1.5 bg-neutral-100/10 border rounded focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] opacity-75">Тип ответа</label>
                            <select 
                              value={newQType} 
                              onChange={(e) => setNewQType(e.target.value as Question['type'])}
                              className="text-xs p-1 bg-white border dark:bg-zinc-800 text-neutral-800 dark:text-white rounded"
                            >
                              <option value="boolean">Логический (Да / Нет)</option>
                              <option value="number">Число (Манометр/Ток)</option>
                              <option value="text">Текстовое описание</option>
                              <option value="select">Выбор из вариантов</option>
                              <option value="photo">Обязательное ФОТО</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5 pt-4">
                            <input 
                              type="checkbox"
                              id="qReq"
                              checked={newQRequired}
                              onChange={(e) => setNewQRequired(e.target.checked)}
                              className="rounded accent-sky-500"
                            />
                            <label htmlFor="qReq" className="text-[10px] cursor-pointer font-semibold uppercase">Обязательный</label>
                          </div>
                        </div>

                        {newQType === 'select' && (
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[9px] text-zinc-400">Варианты выбора (через запятую)</label>
                            <input 
                              type="text"
                              value={newQOptions}
                              onChange={(e) => setNewQOptions(e.target.value)}
                              placeholder="Пример: Отлично, Хорошо, Авария"
                              className="text-xs p-1 bg-neutral-100/10 border rounded focus:outline-none"
                            />
                          </div>
                        )}

                        <button 
                          type="button" 
                          onClick={addQuestionToTemplate}
                          className="w-full py-1.5 bg-sky-500/10 text-sky-500 rounded hover:bg-sky-500/20 text-xs font-bold transition-all"
                        >
                          + Добавить опрос в список ({tplQuestions.length})
                        </button>
                      </div>

                      {/* Ordered questions list representation */}
                      <div className="space-y-11.5">
                        <span className="text-[10px] font-bold uppercase block text-neutral-400">Вопросы в текущем шаблоне:</span>
                        {tplQuestions.length === 0 ? (
                          <span className="text-[11px] opacity-50 block italic text-center py-2">Вопросы пока не добавлены</span>
                        ) : (
                          <div className="space-y-1">
                            {tplQuestions.map((q, idx) => (
                              <div key={q.id} className="flex items-center justify-between p-1.5 bg-neutral-100/5 hover:bg-neutral-100/10 rounded border text-xs text-neutral-500">
                                <span className="font-medium">{idx + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}</span>
                                <button 
                                  type="button" 
                                  onClick={() => removeQuestionFromTemplate(q.id)}
                                  className="text-red-500 hover:bg-red-500/10 p-1 rounded font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button type="submit" className={`flex-1 ${getAccentBtn()}`}>
                          {editingTemplateId ? "Обновить шаблон" : "Создать шаблон"}
                        </button>
                        {editingTemplateId && (
                          <button type="button" onClick={resetTemplateForm} className={getMutedBtn()}>
                            Отмена
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base">Выездные Акты и Заполненные Чек-листы</h3>
                    <p className="text-xs opacity-60">Юридически и технически подтвержденная история осмотров инженерного оборудования объектов</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map(rep => {
                      const obj = objects.find(o => o.id === rep.objectId);
                      const tpl = templates.find(t => t.id === rep.checklistTemplateId);
                      const sch = schedules.find(s => s.id === rep.scheduleItemId);
                      
                      return (
                        <div key={rep.id} className="p-5 rounded-2xl border border-neutral-300/15 bg-neutral-100/5 hover:shadow-md transition-all space-y-4">
                          <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                            <div>
                              <span className="text-[10px] text-sky-500 font-bold tracking-wider uppercase block">АКТ {rep.id}</span>
                              <span className="text-[11px] opacity-60">{new Date(rep.dateDone).toLocaleString('ru-RU')}</span>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold px-2 py-1 rounded-full uppercase">Выполнено</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Объект контроля:</span>
                            <div className="font-extrabold text-sm">{obj ? obj.name : "Неизвестный объект"}</div>
                            <p className="text-xs text-slate-500">{obj ? obj.address : ""}</p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Регламентная задача:</span>
                            <div className="font-bold text-xs">{sch ? sch.title : "Регламентное обслуживание"}</div>
                            <p className="text-[11px] opacity-65 italic">Тип чек-листа: {tpl ? tpl.name : ""}</p>
                          </div>

                          <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl space-y-2 border">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block border-b pb-1">Ответы в чек-листе:</span>
                            <div className="space-y-1.5">
                              {rep.answers.map(ans => {
                                const qText = tpl?.questions.find(q => q.id === ans.questionId)?.text || ans.questionId;
                                const isPhoto = ans.value.startsWith('http') || ans.value.startsWith('data:image');
                                return (
                                  <div key={ans.questionId} className="text-[11px] leading-tight flex flex-col">
                                    <span className="text-slate-500 font-medium">{qText}:</span>
                                    {isPhoto ? (
                                      <a href={ans.value} target="_blank" rel="noopener noreferrer" className="text-sky-500 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                        <ImageIcon className="w-3.5 h-3.5" /> [Смотреть прикрепленное фото]
                                      </a>
                                    ) : (
                                      <span className="font-extrabold text-slate-800 mt-0.5">
                                        {ans.value === 'true' ? '✅ Да' : ans.value === 'false' ? '❌ Нет' : ans.value}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-dashed border-neutral-300/15 pt-3 flex items-center justify-between text-[11px]">
                            <div>
                              <div className="font-bold text-slate-700">{rep.specialistInfo.fullname}</div>
                              <div className="opacity-65 text-[10px]">{rep.specialistInfo.company}</div>
                            </div>

                            <a 
                              href={`/api/reports/${rep.id}/pdf`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg flex items-center gap-1 shadow-sm uppercase text-[9px] tracking-wide"
                            >
                              <Download className="w-3.5 h-3.5" /> Скачать акт
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Users list database */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base">Управление правами доступа и каналами связи</h3>
                      <p className="text-xs opacity-60">Настройка идентификаторов мессенджеров для мгновенной рассылки уведомлений ТО</p>
                    </div>

                    <div className="space-y-3">
                      {users.map(u => (
                        <div key={u.id} className="p-4 rounded-xl border border-neutral-300/15 bg-neutral-100/5 hover:bg-neutral-100/10 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {u.role === 'admin' ? <Shield className="w-4 h-4 text-emerald-500" /> : u.role === 'owner' ? <UserCheck className="w-4 h-4 text-sky-500" /> : <HardHat className="w-4 h-4 text-amber-500" />}
                              <span className="font-extrabold text-sm">{u.fullname}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500' : u.role === 'owner' ? 'bg-sky-500/10 text-sky-500' : 'bg-amber-500/10 text-amber-500'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                            <p className="text-xs opacity-85">Email: <span className="font-semibold">{u.email}</span> • Тел: {u.phone || "—"}</p>
                            
                            {/* Communication channels state tags */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-1.5 text-[10px]">
                              <span className={`px-2 py-0.5 rounded font-mono ${u.telegramChatId ? "bg-emerald-500/10 text-emerald-500 font-bold" : "bg-zinc-200/10 text-zinc-500"}`}>
                                TG Chat ID: {u.telegramChatId || "Не привязан"}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-mono ${u.maxChatId ? "bg-emerald-500/10 text-emerald-500 font-bold" : "bg-zinc-200/10 text-zinc-500"}`}>
                                MAX Bot: {u.maxChatId || "Не привязан"}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-mono ${u.vkUserId ? "bg-emerald-500/10 text-emerald-500 font-bold" : "bg-zinc-200/10 text-zinc-500"}`}>
                                VK ID: {u.vkUserId || "Не привязан"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => startEditUser(u)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg border"
                              title="Редактировать пользователя"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteUser(u.id)}
                              className={getRedBtn()}
                              title="Удалить аккаунт"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Create/Edit user form */}
                <div className="space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-sm">
                        {editingUserId ? "✏️ Редактирование профиля" : "👥 Добавить пользователя"}
                      </h3>
                      <p className="text-xs opacity-60">Настройка ролей доступа и ID коммуникационных ботов</p>
                    </div>

                    <form onSubmit={saveUserSubmit} className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">ФИО Пользователя *</label>
                        <input 
                          type="text" 
                          required
                          value={usrFullname}
                          onChange={(e) => setUsrFullname(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Почта (Email) *</label>
                        <input 
                          type="email" 
                          required
                          value={usrEmail}
                          onChange={(e) => setUsrEmail(e.target.value)}
                          placeholder="ivanov@service.ru"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase opacity-75">Роль в системе</label>
                          <select 
                            value={usrRole} 
                            onChange={(e) => setUsrRole(e.target.value as UserRole)}
                            className={getInputStyle()}
                          >
                            <option value="admin">Администратор</option>
                            <option value="owner">Собственник объектов</option>
                            <option value="specialist">Инженер службы ТО</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase opacity-75">Телефон</label>
                          <input 
                            type="text" 
                            value={usrPhone}
                            onChange={(e) => setUsrPhone(e.target.value)}
                            placeholder="+7-999..."
                            className={getInputStyle()} 
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Компания (Для специалистов)</label>
                        <input 
                          type="text" 
                          value={usrCompany}
                          onChange={(e) => setUsrCompany(e.target.value)}
                          placeholder="ООО Служба эксплуатации"
                          className={getInputStyle()} 
                        />
                      </div>

                      <div className="border-t border-dashed border-neutral-300/10 pt-2 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500">Оповещения в мессенджеры:</span>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] opacity-75">Telegram Chat ID (от @userinfobot)</label>
                          <input 
                            type="text" 
                            value={usrTelegram}
                            onChange={(e) => setUsrTelegram(e.target.value)}
                            placeholder="555444111"
                            className={getInputStyle()} 
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] opacity-75">MAX Chat ID (от @MasterBot)</label>
                          <input 
                            type="text" 
                            value={usrMax}
                            onChange={(e) => setUsrMax(e.target.value)}
                            placeholder="max_123456"
                            className={getInputStyle()} 
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] opacity-75">VK User ID (страница ВК)</label>
                          <input 
                            type="text" 
                            value={usrVk}
                            onChange={(e) => setUsrVk(e.target.value)}
                            placeholder="vk_555"
                            className={getInputStyle()} 
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button type="submit" className={`flex-1 ${getAccentBtn()}`}>
                          {editingUserId ? "Обновить" : "Добавить"}
                        </button>
                        {editingUserId && (
                          <button type="button" onClick={resetUserForm} className={getMutedBtn()}>
                            Отмена
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: SETTINGS & GLOBAL TELEMETRY LOGS */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Global Notification config settings */}
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base">🔧 Симуляция серверов API и подключений ботов</h3>
                    <p className="text-xs opacity-60">Настройки интеграции мессенджеров для уведомлений о прохождении Чек-листов</p>
                  </div>

                  <form onSubmit={saveSettingsSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.02]">
                      <span className="font-bold text-blue-500 uppercase">1. Провайдеры связи и шины отчетов:</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600">Telegram Bot API (python-telegram-bot):</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Имитируемый BOT_TOKEN)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600">VK_API Сервер сообщений:</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Связан с Группой)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600">MAX-BOTAPI Клиент (MasterBot):</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Асинхронные задачи)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600">SMTP Почтовый сервер (.env):</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (С шифрованием SSL)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Admin Matrix */}
                      <div className="space-y-2 border p-3 rounded-lg">
                        <span className="font-bold text-slate-800 uppercase text-[11px] block">Уведомления Администратору:</span>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.admin.telegram} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  admin: { ...systemSettings.notificationChannels.admin, telegram: e.target.checked }
                                }
                              })}
                            /> Telegram
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.admin.max} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  admin: { ...systemSettings.notificationChannels.admin, max: e.target.checked }
                                }
                              })}
                            /> MAX
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.admin.vk} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  admin: { ...systemSettings.notificationChannels.admin, vk: e.target.checked }
                                }
                              })}
                            /> ВКонтакте
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.admin.email} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  admin: { ...systemSettings.notificationChannels.admin, email: e.target.checked }
                                }
                              })}
                            /> Email по регламенту
                          </label>
                        </div>
                      </div>

                      {/* Owner Matrix */}
                      <div className="space-y-2 border p-3 rounded-lg">
                        <span className="font-bold text-slate-800 uppercase text-[11px] block">Уведомления Собственнику:</span>
                        <div className="space-y-1">
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.owner.telegram} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  owner: { ...systemSettings.notificationChannels.owner, telegram: e.target.checked }
                                }
                              })}
                            /> Telegram
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.owner.max} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  owner: { ...systemSettings.notificationChannels.owner, max: e.target.checked }
                                }
                              })}
                            /> MAX
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.owner.vk} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  owner: { ...systemSettings.notificationChannels.owner, vk: e.target.checked }
                                }
                              })}
                            /> ВКонтакте
                          </label>
                          <label className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={systemSettings.notificationChannels.owner.email} 
                              onChange={(e) => setSystemSettings({
                                ...systemSettings,
                                notificationChannels: {
                                  ...systemSettings.notificationChannels,
                                  owner: { ...systemSettings.notificationChannels.owner, email: e.target.checked }
                                }
                              })}
                            /> Email по регламенту
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase">Оповещать о предстоящем ТО (дней до срока) *</label>
                      <input 
                        type="number" 
                        required
                        value={systemSettings.reminderDaysBefore}
                        onChange={(e) => setSystemSettings({ ...systemSettings, reminderDaysBefore: Number(e.target.value) })}
                        className={getInputStyle()}
                      />
                      <span className="text-[10px] opacity-60 mt-0.5">Планировщик Reminders daily проверяет графики в автоматическом цикле</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-bold uppercase">Яндекс Диск API Авторизация (Токен доступа)</label>
                      <input 
                        type="password" 
                        value={systemSettings.yandexDiskToken}
                        onChange={(e) => setSystemSettings({ ...systemSettings, yandexDiskToken: e.target.value, yandexDiskConnected: !!e.target.value })}
                        placeholder="YA_TOKEN_OAUTH_EXAMPLE..."
                        className={getInputStyle()}
                      />
                      <span className="text-[10px] opacity-60 mt-0.5">Служебный токен с правами на сохранение отчетов</span>
                    </div>

                    <div className="space-y-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.02] mt-4">
                      <span className="font-bold text-rose-500 uppercase tracking-wider block text-[10px]">🎨 Фирменный логотип объекта (брендирование):</span>
                      
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-semibold text-neutral-800 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!systemSettings.customLogoEnabled} 
                            onChange={(e) => setSystemSettings({ ...systemSettings, customLogoEnabled: e.target.checked })}
                          />
                          Активировать индивидуальный логотип
                        </label>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold text-neutral-600 block">Ссылка на логотип (URL картинки или Base64):</span>
                        <input 
                          type="text" 
                          placeholder="https://example.com/logo.png"
                          value={systemSettings.logoUrl || ""}
                          onChange={(e) => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })}
                          className={getInputStyle()}
                        />
                        <span className="text-[10px] opacity-65">Внесите URL-адрес любого изображения, чтобы оно заменило стандартную эмблему в верхнем углу для всех пользователей.</span>
                        
                        {systemSettings.logoUrl && (
                          <div className="mt-2 text-center p-3 border border-dashed rounded bg-white flex flex-col items-center justify-center gap-1.5">
                            <span className="text-[9px] uppercase tracking-wider opacity-60">Предпросмотр:</span>
                            <img 
                              src={systemSettings.logoUrl} 
                              alt="Предпросмотр логотипа" 
                              className="max-h-12 max-w-full object-contain mx-auto"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <button type="submit" className={`w-full ${getAccentBtn()}`}>
                      Сохранить настройки
                    </button>
                  </form>
                </div>

                {/* Simulated Notification Real Time Hub logs */}
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base">📡 Лог уведомлений и отправки отчетов</h3>
                    <p className="text-xs opacity-60">Телеметрия отправок по каналам связи (Telegram, email, MAX, VK) в реальном времени</p>
                  </div>

                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {logs.map(log => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono leading-tight space-y-1">
                        <div className="flex justify-between text-neutral-400">
                          <span className="text-cyan-400 flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            {log.channel.toUpperCase()} ➔ {log.recipient}
                          </span>
                          <span>{new Date(log.timestamp).toLocaleTimeString('ru-RU')}</span>
                        </div>
                        <p className="text-green-400 leading-snug">{log.message}</p>
                        <div className="flex justify-between pt-1 border-t border-slate-800 text-[8px] text-neutral-500">
                          <span>УЗЕЛ: {log.type}</span>
                          <span className="text-emerald-400">STATUS: {log.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ======================= ROLE 2: OWNER FACILITY MONITOR ======================= */}
        {currentUser.role === 'owner' && (
          <div className="space-y-6">
            
            <div className={getCardStyle()}>
              <div className={getSubHeaderStyle()}>
                <h3 className="font-bold text-base">🏢 Мои объекты (Личный кабинет Собственника)</h3>
                <p className="text-xs opacity-60">Просмотр технических паспортов в режиме чтения, проверка календарных графиков ТО и загрузка архива Актов</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {objects.filter(o => o.ownerId === currentUser.id).map(obj => {
                  const matchingSchedules = schedules.filter(s => s.objectId === obj.id);
                  const matchingReports = reports.filter(r => r.objectId === obj.id);
                  
                  return (
                    <div key={obj.id} className="p-5 rounded-2xl border border-neutral-300/10 space-y-4 bg-neutral-100/5">
                      <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div className="flex gap-2.5 items-center">
                          <Building className="w-5 h-5 text-blue-500" />
                          <div>
                            <h4 className="font-black text-base">{obj.name}</h4>
                            <p className="text-xs opacity-65">{obj.address}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://disk.yandex.ru/client/disk/${encodeURIComponent(obj.yandexDiskPath)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="Открыть папку объекта на Яндекс.Диск"
                          className="flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-bold text-xs p-1.5 px-3 rounded-lg transition-all"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Яндекс.Диск объекта ↗
                        </a>
                      </div>

                      {/* Schedule item readings */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-zinc-400">График обслуживания оборудования:</span>
                        {matchingSchedules.length === 0 ? (
                          <p className="text-xs italic text-[11px] opacity-50">График не назначен службой эксплуатации</p>
                        ) : (
                          <div className="space-y-1.5">
                            {matchingSchedules.map(sch => {
                              const status = getScheduleStatus(sch);
                              return (
                                <div key={sch.id} className="p-3 border rounded-lg flex flex-col gap-2 text-xs text-neutral-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 shadow-sm border-neutral-300/20">
                                  <div className="min-w-0 space-y-1">
                                    <div className="font-bold text-slate-800 dark:text-slate-100 break-words">{sch.title}</div>
                                    <div className="text-[10px] opacity-65 flex flex-wrap gap-x-2 gap-y-1 items-center mt-0.5">
                                      <span>Интервал: {sch.intervalDays} дн.</span>
                                      <span className="opacity-40">•</span>
                                      <span>Чек-лист: {getTemplateName(sch.checklistTemplateId)}</span>
                                    </div>
                                    <div className="pt-1 flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${status.class}`}>
                                        {status.label}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-zinc-800/40">
                                    <button 
                                      onClick={() => setQrModalSchedule(sch)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-300/20 rounded-md font-bold text-[9px] cursor-pointer transition-all uppercase tracking-wider"
                                    >
                                      <span>📲 Сформировать QR-код</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Completed Acts for this owner facility */}
                      <div className="space-y-2 border-t border-dashed border-neutral-300/15 pt-3">
                        <span className="text-[10px] font-black uppercase text-zinc-400">Всего подтверждено выездов ({matchingReports.length}):</span>
                        {matchingReports.length === 0 ? (
                          <p className="text-xs italic text-[11px] opacity-50">Акты пока отсутствуют</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {matchingReports.map(rep => (
                              <div key={rep.id} className="p-2 bg-neutral-50 dark:bg-zinc-800 rounded-lg flex justify-between items-center text-[11px]">
                                <div>
                                  <div className="font-bold text-slate-800">Акт {rep.id} от {new Date(rep.dateDone).toLocaleDateString('ru-RU')}</div>
                                  <div className="opacity-50 mt-0.5">Внутренний чек-лист инспекции выполнен</div>
                                </div>
                                <a 
                                  href={`/api/reports/${rep.id}/pdf`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 shrink-0"
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Registered Service Specialists Contact Info for Owners */}
            <div className={getCardStyle()}>
              <div className={getSubHeaderStyle()}>
                <span className="text-[10px] uppercase font-bold text-[#bc1c24] block tracking-widest mb-1">Служба эксплуатации</span>
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-zinc-800">
                  <HardHat className="w-5 h-5 text-amber-500" />
                  Контакты сервисных специалистов инженеров
                </h3>
                <p className="text-xs opacity-60">
                  Список авторизованных профилей специалистов, закрепленных за обслуживанием ваших объектов
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {users.filter(u => u.role === 'specialist').length === 0 ? (
                  <p className="text-xs italic opacity-60 col-span-full">В данный момент зарегистрированные специалисты отсутствуют в системе.</p>
                ) : (
                  users.filter(u => u.role === 'specialist').map(spec => (
                    <div key={spec.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/35 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">Инженер</span>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{spec.fullname}</h4>
                        <p className="text-xs opacity-70 italic">{spec.company || "Служба эксплуатации и ТО"}</p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-zinc-800 text-xs text-neutral-600">
                        {spec.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="opacity-50 text-[10px]">Телефон:</span>
                            <a href={`tel:${spec.phone}`} className="font-semibold text-sky-600 hover:underline">{spec.phone}</a>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="opacity-50 text-[10px]">Эл. почта:</span>
                          <a href={`mailto:${spec.email}`} className="font-medium hover:underline text-sky-700">{spec.email}</a>
                        </div>
                        {spec.telegramChatId && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-sky-50 dark:bg-sky-900/10 text-sky-600 dark:text-sky-400 text-[10px] px-1.5 py-0.5 rounded font-mono">TG Chat Link ID: {spec.telegramChatId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notification channel setup for owners */}
            <div className={getCardStyle()}>
              <div className={getSubHeaderStyle()}>
                <h3 className="font-bold text-base">📲 Мои каналы получения уведомлений</h3>
                <p className="text-xs opacity-60">Куда техническому инженеру высылать уведомление сразу в момент окончания обхода</p>
              </div>

              <div className="space-y-4 max-w-md text-xs">
                <div className="space-y-2">
                  <span className="font-extrabold text-neutral-700">Настройки аккаунта:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-xl">
                    <div>
                      <span className="opacity-60 block text-[10px]">Ваш Telegram Chat ID</span>
                      <span className="font-bold text-sm block">{currentUser.telegramChatId || "Не указан"}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block text-[10px]">Ваш контактный Email</span>
                      <span className="font-bold text-sm block">{currentUser.email}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block text-[10px]">MAX ID (для корпоративных ботов)</span>
                      <span className="font-bold text-sm block">{currentUser.maxChatId || "Не указан"}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block text-[10px]">VK Идентификатор аккаунта</span>
                      <span className="font-bold text-sm block">{currentUser.vkUserId || "Не указан"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-dashed border-neutral-300/15 pt-3 mt-3">
                  <span className="font-extrabold text-neutral-700">Защита профиля и Беспарольный вход:</span>
                  <div className="p-3 border rounded-xl bg-rose-500/[0.02] border-rose-500/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <span className="opacity-60 block text-[10px]">Биометрический вход (Face ID / TouchID)</span>
                      <span className={`font-bold text-xs flex items-center gap-1 mt-0.5 ${
                        currentUser.hasBiometrics ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        <Fingerprint className="w-4 h-4" />
                        {currentUser.hasBiometrics 
                          ? `Связано (${currentUser.biometricDeviceName || "Активное устройство"})`
                          : "Не привязано"
                        }
                      </span>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              email: currentUser.email,
                              credentialId: "usr_bio_" + Math.random().toString(36).substr(2, 9),
                              publicKey: "alg_es256",
                              deviceName: window.navigator.userAgent.includes("Mobile") ? "iPhone / Смартфон TouchID" : "Персональный компьютер (Windows Hello/Macbook TouchID)"
                            })
                          });
                          const data = await verifyRes.json();
                          if (verifyRes.ok && data.success) {
                            setCurrentUser(data.user);
                            alert("Отпечаток пальца и FaceID успешно привязаны к вашей текущей сессии!");
                          }
                        } catch(e) {
                          alert("Ошибка подключения датчиков");
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer"
                    >
                      {currentUser.hasBiometrics ? "Связать заново" : "Привязать TouchID / FaceID"}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-[11px] leading-snug">
                  Для изменения параметров уведомлений обратитесь к Вашему управляющему администратору портала или измените контактные свойства профиля.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================= ROLE 3: SPECIALIST CHECKS RUNNER ======================= */}
        {currentUser.role === 'specialist' && (
          <div className="space-y-6">
            
            <div className={getCardStyle()}>
              <div className={getSubHeaderStyle()}>
                <h3 className="font-bold text-base">🛠️ Рабочее место выездного специалиста ТО</h3>
                <p className="text-xs opacity-60">Прохождение проверочных чек-листов непосредственно на объекте во время инспекции с подтверждением факта регламента (PDF)</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Steps left selection */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border bg-slate-100/50 space-y-3">
                    <span className="text-xs font-bold uppercase text-slate-500 block">Шаг 1: Выберите обслуживаемый объект</span>
                    <select 
                      value={selectedObjId}
                      onChange={(e) => handleObjectSelectForChecklist(e.target.value)}
                      className={`${getInputStyle()} w-full max-w-full block text-xs overflow-hidden text-ellipsis`}
                      style={{ textOverflow: 'ellipsis' }}
                    >
                      <option value="">-- Выбрать здание --</option>
                      {objects.map(o => (
                        <option key={o.id} value={o.id} title={o.name}>
                          {o.name.length > 32 ? `${o.name.substring(0, 30)}...` : o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedObjId && (
                    <div className="p-4 rounded-xl border bg-slate-100/50 space-y-3 animate-fade-in">
                      <span className="text-xs font-bold uppercase text-slate-500 block">Шаг 2: Выберите необходимый регламент</span>
                      <select 
                        value={selectedSchId}
                        onChange={(e) => handleScheduleSelectForChecklist(e.target.value)}
                        className={`${getInputStyle()} w-full max-w-full block text-xs overflow-hidden text-ellipsis`}
                        style={{ textOverflow: 'ellipsis' }}
                      >
                        <option value="">-- Выбрать регламент --</option>
                        {schedules.filter(s => s.objectId === selectedObjId).map(s => {
                          const status = getScheduleStatus(s);
                          const dispLabel = `${s.category}: ${s.title}`;
                          const truncated = dispLabel.length > 32 ? `${dispLabel.substring(0, 30)}...` : dispLabel;
                          return (
                            <option key={s.id} value={s.id} title={`${s.category} • ${s.title} (${status.label})`}>
                              {truncated} ({status.label})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Technician Profile credentials checker for auto validation */}
                  {activeTemplate && (
                    <div className="p-4 rounded-xl border bg-slate-100/20 space-y-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold uppercase text-slate-500 block">Шаг 3: Технические реквизиты специалиста</span>
                        <button 
                          onClick={triggerLoadProfileDefaults}
                          className="text-[9px] bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 text-slate-800 dark:text-white px-2 py-0.5 rounded font-bold uppercase"
                        >
                          Загрузить из профиля
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex flex-col">
                          <label className="text-[10px] opacity-60">ФИО Исполнителя *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Иванов И. И."
                            value={specName}
                            onChange={(e) => setSpecName(e.target.value)}
                            className="bg-white border rounded p-1"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] opacity-60">Сервисная компания / ООО *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="ООО СпецМонтаж"
                            value={specCompany}
                            onChange={(e) => setSpecCompany(e.target.value)}
                            className="bg-white border rounded p-1"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] opacity-60">Контактный телефон *</label>
                          <input 
                            type="text" 
                            required
                            placeholder="+7-921-123-45-67"
                            value={specPhone}
                            onChange={(e) => setSpecPhone(e.target.value)}
                            className="bg-white border rounded p-1"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-[10px] opacity-60">Контактный Email</label>
                          <input 
                            type="email" 
                            placeholder="spec@tech.ru"
                            value={specEmail}
                            onChange={(e) => setSpecEmail(e.target.value)}
                            className="bg-white border rounded p-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checklist execution interactive dynamic form */}
                <div className="lg:col-span-2 space-y-4">
                  {!activeTemplate ? (
                    <div className="p-8 border border-dashed text-center rounded-xl text-neutral-400">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-extrabold text-slate-700">Анкета не загружена</h4>
                      <p className="text-xs opacity-70 mt-1">Пожалуйста, укажите объект и выберите необходимый регламент ТО из графика слева, чтобы динамически сформировать опросный лист.</p>
                    </div>
                  ) : (
                    <div className="p-6 border border-neutral-300/10 rounded-xl bg-white space-y-6">
                      
                      {/* Header with notes */}
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-black text-blue-900 text-sm">Чек-лист: {activeTemplate.name}</h4>
                        <p className="text-xs text-blue-700 mt-1">{activeTemplate.description || "Заполните все опросные пункты и приложите запрашиваемые макрофотоснимки оборудования."}</p>
                      </div>

                      {/* Interactive form Questions */}
                      <div className="space-y-5">
                        {activeTemplate.questions.map((q, idx) => {
                          return (
                            <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/50 space-y-3">
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-sm text-slate-800 leading-tight">
                                  {idx + 1}. {q.text} {q.required && <span className="text-rose-500 font-bold">*</span>}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded shadow-sm">
                                  {q.type}
                                </span>
                              </div>

                              {/* CONDITIONAL RENDER BY QUESTION TYPE */}
                              {q.type === 'boolean' && (
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-700">
                                    <input 
                                      type="radio" 
                                      name={`bool_${q.id}`} 
                                      checked={filledAnswers[q.id] === 'true'} 
                                      onChange={() => setFilledAnswers(prev => ({ ...prev, [q.id]: 'true' }))}
                                      className="rounded accent-emerald-500"
                                    />
                                    Да / Измерение в норме
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-700">
                                    <input 
                                      type="radio" 
                                      name={`bool_${q.id}`} 
                                      checked={filledAnswers[q.id] === 'false'} 
                                      onChange={() => setFilledAnswers(prev => ({ ...prev, [q.id]: 'false' }))}
                                      className="rounded accent-rose-500"
                                    />
                                    Нет / Есть отклонение
                                  </label>
                                </div>
                              )}

                              {q.type === 'number' && (
                                <input 
                                  type="number"
                                  step="any"
                                  value={filledAnswers[q.id] || ""}
                                  placeholder="Пример: 3.5"
                                  onChange={(e) => setFilledAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                                />
                              )}

                              {q.type === 'text' && (
                                <textarea
                                  value={filledAnswers[q.id] || ""}
                                  placeholder="Введите пояснения по внешнему осмотру..."
                                  onChange={(e) => setFilledAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs h-16 resize-none"
                                />
                              )}

                              {q.type === 'select' && (
                                <select
                                  value={filledAnswers[q.id] || ""}
                                  onChange={(e) => setFilledAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs"
                                >
                                  {q.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              )}

                              {q.type === 'photo' && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="relative overflow-hidden w-full max-w-xs flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white hover:border-blue-400 transition-all cursor-pointer">
                                      <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
                                      <span className="text-[11px] font-bold text-slate-600 block">Нажмите для выбора снимка</span>
                                      <span className="text-[9px] text-slate-400">Загрузка идет напрямую на Яндекс.Диск</span>
                                      <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handlePhotoUpload(q.id, e)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                      />
                                    </div>

                                    {uploadingPhotoId === q.id && (
                                      <div className="text-xs text-neutral-600 font-semibold animate-pulse flex items-center gap-1.5">
                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Загрузка в облако...
                                      </div>
                                    )}
                                  </div>

                                  {/* Uploaded thumbnail visual guarantee */}
                                  {uploadedPhotos[q.id] && (
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                                      <img 
                                        src={uploadedPhotos[q.id]} 
                                        alt="Uploaded Preview" 
                                        className="w-full h-full object-cover"
                                      />
                                      <span className="bg-emerald-500 text-white px-1 py-0.5 rounded text-[8px] uppercase tracking-wider absolute bottom-1 right-1 font-bold">Снимок готов</span>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>

                      {/* Submit block */}
                      <div className="border-t border-dashed border-slate-200 pt-5 space-y-4">
                        <button 
                          onClick={submitCompletedChecklist}
                          className={`w-full py-4 font-black rounded-xl uppercase tracking-wider cursor-pointer shadow-lg text-sm flex items-center justify-center gap-2 ${getAccentBtn()}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Подтвердить выполнение ТО и отправить Акт
                        </button>
                      </div>

                      {/* Form submitted receipt */}
                      {checklistCompletedReport && (
                        <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl space-y-3 animate-fade-in">
                          <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-emerald-600 font-extrabold" />
                            <h4 className="font-extrabold text-emerald-800 text-sm">ТО Успешно проведено и сохранено!</h4>
                          </div>
                          
                          <p className="text-xs text-emerald-700 leading-snug">
                            Уникальный номер Акта: <strong>{checklistCompletedReport.id}</strong>. Дата на сервере обновлена. Запрос на отправку моментальных оповещений отправлен собственнику и администраторам по следующим адресатам: (Telegram, MAX, VK, email). 
                          </p>

                          <div className="pt-2">
                            <a 
                              href={`/api/reports/${checklistCompletedReport.id}/pdf`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 px-4 rounded-xl text-xs uppercase cursor-pointer"
                            >
                              <FileText className="w-4.5 h-4.5" /> Сформировать и Распечатать Акт в PDF
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* Humble Clean footer */}
      <footer className="py-12 border-t border-neutral-300/10 mt-12 text-center text-[10px] opacity-50 space-y-1">
        <p>© 2026 Управление Техническим Обслуживанием Объектов • «Цифровой паспорт здания»</p>
        <p>Яндекс.Диск Робот-Синхронизатор • FastAPI Backend • PostgreSQL Engine v15</p>
      </footer>

      {/* MODAL: QR-CODE ISSUING FOR INSTRUCTIONS & FORMS */}
      {qrModalSchedule && (() => {
        const schObj = objects.find(o => o.id === qrModalSchedule.objectId);
        const qrLink = `${window.location.origin}${window.location.pathname}?flow=specialist&objId=${qrModalSchedule.objectId}&schId=${qrModalSchedule.id}`;
        const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=230x230&data=${encodeURIComponent(qrLink)}`;
        
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${getCardStyle()} max-w-md w-full relative animate-fadeIn space-y-5 bg-white text-neutral-800`}>
              
              {/* Header of Modal */}
              <div className="flex justify-between items-start border-b pb-3 border-neutral-100">
                <div>
                  <span className="text-[10px] font-bold text-[#bc1c24] uppercase block tracking-wider">Выдача QR-кода на обслуживание</span>
                  <h4 className="font-semibold text-base text-slate-900 leading-snug">
                    {qrModalSchedule.title}
                  </h4>
                </div>
                <button 
                  onClick={() => setQrModalSchedule(null)} 
                  className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body of Modal */}
              <div className="space-y-4 text-center">
                <p className="text-xs text-neutral-500 text-left leading-relaxed">
                  Предоставьте данный QR-код сервисному инженеру (показав на экране или распечатав его). Инженер отсканирует его смартфоном для мгновенного прохождения чек-листа <strong className="text-slate-900">"{getTemplateName(qrModalSchedule.checklistTemplateId)}"</strong> на объекте <strong className="text-slate-900">"{schObj?.name}"</strong>.
                </p>

                {/* QR Image Frame */}
                <div className="p-4 bg-white border rounded-xl inline-block shadow-inner mx-auto">
                  <img 
                    src={qrImageSrc} 
                    alt="Сканировать QR-код" 
                    className="w-48 h-48 object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Specialist link copy-paste */}
                <div className="bg-neutral-50 border p-3 rounded-xl text-left space-y-1">
                  <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold block">Прямая ссылка (для симуляции без телефона)</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={qrLink} 
                      className="bg-transparent border-none text-[10px] text-neutral-600 w-full focus:outline-none focus:ring-0 overflow-ellipsis font-mono"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(qrLink);
                        alert("Ссылка успешно скопирована!");
                      }}
                      className="p-1 px-2.5 bg-blue-500 hover:bg-blue-600 font-bold text-[10px] text-white rounded cursor-pointer shrink-0 transition-colors"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer of Modal */}
              <div className="flex justify-end gap-2.5 pt-1">
                <button 
                  onClick={() => setQrModalSchedule(null)} 
                  className={`${getMutedBtn()}`}
                >
                  Закрыть окно
                </button>
                <a 
                  href={qrLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded shadow-sm hover:shadow transition-all flex items-center gap-1.5"
                >
                  Симулировать переход инженера ➔
                </a>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
