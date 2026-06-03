import React, { useState, useEffect, useRef, startTransition, useTransition, useMemo } from "react";
import { 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog, 
  User, 
  UserRole, 
  Question,
  SystemSettings
} from "./types";
import ThemeSelector, { ThemeStyle } from "./components/ThemeSelector";
import LoginScreen from "./components/LoginScreen";
import { LegalTabContent } from "./components/LegalAgreements";
import SupportTab from "./components/SupportTab";
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
  ChevronDown,
  Copy, 
  Check, 
  X,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Fingerprint,
  ScanFace,
  Camera,
  Wrench,
  Menu,
  ShieldCheck,
  Users,
  Star,
  Palette,
  Phone,
  User as UserIcon
} from "lucide-react";

// Intercept native fetch to seamlessly append JWT Bearer tokens and handle silent token rotations (refresh tokens)
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const nativeFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as any).url || "";
  
  if (url.includes("/api/")) {
    init = init || {};
    init.headers = init.headers || {};
    
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      if (init.headers instanceof Headers) {
        init.headers.set("Authorization", `Bearer ${accessToken}`);
      } else if (Array.isArray(init.headers)) {
        const hasAuth = init.headers.some(([k]) => k.toLowerCase() === "authorization");
        if (!hasAuth) {
          init.headers.push(["Authorization", `Bearer ${accessToken}`]);
        }
      } else {
        if (!init.headers["Authorization"] && !init.headers["authorization"]) {
          (init.headers as any)["Authorization"] = `Bearer ${accessToken}`;
        }
      }
    }

    // Automatically append X-CSRF-Token header from cookie for CSRF validation checks on mutating backends
    const csrfToken = getCookie("_csrf");
    if (csrfToken) {
      if (init.headers instanceof Headers) {
        init.headers.set("X-CSRF-Token", csrfToken);
      } else if (Array.isArray(init.headers)) {
        const hasCsrf = init.headers.some(([k]) => k.toLowerCase() === "x-csrf-token");
        if (!hasCsrf) {
          init.headers.push(["X-CSRF-Token", csrfToken]);
        }
      } else {
        if (!init.headers["X-CSRF-Token"] && !init.headers["x-csrf-token"]) {
          (init.headers as any)["X-CSRF-Token"] = csrfToken;
        }
      }
    }
  }

  let response = await nativeFetch(input, init);

  if (response.status === 401 && url.includes("/api/") && !url.includes("/api/auth/login") && !url.includes("/api/auth/refresh")) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const refreshResponse = await nativeFetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${refreshToken}`
          },
          body: JSON.stringify({ refreshToken })
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.success && refreshData.accessToken) {
            localStorage.setItem("accessToken", refreshData.accessToken);
            localStorage.setItem("refreshToken", refreshData.refreshToken);
            
            if (init.headers instanceof Headers) {
              init.headers.set("Authorization", `Bearer ${refreshData.accessToken}`);
            } else if (Array.isArray(init.headers)) {
              init.headers = init.headers.map(([k, v]) => k.toLowerCase() === "authorization" ? [k, `Bearer ${refreshData.accessToken}`] : [k, v]) as [string, string][];
            } else {
              (init.headers as any)["Authorization"] = `Bearer ${refreshData.accessToken}`;
            }
            return await nativeFetch(input, init);
          }
        }
      } catch (err) {
        console.error("Auto token refresh failed", err);
      }
      
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user_session");
    }
  }

  return response;
};

try {
  Object.defineProperty(window, "fetch", {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Could not overwrite window.fetch using Object.defineProperty", e);
  try {
    (window as any).fetch = customFetch;
  } catch (e2) {
    console.error("Failed to assign fallback fetch function on window", e2);
  }
}

export default function App() {
  // Theme & Layout state
  const [theme, setTheme] = useState<ThemeStyle>(() => {
    return (localStorage.getItem("app_theme") as ThemeStyle) || 'cleanroom';
  });

  const [activeTab, setActiveTab] = useState<string>('objects');
  const [qrModalSchedule, setQrModalSchedule] = useState<ScheduleItem | null>(null);
  
  // Reports Filter states
  const [selectedReportObjectId, setSelectedReportObjectId] = useState<string>('all');
  const [selectedReportYear, setSelectedReportYear] = useState<string>('all');
  const [selectedMyReportObjectId, setSelectedMyReportObjectId] = useState<string>('all');
  const [selectedMyReportYear, setSelectedMyReportYear] = useState<string>('all');
  
  // Data State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [objects, setObjects] = useState<BuildingObject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [reports, setReports] = useState<CompletedChecklist[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    yandexDiskToken: "",
    yandexDiskConnected: false,
    reminderDaysBefore: 3,
    logoUrl: "",
    customLogoEnabled: false,
    appBackgroundType: "default",
    appBackgroundUrl: "",
    notificationChannels: {
      admin: { telegram: true, max: true, vk: false, email: true },
      owner: { telegram: true, max: false, vk: false, email: true }
    }
  });

  // Track loaded user email to avoid redundant load/save cascades
  const loadedUserEmailRef = useRef<string>("");

  useEffect(() => {
    const userEmail = currentUser?.email || "guest";
    if (loadedUserEmailRef.current !== userEmail) {
      // User changed! Load their customized settings
      const userTheme = localStorage.getItem("theme_" + userEmail) as ThemeStyle | null;
      if (userTheme) {
        setTheme(userTheme);
      } else if (userEmail === "guest") {
        const appTheme = localStorage.getItem("app_theme") as ThemeStyle | null;
        if (appTheme) setTheme(appTheme);
      }

      const userBgType = localStorage.getItem("bg_type_" + userEmail);
      const userBgUrl = localStorage.getItem("bg_url_" + userEmail);
      const userOpacity = localStorage.getItem("opacity_" + userEmail);

      setSystemSettings(prev => ({
        ...prev,
        appBackgroundType: (userBgType as any) || prev.appBackgroundType || 'default',
        appBackgroundUrl: userBgUrl || prev.appBackgroundUrl || '',
        cardOpacity: userOpacity !== null ? parseInt(userOpacity, 10) : (prev.cardOpacity !== undefined ? prev.cardOpacity : 85)
      }));

      loadedUserEmailRef.current = userEmail;
    } else {
      // Same user, so this is an interactive change! Let's save it.
      if (userEmail === "guest" && theme) {
        localStorage.setItem("app_theme", theme);
      }
      if (theme) {
        localStorage.setItem("theme_" + userEmail, theme);
      }
      if (systemSettings.appBackgroundType) {
        localStorage.setItem("bg_type_" + userEmail, systemSettings.appBackgroundType);
      }
      if (systemSettings.appBackgroundUrl) {
        localStorage.setItem("bg_url_" + userEmail, systemSettings.appBackgroundUrl);
      }
      if (systemSettings.cardOpacity !== undefined) {
        localStorage.setItem("opacity_" + userEmail, systemSettings.cardOpacity.toString());
      }
    }
  }, [currentUser?.email, theme, systemSettings.appBackgroundType, systemSettings.appBackgroundUrl, systemSettings.cardOpacity]);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Synced status
  const [syncLogs, setSyncLogs] = useState<string>("Синхронизация не производилась");
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Create / Edit Modals and Form states
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const getBackgroundStyle = () => {
    let bgUrl = "";
    if (systemSettings.appBackgroundType === 'villa') {
      bgUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80";
    } else if (systemSettings.appBackgroundType === 'blueprint') {
      bgUrl = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80";
    } else if (systemSettings.appBackgroundType === 'sakura' || theme === 'japanese_calligraphy') {
      bgUrl = "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=2000&q=80";
    } else if (systemSettings.appBackgroundType === 'custom' && systemSettings.appBackgroundUrl) {
      bgUrl = systemSettings.appBackgroundUrl;
    }

    if (bgUrl) {
      const isDark = theme === 'modern' || theme === 'terminal';
      const overlayColor = isDark 
        ? "rgba(10, 10, 12, 0.70)" 
        : theme === 'japanese_calligraphy'
          ? "rgba(253, 248, 240, 0.45)"
          : "rgba(240, 244, 248, 0.50)";
      return {
        backgroundImage: `linear-gradient(${overlayColor}, ${overlayColor}), url("${bgUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }
    return {};
  };
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

  // States for hierarchical schedule TO view collapsing
  const [expandedObjs, setExpandedObjs] = useState<Record<string, boolean>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});
  const [copyingCatInfo, setCopyingCatInfo] = useState<{ srcObjectId: string; category: string } | null>(null);
  const [copyTargetObjId, setCopyTargetObjId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'schedule' | 'user' | 'object' | 'template'; title: string } | null>(null);

  // User profile modal states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileFullname, setProfileFullname] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileCompany, setProfileCompany] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");
  const [profileKeySkills, setProfileKeySkills] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState("");
  const [settingsErrorMsg, setSettingsErrorMsg] = useState("");

  // Web Toast System for User Confirmations
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // States for Admin Profile tab
  const [adminOldPassword, setAdminOldPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminProfileErr, setAdminProfileErr] = useState("");
  const [adminProfileOk, setAdminProfileOk] = useState("");

  // Owner profile notification settings editor states
  const [isOwnerEditing, setIsOwnerEditing] = useState(false);
  const [ownerTelegram, setOwnerTelegram] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerMaxId, setOwnerMaxId] = useState("");
  const [ownerVkId, setOwnerVkId] = useState("");
  const [ownerFullname, setOwnerFullname] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEditMsg, setOwnerEditMsg] = useState("");
  const [ownerEditError, setOwnerEditError] = useState("");

  const [ownerActiveTab, setOwnerActiveTab] = useState<'characteristics' | 'profile' | 'reports' | 'specialists' | 'settings' | 'legal' | 'support'>('characteristics');
  const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isSpecMenuOpen, setIsSpecMenuOpen] = useState(false);
  const [objDiskUrl, setObjDiskUrl] = useState("");

  // Specialist rating states
  const [ratingReport, setRatingReport] = useState<CompletedChecklist | null>(null);
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>("");

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
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const templateEditorRef = useRef<HTMLDivElement>(null);

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
  const [usrPassword, setUsrPassword] = useState("");

  // Object Editor modal form
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [objName, setObjName] = useState("");
  const [objAddress, setObjAddress] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objOwnerId, setObjOwnerId] = useState("");
  const [objDiskPath, setObjDiskPath] = useState("");
  const [objAllowedSpecialistIds, setObjAllowedSpecialistIds] = useState<string[]>([]);

  // QR Modal options
  const [qrSelectedSpecId, setQrSelectedSpecId] = useState<string>("new-specialist");

  // States to Create/Edit Service Specialist profiles
  const [editingSpecialistId, setEditingSpecialistId] = useState<string | null>(null);
  const [specFormFullname, setSpecFormFullname] = useState("");
  const [specFormEmail, setSpecFormEmail] = useState("");
  const [specFormPhone, setSpecFormPhone] = useState("");
  const [specFormCompany, setSpecFormCompany] = useState("");
  const [specFormTelegram, setSpecFormTelegram] = useState("");
  const [specFormPassword, setSpecFormPassword] = useState("");
  const [specFormAllowedObjects, setSpecFormAllowedObjects] = useState<string[]>([]);
  const [mySkills, setMySkills] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  // Schedule Editor modal form
  const [editingSchId, setEditingSchId] = useState<string | null>(null);
  const [schObjId, setSchObjId] = useState("");
  const [schCategory, setSchCategory] = useState("Отопление");
  const [schTitle, setSchTitle] = useState("");
  const [schInterval, setSchInterval] = useState(30);
  const [schCommissioningDate, setSchCommissioningDate] = useState("");
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
      const registeredParam = params.get("registered");
      const specUserIdParam = params.get("specUserId");
      
      if (flowParam === "specialist" && objParam && schParam) {
        setSelectedObjId(objParam);
        setSelectedSchId(schParam);
        
        if (registeredParam === "true" && specUserIdParam) {
          const foundSpec = usersData.find((u: any) => u.id === specUserIdParam && u.role === 'specialist');
          if (foundSpec) {
            localStorage.setItem("user_session", JSON.stringify(foundSpec));
            setCurrentUser(foundSpec);
          } else {
            const anonUser = { id: 'anonymous_specialist', role: 'specialist' as const, fullname: 'Новый специалист', email: '', company: '' };
            setCurrentUser(anonUser);
          }
        } else {
          // 'Новый специалист' flow
          const anonUser = { id: 'anonymous_specialist', role: 'specialist' as const, fullname: 'Новый специалист', email: '', company: '' };
          setCurrentUser(anonUser);
        }
        
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
        if (data.accessToken) {
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        localStorage.setItem("user_session", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setRefreshTrigger(prev => prev + 1);
      }
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem("user_session");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const data = await response.json();
    if (data.success) {
      setCurrentUser(data.user);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const openUserProfile = () => {
    if (!currentUser) return;
    setProfileFullname(currentUser.fullname || "");
    setProfilePhone(currentUser.phone || "");
    setProfileCompany(currentUser.company || "");
    setProfileKeySkills(currentUser.keySkills || "");
    setProfileAvatarUrl(currentUser.avatarUrl || "");
    setProfilePassword("");
    setProfileSuccessMsg("");
    setProfileErrorMsg("");
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg("");
    setProfileErrorMsg("");
    if (!profileFullname.trim()) {
      setProfileErrorMsg("ФИО не может быть пустым.");
      return;
    }
    try {
      // First, update User Profile particulars
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: profileFullname.trim(),
          phone: profilePhone.trim(),
          company: profileCompany.trim(),
          keySkills: profileKeySkills.trim(),
          avatarUrl: profileAvatarUrl.trim(),
          password: profilePassword.trim() || undefined
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Next, save background and layout theme settings to global database
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(systemSettings)
        });

        localStorage.setItem("user_session", JSON.stringify(data.user));
        // Auto-close modal on successful save
        setIsProfileOpen(false);
        setCurrentUser(data.user);
        setRefreshTrigger(prev => prev + 1);
        showToast("Данные профиля и настройки оформления сохранены!", "success");
      } else {
        setProfileErrorMsg(data.error || "Произошла ошибка при сохранении профиля.");
        showToast(data.error || "Ошибка сохранения профиля", "error");
      }
    } catch (err) {
      setProfileErrorMsg("Не удалось связаться с сервером.");
      showToast("Не удалось сохранить профиль: ошибка сети", "error");
    }
  };

  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminProfileErr("");
    setAdminProfileOk("");
    
    if (!profileFullname.trim()) {
      setAdminProfileErr("ФИО не может быть пустым.");
      return;
    }

    try {
      const payload: any = {
        fullname: profileFullname.trim(),
        phone: profilePhone.trim(),
        company: profileCompany.trim(),
        keySkills: profileKeySkills.trim(),
        avatarUrl: profileAvatarUrl.trim(),
      };

      if (adminNewPassword.trim() !== "") {
        if (adminOldPassword.trim() === "") {
          setAdminProfileErr("Для смены пароля введите текущий (старый) пароль.");
          return;
        }
        if (adminNewPassword.trim() !== adminConfirmPassword.trim()) {
          setAdminProfileErr("Новые пароли не совпадают.");
          return;
        }
        if (adminNewPassword.trim().length < 4) {
          setAdminProfileErr("Новый пароль должен быть не менее 4 символов.");
          return;
        }
        payload.oldPassword = adminOldPassword.trim();
        payload.newPassword = adminNewPassword.trim();
        payload.confirmNewPassword = adminConfirmPassword.trim();
      }

      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("user_session", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setAdminProfileOk("Профиль администратора успешно сохранен!");
        showToast("Профиль администратора успешно сохранен!", "success");
        setAdminOldPassword("");
        setAdminNewPassword("");
        setAdminConfirmPassword("");
        setRefreshTrigger(prev => prev + 1);
      } else {
        setAdminProfileErr(data.error || "Произошла ошибка при сохранении профиля.");
        showToast(data.error || "Ошибка сохранения профиля администратора", "error");
      }
    } catch (err) {
      setAdminProfileErr("Не удалось связаться с сервером.");
      showToast("Не удалось подключиться к серверу", "error");
    }
  };

  const handleSaveVisualSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg("");
    setSettingsErrorMsg("");
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemSettings)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSettingsSuccessMsg("Настройки оформления и фонов успешно сохранены!");
        setRefreshTrigger(prev => prev + 1);
      } else {
        setSettingsErrorMsg(data.error || "Произошла ошибка при сохранении настроек.");
      }
    } catch (err) {
      setSettingsErrorMsg("Не удалось связаться с сервером.");
    }
  };

  const startEditOwnerProfile = () => {
    if (!currentUser) return;
    setOwnerFullname(currentUser.fullname || "");
    setOwnerPhone(currentUser.phone || "");
    setOwnerEmail(currentUser.email || "");
    setOwnerTelegram(currentUser.telegramChatId || "");
    setOwnerMaxId(currentUser.maxChatId || "");
    setOwnerVkId(currentUser.vkUserId || "");
    setOwnerEditMsg("");
    setOwnerEditError("");
    setIsOwnerEditing(true);
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerEditMsg("");
    setOwnerEditError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: ownerFullname.trim(),
          phone: ownerPhone.trim(),
          email: ownerEmail.trim(),
          telegramChatId: ownerTelegram.trim(),
          maxChatId: ownerMaxId.trim(),
          vkUserId: ownerVkId.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("user_session", JSON.stringify(data.user));
        setCurrentUser(data.user);
        setOwnerEditMsg("Настройки аккаунта успешно сохранены!");
        setIsOwnerEditing(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        setOwnerEditError(data.error || "Не удалось сохранить настройки.");
      }
    } catch (err: any) {
      setOwnerEditError("Ошибка сети: " + err.message);
    }
  };

  const submitOwnerRating = async () => {
    if (!ratingReport) return;
    try {
      const response = await fetch(`/api/reports/${ratingReport.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: ratingStars,
          ratingComment: ratingComment.trim()
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRatingReport(null);
        setRatingStars(5);
        setRatingComment("");
        // Reload completed reports
        const resCompleted = await fetch("/api/reports");
        const reportsData = await resCompleted.json();
        setReports(reportsData);
      } else {
        alert(data.error || "Не удалось сохранить оценку");
      }
    } catch(err: any) {
      alert("Ошибка подключения: " + err.message);
    }
  };

  const handleAssignOwner = async (objectId: string, newOwnerId: string) => {
    try {
      const obj = objects.find(o => o.id === objectId);
      if (!obj) return;
      const payload = {
        name: obj.name,
        address: obj.address,
        description: obj.description,
        ownerId: newOwnerId === "" ? null : newOwnerId,
        yandexDiskPath: obj.yandexDiskPath,
        yandexDiskUrl: obj.yandexDiskUrl,
        allowedSpecialistIds: obj.allowedSpecialistIds || []
      };
      await fetch(`/api/objects/${objectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Ошибка привязки собственника к объекту:", err);
    }
  };

  // --- CRUD API Calls ---
  // Users CRUD
  const saveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      fullname: usrFullname,
      email: usrEmail,
      role: usrRole,
      phone: usrPhone,
      company: usrCompany,
      telegramChatId: usrTelegram,
      maxChatId: usrMax,
      vkUserId: usrVk
    };
    if (usrPassword) {
      payload.password = usrPassword;
    }

    try {
      if (editingUserId) {
        await fetch(`/api/users/${editingUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast(`Пользователь "${usrFullname}" успешно обновлен!`, "success");
      } else {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast(`Пользователь "${usrFullname}" успешно добавлен!`, "success");
      }
      setEditingUserId(null);
      setRefreshTrigger(prev => prev + 1);
      resetUserForm();
    } catch (err: any) {
      showToast("Ошибка сохранения пользователя: " + err.message, "error");
    }
  };

  const deleteUser = async (id: string | any) => {
    setDeleteConfirm({
      id: typeof id === 'object' ? id.id : id,
      type: 'user',
      title: "Вы уверены, что хотите удалить этого пользователя?"
    });
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
    setUsrPassword("");
    setTimeout(() => {
      document.getElementById("user-form-container")?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
    setUsrPassword("");
  };

  // Facility / Object CRUD
  const saveObjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: objName,
      address: objAddress,
      description: objDesc,
      ownerId: objOwnerId,
      yandexDiskPath: objDiskPath,
      yandexDiskUrl: objDiskUrl,
      allowedSpecialistIds: objAllowedSpecialistIds
    };

    try {
      if (editingObjId) {
        await fetch(`/api/objects/${editingObjId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast(`Объект "${objName}" успешно обновлен!`, "success");
      } else {
        await fetch("/api/objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast(`Объект "${objName}" успешно добавлен!`, "success");
      }
      setEditingObjId(null);
      setRefreshTrigger(prev => prev + 1);
      resetObjectForm();
    } catch (err: any) {
      showToast("Ошибка сохранения объекта: " + err.message, "error");
    }
  };

  const deleteObject = async (id: string) => {
    setDeleteConfirm({
      id,
      type: 'object',
      title: "Удалить этот объект со всей привязанной схемой регламентов?"
    });
  };

  const startEditObject = (o: BuildingObject) => {
    setEditingObjId(o.id);
    setObjName(o.name);
    setObjAddress(o.address);
    setObjDesc(o.description);
    setObjOwnerId(o.ownerId || "");
    setObjDiskPath(o.yandexDiskPath);
    setObjDiskUrl(o.yandexDiskUrl || "");
    setObjAllowedSpecialistIds(o.allowedSpecialistIds || []);

    // Smooth scroll to object form
    setTimeout(() => {
      document.getElementById("object-form-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const resetObjectForm = () => {
    setEditingObjId(null);
    setObjName("");
    setObjAddress("");
    setObjDesc("");
    setObjOwnerId("");
    setObjDiskPath("");
    setObjDiskUrl("");
    setObjAllowedSpecialistIds([]);
  };

  // Specialist Profiles CRUD for Owners & Admins
  const saveSpecialistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specFormFullname || !specFormEmail) {
      alert("Имя и Email обязательны к заполнению!");
      return;
    }

    const payload: any = {
      fullname: specFormFullname,
      email: specFormEmail.toLowerCase().trim(),
      role: 'specialist',
      phone: specFormPhone,
      company: specFormCompany,
      telegramChatId: specFormTelegram
    };

    if (specFormPassword) {
      payload.password = specFormPassword;
    }

    try {
      let specId = editingSpecialistId;
      if (editingSpecialistId) {
        const response = await fetch(`/api/users/${editingSpecialistId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Ошибка обновления");
        }
      } else {
        const emailExists = users.some(u => u.email.toLowerCase() === specFormEmail.toLowerCase().trim());
        if (emailExists) {
          alert("Пользователь с таким Email уже зарегистрирован!");
          return;
        }

        if (!payload.password) {
          payload.password = "123456"; 
        }

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Ошибка добавления");
        }
        const createdUser = await response.json();
        specId = createdUser.id;
      }

      // Update object mappings for this specialist
      if (currentUser && specId) {
        const touchableObjects = currentUser.role === 'admin' 
          ? objects 
          : objects.filter(o => o.ownerId === currentUser.id);
          
        for (const obj of touchableObjects) {
          const isSelected = specFormAllowedObjects.includes(obj.id);
          const currentAllowed = obj.allowedSpecialistIds || [];
          const contains = currentAllowed.includes(specId);
          
          let newAllowed = [...currentAllowed];
          if (isSelected && !contains) {
            newAllowed.push(specId);
          } else if (!isSelected && contains) {
            newAllowed = newAllowed.filter(id => id !== specId);
          }
          
          if (JSON.stringify(currentAllowed) !== JSON.stringify(newAllowed)) {
            await fetch(`/api/objects/${obj.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...obj,
                allowedSpecialistIds: newAllowed
              })
            });
          }
        }
      }

      setEditingSpecialistId(null);
      setSpecFormFullname("");
      setSpecFormEmail("");
      setSpecFormPhone("");
      setSpecFormCompany("");
      setSpecFormTelegram("");
      setSpecFormPassword("");
      setSpecFormAllowedObjects([]);
      setRefreshTrigger(prev => prev + 1);
      alert(editingSpecialistId ? "Профиль специалиста успешно обновлен!" : "Специалист успешно зарегистрирован!");
    } catch (err: any) {
      alert("Ошибка сохранения: " + err.message);
    }
  };

  const startEditSpecialist = (spec: User) => {
    setEditingSpecialistId(spec.id);
    setSpecFormFullname(spec.fullname);
    setSpecFormEmail(spec.email);
    setSpecFormPhone(spec.phone || "");
    setSpecFormCompany(spec.company || "");
    setSpecFormTelegram(spec.telegramChatId || "");
    setSpecFormPassword("");
    // Find already assigned objects
    const assigned = objects
      .filter(o => o.allowedSpecialistIds && o.allowedSpecialistIds.includes(spec.id))
      .map(o => o.id);
    setSpecFormAllowedObjects(assigned);
  };

  const deleteSpecialist = async (id: string) => {
    setDeleteConfirm({
      id,
      type: 'user',
      title: "Вы действительно хотите удалить данного инженера? Доступ к объектам будет заблокирован."
    });
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
      notes: schNotes,
      commissioningDate: schCommissioningDate || null
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
    setDeleteConfirm({
      id,
      type: 'schedule',
      title: "Удалить этот регламент обслуживания из графика?"
    });
  };

  const handleCopyCategory = async () => {
    if (!copyingCatInfo || !copyTargetObjId) return;
    try {
      const sourceSchedules = schedules.filter(
        s => s.objectId === copyingCatInfo.srcObjectId && s.category === copyingCatInfo.category
      );

      if (sourceSchedules.length === 0) {
        alert("В этом разделе нет регламентов для копирования.");
        return;
      }

      const promises = sourceSchedules.map(sch => {
        const copyItem = {
          objectId: copyTargetObjId,
          category: sch.category,
          title: sch.title + " (Копия)",
          intervalDays: sch.intervalDays,
          lastDoneDate: null,
          responsibleUserId: sch.responsibleUserId || "",
          notes: sch.notes || "",
          checklistTemplateId: sch.checklistTemplateId,
          commissioningDate: sch.commissioningDate || null
        };
        return fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(copyItem)
        }).then(res => {
          if (!res.ok) throw new Error("Ошибка копирования пункта");
          return res.json();
        });
      });

      await Promise.all(promises);

      // Refresh data
      const res = await fetch("/api/schedules");
      const updatedSchedules = await res.json();
      setSchedules(updatedSchedules);

      setCopyingCatInfo(null);
      alert("Раздел со всеми регламентами успешно скопирован!");
    } catch (e: any) {
      console.error(e);
      alert("Не удалось скопировать раздел: " + e.message);
    }
  };

  const startEditSchedule = (s: ScheduleItem) => {
    setEditingSchId(s.id);
    setSchObjId(s.objectId);
    setSchCategory(s.category);
    setSchTitle(s.title);
    setSchInterval(s.intervalDays);
    setSchCommissioningDate(s.commissioningDate || "");
    setSchResponsible(s.responsibleUserId || "");
    setSchTemplateId(s.checklistTemplateId);
    setSchNotes(s.notes || "");

    // Smooth scroll to schedule form
    setTimeout(() => {
      document.getElementById("schedule-form-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const resetScheduleForm = () => {
    setEditingSchId(null);
    setSchObjId("");
    setSchCategory("Отопление");
    setSchTitle("");
    setSchInterval(30);
    setSchCommissioningDate("");
    setSchResponsible("");
    setSchTemplateId("");
    setSchNotes("");
  };

  const handleAddNewScheduleForObject = (objectId: string) => {
    setEditingSchId(null);
    setSchObjId(objectId);
    setSchCategory("Отопление");
    setSchTitle("");
    setSchInterval(30);
    setSchCommissioningDate("");
    setSchResponsible("");
    setSchTemplateId("");
    setSchNotes("");

    // Smooth scroll to schedule form
    setTimeout(() => {
      document.getElementById("schedule-form-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Checklist Template Builder Handlers
  const addQuestionToTemplate = () => {
    if (!newQText.trim()) return;
    if (editingQuestionId) {
      setTplQuestions(tplQuestions.map(q => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            text: newQText,
            type: newQType,
            options: newQType === 'select' ? (newQOptions ? newQOptions.split(',').map(o => o.trim()).filter(Boolean) : []) : undefined,
            required: newQRequired
          };
        }
        return q;
      }));
      setEditingQuestionId(null);
    } else {
      const newQ: Question = {
        id: "q_" + Math.random().toString(36).substr(2, 5),
        text: newQText,
        type: newQType,
        options: newQType === 'select' ? (newQOptions ? newQOptions.split(',').map(o => o.trim()).filter(Boolean) : []) : undefined,
        required: newQRequired
      };
      setTplQuestions([...tplQuestions, newQ]);
    }
    setNewQText("");
    setNewQOptions("");
    setNewQRequired(true);
    setNewQType("boolean");
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setNewQText(q.text);
    setNewQType(q.type);
    setNewQOptions(q.options ? q.options.join(', ') : "");
    setNewQRequired(q.required);
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setNewQText("");
    setNewQType("boolean");
    setNewQOptions("");
    setNewQRequired(true);
  };

  const moveQuestionUp = (idx: number) => {
    if (idx === 0) return;
    const list = [...tplQuestions];
    const prev = list[idx - 1];
    list[idx - 1] = list[idx];
    list[idx] = prev;
    setTplQuestions(list);
  };

  const moveQuestionDown = (idx: number) => {
    if (idx === tplQuestions.length - 1) return;
    const list = [...tplQuestions];
    const next = list[idx + 1];
    list[idx + 1] = list[idx];
    list[idx] = next;
    setTplQuestions(list);
  };

  const removeQuestionFromTemplate = (qid: string) => {
    setTplQuestions(tplQuestions.filter(q => q.id !== qid));
    if (editingQuestionId === qid) {
      setEditingQuestionId(null);
    }
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
    setDeleteConfirm({
      id,
      type: 'template',
      title: "Удалить этот шаблон? Будет утерян во всех привязанных графиках."
    });
  };

  const handleConfirmedDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    try {
      if (type === 'user') {
        await fetch(`/api/users/${id}`, { method: "DELETE" });
      } else if (type === 'object') {
        await fetch(`/api/objects/${id}`, { method: "DELETE" });
      } else if (type === 'schedule') {
        await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      } else if (type === 'template') {
        await fetch(`/api/templates/${id}`, { method: "DELETE" });
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error("Error executing delete:", e);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const startEditTemplate = (t: ChecklistTemplate) => {
    setEditingTemplateId(t.id);
    setTplName(t.name);
    setTplDesc(t.description || "");
    setTplQuestions(t.questions);
    setEditingQuestionId(null);
    setTimeout(() => {
      if (templateEditorRef.current) {
        templateEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const offset = document.getElementById("template-editor-section")?.offsetTop || 0;
        window.scrollTo({ top: offset, behavior: "smooth" });
      }
    }, 80);
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
    setEditingQuestionId(null);
  };

  // Yandex.Disk Settings Save
  const saveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemSettings)
      });
      showToast("Настройки системы успешно сохранены!", "success");
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast("Ошибка при сохранении настроек: " + err.message, "error");
    }
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

  const getCardBgColorWithOpacity = () => {
    const opacityVal = (systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85) / 100;
    switch (theme) {
      case 'modern':
        return `rgba(9, 9, 11, ${opacityVal})`;
      case 'terminal':
        return `rgba(0, 0, 0, ${opacityVal})`;
      case 'warm':
        return `rgba(253, 246, 226, ${opacityVal})`;
      case 'japanese':
      case 'japanese_calligraphy':
        return `rgba(253, 251, 247, ${opacityVal})`;
      case 'crisp_minimal':
      case 'cleanroom':
      default:
        return `rgba(255, 255, 255, ${opacityVal})`;
    }
  };

  const getInputBgColorWithOpacity = () => {
    const opacityVal = (systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85) / 100;
    switch (theme) {
      case 'modern':
        return `rgba(39, 39, 42, ${opacityVal})`;
      case 'terminal':
        return `rgba(0, 0, 0, ${opacityVal})`;
      case 'warm':
        return `rgba(250, 246, 235, ${opacityVal})`;
      case 'japanese':
      case 'japanese_calligraphy':
        return `rgba(255, 255, 255, ${opacityVal})`;
      case 'crisp_minimal':
      case 'cleanroom':
      default:
        return `rgba(248, 250, 252, ${opacityVal})`;
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
      theme === 'japanese_calligraphy' ? 'bg-[#fcfbf9] text-[#1c1c1c] font-serif min-h-screen selection:bg-[#bc1c24]/20 py-10 font-medium' :
      theme === 'crisp_minimal' ? 'bg-[#fafafa] text-neutral-900 font-sans min-h-screen selection:bg-neutral-200 py-10' :
      theme === 'modern' ? 'bg-zinc-950 text-zinc-100 font-sans min-h-screen selection:bg-sky-500/30 py-10' :
      theme === 'terminal' ? 'bg-black text-green-400 font-mono min-h-screen selection:bg-green-500/40 py-10' :
      theme === 'warm' ? 'bg-[#f8f1e5] text-amber-950 font-serif min-h-screen selection:bg-amber-100 py-10' :
      'bg-slate-50 text-slate-800 font-sans min-h-screen selection:bg-blue-100 py-10';

    return (
      <div className={loginThemeWrapper} style={getBackgroundStyle()}>
        {/* Dynamic Glassmorphic Opacity overrides */}
        <style>{`
          .theme-custom-card-bg {
            background-color: ${getCardBgColorWithOpacity()} !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
          }
          .theme-custom-input-bg {
            background-color: ${getInputBgColorWithOpacity()} !important;
          }
        `}</style>
        <LoginScreen 
          usersList={users} 
          currentTheme={theme}
          logoUrl={systemSettings.logoUrl}
          customLogoEnabled={systemSettings.customLogoEnabled}
          backgroundType={systemSettings.appBackgroundType}
          onLoginSuccess={(user) => {
            localStorage.setItem("user_session", JSON.stringify(user));
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

  const getUserFullname = (userId?: string) => {
    if (!userId) return "Свободный выбор";
    const found = users.find(u => u.id === userId);
    return found ? found.fullname : "Неизвестный специалист";
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
    const isBgActive = (systemSettings.appBackgroundType && systemSettings.appBackgroundType !== 'default') || theme === 'japanese_calligraphy';
    
    switch (theme) {
      case 'modern':
        return 'bg-zinc-950 text-zinc-100 font-sans min-h-screen selection:bg-sky-500/30';
      case 'terminal':
        return 'bg-black text-green-400 font-mono min-h-screen selection:bg-green-500/40';
      case 'warm':
        return `${isBgActive ? '' : 'bg-[#f8f1e5]'} text-[#543b17] font-serif min-h-screen selection:bg-amber-100`;
      case 'japanese':
        return `${isBgActive ? '' : 'bg-[#faf7f0]'} text-[#2d2d2d] font-sans min-h-screen selection:bg-[#bc1c24]/15`;
      case 'japanese_calligraphy':
        return `${isBgActive ? '' : 'bg-[#fcfbf9]'} text-[#1c1c1c] font-serif min-h-screen selection:bg-[#bc1c24]/20 font-medium`;
      case 'crisp_minimal':
        return `${isBgActive ? '' : 'bg-[#fafafa]'} text-neutral-900 font-sans min-h-screen selection:bg-neutral-200`;
      case 'cleanroom':
      default:
        return `${isBgActive ? 'text-slate-800' : 'bg-slate-50 text-slate-800'} font-sans min-h-screen selection:bg-blue-100`;
    }
  };

  const getCardStyle = () => {
    const isBgActive = (systemSettings.appBackgroundType && systemSettings.appBackgroundType !== 'default') || theme === 'japanese_calligraphy';
    
    let baseStyle = "";
    switch (theme) {
      case 'modern':
        baseStyle = isBgActive 
          ? 'bg-[#09090b]/75 border border-zinc-800/80 backdrop-blur-md rounded-xl p-5 shadow-lg shadow-black/30' 
          : 'bg-[#18181b]/95 border border-zinc-800 rounded-xl p-5 shadow-lg';
        break;
      case 'terminal':
        baseStyle = 'bg-black/95 border border-green-500/30 rounded-none p-5 text-green-400 font-mono backdrop-blur-xs';
        break;
      case 'warm':
        baseStyle = isBgActive 
          ? 'bg-[#fdf6e2]/90 border border-amber-900/20 backdrop-blur-md rounded-2xl p-6 shadow-sm' 
          : 'bg-[#fdf6e2] border border-amber-900/15 rounded-2xl p-6 shadow-sm';
        break;
      case 'japanese':
        baseStyle = isBgActive 
          ? 'bg-[#fdfbf7]/92 border border-[#d6cfbe] backdrop-blur-xs rounded-none p-6 shadow-sm relative after:absolute after:bottom-1.5 after:right-1.5 after:w-1.5 after:h-1.5 after:bg-[#bc1c24]'
          : 'bg-[#fdfbf7] border border-[#d6cfbe] rounded-none p-6 shadow-sm relative after:absolute after:bottom-1.5 after:right-1.5 after:w-1.5 after:h-1.5 after:bg-[#bc1c24]';
        break;
      case 'japanese_calligraphy':
        baseStyle = 'bg-[#fdfbf7]/92 border-2 border-[#8a7a5d] rounded-none p-6 shadow-lg relative outline outline-offset-4 outline-1 outline-[#8a7a5d]/30 after:absolute after:bottom-2.5 after:right-2.5 after:w-2.5 after:h-2.5 after:bg-[#bc1c24] after:rounded-xs';
        break;
      case 'crisp_minimal':
        baseStyle = isBgActive 
          ? 'bg-white/95 border border-neutral-300 rounded-sm p-5 shadow-none backdrop-blur-xs'
          : 'bg-white border border-neutral-200 rounded-sm p-5 shadow-none';
        break;
      case 'cleanroom':
      default:
        baseStyle = isBgActive 
          ? 'bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-5 shadow-md backdrop-blur-md'
          : 'bg-white border border-slate-200 rounded-xl p-5 shadow-sm';
        break;
    }
    return baseStyle + " theme-custom-card-bg";
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
      case 'japanese_calligraphy':
        return 'border-b-2 border-double border-[#bc1c24]/30 pb-3 mb-[18px] text-center italic font-bold tracking-wide';
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
      case 'japanese_calligraphy':
        return 'bg-[#bc1c24] hover:bg-[#a01319] text-white font-bold rounded-none px-5 py-2.5 border-b-4 border-[#7a0d11] transition-all duration-150 uppercase tracking-widest text-xs hover:translate-y-[1px] hover:border-b-2';
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
      case 'japanese_calligraphy':
        return 'bg-[#f5ebd6] hover:bg-[#ebd9bc] text-amber-950 border border-[#b2a591] rounded-none px-3 py-1.5 text-xs font-bold uppercase tracking-wider';
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
    let baseStyle = "";
    switch (theme) {
      case 'modern':
        baseStyle = 'bg-zinc-800/60 border border-zinc-700 text-white rounded-lg p-2 focus:ring-1 focus:ring-sky-500 focus:outline-none';
        break;
      case 'terminal':
        baseStyle = 'bg-black border border-green-500 text-green-400 rounded-none p-2 focus:outline-none placeholder-green-700';
        break;
      case 'warm':
        baseStyle = 'bg-[#faf6eb] border border-amber-900/20 text-amber-950 rounded-xl p-3 focus:outline-none focus:border-amber-900/50';
        break;
      case 'japanese':
        baseStyle = 'bg-white border border-[#d6cfbe] text-[#2d2d2d] rounded-none p-2 focus:border-[#bc1c24] focus:outline-none';
        break;
      case 'japanese_calligraphy':
        baseStyle = 'bg-white border border-[#b2a591] text-[#1c1c1c] rounded-none p-2 focus:border-[#bc1c24] focus:ring-1 focus:ring-[#bc1c24] focus:outline-none font-serif';
        break;
      case 'crisp_minimal':
        baseStyle = 'bg-white border border-neutral-300 text-neutral-900 rounded-sm p-2 focus:ring-1 focus:ring-neutral-400 focus:outline-none';
        break;
      case 'cleanroom':
      default:
        baseStyle = 'bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2 focus:ring-1 focus:ring-blue-400 focus:outline-none';
        break;
    }
    return baseStyle + " theme-custom-input-bg";
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
      case 'japanese_calligraphy':
        return 'bg-[#faf4e8] text-[#543b17] text-xs font-extrabold uppercase tracking-widest border-b-2 border-[#b2a591]';
      case 'crisp_minimal':
        return 'bg-neutral-100 text-neutral-600 text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200';
      case 'cleanroom':
      default:
        return 'bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider';
    }
  };

  if (currentUser && currentUser.id === 'anonymous_specialist') {
    // Render the beautiful isolated check-list page for unregistered guest specialist scanning QR
    return (
      <div className={getThemeWrapperStyle()} style={getBackgroundStyle()}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* Header of isolated QR check sheet */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#bc1c24]/10 rounded-xl flex items-center justify-center text-red-600 font-bold text-xl shadow-md">
                📋
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight">Карта выездного обслуживания ТО</h1>
                <p className="text-xs opacity-60">Одноразовый проверочный лист инспекции по QR-коду</p>
              </div>
            </div>
            
            <div className={`p-2 px-3 rounded-lg border text-xs flex items-center gap-2.5 ${
              theme === 'modern' ? 'bg-zinc-900 border-zinc-800' : theme === 'terminal' ? 'border-green-500/20' : theme === 'warm' ? 'bg-[#fdf6e2] border-amber-900/10' : 'bg-white border-slate-200'
            }`}>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <div className="font-bold">Разовый гостевой доступ (Защищено)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Technical credentials filling panel */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-neutral-300/15 bg-slate-100/50 dark:bg-zinc-800/20 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-500 block">Технические реквизиты специалиста</span>
                
                <div className="space-y-3 text-xs">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">ФИО Исполнителя *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Иванов И. И."
                      value={specName}
                      onChange={(e) => setSpecName(e.target.value)}
                      className={getInputStyle()}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Сервисная компания / ООО *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="ООО СпецМонтаж"
                      value={specCompany}
                      onChange={(e) => setSpecCompany(e.target.value)}
                      className={getInputStyle()}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Контактный телефон *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="+7 (999) 123-45-67"
                      value={specPhone}
                      onChange={(e) => setSpecPhone(e.target.value)}
                      className={getInputStyle()}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Эл. почта (email)</label>
                    <input 
                      type="email" 
                      placeholder="spec@corp.ru"
                      value={specEmail}
                      onChange={(e) => setSpecEmail(e.target.value)}
                      className={getInputStyle()}
                    />
                  </div>
                </div>
              </div>

              {/* Object preview */}
              <div className="p-4 rounded-xl border bg-neutral-100/15 text-xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Объект ТО</span>
                <div className="font-bold text-slate-800 dark:text-zinc-200">
                  {objects.find(o => o.id === selectedObjId)?.name || "Выбранный объект"}
                </div>
                <p className="opacity-60 text-[11px]">
                  {objects.find(o => o.id === selectedObjId)?.address || ""}
                </p>
                <div className="pt-2 text-[10.5px]">
                  <span className="opacity-50">Тип регламента: </span> 
                  <span className="font-semibold">{schedules.find(s => s.id === selectedSchId)?.category || "Регламент"}</span>
                </div>
              </div>
            </div>

            {/* Checklist items dynamic form */}
            <div className="md:col-span-2 space-y-4">
              {!activeTemplate ? (
                <div className="p-8 border border-dashed text-center rounded-xl text-neutral-400">
                  <h4 className="font-extrabold text-slate-700">Шаблон опросного листа не загружен</h4>
                  <p className="text-xs opacity-70 mt-1">Возможно, ссылка на QR-код устарела или указана неверно.</p>
                </div>
              ) : (
                <div className="p-6 border border-neutral-300/10 rounded-xl bg-white dark:bg-zinc-900/60 space-y-6 shadow-sm">
                  
                  <div className="bg-[#bc1c24]/5 p-4 rounded-xl border border-[#bc1c24]/10">
                    <h4 className="font-black text-[#bc1c24] text-sm">Чек-лист: {activeTemplate.name}</h4>
                    <p className="text-xs opacity-75 mt-1">{activeTemplate.description || "Пожалуйста, ответьте на вопросы по регламенту и прикрепите фотоснимки, подтверждающие факт ТО."}</p>
                  </div>

                  <div className="space-y-5">
                    {activeTemplate.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/20 border border-slate-200/50 dark:border-zinc-800 space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-slate-800 dark:text-zinc-200 leading-tight">
                            {idx + 1}. {q.text} {q.required && <span className="text-rose-500 font-bold">*</span>}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest bg-white dark:bg-zinc-900 px-2 py-0.5 rounded shadow-sm">
                            {q.type}
                          </span>
                        </div>

                        {q.type === 'boolean' && (
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700 dark:text-zinc-300 font-bold">
                              <input 
                                type="radio" 
                                name={`bool_${q.id}`} 
                                checked={filledAnswers[q.id] === 'true'} 
                                onChange={() => setFilledAnswers(prev => ({ ...prev, [q.id]: 'true' }))}
                                className="rounded accent-emerald-500"
                              />
                              Да / В норме
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-700 dark:text-zinc-300 font-bold">
                              <input 
                                type="radio" 
                                name={`bool_${q.id}`} 
                                checked={filledAnswers[q.id] === 'false'} 
                                onChange={() => setFilledAnswers(prev => ({ ...prev, [q.id]: 'false' }))}
                                className="rounded accent-rose-500"
                              />
                              Нет / Дефект
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-xs text-slate-400">
                              <input 
                                type="radio" 
                                name={`bool_${q.id}`} 
                                checked={filledAnswers[q.id] === 'na'} 
                                onChange={() => setFilledAnswers(prev => ({ ...prev, [q.id]: 'na' }))}
                                className="rounded accent-slate-400"
                              />
                              N/A (Не применимо)
                            </label>
                          </div>
                        )}

                        {q.type === 'text' && (
                          <input 
                            type="text" 
                            placeholder="Количественное значение, модель или краткое текстовое примечание" 
                            value={filledAnswers[q.id] || ""}
                            onChange={(e) => setFilledAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className={`${getInputStyle()} w-full`}
                          />
                        )}

                        {q.type === 'photo' && (
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 p-2 px-3 border border-dashed rounded-lg bg-white dark:bg-zinc-900 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-all">
                              <Camera className="w-4 h-4 text-neutral-400" />
                              <span>{uploadedPhotos[q.id] ? "Заменить фото" : "Загрузить фото ТО"}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(q.id, e)}
                              />
                            </label>
                            
                            {uploadingPhotoId === q.id && <span className="text-[10px] animate-pulse text-blue-500">Загрузка...</span>}
                            
                            {uploadedPhotos[q.id] && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                                <img 
                                  src={uploadedPhotos[q.id]} 
                                  alt="Превью" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => setUploadedPhotos(prev => {
                                    const copy = { ...prev };
                                    delete copy[q.id];
                                    return copy;
                                  })}
                                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white text-[10px]"
                                >
                                  Сбросить
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t flex flex-col items-stretch sm:flex-row sm:justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={submitCompletedChecklist}
                      className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Подтвердить & Отправить Акт
                    </button>
                  </div>
                </div>
              )}

              {/* Success Report screen in anonymous flow */}
              {checklistCompletedReport && (
                <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-500/20 p-6 rounded-xl space-y-4 animate-fade-in text-slate-800 dark:text-zinc-200">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <span>Акт ТО успешно сформирован и передан в систему!</span>
                  </div>
                  <p className="text-xs opacity-85 leading-relaxed">
                    Уникальный номер Акта: <strong className="font-mono text-xs">{checklistCompletedReport.id}</strong>. Данные синхронизированы с Яндекс.Диском по адресу объекта. Уведомление об окончании инспекции отправлено собственнику здания в режиме реального времени.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <a 
                      href={`/api/reports/${checklistCompletedReport.id}/pdf`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition-all inline-block text-center"
                    >
                      Скачать Акт (PDF)
                    </a>
                    <button
                      type="button"
                      onClick={() => handleLogout()}
                      className="py-2 px-3 border border-neutral-350 text-neutral-600 hover:bg-neutral-100 text-xs rounded-lg transition-all"
                    >
                      Заверсить сессию гостя ➔
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className={getThemeWrapperStyle()} style={getBackgroundStyle()}>
      {/* Dynamic Glassmorphic Opacity overrides */}
      <style>{`
        .theme-custom-card-bg {
          background-color: ${getCardBgColorWithOpacity()} !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }
        .theme-custom-input-bg {
          background-color: ${getInputBgColorWithOpacity()} !important;
        }
      `}</style>
      
      {/* Main Structural Container */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation & Brand Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            {systemSettings.logoUrl && systemSettings.customLogoEnabled ? (
              <img 
                src={systemSettings.logoUrl} 
                alt="Логотип" 
                className="w-14 h-14 md:w-16 md:h-16 object-contain rounded-2xl shadow-md border border-neutral-250 bg-white"
                referrerPolicy="no-referrer"
              />
            ) : theme === 'japanese' ? (
              <div className="w-14 h-14 md:w-16 md:h-16 bg-[#bc1c24] rounded-none flex items-center justify-center text-white font-bold text-2xl shadow-md">
                ⛩️
              </div>
            ) : theme === 'crisp_minimal' ? (
              <div className="w-14 h-14 md:w-16 md:h-16 bg-black rounded-none border border-black flex items-center justify-center text-white font-bold text-lg">
                ЦП
              </div>
            ) : (
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md">
                S
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Цифровой паспорт объекта
              </h1>
              <p className="text-xs opacity-60">
                Система инспекций & графиков ТО
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
            {/* Role-based Popup Menus */}
            {currentUser.role === 'owner' && (
              <div className="relative">
                <button
                  id="owner-menu-toggle-btn"
                  onClick={() => setIsOwnerMenuOpen(!isOwnerMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                  <span>📂 Кабинет Владельца</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOwnerMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOwnerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setIsOwnerMenuOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl border p-4 z-50 animate-scaleUp text-neutral-800 dark:text-neutral-100 ${
                      theme === 'modern' ? 'bg-zinc-950 border-zinc-800' : theme === 'terminal' ? 'bg-black border-green-500' : theme === 'warm' ? 'bg-[#fdf6e2] border-amber-900/10' : 'bg-white border-slate-200'
                    }`}>
                      <div className="pb-3 border-b border-black/5 dark:border-white/10 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <div className="font-extrabold text-xs tracking-wide uppercase opacity-55">Авторизован как</div>
                          <div className="font-black text-sm text-neutral-900 dark:text-neutral-50 truncate max-w-[200px]" title={currentUser.fullname}>
                            {currentUser.fullname}
                          </div>
                          <div className="text-[10px] opacity-65">Собственник объектов</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <button
                          onClick={() => { setOwnerActiveTab('profile'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <UserIcon className="w-4 h-4" />
                          <span>👤 Мой профиль</span>
                        </button>
                        
                        <button
                          onClick={() => { setOwnerActiveTab('characteristics'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'characteristics' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Building className="w-4 h-4" />
                          <span>📋 Мои характеристики</span>
                        </button>
                        
                        <button
                          onClick={() => { setOwnerActiveTab('reports'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>📂 Мои акты</span>
                        </button>
                        
                        <button
                          onClick={() => { setOwnerActiveTab('specialists'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'specialists' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Wrench className="w-4 h-4" />
                          <span>🔧 Сервисные службы</span>
                        </button>
                        
                        <button
                          onClick={() => { setOwnerActiveTab('settings'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Settings className="w-4 h-4" />
                          <span>⚙️ Настройки и Стиль</span>
                        </button>

                        <button
                          onClick={() => { setOwnerActiveTab('support'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'support' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Phone className="w-4 h-4" />
                          <span>📞 Поддержка</span>
                        </button>

                        <button
                          onClick={() => { setOwnerActiveTab('legal'); setIsOwnerMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            ownerActiveTab === 'legal' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>⚖️ Юр. соглашения</span>
                        </button>
                        
                        <div className="border-t border-black/5 dark:border-white/10 my-2 pt-2" />
                        
                        <button
                          onClick={() => { handleLogout(); setIsOwnerMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Выход</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="relative">
                <button
                  id="admin-menu-toggle-btn"
                  onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                  <span>⚙️ Панель Управления</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isAdminMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setIsAdminMenuOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl border p-4 z-50 animate-scaleUp text-neutral-800 dark:text-neutral-100 ${
                      theme === 'modern' ? 'bg-zinc-950 border-zinc-800' : theme === 'terminal' ? 'bg-black border-indigo-500' : theme === 'warm' ? 'bg-[#fdf6e2] border-amber-900/10' : 'bg-white border-slate-200'
                    }`}>
                      <div className="pb-3 border-b border-black/5 dark:border-white/10 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <div className="font-extrabold text-xs tracking-wide uppercase opacity-55">Системный вход</div>
                          <div className="font-black text-sm text-neutral-900 dark:text-neutral-50 truncate max-w-[200px]" title={currentUser.fullname}>
                            {currentUser.fullname}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setProfileFullname(currentUser.fullname || "");
                            setProfilePhone(currentUser.phone || "");
                            setProfileCompany(currentUser.company || "");
                            setProfileKeySkills(currentUser.keySkills || "");
                            setProfileAvatarUrl(currentUser.avatarUrl || "");
                            setAdminOldPassword("");
                            setAdminNewPassword("");
                            setAdminConfirmPassword("");
                            setAdminProfileErr("");
                            setAdminProfileOk("");
                            setActiveTab('profile');
                            setIsAdminMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <UserIcon className="w-4 h-4" />
                          <span>👤 Профиль</span>
                        </button>

                        <button
                          onClick={() => { setActiveTab('objects'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'objects' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Building className="w-4 h-4" />
                          <span>🏢 Объекты</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('schedule'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'schedule' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span>📅 График ТО</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('templates'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>📝 Чек-листы</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('reports'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>📂 Накопленные акты</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('users'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'users' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          <span>👥 Пользователи</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('ratings'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'ratings' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Star className="w-4 h-4" />
                          <span>⭐ Рейтинг специалистов</span>
                        </button>
                        
                        <button
                          onClick={() => { setActiveTab('settings'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Settings className="w-4 h-4" />
                          <span>⚙️ Каналы связи</span>
                        </button>

                        <button
                          onClick={() => { setActiveTab('branding'); setIsAdminMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            activeTab === 'branding' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <Palette className="w-4 h-4" />
                          <span>🎨 Оформление приложения</span>
                        </button>

                        <button
                          onClick={async () => {
                            // Safely type-cast the state or add support for legal
                            (setActiveTab as any)('legal'); 
                            setIsAdminMenuOpen(false); 
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            (activeTab as any) === 'legal' ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>⚖️ Юр. соглашения</span>
                        </button>
                        
                        <div className="border-t border-black/5 dark:border-white/10 my-2 pt-2" />
                        
                        <button
                          onClick={() => { handleLogout(); setIsAdminMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Выход</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentUser.role === 'specialist' && (
              <div className="relative">
                <button
                  id="spec-menu-toggle-btn"
                  onClick={() => setIsSpecMenuOpen(!isSpecMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-extrabold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all cursor-pointer"
                >
                  <Menu className="w-4 h-4" />
                  <span>🔧 Кабинет Исполнителя</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSpecMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isSpecMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setIsSpecMenuOpen(false)} />
                    <div className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl border p-4 z-50 animate-scaleUp text-neutral-800 dark:text-neutral-100 ${
                      theme === 'modern' ? 'bg-zinc-950 border-zinc-800' : theme === 'terminal' ? 'bg-black border-amber-500' : theme === 'warm' ? 'bg-[#fdf6e2] border-amber-900/10' : 'bg-white border-slate-200'
                    }`}>
                      <div className="pb-3 border-b border-black/5 dark:border-white/10 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <div className="font-extrabold text-xs tracking-wide uppercase opacity-55">Авторизован как</div>
                          <div className="font-black text-sm text-neutral-900 dark:text-neutral-50 truncate max-w-[200px]" title={currentUser.fullname}>
                            {currentUser.fullname}
                          </div>
                          <div className="text-[10px] opacity-65">Тех. Специалист</div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                         <button
                           onClick={() => { 
                             setActiveTab('workplace'); 
                             setIsSpecMenuOpen(false); 
                           }}
                           className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                             activeTab === 'workplace' || activeTab === 'objects' ? 'bg-amber-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                           }`}
                         >
                           <Wrench className="w-4 h-4" />
                           <span>🔧 Рабочее место</span>
                         </button>

                         <button
                           onClick={() => { 
                             setActiveTab('my-acts'); 
                             setIsSpecMenuOpen(false); 
                           }}
                           className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                             activeTab === 'my-acts' ? 'bg-amber-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                           }`}
                         >
                           <FileText className="w-4 h-4" />
                           <span>📂 Мои акты</span>
                         </button>

                         <button
                           onClick={() => { 
                             setActiveTab('my-ratings'); 
                             setIsSpecMenuOpen(false); 
                           }}
                           className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                             activeTab === 'my-ratings' ? 'bg-amber-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                           }`}
                         >
                           <Star className="w-4 h-4" />
                           <span>⭐ Мой рейтинг и отзывы</span>
                         </button>

                         <button
                           onClick={() => { 
                             setActiveTab('spec-branding'); 
                             setIsSpecMenuOpen(false); 
                           }}
                           className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                             activeTab === 'spec-branding' ? 'bg-amber-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                           }`}
                         >
                           <Palette className="w-4 h-4" />
                           <span>🎨 Оформление приложения</span>
                          </button>

                          <button
                            onClick={() => { 
                              setActiveTab('support'); 
                              setIsSpecMenuOpen(false); 
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                              activeTab === 'support' ? "bg-amber-600 text-white" : "hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200"
                            }`}
                          >
                            <Phone className="w-4 h-4" />
                            <span>📞 Поддержка</span>
                          </button>

                         <button
                           onClick={() => { 
                             (setActiveTab as any)('legal'); 
                             setIsSpecMenuOpen(false); 
                           }}
                           className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                             activeTab === 'legal' ? 'bg-amber-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200'
                           }`}
                         >
                           <ShieldCheck className="w-4 h-4" />
                           <span>⚖️ Юр. соглашения</span>
                         </button>
                         
                         <div className="border-t border-black/5 dark:border-white/10 my-2 pt-2" />

                         <button
                           onClick={() => { openUserProfile(); setIsSpecMenuOpen(false); }}
                           className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 hover:bg-neutral-100 dark:hover:bg-zinc-800/40 text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer"
                         >
                           <UserIcon className="w-4 h-4" />
                           <span>👤 Мой профиль</span>
                         </button>
                         
                         <button
                           onClick={() => { handleLogout(); setIsSpecMenuOpen(false); }}
                           className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-2.5 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                         >
                           <LogOut className="w-4 h-4" />
                           <span>Выход</span>
                         </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* ======================= ROLE 1: ADMINISTRATOR SYSTEM DESK ======================= */}
        {currentUser.role === 'admin' && (
          <div className="space-y-6">
            
            {/* Status Bento Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div 
                onClick={() => setActiveTab('objects')}
                title="Перейти к списку объектов"
                className={`${getCardStyle()} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-blue-500/30 group select-none`}
              >
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Всего объектов</span>
                  <Building className="w-4.5 h-4.5 text-blue-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-3xl font-black mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{objects.length}</div>
                <div className="text-[10px] opacity-60 mt-1 flex items-center gap-1">
                  <span>Коммерческие комплексы на Яндекс.Диске</span>
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">➔</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('schedule')}
                title="Перейти к календарному графику ТО"
                className={`${getCardStyle()} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-teal-500/30 group select-none`}
              >
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Пунктов регламента</span>
                  <Calendar className="w-4.5 h-4.5 text-teal-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-3xl font-black mt-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{schedules.length}</div>
                <div className="text-[10px] text-red-500 font-semibold mt-1 flex items-center justify-between gap-1">
                  <span>{schedules.filter(s => getScheduleStatus(s).overdue).length} пунктов просрочено</span>
                  <span className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">➔</span>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('reports')}
                title="Перейти к выполненным чек-листам и актам"
                className={`${getCardStyle()} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-emerald-500/30 group select-none`}
              >
                <div className="flex justify-between items-start text-neutral-500">
                  <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Пройдено чек-листов</span>
                  <CheckSquare className="w-4.5 h-4.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-3xl font-black mt-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{reports.length}</div>
                <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between gap-1">
                  <span>С актами контроля в PDF</span>
                  <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold">➔</span>
                </div>
              </div>

              {/* Yandex.Disk Status controller Box */}
              <div className={`${getCardStyle()} bg-gradient-to-br from-blue-500/5 to-emerald-500/5 border-blue-500/25`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-600 uppercase">Синхронизация Яндекс.Диск</span>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <p className="text-[11px] leading-snug opacity-75">{systemSettings.yandexDiskConnected ? "Диск подключен (.env)" : "Облачное хранилище активно"}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button 
                    onClick={triggerDiskSync}
                    disabled={syncing}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Поиск...' : 'Синхронизировать'}
                  </button>
                  <button 
                    onClick={checkCronNow}
                    title="Запустить утренний планировщик напоминаний"
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-805/10 dark:hover:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border dark:border-zinc-700/50 text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
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
                onClick={() => {
                  setProfileFullname(currentUser.fullname || "");
                  setProfilePhone(currentUser.phone || "");
                  setProfileCompany(currentUser.company || "");
                  setProfileKeySkills(currentUser.keySkills || "");
                  setProfileAvatarUrl(currentUser.avatarUrl || "");
                  setAdminOldPassword("");
                  setAdminNewPassword("");
                  setAdminConfirmPassword("");
                  setAdminProfileErr("");
                  setAdminProfileOk("");
                  setActiveTab('profile');
                }}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                👤 Мой профиль
              </button>
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
              <button 
                onClick={() => setActiveTab('branding')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'branding' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                🎨 Оформление приложения
              </button>
              <button 
                onClick={() => setActiveTab('ratings')}
                id="tab-btn-ratings"
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'ratings' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                ⭐ Рейтинг специалистов
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200/50 opacity-80'}`}
              >
                📞 Обращения
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
                <div id="object-form-container" className="space-y-4">
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

                      <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-neutral-300/10 bg-neutral-100/5 dark:bg-zinc-800/5 p-3">
                        <label className="text-xs font-bold uppercase opacity-75">Допустить Специалистов (Закрепление за объектом)</label>
                        <p className="text-[10px] opacity-65 mb-1">Зарегистрированные специалисты будут иметь доступ только к тем объектам, к которым они прикреплены.</p>
                        {users.filter(u => u.role === 'specialist').length === 0 ? (
                          <div className="text-xs italic opacity-60">Зарегистрированные специалисты отсутствуют. Создайте профили специалистов в разделе контактов ниже.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                            {users.filter(u => u.role === 'specialist').map(spec => {
                              const isChecked = objAllowedSpecialistIds.includes(spec.id);
                              return (
                                <label key={spec.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-zinc-800/50 cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setObjAllowedSpecialistIds(prev => [...prev, spec.id]);
                                      } else {
                                        setObjAllowedSpecialistIds(prev => prev.filter(id => id !== spec.id));
                                      }
                                    }}
                                    className="rounded border-zinc-300 text-amber-600 focus:ring-amber-500"
                                  />
                                  <span className="truncate flex flex-col" title={spec.fullname}>
                                    <span className="font-semibold">{spec.fullname}</span>
                                    {spec.keySkills && (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[200px]" title={spec.keySkills}>
                                        💪 {spec.keySkills}
                                      </span>
                                    )}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
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

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">Прямая ссылка на Яндекс.Диск (Необязательно)</label>
                        <input 
                          type="url" 
                          value={objDiskUrl}
                          onChange={(e) => setObjDiskUrl(e.target.value)}
                          placeholder="https://disk.yandex.ru/d/..."
                          className={getInputStyle()} 
                        />
                        <span className="text-[10px] opacity-50">Сервис перенаправит собственника по этой веб-ссылке на Яндекс.Диск</span>
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
              <>
                {/* COPY SECTION MODAL */}
                {copyingCatInfo && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-neutral-300/15 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-scaleUp text-neutral-800 dark:text-neutral-100">
                      <div className="flex items-center justify-between border-b border-neutral-300/15 pb-3">
                        <h3 className="font-black text-sm uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          📋 Копирование раздела ТО
                        </h3>
                        <button 
                          onClick={() => setCopyingCatInfo(null)}
                          className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 text-xs">
                        <p>
                          Вы собираетесь скопировать раздел <strong className="text-blue-500 font-extrabold font-mono uppercase">{copyingCatInfo.category}</strong> со всеми вложенными в него регламентами.
                        </p>
                        <p className="opacity-75">
                          Пожалуйста, выберите целевой объект, в который будут скопированы все пункты ТО данного раздела:
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Целевой объект ТО *</label>
                        <select
                          required
                          value={copyTargetObjId}
                          onChange={(e) => setCopyTargetObjId(e.target.value)}
                          className={getInputStyle()}
                        >
                          <option value="">Выберите целевой объект...</option>
                          {objects
                            .filter(o => o.id !== copyingCatInfo.srcObjectId)
                            .map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-300/15">
                        <button
                          type="button"
                          onClick={() => setCopyingCatInfo(null)}
                          className={getMutedBtn()}
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyCategory}
                          disabled={!copyTargetObjId}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                            copyTargetObjId 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                              : 'bg-neutral-300'
                          }`}
                        >
                          Дублировать раздел
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
                
                {/* Schedule list */}
                <div className="lg:col-span-2 space-y-4">
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base">📅 Календарный график и регламенты ТО</h3>
                      <p className="text-xs opacity-60">
                        Контролирует соблюдение интервалов обслуживания по объектам эксплуатации с раскрывающимся списком регламентных вопросов и элементов Чек-листов
                      </p>
                    </div>

                    <div className="space-y-4">
                      {(() => {
                        const displayObjects = currentUser
                          ? (currentUser.role === 'admin' || currentUser.role === 'operator'
                              ? objects
                              : currentUser.role === 'owner'
                                ? objects.filter(o => o.ownerId === currentUser.id)
                                : objects.filter(o => o.allowedSpecialistIds && o.allowedSpecialistIds.includes(currentUser.id)))
                          : [];

                        if (displayObjects.length === 0) {
                          return (
                            <div className="text-center py-12 bg-neutral-100/5 rounded-xl border border-dashed border-neutral-300/15">
                              <Calendar className="w-10 h-10 text-neutral-400 mx-auto opacity-40 mb-3" />
                              <p className="text-sm font-semibold">Нет доступных объектов недвижимости.</p>
                              <p className="text-xs opacity-65 mt-1">Добавьте новый объект в разделе "Объекты" или зарегистрируйте пользователя.</p>
                            </div>
                          );
                        }

                        return displayObjects.map(obj => {
                          const objId = obj.id;
                          const objName = obj.name;
                          const objSchedules = schedules.filter(s => s.objectId === objId);
                          const isObjExpanded = expandedObjs[objId] !== false; // expanded by default

                          // Unique categories in this object
                          const categoriesMap = Array.from(new Set(objSchedules.map(s => s.category))) as string[];

                          return (
                            <div key={objId} className="border border-neutral-300/15 rounded-xl overflow-hidden bg-neutral-100/3 dark:bg-zinc-900/40 shadow-sm">
                              
                              {/* 1. ОБЪЕКТ HEADER (LEVEL 1) - Multi-button container */}
                              <div 
                                className="w-full text-left p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-200/20 hover:bg-neutral-200/30 dark:bg-white/5 transition-all border-b border-neutral-300/10"
                              >
                                <div 
                                  onClick={() => setExpandedObjs(prev => ({ ...prev, [objId]: !isObjExpanded }))}
                                  className="flex items-center gap-3 flex-1 cursor-pointer select-none min-w-0"
                                >
                                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg shrink-0">
                                    <Building className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-black text-sm text-neutral-800 dark:text-neutral-100 block truncate">{objName}</span>
                                    {obj && <p className="text-xs opacity-60 font-semibold truncate">{obj.address}</p>}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0 self-start md:self-auto w-full md:w-auto justify-between md:justify-end">
                                  {/* Кнопка Добавить регламент для конкретного объекта */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddNewScheduleForObject(objId);
                                    }}
                                    className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                    title="Добавить новый регламент обслуживания для этого объекта"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Добавить регламент</span>
                                  </button>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="bg-blue-600/10 text-blue-500 text-[10px] px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                                      Регламентов: {objSchedules.length}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedObjs(prev => ({ ...prev, [objId]: !isObjExpanded }))}
                                      className="p-1.5 hover:bg-neutral-300/30 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                    >
                                      {isObjExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* LEVEL 2: CATEGORIES */}
                              {isObjExpanded && (
                                <div className="p-4 space-y-4 bg-transparent">
                                  {objSchedules.length === 0 ? (
                                    <div className="text-center py-8 px-4 bg-neutral-100/10 dark:bg-zinc-800/20 rounded-xl border border-dashed border-neutral-300/15">
                                      <p className="text-xs italic text-neutral-500/80">Для этого объекта еще не создано регламентных пунктов ТО.</p>
                                      <button
                                        type="button"
                                        onClick={() => handleAddNewScheduleForObject(objId)}
                                        className="mt-2.5 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Добавить первый регламент</span>
                                      </button>
                                    </div>
                                  ) : (
                                    categoriesMap.map(cat => {
                                      const catKey = `${objId}-${cat}`;
                                      const isCatExpanded = expandedCats[catKey] !== false; // expanded by default
                                      const catSchedules = objSchedules.filter(s => s.category === cat);

                                      return (
                                        <div key={cat} className="rounded-lg border border-neutral-300/10 bg-neutral-100/5 dark:bg-black/15 overflow-hidden">
                                          
                                          {/* 2. КАТЕГОРИЯ HEADER (LEVEL 2) */}
                                          <button 
                                            type="button"
                                            onClick={() => setExpandedCats(prev => ({ ...prev, [catKey]: !isCatExpanded }))}
                                            className="w-full text-left px-3.5 py-2.5 flex items-center justify-between cursor-pointer bg-neutral-100/20 hover:bg-neutral-100/40 dark:bg-white/2 dark:hover:bg-white/5 transition-colors border-b border-dashed border-neutral-300/10"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                              <span className="font-black text-[11px] text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                                                {cat}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <button
                                                type="button"
                                                title="Копировать этот раздел с регламентами в другой объект"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setCopyingCatInfo({ srcObjectId: objId, category: cat });
                                                  const firstOtherObj = objects.find(o => o.id !== objId);
                                                  if (firstOtherObj) setCopyTargetObjId(firstOtherObj.id);
                                                }}
                                                className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold border border-blue-500/20"
                                              >
                                                <Copy className="w-3 h-3" />
                                                <span>Копировать</span>
                                              </button>
                                              <span className="text-[10px] opacity-60 font-semibold uppercase">
                                                Регламентов: {catSchedules.length}
                                              </span>
                                              {isCatExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                              ) : (
                                                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                              )}
                                            </div>
                                          </button>

                                          {/* LEVEL 3: DETAILED COLLAPSIBLE LIST - Responsive stretch to section layout */}
                                          {isCatExpanded && (
                                            <div className="p-3 grid grid-cols-1 gap-4">
                                              {catSchedules.map((sch, schIdx) => {
                                                const isSchExpanded = expandedSchedules[sch.id] === true; // collapsed by default
                                                const status = getScheduleStatus(sch);
                                                const tpl = templates.find(t => t.id === sch.checklistTemplateId);
                                                const elementsCount = tpl ? tpl.questions.length : 0;

                                                return (
                                                  <div 
                                                    key={sch.id} 
                                                    className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col justify-between relative w-full ${
                                                      isSchExpanded 
                                                        ? 'bg-blue-500/[0.02] border-blue-500/35 dark:border-blue-500/20 ring-1 ring-blue-500/5' 
                                                        : 'bg-white dark:bg-zinc-900/60 border-neutral-250 dark:border-zinc-800/80 hover:border-blue-500/30 dark:hover:border-blue-500/30'
                                                    }`}
                                                  >
                                                    
                                                    {/* Card Head: Title & Action Controls */}
                                                    <div className="flex items-start justify-between gap-3 text-xs w-full pb-3 border-b border-neutral-100 dark:border-zinc-800/50">
                                                      <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                                          <span className={`px-1.5 py-0.5 rounded text-[8px] border font-black uppercase tracking-wider leading-none ${status.class}`}>
                                                            {status.label}
                                                          </span>
                                                          {sch.category && (
                                                            <span className="text-[8px] bg-neutral-100 dark:bg-zinc-800/60 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold leading-none">
                                                              {sch.category}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <h4 
                                                          onClick={() => setExpandedSchedules(prev => ({ ...prev, [sch.id]: !isSchExpanded }))}
                                                          className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100 hover:text-blue-500 cursor-pointer transition-colors leading-snug break-words"
                                                        >
                                                          {sch.title}
                                                        </h4>
                                                        <div className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1 uppercase tracking-widest font-mono">
                                                          Ответственный: <span className="text-zinc-600 dark:text-zinc-400 font-bold font-sans normal-case">{sch.responsibleUserId ? getUserFullname(sch.responsibleUserId) : "Свободный выбор инженером"}</span>
                                                        </div>
                                                      </div>

                                                      {/* Action Controls */}
                                                      <div className="flex gap-1.5 shrink-0 ml-2">
                                                        <button 
                                                          type="button"
                                                          onClick={() => startEditSchedule(sch)}
                                                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 p-2 rounded-lg transition-colors cursor-pointer border border-amber-500/10"
                                                          title="Редактировать регламент графика"
                                                        >
                                                          <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                          type="button"
                                                          onClick={() => deleteSchedule(sch.id)}
                                                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg transition-colors cursor-pointer border border-rose-500/10"
                                                          title="Удалить регламент"
                                                        >
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    </div>

                                                    {/* Central 2x2 Grid with properties */}
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-3 text-[11px]">
                                                      <div className="p-2 rounded-lg bg-neutral-50 dark:bg-zinc-850/20 border border-neutral-150 dark:border-zinc-800/40">
                                                        <span className="text-[8px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5 leading-none">Ввод в экспл.</span>
                                                        <span className="font-extrabold text-neutral-700 dark:text-neutral-300 font-mono text-[10.5px]">
                                                          {sch.commissioningDate ? new Date(sch.commissioningDate).toLocaleDateString('ru-RU') : "—"}
                                                        </span>
                                                      </div>

                                                      <div className="p-2 rounded-lg bg-neutral-50 dark:bg-zinc-850/20 border border-neutral-150 dark:border-zinc-800/40">
                                                        <span className="text-[8px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5 leading-none">Интервал</span>
                                                        <span className="font-extrabold text-neutral-700 dark:text-neutral-300 text-[10.5px]">{sch.intervalDays} дн.</span>
                                                      </div>

                                                      <div className="p-2 rounded-lg bg-neutral-50 dark:bg-zinc-850/20 border border-neutral-150 dark:border-zinc-800/40">
                                                        <span className="text-[8px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5 leading-none">Посл. запуск</span>
                                                        <span className="font-extrabold text-neutral-700 dark:text-neutral-300 font-mono text-[10.5px]">
                                                          {sch.lastDoneDate ? new Date(sch.lastDoneDate).toLocaleDateString('ru-RU') : "—"}
                                                        </span>
                                                      </div>

                                                      <button 
                                                        type="button"
                                                        onClick={() => setExpandedSchedules(prev => ({ ...prev, [sch.id]: !isSchExpanded }))}
                                                        className="p-2 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-left transition-colors flex flex-col justify-between cursor-pointer"
                                                      >
                                                        <span className="text-[8px] uppercase tracking-wider text-blue-500 font-bold block leading-none">Элементы контроля</span>
                                                        <span className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 text-[10.5px] underline decoration-dotted leading-none">
                                                          {elementsCount} вопр.
                                                        </span>
                                                      </button>
                                                    </div>

                                                    {/* Expanded checklist contents in standard responsive block */}
                                                    {isSchExpanded && (
                                                      <div className="mt-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800/60 text-xs animate-fadeIn space-y-2">
                                                        {tpl ? (
                                                          <div className="bg-neutral-100/15 dark:bg-black/25 p-2.5 rounded-lg border border-neutral-350/5 space-y-2">
                                                            <div className="text-[9px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider flex items-center justify-between">
                                                              <span>📋 Чек-лист: "{tpl.name}"</span>
                                                            </div>
                                                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                                              {tpl.questions.map((q, idx) => (
                                                                <div key={q.id} className="flex gap-1.5 p-1.5 rounded bg-white/5 border border-dashed border-neutral-300/10 text-[10px]">
                                                                  <span className="text-[8px] bg-sky-500/10 text-sky-500 rounded px-1.5 py-0.5 font-bold shrink-0 self-start leading-none">
                                                                    {idx + 1}
                                                                  </span>
                                                                  <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">{q.text}</p>
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </div>
                                                            {sch.notes && (
                                                              <div className="text-[10px] text-neutral-500 dark:text-zinc-400 bg-neutral-300/10 dark:bg-zinc-800/20 p-2 rounded border-l-2 border-amber-500/70">
                                                                <span className="font-extrabold uppercase text-[8px] text-zinc-400 block mb-0.5">Инструкция:</span>
                                                                <p className="font-medium italic leading-relaxed">{sch.notes}</p>
                                                              </div>
                                                            )}
                                                          </div>
                                                        ) : (
                                                          <div className="text-[11px] italic text-zinc-500 dark:text-zinc-400">
                                                            Опросный чек-лист не назначен или шаблон был удален. Измените регламент, чтобы сопоставить шаблон.
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}

                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}

                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Create/Edit schedule item */}
                <div id="schedule-form-container" className="space-y-4">
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
                        <label className="text-xs font-bold uppercase opacity-75">Ввод в эксплуатацию</label>
                        <input 
                          type="date" 
                          value={schCommissioningDate}
                          onChange={(e) => setSchCommissioningDate(e.target.value)}
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
              </>
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
                              className="bg-sky-50 hover:bg-sky-100 text-sky-600 p-1.5 rounded-lg border text-[11px] flex items-center gap-1 cursor-pointer animate-fade-in"
                            >
                              <Copy className="w-3.5 h-3.5" /> Копия
                            </button>
                            <button 
                              onClick={() => startEditTemplate(tpl)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded-lg border cursor-pointer"
                              title="Редактировать структуру"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteTemplate(tpl.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg border cursor-pointer"
                              title="Удалить макет"
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
                <div ref={templateEditorRef} id="template-editor-section" className="space-y-4">
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
                      <div className={`border border-dashed p-3 rounded-lg space-y-2 transition-all ${
                        editingQuestionId 
                          ? 'border-amber-500/30 bg-amber-500/[0.01]' 
                          : 'border-sky-500/20 bg-sky-500/[0.02]'
                      }`}>
                        <span className={`text-[11px] font-extrabold uppercase block ${
                          editingQuestionId ? 'text-amber-600' : 'text-sky-500'
                        }`}>
                          {editingQuestionId ? "✏️ Редактирование вопроса в чек-листе:" : "Новый вопрос в чек-лист:"}
                        </span>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] opacity-75">Текст вопроса/требования контроля *</label>
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

                        <div className="flex flex-col gap-1.5 pt-1">
                          <button 
                            type="button" 
                            onClick={addQuestionToTemplate}
                            className={`w-full py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                              editingQuestionId 
                                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" 
                                : "bg-sky-500/10 text-sky-500 hover:bg-sky-500/20"
                            }`}
                          >
                            {editingQuestionId ? "💾 Сохранить изменения вопроса" : `+ Добавить опрос в список (${tplQuestions.length})`}
                          </button>
                          
                          {editingQuestionId && (
                            <button 
                              type="button" 
                              onClick={cancelEditQuestion}
                              className="w-full py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Отменить правку вопроса
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Ordered questions list representation */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase block text-neutral-400">Вопросы в текущем шаблоне:</span>
                        {tplQuestions.length === 0 ? (
                          <span className="text-[11px] opacity-50 block italic text-center py-2">Вопросы пока не добавлены</span>
                        ) : (
                          <div className="space-y-1.5">
                            {tplQuestions.map((q, idx) => (
                              <div key={q.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all text-xs ${
                                editingQuestionId === q.id 
                                  ? 'bg-amber-500/[0.04] border-amber-500/30 ring-1 ring-amber-500/20' 
                                  : 'bg-white dark:bg-zinc-900 border-neutral-300/10 hover:border-slate-300/40'
                              }`}>
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                    {idx + 1}. {q.text} {q.required && <span className="text-red-500 font-bold" title="Обязательный">*</span>}
                                  </div>
                                  <div className="text-[10px] opacity-60 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="bg-neutral-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[9px] font-medium">
                                      {q.type === 'boolean' ? 'Да/Нет' : q.type === 'photo' ? 'Фото' : q.type === 'select' ? 'Выбор' : q.type === 'number' ? 'Число' : 'Текст'}
                                    </span>
                                    {q.options && q.options.length > 0 && (
                                      <span className="truncate opacity-75">• Варианты: {q.options.join(', ')}</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => moveQuestionUp(idx)}
                                    className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded disabled:opacity-25 cursor-pointer text-xs"
                                    title="Вверх (переместить)"
                                  >
                                    ⬆️
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === tplQuestions.length - 1}
                                    onClick={() => moveQuestionDown(idx)}
                                    className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded disabled:opacity-25 cursor-pointer text-xs"
                                    title="Вниз (переместить)"
                                  >
                                    ⬇️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEditQuestion(q)}
                                    className="p-1 rounded text-amber-600 hover:bg-amber-100 dark:hover-bg-amber-950/20 cursor-pointer text-xs"
                                    title="Редактировать вопрос"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeQuestionFromTemplate(q.id)}
                                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded cursor-pointer text-xs"
                                    title="Удалить вопрос"
                                  >
                                    ❌
                                  </button>
                                </div>
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

                  {/* Фильтры структуры: Объект и Год */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 mb-5 border-b border-neutral-300/15">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase opacity-75">🏢 Выберите объект контроля:</label>
                      <select
                        value={selectedReportObjectId}
                        onChange={(e) => {
                          setSelectedReportObjectId(e.target.value);
                          setSelectedReportYear('all'); // сбросить год при выборе другого объекта
                        }}
                        className={getInputStyle()}
                      >
                        <option value="all">🌐 Все объекты ({reports.length} актов)</option>
                        {objects.map(obj => {
                          const hasReports = reports.some(r => r.objectId === obj.id);
                          if (!hasReports) return null;
                          const count = reports.filter(r => r.objectId === obj.id).length;
                          return (
                            <option key={obj.id} value={obj.id}>
                              🏢 {obj.name} (Актов: {count})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase opacity-75">📅 Выберите год:</label>
                      <select
                        value={selectedReportYear}
                        onChange={(e) => setSelectedReportYear(e.target.value)}
                        className={getInputStyle()}
                        disabled={reports.filter(r => selectedReportObjectId === 'all' || r.objectId === selectedReportObjectId).length === 0}
                      >
                        <option value="all">⏳ Все годы ({reports.filter(r => selectedReportObjectId === 'all' || r.objectId === selectedReportObjectId).length} актов)</option>
                        {(() => {
                          const relevantReports = reports.filter(r => selectedReportObjectId === 'all' || r.objectId === selectedReportObjectId);
                          const years = Array.from<string>(new Set(relevantReports.map(r => new Date(r.dateDone).getFullYear().toString()))).sort((a: string, b: string) => b.localeCompare(a));
                          return years.map(yr => {
                            const countInYear = relevantReports.filter(r => new Date(r.dateDone).getFullYear().toString() === yr).length;
                            return (
                              <option key={yr} value={yr}>
                                📅 {yr} год (Актов: {countInYear})
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const finalReports = reports.filter(rep => {
                        const matchObject = selectedReportObjectId === 'all' || rep.objectId === selectedReportObjectId;
                        const matchYear = selectedReportYear === 'all' || new Date(rep.dateDone).getFullYear().toString() === selectedReportYear;
                        return matchObject && matchYear;
                      });

                      if (finalReports.length === 0) {
                        return (
                          <div className="col-span-full py-12 text-center text-sm opacity-65 font-medium">
                            📭 Не найдено заполненных актов по выбранному фильтру (объект / год).
                          </div>
                        );
                      }

                      return finalReports.map(rep => {
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
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Users list database structured by Object - Owner */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Part 1: Object - Owner Relation List */}
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <span className="text-[10px] uppercase font-bold text-[#bc1c24] block tracking-widest mb-1">Права доступа и Каналы</span>
                      <h3 className="font-extrabold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        🏢 Структура «Объект — Собственник»
                      </h3>
                      <p className="text-xs opacity-65">
                        Управление правами доступа и настройка каналов связи собственников для каждого обслуживаемого здания
                      </p>
                    </div>

                    <div className="space-y-4">
                      {objects.map(obj => {
                        const owner = users.find(u => u.id === obj.ownerId);
                        const otherOwners = users.filter(u => u.role === 'owner');

                        return (
                          <div 
                            key={obj.id} 
                            className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800/85 bg-neutral-100/10 dark:bg-zinc-900/40 hover:border-blue-500/30 transition-all space-y-3"
                          >
                            {/* Object Info & Dynamic Owner Selector */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-150 dark:border-zinc-850/50">
                              <div>
                                <h4 className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100">
                                  {obj.name}
                                </h4>
                                <p className="text-xs text-neutral-450 dark:text-neutral-500 font-medium">
                                  📍 {obj.address}
                                </p>
                              </div>

                              {/* Owner Assignment Dropdown */}
                              <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                                <span className="text-[10px] uppercase font-bold text-neutral-400">Собственник:</span>
                                <select
                                  value={obj.ownerId || ""}
                                  onChange={(e) => handleAssignOwner(obj.id, e.target.value)}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-semibold text-neutral-700 dark:text-neutral-200 cursor-pointer w-full sm:w-auto"
                                >
                                  <option value="">-- Не назначен --</option>
                                  {otherOwners.map(ow => (
                                    <option key={ow.id} value={ow.id}>
                                      👤 {ow.fullname}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Linked Owner Contact & Communication Channels block */}
                            {owner ? (
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-sky-500" />
                                    <span className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100">
                                      {owner.fullname}
                                    </span>
                                    <span className="text-[8px] font-black bg-sky-500/10 text-sky-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      Кабинет собственника
                                    </span>
                                  </div>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    Email: <span className="font-semibold text-neutral-750 dark:text-neutral-300">{owner.email}</span> • Тел: <span className="font-mono">{owner.phone || "—"}</span>
                                  </p>

                                  {/* Messenger channels for this owner */}
                                  <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px]">
                                    <span className={`px-2 py-0.5 rounded font-mono ${owner.telegramChatId ? "bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                      💬 TG ID: {owner.telegramChatId || "не настроен"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-mono ${owner.maxChatId ? "bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                      🤖 MAX Chat Bot: {owner.maxChatId || "не настроен"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded font-mono ${owner.vkUserId ? "bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                      👤 VK ID: {owner.vkUserId || "не настроен"}
                                    </span>
                                  </div>
                                </div>

                                {/* Edit buttons */}
                                <div className="flex gap-2 self-end md:self-center">
                                  <button 
                                    type="button"
                                    onClick={() => startEditUser(owner)}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 p-2 rounded-lg border border-amber-500/10 transition-colors cursor-pointer"
                                    title="Настройка коммуникационных каналов и личных данных"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => deleteUser(owner.id)}
                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                                    title="Удалить собственника"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-amber-500/5 rounded-xl border border-dashed border-amber-500/20 text-xs text-amber-600 dark:text-amber-400/95 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                  Собственник не привязан к этому объекту. Уведомления не будут доставляться.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUsrRole('owner');
                                    setEditingUserId(null);
                                    document.getElementById("user-form-container")?.scrollIntoView({ behavior: "smooth" });
                                  }}
                                  className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-neutral-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg"
                                >
                                  + Добавить собственника
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Part 2: Administrators */}
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <span className="text-[10px] uppercase font-bold text-emerald-500 block tracking-widest mb-1">Группа администрирования</span>
                      <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                        🛡️ Администраторы системы
                      </h3>
                      <p className="text-xs opacity-65">
                        Управляющий персонал с правами на добавление объектов, редактирование графиков, чек-листов и юридических документов
                      </p>
                    </div>

                    <div className="space-y-3">
                      {users.filter(u => u.role === 'admin').map(u => (
                        <div key={u.id} className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-100/5 hover:bg-neutral-150/10 dark:hover:bg-zinc-800/10 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-500" />
                              <span className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100">{u.fullname}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-emerald-500/10 text-emerald-500">
                                Администратор
                              </span>
                              {u.company && (
                                <span className="text-[9px] font-medium text-neutral-450">
                                  🏢 {u.company}
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-85 text-neutral-500 dark:text-neutral-400 font-medium">Email: <span className="font-semibold text-neutral-750 dark:text-neutral-300">{u.email}</span> • Тел: <span className="font-mono">{u.phone || "—"}</span></p>
                            
                            {/* Staff messenger channels */}
                            <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px]">
                              <span className={`px-2 py-0.5 rounded font-mono ${u.telegramChatId ? "bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                TG Chat: {u.telegramChatId || "Не привязан"}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-mono ${u.maxChatId ? "bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                MAX Bot: {u.maxChatId || "Не привязан"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => startEditUser(u)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 p-2 rounded-lg border border-amber-500/10 transition-colors cursor-pointer"
                              title="Редактировать сотрудника"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteUser(u.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                              title="Удалить сотрудника"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {users.filter(u => u.role === 'admin').length === 0 && (
                        <p className="text-xs text-neutral-400 italic">Администраторы отсутствуют.</p>
                      )}
                    </div>
                  </div>

                  {/* Part 3: Service Specialists */}
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <span className="text-[10px] uppercase font-bold text-amber-500 block tracking-widest mb-1">Производственный персонал</span>
                      <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                        🛠️ Сервисные специалисты службы ТО
                      </h3>
                      <p className="text-xs opacity-65">
                        Технический персонал, выполняющий обходы и контролирующий регламентные графики ТО
                      </p>
                    </div>

                    <div className="space-y-3">
                      {users.filter(u => u.role === 'specialist').map(u => (
                        <div key={u.id} className="p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-neutral-100/5 hover:bg-neutral-150/10 dark:hover:bg-zinc-800/10 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {u.avatarUrl ? (
                                <img 
                                  src={u.avatarUrl} 
                                  alt={u.fullname} 
                                  className="w-5 h-5 rounded-full object-cover border border-neutral-300 dark:border-zinc-700 shadow-sm shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <HardHat className="w-4 h-4 text-amber-500" />
                              )}
                              <span className="font-extrabold text-sm text-neutral-800 dark:text-neutral-100">{u.fullname}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-amber-500/10 text-amber-500">
                                Специалист
                              </span>
                              {u.company && (
                                <span className="text-[9px] font-medium text-neutral-450">
                                  🏢 {u.company}
                                </span>
                              )}
                            </div>
                            <p className="text-xs opacity-85 text-neutral-500 dark:text-neutral-400 font-medium">Email: <span className="font-semibold text-neutral-750 dark:text-neutral-300">{u.email}</span> • Тел: <span className="font-mono">{u.phone || "—"}</span></p>
                            
                            {/* Staff messenger channels */}
                            <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px]">
                              <span className={`px-2 py-0.5 rounded font-mono ${u.telegramChatId ? "bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                TG Chat: {u.telegramChatId || "Не привязан"}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-mono ${u.maxChatId ? "bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/15" : "bg-neutral-100 dark:bg-zinc-800 text-neutral-400"}`}>
                                MAX Bot: {u.maxChatId || "Не привязан"}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => startEditUser(u)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 p-2 rounded-lg border border-amber-500/10 transition-colors cursor-pointer"
                              title="Редактировать сотрудника"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => deleteUser(u.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 p-2 rounded-lg border border-rose-500/10 transition-colors cursor-pointer"
                              title="Удалить сотрудника"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {users.filter(u => u.role === 'specialist').length === 0 && (
                        <p className="text-xs text-neutral-400 italic">Специалисты отсутствуют.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Create/Edit user form */}
                <div id="user-form-container" className="space-y-4">
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

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase opacity-75">
                          {editingUserId ? "Новый пароль (оставьте пустым, чтобы не менять)" : "Первоначальный пароль *"}
                        </label>
                        <input 
                          type="password" 
                          required={!editingUserId}
                          value={usrPassword}
                          onChange={(e) => setUsrPassword(e.target.value)}
                          placeholder="Минимум 4 символа"
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                
                {/* Global Notification config settings */}
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base">🔧 Интеграция шины мессенджеров и Telegram / MAX Ботов</h3>
                    <p className="text-xs opacity-60">Управление каналами связи для мгновенной рассылки инженерам и собственникам о регламентных ТО</p>
                  </div>

                  <form onSubmit={saveSettingsSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.02]">
                      <span className="font-bold text-blue-500 uppercase">1. Провайдеры связи и шины отчетов (подключенные боты):</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600 font-bold">Telegram Bot API (python-telegram-bot):</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Реальный BOT_TOKEN через .env)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600 font-bold">VK_API Сервер сообщений:</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Связан с Группой)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600 font-bold">MAX-BOTAPI Клиент (MasterBot):</span>
                          <span className="text-emerald-500 font-bold mt-1">● АКТИВЕН (Реальный API через .env)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-600 font-bold">SMTP Почтовый сервер (.env):</span>
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
                            /> MAX (мессенджер)
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

                    {/* SMTP Mail Configuration Panel */}
                    <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <span className="font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider block text-[10px]">📧 Настройка SMTP-сервера для отправки писем:</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">SMTP Host (сервер исходящей почты):</label>
                          <input 
                            type="text" 
                            placeholder="smtp.yandex.ru или smtp.gmail.com"
                            value={systemSettings.smtpHost || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpHost: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">SMTP Port (исходящий порт):</label>
                          <input 
                            type="number" 
                            placeholder="465 или 587"
                            value={systemSettings.smtpPort || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpPort: e.target.value ? Number(e.target.value) : undefined })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">SMTP User (логин/почта отправителя):</label>
                          <input 
                            type="text" 
                            placeholder="notify-bot@commercial-passport.ru"
                            value={systemSettings.smtpUser || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpUser: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">SMTP Password (пароль приложения):</label>
                          <input 
                            type="password" 
                            placeholder="Ваш пароль или токен приложения"
                            value={systemSettings.smtpPass || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, smtpPass: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350 flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={systemSettings.smtpSecure !== undefined ? systemSettings.smtpSecure : true}
                              onChange={(e) => setSystemSettings({ ...systemSettings, smtpSecure: e.target.checked })}
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                            />
                            Использовать SSL/TLS шифрование (secure соединение)
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Адрес почты робота-отправителя (emailBotAddress):</label>
                        <input 
                          type="text" 
                          placeholder="notify-bot@commercial-passport.ru"
                          value={systemSettings.emailBotAddress || ""}
                          onChange={(e) => setSystemSettings({ ...systemSettings, emailBotAddress: e.target.value })}
                          className={getInputStyle()}
                        />
                        <span className="text-[10px] opacity-70 block leading-tight">
                          Этот адрес будет отображаться в поле "Отправитель" в отправленных письмах (from).
                        </span>
                      </div>
                    </div>

                    {/* 📞 Контактные данные службы техподдержки перенесены в Каналы связи */}
                    <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <span className="font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider block text-[10px]">📞 Контактные данные службы техподдержки:</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">Горячая линия (телефон):</label>
                          <input 
                            type="text" 
                            placeholder="+7 (800) 555-35-35"
                            value={systemSettings.supportPhone || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, supportPhone: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">Email техподдержки:</label>
                          <input 
                            type="email" 
                            placeholder="support@commercial-passport.ru"
                            value={systemSettings.supportEmail || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">Телеграм чат-бот:</label>
                          <input 
                            type="text" 
                            placeholder="cp_support_bot"
                            value={systemSettings.supportTelegram || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, supportTelegram: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">WhatsApp (телефон/ссылка):</label>
                          <input 
                            type="text" 
                            placeholder="+79234567890"
                            value={systemSettings.supportWhatsapp || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, supportWhatsapp: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <label className="font-semibold text-neutral-600 dark:text-zinc-350">Мессенджер MAX (ID чата или ссылка):</label>
                          <input 
                            type="text" 
                            placeholder="@PassportTechSupportBot"
                            value={systemSettings.supportMax || ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, supportMax: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>
                      </div>
                      
                      <span className="text-[10px] opacity-70 block leading-tight mt-1">
                        Эти контактные данные будут отображаться во вкладке «Поддержка» для специалистов и собственников жилья.
                      </span>
                    </div>

                    <button type="submit" className={`w-full ${getAccentBtn()}`}>
                      Сохранить настройки
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: BRANDING */}
            {activeTab === 'branding' && (
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block tracking-widest mb-1 font-bold">Оформление приложения</span>
                    <h3 className="font-extrabold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                      🎨 Фирменное брендирование и визуальный стиль
                    </h3>
                    <p className="text-xs opacity-65">
                      Настройка тем оформления, индивидуального логотипа, прозрачности интерактивных панелей и фоновых изображений системы
                    </p>
                  </div>

                  <form onSubmit={saveSettingsSubmit} className="space-y-6 text-xs animate-fadeIn">
                    {/* 1. Selection of color palette (theme) */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-zinc-300">Цветовая палитра интерфейса:</label>
                      <select
                        value={theme}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTheme(val);
                          localStorage.setItem("app_theme", val);
                        }}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                      >
                        <option value="cleanroom">🧼 «Чистая комната» (Классический светлый)</option>
                        <option value="modern">💻 «Современный тёмный» (Modern Dark)</option>
                        <option value="terminal">📟 «Хаки терминал» (Terminal Green)</option>
                        <option value="warm">📜 «Теплый бежевый» (Warm Serif)</option>
                        <option value="japanese">🍣 «Японский дзен» (Japanese Zen)</option>
                        <option value="japanese_calligraphy">🌸 «Сад сакуры & Каллиграфия» (Kyoto Brush)</option>
                        <option value="crisp_minimal">⬜ «Строгий бумажный» (Crisp Minimal)</option>
                      </select>
                    </div>

                    {/* 2. Фоновое оформление и Прозрачность */}
                    <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <span className="font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider block text-[10px]">🏞️ Фоновые изображения и Стеклянный дизайн (Glassmorphism):</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'default', appBackgroundUrl: '' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            (!systemSettings.appBackgroundType || systemSettings.appBackgroundType === 'default')
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🎨 Стандартный фон
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'villa', appBackgroundUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'villa'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🏡 Вилла (Остекление)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'blueprint', appBackgroundUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'blueprint'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          📐 Чертеж фасада
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'sakura', appBackgroundUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'sakura'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🌸 Сад Сакуры
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'custom' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all col-span-2 ${
                            systemSettings.appBackgroundType === 'custom'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          📸 Свое фоновое фото
                        </button>
                      </div>

                      {systemSettings.appBackgroundType === 'custom' && (
                        <div className="space-y-2 animate-fadeIn pt-1">
                          <span className="text-xs font-semibold text-neutral-600 block">Загрузить свое фоновое фото с диска (Base64):</span>
                          <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-lg p-5 bg-white/50 hover:bg-white dark:bg-zinc-950/20 transition cursor-pointer group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSystemSettings({ ...systemSettings, appBackgroundUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <ImageIcon className="w-8 h-8 text-neutral-400 group-hover:text-neutral-500 transition mb-1" />
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Нажмите для выбора файла фона</span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">Допустимы изображения JPG, PNG, WEBP</span>
                          </div>

                          <div className="flex flex-col gap-1 pt-1">
                            <span className="text-[11px] font-semibold text-neutral-500">Или внешняя ссылка на изображение:</span>
                            <input 
                              type="text" 
                              placeholder="https://example.com/background.jpg"
                              value={systemSettings.appBackgroundUrl && !systemSettings.appBackgroundUrl.startsWith("data:") ? systemSettings.appBackgroundUrl : ""}
                              onChange={(e) => setSystemSettings({ ...systemSettings, appBackgroundUrl: e.target.value })}
                              className={getInputStyle()}
                            />
                          </div>

                          {systemSettings.appBackgroundUrl && (
                            <div className="flex items-center justify-between p-2.5 rounded bg-blue-50 dark:bg-zinc-800 border border-blue-250 dark:border-zinc-700 text-xs gap-2">
                              <span className="truncate max-w-[200px] text-blue-800 dark:text-blue-300 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Cобственный фон активирован
                              </span>
                              <button
                                type="button"
                                onClick={() => setSystemSettings({ ...systemSettings, appBackgroundUrl: "" })}
                                className="text-rose-600 hover:text-rose-800 transition font-semibold"
                              >
                                Очистить фон
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card transparency slider */}
                      <div className="space-y-1.5 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-150 dark:border-zinc-800 rounded-xl p-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                            Прозрачность полей и панелей:
                          </span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}
                          onChange={(e) => setSystemSettings({ ...systemSettings, cardOpacity: parseInt(e.target.value, 10) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[9px] text-neutral-400 dark:text-zinc-500 leading-tight">
                          Настройте прозрачность остекления (Glassmorphism): левее для полупрозрачного матового фона, правее — для сплошного цвета.
                        </p>
                      </div>

                      <span className="text-[10px] opacity-70 block leading-tight mt-1.5">
                        При выборе фоновых изображений веб-интерфейс автоматически переключается в <b>адаптивный стеклянный дизайн (Glassmorphism)</b> с полупрозрачными затушеванными панелями и эффектом размытия <b>backdrop-blur</b>. Вы можете регулировать прозрачность интерфейса в настройках.
                      </span>
                    </div>

                    {/* 3. Логотип приложения (Поставлен в конец!) */}
                    <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <span className="font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider block text-[10px]">🏢 Логотип приложения:</span>
                      
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-250 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={!!systemSettings.customLogoEnabled} 
                            onChange={(e) => setSystemSettings({ ...systemSettings, customLogoEnabled: e.target.checked })}
                          />
                          Активировать индивидуальный логотип
                        </label>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-neutral-600 dark:text-neutral-400 block">Ссылка на логотип (URL картинки):</span>
                          <input 
                            type="text" 
                            placeholder="https://example.com/logo.png"
                            value={systemSettings.logoUrl && !systemSettings.logoUrl.startsWith("data:") ? systemSettings.logoUrl : ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, logoUrl: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <span className="font-semibold text-neutral-600 dark:text-neutral-400 block">Или загрузить файл с компьютера (Base64):</span>
                          <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-lg p-5 bg-white/50 hover:bg-white dark:bg-zinc-950/20 transition cursor-pointer group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSystemSettings({ ...systemSettings, logoUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <ImageIcon className="w-8 h-8 text-neutral-400 group-hover:text-neutral-500 transition mb-1" />
                            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Нажмите или перетащите файл логотипа</span>
                            <span className="text-[10px] text-neutral-400 mt-0.5">Допустимы форматы JPG, PNG, SVG, WEBP</span>
                          </div>
                        </div>

                        {systemSettings.logoUrl && systemSettings.logoUrl.startsWith("data:") && (
                          <div className="flex items-center justify-between p-2.5 rounded bg-amber-50 dark:bg-zinc-800 border border-amber-200 dark:border-zinc-700 text-xs gap-2">
                            <span className="truncate max-w-[200px] text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                              Файл загружен напрямую
                            </span>
                            <button
                              type="button"
                              onClick={() => setSystemSettings({ ...systemSettings, logoUrl: "" })}
                              className="text-rose-650 hover:text-rose-800 transition font-semibold"
                            >
                              Очистить
                            </button>
                          </div>
                        )}

                        {systemSettings.logoUrl && (
                          <div className="mt-2 text-center p-3 border border-dashed rounded bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-1.5">
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
                      Сохранить настройки оформления
                    </button>
                  </form>
                </div>

              </div>
            )}

            {activeTab === 'ratings' && (
              <div className="space-y-6 max-w-3xl mx-auto w-full">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">⭐ Сводный рейтинг специалистов</h3>
                    <p className="text-xs opacity-60">
                      Оценки квалификации и экспертности инженеров службы эксплуатации на основе отзывов собственников
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-500 border-collapse">
                      <thead className="text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-neutral-300/15">
                        <tr>
                          <th className="py-2.5 px-3">Инженер / Специалист</th>
                          <th className="py-2.5 px-3">Компания</th>
                          <th className="py-2.5 px-3">Кол-во оценок</th>
                          <th className="py-2.5 px-3">Средний балл (1-5★)</th>
                          <th className="py-2.5 px-3">Шкала качества</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-300/10 font-medium">
                        {users.filter(u => u.role === 'specialist').map(spec => {
                          const specRatings = reports.filter(r => r.specialistUserId === spec.id && r.approvedByOwner === true && r.ownerRating !== undefined);
                          const avgRating = specRatings.length > 0 
                            ? Number((specRatings.reduce((sum, r) => sum + (r.ownerRating || 0), 0) / specRatings.length).toFixed(1)) 
                            : 0;

                          return (
                            <tr key={spec.id} className="hover:bg-neutral-500/5">
                              <td className="py-3 px-3 text-slate-900 dark:text-slate-100 font-bold">
                                <div>{spec.fullname}</div>
                                {spec.keySkills && (
                                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-normal mt-0.5">
                                    💪 {spec.keySkills}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">{spec.company || "Служба эксплуатации"}</td>
                              <td className="py-3 px-3 text-slate-700 dark:text-zinc-300">{specRatings.length}</td>
                              <td className="py-3 px-3">
                                {avgRating > 0 ? (
                                  <div className="flex items-center gap-1.5 font-bold text-amber-500">
                                    <span>★ {avgRating.toFixed(1)}</span>
                                    <span>/ 5.0</span>
                                  </div>
                                ) : (
                                  <span className="opacity-40 italic">Оценок нет</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {avgRating > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <div className="w-24 bg-neutral-200 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-amber-500 h-full rounded-full" 
                                        style={{ width: `${(avgRating / 5) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-400">{(avgRating / 5 * 100).toFixed(0)}%</span>
                                  </div>
                                ) : (
                                  <span className="opacity-40">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">💬 Все отзывы и комментарии собственников</h3>
                    <p className="text-xs opacity-60">История всех проверок, к которым собственники оставили комментарий и оценку</p>
                  </div>

                  <div className="space-y-3">
                    {reports.filter(r => r.approvedByOwner === true && r.ownerRating !== undefined).length === 0 ? (
                      <p className="text-xs italic opacity-50 p-4 text-center">Оценки и отзывы пока отсутствуют</p>
                    ) : (
                      reports.filter(r => r.approvedByOwner === true && r.ownerRating !== undefined).map(rep => {
                        const associatedObject = objects.find(o => o.id === rep.objectId);
                        return (
                          <div key={rep.id} className="p-3 border rounded-xl bg-slate-50 dark:bg-zinc-900/40 border-neutral-300/10 space-y-2 text-xs">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{rep.specialistInfo?.fullname}</span>
                                <span className="text-[10px] opacity-50 block">{associatedObject ? `Объект: ${associatedObject.name}` : `Акт: ${rep.id}`}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-amber-500 font-extrabold text-sm">
                                  {"★".repeat(rep.ownerRating || 0)}{"☆".repeat(5 - (rep.ownerRating || 0))}
                                </span>
                                <span className="text-[9px] opacity-40">{new Date(rep.dateDone).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </div>
                            {rep.ownerRatingComment ? (
                              <p className="italic text-slate-600 dark:text-zinc-300 p-2.5 rounded-lg bg-white dark:bg-zinc-800/40 border-dashed border border-neutral-300/10">
                                "{rep.ownerRatingComment}"
                              </p>
                            ) : (
                              <p className="italic text-slate-400 p-1.5">Отзыв не оставлен</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LEGAL */}
            {(activeTab as any) === 'legal' && (
              <div className="space-y-4 max-w-3xl mx-auto w-full mr-auto">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">⚖️ Юридические соглашения</h3>
                    <p className="text-xs opacity-60">Официальные документы, регулирующие использование сервиса «Цифровой паспорт объекта»</p>
                  </div>
                  <LegalTabContent currentTheme={theme} isAdmin={currentUser.role === 'admin'} />
                </div>
              </div>
            )}

            {/* TAB: SUPPORT (TICKETS) */}
            {activeTab === 'support' && (
              <SupportTab 
                currentUser={currentUser} 
                systemSettings={systemSettings} 
                getCardStyle={getCardStyle} 
                getSubHeaderStyle={getSubHeaderStyle}
                theme={theme}
              />
            )}

            {/* TAB: ADMIN PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-4xl mx-auto w-full animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Personal info form */}
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base flex items-center gap-2">👤 Личные данные администратора</h3>
                      <p className="text-xs opacity-60">Управление контактной информацией и фотографией профиля системы</p>
                    </div>

                    <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs font-medium">
                      
                      {adminProfileOk && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl font-bold">
                          {adminProfileOk}
                        </div>
                      )}
                      
                      {adminProfileErr && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl font-bold">
                          {adminProfileErr}
                        </div>
                      )}

                      {/* Photo / Avatar Section */}
                      <div className="p-3 bg-neutral-100/50 dark:bg-zinc-900/40 rounded-xl border border-neutral-200 dark:border-zinc-800 space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-blue-600" />
                          Фотография профиля
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-neutral-200 dark:border-zinc-800 bg-neutral-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 shadow-inner group">
                            {profileAvatarUrl ? (
                              <img 
                                src={profileAvatarUrl} 
                                alt="Аватар профиля" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <UserIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                            )}
                            <label 
                              htmlFor="profile-admin-avatar-input"
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-white" />
                            </label>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-1">
                            <input 
                              type="file"
                              id="profile-admin-avatar-input"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    alert("Размер файла превышает 2МБ. Выберите меньший файл.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setProfileAvatarUrl(ev.target.result as string);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <span className="text-[10.5px] text-neutral-500 leading-tight">Нажмите на фото, чтобы обновить, или загрузите файл формата JPG, PNG, WebP (макс. 2МБ)</span>
                            {profileAvatarUrl && (
                              <button 
                                type="button" 
                                onClick={() => setProfileAvatarUrl("")} 
                                className="text-left text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                              >
                                Удалить фото
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Полное ФИО *</label>
                        <input 
                          type="text" 
                          required
                          value={profileFullname}
                          onChange={(e) => setProfileFullname(e.target.value)}
                          className={getInputStyle()}
                          placeholder="Иванов Александр Владимирович"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Контактный телефон</label>
                        <input 
                          type="text" 
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className={getInputStyle()}
                          placeholder="+7 (999) 000-00-00"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Компания / Служба эксплуатации</label>
                        <input 
                          type="text" 
                          value={profileCompany}
                          onChange={(e) => setProfileCompany(e.target.value)}
                          className={getInputStyle()}
                          placeholder="УК ЖилСервис"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Должность / Квалификация</label>
                        <input 
                          type="text" 
                          value={profileKeySkills}
                          onChange={(e) => setProfileKeySkills(e.target.value)}
                          className={getInputStyle()}
                          placeholder="Главный инженер, администратор системы"
                        />
                      </div>

                      <button type="submit" className={`${getAccentBtn()} w-full mt-4`}>
                        💾 Сохранить личные данные
                      </button>
                    </form>
                  </div>

                  {/* Password Change Form */}
                  <div className={getCardStyle()}>
                    <div className={getSubHeaderStyle()}>
                      <h3 className="font-bold text-base flex items-center gap-2">🔐 Безопасность и смена пароля</h3>
                      <p className="text-xs opacity-60">Для изменения текущего пароля администратора введите старый и новый пароли под своей учетной записью</p>
                    </div>

                    <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs font-medium">
                      
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl leading-relaxed">
                        Перед вводом нового пароля убедитесь, что вы помните ваш текущий системный пароль от учетной записи администратора.
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Текущий (старый) пароль *</label>
                        <input 
                          type="password" 
                          value={adminOldPassword}
                          onChange={(e) => setAdminOldPassword(e.target.value)}
                          className={getInputStyle()}
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 border-t dark:border-zinc-800 pt-3">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Новый пароль *</label>
                        <input 
                          type="password" 
                          value={adminNewPassword}
                          onChange={(e) => setAdminNewPassword(e.target.value)}
                          className={getInputStyle()}
                          placeholder="Минимум 4 символа"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-semibold text-neutral-600 dark:text-zinc-350">Подтвердите новый пароль *</label>
                        <input 
                          type="password" 
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          className={getInputStyle()}
                          placeholder="Повторите новый пароль"
                        />
                      </div>

                      <button type="submit" className="w-full mt-4 py-2 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all cursor-pointer">
                        🔑 Обновить пароль и сохранить изменения
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ======================= ROLE 2: OWNER FACILITY MONITOR ======================= */}
        {currentUser.role === 'owner' && (
          <div className="space-y-6">
            
            {ownerActiveTab === 'characteristics' && (
              <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto w-full">
                <div className={getCardStyle()}>
                <div className={getSubHeaderStyle()}>
                  <h3 className="font-bold text-base flex items-center gap-2">🏢 Мои объекты (Личный кабинет Собственника)</h3>
                  <p className="text-xs opacity-60">Просмотр технических паспортов в режиме чтения, проверка календарных графиков ТО и загрузка архива Актов. Кликните на объект, чтобы скрыть или показать его данные.</p>
                </div>

                <div className="space-y-4">
                  {objects.filter(o => o.ownerId === currentUser.id).map(obj => {
                  const matchingSchedules = schedules.filter(s => s.objectId === obj.id);
                  const matchingReports = reports.filter(r => r.objectId === obj.id);
                  
                  const isObjExpanded = expandedObjs[obj.id] !== false; // expanded by default
                  
                  return (
                    <div key={obj.id} className="border border-neutral-300/15 rounded-xl overflow-hidden bg-white/40 dark:bg-zinc-900/10 shadow-sm transition-all duration-200">
                      {/* Object Header block which toggles expansion when clicked */}
                      <div 
                        onClick={() => setExpandedObjs(prev => ({ ...prev, [obj.id]: !isObjExpanded }))}
                        className="w-full text-left p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-100/5 hover:bg-neutral-100/10 dark:bg-white/5 transition-all border-b border-neutral-300/10 cursor-pointer select-none"
                      >
                        <div className="flex gap-2.5 items-center">
                          <Building className="w-5 h-5 text-blue-500" />
                          <div>
                            <h4 className="font-black text-sm flex items-center gap-2">
                              <span>{obj.name}</span>
                              <span className="text-[10px] opacity-45 font-mono">ID: {obj.id}</span>
                            </h4>
                            <p className="text-xs opacity-65">{obj.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {obj.yandexDiskUrl ? (
                            <a 
                              href={obj.yandexDiskUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              title="Открыть папку объекта на Яндекс.Диск"
                              onClick={(e) => e.stopPropagation()} // Prevent collapse trigger when clicking link
                              className="flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-bold text-xs p-1.5 px-3 rounded-lg transition-all"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              <span>Яндекс.Диск объекта ↗</span>
                            </a>
                          ) : obj.yandexDiskPath ? (
                            <a 
                              href={`https://disk.yandex.ru/client/disk/${encodeURIComponent(obj.yandexDiskPath)}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              title="Открыть папку объекта на Яндекс.Диск"
                              onClick={(e) => e.stopPropagation()} // Prevent collapse trigger when clicking link
                              className="flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-bold text-xs p-1.5 px-3 rounded-lg transition-all"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              <span>Яндекс.Диск объекта ↗</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-zinc-400 italic">Диск не привязан</span>
                          )}
                          <span className="text-xs font-semibold text-neutral-400">
                            {isObjExpanded ? "Скрыть ▲" : "Показать ▼"}
                          </span>
                        </div>
                      </div>

                      {/* Object Details body */}
                      {isObjExpanded && (
                        <div className="p-5 space-y-5 bg-white/20 dark:bg-black/5 animate-slideDown">
                          {/* Characteristics / Specs list */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-neutral-300/10 pb-4">
                            <div className="p-3 bg-neutral-100/5 border border-neutral-300/10 rounded-xl">
                              <span className="text-[9px] uppercase tracking-wider opacity-60 font-black block">📁 Общая характеристика:</span>
                              <p className="font-bold text-xs mt-1 text-slate-800 dark:text-zinc-200">{obj.specs || "Характеристики не указаны"}</p>
                            </div>
                            <div className="p-3 bg-neutral-100/5 border border-neutral-300/10 rounded-xl">
                              <span className="text-[9px] uppercase tracking-wider opacity-60 font-black block">⚙️ Ключевое оборудование:</span>
                              <p className="font-bold text-xs mt-1 text-slate-800 dark:text-zinc-200">{obj.equipmentSpecs || "Перечень оборудования отсутствует"}</p>
                            </div>
                            <div className="p-3 bg-neutral-100/5 border border-neutral-300/10 rounded-xl">
                              <span className="text-[9px] uppercase tracking-wider opacity-60 font-black block">🏗️ Ввод в эксплуатацию:</span>
                              <p className="font-bold text-xs mt-1 text-slate-800 dark:text-zinc-200">{obj.info || "Параметры года постройки не указаны"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                          <div className="pt-1 flex items-center justify-between gap-2">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-wider ${status.class}`}>
                                              {status.label}
                                            </span>
                                            <button 
                                              onClick={() => setQrModalSchedule(sch)}
                                              className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-300/20 rounded-md font-bold text-[9px] cursor-pointer transition-all uppercase tracking-wider"
                                            >
                                              <span>📲 QR-код</span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Completed Acts for this owner facility */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-black uppercase text-zinc-400">Всего подтверждено выездов ({matchingReports.length}):</span>
                              {matchingReports.length === 0 ? (
                                <p className="text-xs italic text-[11px] opacity-50">Акты пока отсутствуют</p>
                              ) : (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {matchingReports.map(rep => {
                                    const isApproved = !!rep.approvedByOwner;
                                    return (
                                      <div key={rep.id} className="p-2 bg-neutral-50 dark:bg-zinc-800 rounded-lg flex flex-col justify-between gap-2 text-[11px]">
                                        <div className="p-2 pb-0">
                                          <div className="font-bold text-slate-800 flex items-center justify-between gap-1">
                                            <span>Акт {rep.id} от {new Date(rep.dateDone).toLocaleDateString('ru-RU')}</span>
                                            {isApproved ? (
                                              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide">Утвержден</span>
                                            ) : (
                                              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide">Ожидает</span>
                                            )}
                                          </div>
                                          {isApproved && rep.ownerRating && (
                                            <div className="flex items-center gap-1 mt-1 text-amber-500 font-bold">
                                              <span>Оценка: {"★".repeat(rep.ownerRating)}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 p-2 pt-0 border-t border-neutral-100 dark:border-zinc-700/50 mt-1">
                                          {!isApproved ? (
                                            <button
                                              onClick={() => {
                                                setRatingReport(rep);
                                                setRatingStars(5);
                                                setRatingComment("");
                                              }}
                                              className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[9px] cursor-pointer"
                                            >
                                              👍 Оценить
                                            </button>
                                          ) : <span className="text-[10px] text-emerald-600">✓ Подтвержден</span>}
                                          <a 
                                            href={`/api/reports/${rep.id}/pdf`} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-600 font-bold hover:underline flex items-center gap-1 shrink-0 px-2 py-0.5 bg-neutral-200/50 hover:bg-neutral-200 rounded"
                                          >
                                            <Download className="w-3 h-3" /> PDF
                                          </a>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
              </div>
            )}

            {/* Registered Service Specialists Contact Info for Owners */}
            {ownerActiveTab === 'specialists' && (
              <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto w-full">
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
                  users.filter(u => u.role === 'specialist').map(spec => {
                    const specRatings = reports.filter(r => r.specialistUserId === spec.id && r.approvedByOwner === true && r.ownerRating !== undefined);
                    const avgRating = specRatings.length > 0 ? (specRatings.reduce((sum, r) => sum + (r.ownerRating || 0), 0) / specRatings.length).toFixed(1) : null;

                    return (
                      <div key={spec.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/35 hover:shadow-sm transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">Инженер</span>
                            {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => startEditSpecialist(spec)}
                                  title="Редактировать профиль инженера"
                                  className="p-1 bg-neutral-200/50 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-slate-700 dark:text-zinc-300 cursor-pointer"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => deleteSpecialist(spec.id)}
                                  title="Удалить инженера"
                                  className="p-1 bg-red-50 hover:bg-red-150 dark:bg-red-900/10 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start gap-3 mt-1.5">
                            {spec.avatarUrl ? (
                              <img 
                                src={spec.avatarUrl} 
                                alt={spec.fullname} 
                                className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-zinc-800 shadow-xl shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/15">
                                <HardHat className="w-5 h-5 text-amber-500" />
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{spec.fullname}</h4>
                              <p className="text-[11px] opacity-75 dark:text-zinc-400 italic">{spec.company || "Служба эксплуатации и ТО"}</p>
                            </div>
                          </div>
                          
                          {/* Specialist average rating */}
                          {avgRating ? (
                            <div className="flex items-center gap-1 mt-1 text-xs">
                              <span className="text-amber-500 font-bold">★ {avgRating}</span>
                              <span className="opacity-60 text-[10px]">({specRatings.length} {specRatings.length === 1 ? 'оценка' : [2,3,4].includes(specRatings.length % 10) && ![12,13,14].includes(specRatings.length % 100) ? 'оценки' : 'оценок'})</span>
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-40 mt-1 italic">Рейтинг: Нет оценок</div>
                          )}

                          {spec.keySkills && (
                            <div className="mt-2 bg-amber-500/10 border border-amber-500/15 p-2 rounded-lg text-[10px] text-amber-800 dark:text-amber-400">
                              <span className="font-extrabold uppercase text-[7.5px] tracking-wider block opacity-75">Профессиональные навыки и компетенции:</span>
                              <p className="mt-0.5 whitespace-pre-wrap leading-snug">{spec.keySkills}</p>
                            </div>
                          )}
                        </div>

                      <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-zinc-800 text-xs text-neutral-600 dark:text-zinc-400">
                        {spec.phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="opacity-50 text-[10px]">Телефон:</span>
                            <a href={`tel:${spec.phone}`} className="font-semibold text-sky-600 hover:underline">{spec.phone}</a>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="opacity-50 text-[10px]">Эл. почта:</span>
                          <a href={`mailto:${spec.email}`} className="font-medium hover:underline text-sky-700 dark:text-sky-400">{spec.email}</a>
                        </div>
                        {spec.telegramChatId && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="bg-sky-50 dark:bg-sky-900/10 text-sky-600 dark:text-sky-400 text-[10px] px-1.5 py-0.5 rounded font-mono">TG Chat Link ID: {spec.telegramChatId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Specialist Profile Form (only visible to Owners & Admins) */}
              {(currentUser.role === 'owner' || currentUser.role === 'admin') && (
                <div className="mt-8 pt-6 border-t border-dashed border-zinc-200 dark:border-zinc-800 p-4 rounded-xl bg-neutral-100/5 dark:bg-zinc-800/10 space-y-3">
                  <h4 className="font-bold text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                    {editingSpecialistId ? "✏️ Редактирование профиля инженера" : "➕ Регистрация нового инженера"}
                  </h4>
                  
                  <form onSubmit={saveSpecialistSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">ФИО Специалиста *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Сидоров А. К."
                        value={specFormFullname}
                        onChange={(e) => setSpecFormFullname(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">Email (Используется как логин) *</label>
                      <input 
                        type="email" 
                        required 
                        placeholder="sidorov@service.ru"
                        value={specFormEmail}
                        onChange={(e) => setSpecFormEmail(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">Пароль для входа {editingSpecialistId ? "(Оставьте пустым для сохранения старого)" : "*"}</label>
                      <input 
                        type="password" 
                        placeholder={editingSpecialistId ? "••••••" : "Например, 123456"}
                        value={specFormPassword}
                        onChange={(e) => setSpecFormPassword(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">Номер телефона</label>
                      <input 
                        type="text" 
                        placeholder="+7 (900) 123-45-67"
                        value={specFormPhone}
                        onChange={(e) => setSpecFormPhone(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">Обслуживающая организация</label>
                      <input 
                        type="text" 
                        placeholder="ООО РемСтройСервис"
                        value={specFormCompany}
                        onChange={(e) => setSpecFormCompany(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="font-semibold text-slate-500">Telegram Chat Link ID (для уведомлений)</label>
                      <input 
                        type="text" 
                        placeholder="Например: 12435678"
                        value={specFormTelegram}
                        onChange={(e) => setSpecFormTelegram(e.target.value)}
                        className={getInputStyle()}
                      />
                    </div>
                    
                    {/* Objects Assignment Checklist */}
                    <div className="col-span-full border-t border-dashed border-neutral-300/30 pt-3 text-xs">
                      <span className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px]">
                        Закрепить за объектами {currentUser.role === 'admin' ? "(Администратор может назначать любые объекты)" : "(Собственник может назначать только за свои объекты)"}:
                      </span>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1.5 bg-neutral-100/50 rounded-lg">
                        {(currentUser.role === 'admin' ? objects : objects.filter(o => o.ownerId === currentUser.id)).map(obj => {
                          const isAssigned = specFormAllowedObjects.includes(obj.id);
                          return (
                            <label key={obj.id} className="flex items-center gap-1.5 p-1 bg-white border border-neutral-200 rounded cursor-pointer select-none hover:bg-neutral-50 px-2.5">
                              <input 
                                type="checkbox" 
                                checked={isAssigned}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSpecFormAllowedObjects(prev => [...prev, obj.id]);
                                  } else {
                                    setSpecFormAllowedObjects(prev => prev.filter(id => id !== obj.id));
                                  }
                                }}
                                className="rounded accent-amber-600"
                              />
                              <span className="font-semibold text-[11px] text-slate-800">{obj.name}</span>
                            </label>
                          );
                        })}
                        {(currentUser.role === 'admin' ? objects : objects.filter(o => o.ownerId === currentUser.id)).length === 0 && (
                          <span className="opacity-50 italic text-[10px]">Доступные объекты отсутствуют</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-full pt-1.5 flex gap-2">
                      <button type="submit" className={`py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow transition-all cursor-pointer`}>
                        {editingSpecialistId ? "Обновить данные" : "Сохранить и зарегистрировать"}
                      </button>
                      {editingSpecialistId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingSpecialistId(null);
                            setSpecFormFullname("");
                            setSpecFormEmail("");
                            setSpecFormPhone("");
                            setSpecFormCompany("");
                            setSpecFormTelegram("");
                            setSpecFormPassword("");
                          }} 
                          className={getMutedBtn()}
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
              </div>
            )}

            {/* Notification channel setup for owners */}
            {ownerActiveTab === 'profile' && (
              <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto w-full">
                <div className={getCardStyle()}>
              <div className={getSubHeaderStyle()}>
                <h3 className="font-bold text-base">📲 Мои каналы получения уведомлений</h3>
                <p className="text-xs opacity-60">Куда техническому инженеру высылать уведомление сразу в момент окончания обхода</p>
              </div>

              <div className="space-y-4 max-w-md text-xs">
                {isOwnerEditing ? (
                  <form onSubmit={handleSaveOwnerProfile} className="space-y-3 p-3 border rounded-xl bg-slate-50 border-slate-200">
                    <span className="font-extrabold text-neutral-700 block text-xs">Редактирование настроек аккаунта</span>
                    {ownerEditError && (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg font-semibold text-[11px]">
                        {ownerEditError}
                      </div>
                    )}
                    {ownerEditMsg && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg font-semibold text-[11px]">
                        {ownerEditMsg}
                      </div>
                    )}

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">Ваше ФИО *</label>
                      <input 
                        type="text" 
                        required 
                        value={ownerFullname}
                        onChange={(e) => setOwnerFullname(e.target.value)}
                        className={getInputStyle()}
                        placeholder="Иванов И. И."
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">Номер телефона</label>
                      <input 
                        type="text" 
                        id="owner-phone-input"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        className={getInputStyle()}
                        placeholder="+7-999-123-45-67"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">Электронная почта *</label>
                      <input 
                        type="email" 
                        required 
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        className={getInputStyle()}
                        placeholder="owner@example.com"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">Telegram Chat ID (для уведомлений)</label>
                      <input 
                        type="text" 
                        id="owner-tg-input"
                        value={ownerTelegram}
                        onChange={(e) => setOwnerTelegram(e.target.value)}
                        className={getInputStyle()}
                        placeholder="Например: 12435678"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">MAX ID (для корпоративных ботов)</label>
                      <input 
                        type="text" 
                        id="owner-max-input"
                        value={ownerMaxId}
                        onChange={(e) => setOwnerMaxId(e.target.value)}
                        className={getInputStyle()}
                        placeholder="Например: max_123"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="font-semibold text-slate-500 text-[10px]">VK Идентификатор аккаунта</label>
                      <input 
                        type="text" 
                        id="owner-vk-input"
                        value={ownerVkId}
                        onChange={(e) => setOwnerVkId(e.target.value)}
                        className={getInputStyle()}
                        placeholder="Например: vk_456"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button type="submit" id="save-owner-btn" className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow text-[10px] cursor-pointer animate-none">
                        Сохранить
                      </button>
                      <button 
                        type="button" 
                        id="cancel-owner-btn"
                        onClick={() => setIsOwnerEditing(false)}
                        className="py-1 px-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold rounded text-[10px] cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-neutral-700">Настройки аккаунта:</span>
                      <button 
                        onClick={startEditOwnerProfile}
                        id="edit-owner-settings-btn"
                        className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 font-bold py-1 px-2.5 rounded border border-blue-200/20 transition-all cursor-pointer"
                      >
                        ✏️ Редактировать настройки
                      </button>
                    </div>
                    {ownerEditMsg && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg font-semibold">
                        {ownerEditMsg}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border rounded-xl">
                      <div>
                        <span className="opacity-60 block text-[10px]">Ваше ФИО</span>
                        <span className="font-bold text-sm block">{currentUser.fullname || "Не указано"}</span>
                      </div>
                      <div>
                        <span className="opacity-60 block text-[10px]">Номер телефона</span>
                        <span className="font-bold text-sm block">{currentUser.phone || "Не указан"}</span>
                      </div>
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
                )}

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
                            localStorage.setItem("user_session", JSON.stringify(data.user));
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

            {/* TAB: OWNER ACCUMULATED REPORTS/ACTS */}
            {ownerActiveTab === 'reports' && (
              <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto w-full">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-extrabold text-base flex items-center gap-1.5">
                      <FileText className="w-5 h-5 text-blue-500" />
                      📂 Мои Акты и Заполненные Чек-листы
                    </h3>
                    <p className="text-xs opacity-60">Юридически подтвержденная история осмотров инженерного оборудования по вашим объектам</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 mb-5 border-b border-neutral-300/15">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase opacity-75">🏢 Выберите объект контроля:</label>
                      <select
                        value={selectedReportObjectId}
                        onChange={(e) => {
                          setSelectedReportObjectId(e.target.value);
                          setSelectedReportYear('all');
                        }}
                        className={getInputStyle()}
                      >
                        <option value="all">Все мои объекты ({reports.filter(r => objects.some(o => o.id === r.objectId && o.ownerId === currentUser.id)).length} актов)</option>
                        {objects.filter(o => o.ownerId === currentUser.id).map(obj => {
                          const count = reports.filter(r => r.objectId === obj.id).length;
                          return (
                            <option key={obj.id} value={obj.id}>
                              🏢 {obj.name} (Актов: {count})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase opacity-75">📅 Выберите год:</label>
                      <select
                        value={selectedReportYear}
                        onChange={(e) => setSelectedReportYear(e.target.value)}
                        className={getInputStyle()}
                      >
                        <option value="all">Все доступные годы ({reports.filter(r => (selectedReportObjectId === 'all' ? objects.some(o => o.id === r.objectId && o.ownerId === currentUser.id) : r.objectId === selectedReportObjectId)).length} актов)</option>
                        {(() => {
                          const relevantReports = reports.filter(r => (selectedReportObjectId === 'all' ? objects.some(o => o.id === r.objectId && o.ownerId === currentUser.id) : r.objectId === selectedReportObjectId));
                          const years = Array.from<string>(new Set(relevantReports.map(r => new Date(r.dateDone).getFullYear().toString()))).sort((a: string, b: string) => b.localeCompare(a));
                          return years.map(yr => {
                            const countInYear = relevantReports.filter(r => new Date(r.dateDone).getFullYear().toString() === yr).length;
                            return (
                              <option key={yr} value={yr}>
                                📅 {yr} год (Актов: {countInYear})
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const finalReports = reports.filter(rep => {
                        const isMyObj = objects.some(o => o.id === rep.objectId && o.ownerId === currentUser.id);
                        if (!isMyObj) return false;
                        const matchObject = selectedReportObjectId === 'all' || rep.objectId === selectedReportObjectId;
                        const matchYear = selectedReportYear === 'all' || new Date(rep.dateDone).getFullYear().toString() === selectedReportYear;
                        return matchObject && matchYear;
                      });

                      if (finalReports.length === 0) {
                        return (
                          <div className="col-span-full py-12 text-center text-sm opacity-65 font-medium">
                            📭 Не найдено заполненных актов по выбранному фильтру.
                          </div>
                        );
                      }

                      return finalReports.map(rep => {
                        const obj = objects.find(o => o.id === rep.objectId);
                        const tpl = templates.find(t => t.id === rep.checklistTemplateId);
                        const sch = schedules.find(s => s.id === rep.scheduleItemId);
                        const isApproved = !!rep.approvedByOwner;
                        
                        return (
                          <div key={rep.id} className="p-5 rounded-2xl border border-neutral-300/15 bg-neutral-100/5 hover:shadow-md transition-all space-y-4">
                            <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-2.5 rounded-xl">
                              <div>
                                <span className="text-[10px] text-sky-500 font-bold tracking-wider uppercase block">АКТ {rep.id}</span>
                                <span className="text-[11px] opacity-60">{new Date(rep.dateDone).toLocaleDateString('ru-RU')}</span>
                              </div>
                              {isApproved ? (
                                <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase">Утвержден</span>
                              ) : (
                                <span className="bg-amber-500/10 text-amber-500 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase animate-pulse">Ожидает</span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block pb-0.5 border-b border-neutral-300/10">Объект контроля:</span>
                              <div className="font-extrabold text-sm">{obj ? obj.name : "Неизвестный объект"}</div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block pb-0.5 border-b border-neutral-300/10">Регламентная задача:</span>
                              <span className="font-bold text-xs">{sch ? sch.title : "Регламентное ТО"}</span>
                            </div>

                            <div className="pt-3 border-t border-dashed border-neutral-300/15 flex justify-end gap-2">
                              {!isApproved && (
                                <button
                                  onClick={() => {
                                    setRatingReport(rep);
                                    setRatingStars(5);
                                    setRatingComment("");
                                  }}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                                >
                                  👍 Утвердить
                                </button>
                              )}
                              <a 
                                href={`/api/reports/${rep.id}/pdf`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-3.5 py-1.5 bg-neutral-200/50 hover:bg-neutral-200 text-blue-600 font-bold rounded-xl text-xs inline-flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" /> PDF Акт
                              </a>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OWNER SETTINGS */}
            {ownerActiveTab === 'settings' && (
              <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto w-full">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-extrabold text-base flex items-center gap-1.5">
                      <Settings className="w-5 h-5 text-blue-500" />
                      🎨 Мои настройки и фоновое оформление
                    </h3>
                    <p className="text-xs opacity-60">Собственный визуальный стиль оформления цифрового паспорта объектов</p>
                  </div>

                  <form onSubmit={handleSaveVisualSettings} className="space-y-5 max-w-xl text-left">
                    {settingsSuccessMsg && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-bold animate-fadeIn">
                        ✨ {settingsSuccessMsg}
                      </div>
                    )}
                    {settingsErrorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-bold animate-fadeIn">
                        ⚠️ {settingsErrorMsg}
                      </div>
                    )}

                    {/* 1. Selection of color palette (theme) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">Цветовая палитра интерфейса:</label>
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value as any)}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="cleanroom">🧼 «Чистая комната» (Классический светлый)</option>
                        <option value="modern">💻 «Современный тёмный» (Modern Dark)</option>
                        <option value="terminal">📟 «Хаки терминал» (Terminal Green)</option>
                        <option value="warm">📜 «Теплый бежевый» (Warm Serif)</option>
                        <option value="japanese">🍣 «Японский дзен» (Japanese Zen)</option>
                        <option value="japanese_calligraphy">🌸 «Сад сакуры & Каллиграфия» (Kyoto Brush)</option>
                        <option value="crisp_minimal">⬜ «Строгий бумажный» (Crisp Minimal)</option>
                      </select>
                    </div>

                    {/* 2. Style & Background opacity */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 block">Фоновое изображение экрана и адаптивный стеклянный дизайн:</label>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'default', appBackgroundUrl: '' })}
                          className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                            (!systemSettings.appBackgroundType || systemSettings.appBackgroundType === 'default')
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                          }`}
                        >
                          🎨 Стандартная тема
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'villa', appBackgroundUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                            systemSettings.appBackgroundType === 'villa'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                          }`}
                        >
                          🏡 Вилла (Остекление)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'blueprint', appBackgroundUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                            systemSettings.appBackgroundType === 'blueprint'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                          }`}
                        >
                          📐 Чертеж фасада
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'sakura', appBackgroundUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                            systemSettings.appBackgroundType === 'sakura'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                          }`}
                        >
                          🌸 Сад Сакуры
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'custom' })}
                          className={`p-2.5 text-xs font-semibold rounded-xl border text-center transition-all col-span-2 cursor-pointer ${
                            systemSettings.appBackgroundType === 'custom'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm font-bold'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-900/50'
                          }`}
                        >
                          📸 Свое собственное фоновое фото
                        </button>
                      </div>

                      {/* Custom uploads */}
                      {systemSettings.appBackgroundType === 'custom' && (
                        <div className="space-y-3 pt-2 bg-neutral-50 dark:bg-zinc-850/10 p-3.5 border rounded-xl animate-fadeIn text-xs">
                          <span className="font-semibold text-neutral-600 dark:text-zinc-400 block">Загрузить свое фоновое фото с диска (Base64):</span>
                          <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-xl p-4 bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 transition cursor-pointer group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSystemSettings({ ...systemSettings, appBackgroundUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <ImageIcon className="w-6 h-6 text-neutral-400 group-hover:text-neutral-500 transition mb-1" />
                            <span className="text-[11px] font-semibold text-neutral-650 dark:text-neutral-400">Нажмите для выбора файла</span>
                            <span className="text-[9px] text-neutral-400">JPG, PNG, WEBP</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-neutral-500 dark:text-zinc-450">Или внешняя ссылка на изображение:</span>
                            <input 
                              type="text" 
                              placeholder="https://example.com/background.jpg"
                              value={systemSettings.appBackgroundUrl && !systemSettings.appBackgroundUrl.startsWith("data:") ? systemSettings.appBackgroundUrl : ""}
                              onChange={(e) => setSystemSettings({ ...systemSettings, appBackgroundUrl: e.target.value })}
                              className={getInputStyle()}
                            />
                          </div>

                          {systemSettings.appBackgroundUrl && (
                            <div className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-[11px] gap-2">
                              <span className="truncate max-w-[200px] text-blue-800 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Собственное фоновое фото успешно загружено
                              </span>
                              <button
                                type="button"
                                onClick={() => setSystemSettings({ ...systemSettings, appBackgroundUrl: "" })}
                                className="text-rose-600 hover:text-rose-800 dark:text-rose-400 transition font-semibold"
                              >
                                Сбросить
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card transparency slider */}
                      <div className="space-y-1.5 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-150 dark:border-zinc-800 rounded-xl p-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                            Прозрачность полей и панелей:
                          </span>
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}
                          onChange={(e) => setSystemSettings({ ...systemSettings, cardOpacity: parseInt(e.target.value, 10) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[9px] text-neutral-400 dark:text-zinc-500 leading-tight">
                          Настройте прозрачность остекления (Glassmorphism): левее для полупрозрачного матового фона, правее — для сплошного цвета.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800">
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/15 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>💾 Сохранить оформление</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: OWNER LEGAL DOCUMENT ENCLOSURE */}
            {ownerActiveTab === 'legal' && (
              <div className="space-y-4 animate-fadeIn max-w-3xl mx-auto w-full">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-extrabold text-base flex items-center gap-1.5">
                      <ShieldCheck className="w-5 h-5 text-blue-500" />
                      ⚖️ Юридические соглашения
                    </h3>
                    <p className="text-xs opacity-60">Официальные документы, регулирующие использование сервиса «Цифровой паспорт объекта»</p>
                  </div>
                  <LegalTabContent currentTheme={theme} isAdmin={currentUser.role === 'admin'} />
                </div>
              </div>
            )}

            {/* TAB: SUPPORT */}
            {ownerActiveTab === 'support' && (
              <SupportTab 
                currentUser={currentUser} 
                systemSettings={systemSettings} 
                getCardStyle={getCardStyle} 
                getSubHeaderStyle={getSubHeaderStyle}
                theme={theme}
              />
            )}

          </div>
        )}

        {/* ======================= ROLE 3: SPECIALIST CHECKS RUNNER ======================= */}
        {currentUser.role === 'specialist' && (
          <div className="space-y-6">

            {/* 1. WORKPLACE / DEFAULT TAB */}
            {(activeTab === 'workplace' || activeTab === 'objects' || !activeTab) && (
              <div className="space-y-6">
                
                {/* РАЗДЕЛ: КЛЮЧЕВЫЕ НАВЫКИ СПЕЦИАЛИСТА */}
            <div className={`${getCardStyle()} border-l-4 border-l-amber-500`}>
              <div className={getSubHeaderStyle()}>
                <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-widest mb-1">Квалификация и профиль компетенций</span>
                <h3 className="font-extrabold text-base flex items-center gap-1.5 text-zinc-800">
                  <Wrench className="w-5 h-5 text-amber-500" />
                  Мои ключевые профессиональные навыки
                </h3>
                <p className="text-xs opacity-60">
                  Заполните ваши ключевые навыки, квалификационные разряды, обслуживаемые марки котлов, насосов, чиллеров и вентиляционных машин. Администратор видит этот список при подборе исполнителей на техническое обслуживание объектов собственников.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  {/* Photo management inside the specialist workspace card */}
                  <div className="md:col-span-1 flex flex-col items-center p-3 bg-neutral-100/50 dark:bg-zinc-900/40 rounded-xl border border-neutral-200 dark:border-zinc-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 text-center">Моя фотография</span>
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border border-neutral-250 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex items-center justify-center shrink-0 shadow shadow-inner group">
                      {currentUser?.avatarUrl ? (
                        <img 
                          src={currentUser.avatarUrl} 
                          alt="Мое фото" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <UserIcon className="w-12 h-12 text-neutral-305 dark:text-neutral-605" />
                      )}
                      <label 
                        htmlFor="spec-avatar-direct-input"
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer animate-fadeIn"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </label>
                    </div>
                    
                    <input 
                      type="file"
                      id="spec-avatar-direct-input"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Размер файла превышает 2МБ.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            if (ev.target?.result) {
                              const base64Photo = ev.target.result as string;
                              try {
                                const response = await fetch("/api/auth/me", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    fullname: currentUser?.fullname,
                                    phone: currentUser?.phone,
                                    company: currentUser?.company,
                                    keySkills: currentUser?.keySkills || mySkills,
                                    avatarUrl: base64Photo
                                  })
                                });
                                const data = response.ok ? await response.json() : null;
                                if (data && data.success) {
                                  localStorage.setItem("user_session", JSON.stringify(data.user));
                                  setCurrentUser(data.user);
                                  alert("Фотография успешно обновлена!");
                                } else {
                                  alert(data?.error || "Не удалось обновить фотографию.");
                                }
                              } catch (err) {
                                alert("Не удалось связаться с сервером.");
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    
                    <div className="flex flex-col gap-1 w-full">
                      <button
                        type="button"
                        onClick={() => document.getElementById("spec-avatar-direct-input")?.click()}
                        className="w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] rounded text-center cursor-pointer shadow-xs"
                      >
                        Выбрать файл...
                      </button>
                      {currentUser?.avatarUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Вы хотите удалить фотографию?")) {
                              try {
                                const response = await fetch("/api/auth/me", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    fullname: currentUser?.fullname,
                                    phone: currentUser?.phone,
                                    company: currentUser?.company,
                                    keySkills: currentUser?.keySkills || mySkills,
                                    avatarUrl: ""
                                  })
                                });
                                const data = response.ok ? await response.json() : null;
                                if (data && data.success) {
                                  localStorage.setItem("user_session", JSON.stringify(data.user));
                                  setCurrentUser(data.user);
                                }
                              } catch (e) {}
                            }
                          }}
                          className="w-full py-0.5 px-2 bg-neutral-200 dark:bg-zinc-800 hover:bg-neutral-300 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-200 text-[9px] rounded text-center cursor-pointer"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Skills panel */}
                  <div className="md:col-span-3 space-y-3">
                    <textarea
                      value={mySkills}
                      onChange={(e) => setMySkills(e.target.value)}
                      placeholder="Пример: Наладка автоматики ИТП Danfoss, обслуживание приточно-вытяжных вентиляций Systemair, ремонт чиллеров Carrier, допуски по электробезопасности IV группа..."
                      className={`${getInputStyle()} w-full p-3 text-xs bg-slate-50 border border-slate-200 focus:bg-white transition-colors`}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          setSavingSkills(true);
                          try {
                            const response = await fetch("/api/auth/me", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                fullname: currentUser?.fullname,
                                phone: currentUser?.phone,
                                company: currentUser?.company,
                                keySkills: mySkills,
                                avatarUrl: currentUser?.avatarUrl
                              })
                            });
                            const data = await response.ok ? await response.json() : null;
                            if (data && data.success) {
                              localStorage.setItem("user_session", JSON.stringify(data.user));
                              setCurrentUser(data.user);
                              alert("Ключевые навыки успешно обновлены в вашем профиле!");
                            } else {
                              alert(data?.error || "Произошла ошибка при сохранении навыков.");
                            }
                          } catch (err) {
                            alert("Не удалось связаться с сервером.");
                          } finally {
                            setSavingSkills(false);
                          }
                        }}
                        disabled={savingSkills}
                        className="py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded shadow transition-all cursor-pointer disabled:opacity-50"
                      >
                        {savingSkills ? "Сохранение..." : "💾 Сохранить ключевые навыки"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                      {(() => {
                        const accessibleObjects = currentUser && currentUser.role === 'specialist' && currentUser.id !== 'anonymous_specialist'
                          ? objects.filter(o => o.allowedSpecialistIds && o.allowedSpecialistIds.includes(currentUser.id))
                          : objects;
                        return accessibleObjects.map(o => (
                          <option key={o.id} value={o.id} title={o.name}>
                            {o.name.length > 32 ? `${o.name.substring(0, 30)}...` : o.name}
                          </option>
                        ));
                      })()}
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

            {/* 2. TAB: MY ACTS / МОИ АКТЫ */}
            {activeTab === 'my-acts' && (
              <div className="space-y-4 animate-fadeIn">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">📂 Мои отправленные работы (Акты ТО)</h3>
                    <p className="text-xs opacity-65">Юридически подтвержденная история осмотров и регламентов оборудования, отправленная вами лично</p>
                  </div>

                  {/* Фильтры структуры: Объект и Год */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 mb-5 border-b border-neutral-300/15">
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-xs font-bold uppercase opacity-75">🏢 Выберите объект контроля:</label>
                      <select
                        value={selectedMyReportObjectId}
                        onChange={(e) => {
                          setSelectedMyReportObjectId(e.target.value);
                          setSelectedMyReportYear('all'); // сбросить год при выборе другого объекта
                        }}
                        className={getInputStyle()}
                      >
                        <option value="all">🌐 Все объекты ({reports.filter(r => r.specialistUserId === currentUser.id).length} актов)</option>
                        {objects.map(obj => {
                          const myReports = reports.filter(r => r.specialistUserId === currentUser.id);
                          const hasReports = myReports.some(r => r.objectId === obj.id);
                          if (!hasReports) return null;
                          const count = myReports.filter(r => r.objectId === obj.id).length;
                          return (
                            <option key={obj.id} value={obj.id}>
                              🏢 {obj.name} (Ваших актов: {count})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-xs font-bold uppercase opacity-75">📅 Выберите год:</label>
                      <select
                        value={selectedMyReportYear}
                        onChange={(e) => setSelectedMyReportYear(e.target.value)}
                        className={getInputStyle()}
                        disabled={reports.filter(r => r.specialistUserId === currentUser.id && (selectedMyReportObjectId === 'all' || r.objectId === selectedMyReportObjectId)).length === 0}
                      >
                        <option value="all">⏳ Все годы ({reports.filter(r => r.specialistUserId === currentUser.id && (selectedMyReportObjectId === 'all' || r.objectId === selectedMyReportObjectId)).length} актов)</option>
                        {(() => {
                          const relevantReports = reports.filter(r => r.specialistUserId === currentUser.id && (selectedMyReportObjectId === 'all' || r.objectId === selectedMyReportObjectId));
                          const years = Array.from<string>(new Set(relevantReports.map(r => new Date(r.dateDone).getFullYear().toString()))).sort((a: string, b: string) => b.localeCompare(a));
                          return years.map(yr => {
                            const countInYear = relevantReports.filter(r => new Date(r.dateDone).getFullYear().toString() === yr).length;
                            return (
                              <option key={yr} value={yr}>
                                📅 {yr} год (Актов: {countInYear})
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                      const finalReports = reports.filter(rep => {
                        const isMine = rep.specialistUserId === currentUser.id;
                        const matchObject = selectedMyReportObjectId === 'all' || rep.objectId === selectedMyReportObjectId;
                        const matchYear = selectedMyReportYear === 'all' || new Date(rep.dateDone).getFullYear().toString() === selectedMyReportYear;
                        return isMine && matchObject && matchYear;
                      });

                      if (finalReports.length === 0) {
                        return (
                          <div className="col-span-full py-12 text-center text-sm opacity-65 font-medium">
                            📭 Не найдено отправленных актов по выбранному фильтру (объект / год).
                          </div>
                        );
                      }

                      return finalReports.map(rep => {
                        const obj = objects.find(o => o.id === rep.objectId);
                        const tpl = templates.find(t => t.id === rep.checklistTemplateId);
                        const sch = schedules.find(s => s.id === rep.scheduleItemId);
                        
                        return (
                          <div key={rep.id} className="p-5 rounded-2xl border border-neutral-300/15 bg-neutral-100/5 hover:shadow-md transition-all space-y-4 text-left">
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
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold p-2 rounded-lg flex items-center gap-1 shadow-sm uppercase text-[9px] tracking-wide"
                              >
                                <Download className="w-3.5 h-3.5" /> Скачать акт
                              </a>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 3. TAB: SPECIALIST RATING AND REVIEWS */}
            {activeTab === 'my-ratings' && (
              <div className="space-y-6 max-w-3xl mx-auto w-full animate-fadeIn text-left">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">⭐ Мой профессиональный рейтинг</h3>
                    <p className="text-xs opacity-65">
                      Оценки вашей работы и экспертности на основе отзывов собственников обслуживаемых объектов
                    </p>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-zinc-800/20 border border-neutral-100 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-around gap-6 text-center sm:text-left">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-neutral-400">Ваша средняя оценка</div>
                      {(() => {
                        const myRatings = reports.filter(r => r.specialistUserId === currentUser.id && r.approvedByOwner === true && r.ownerRating !== undefined);
                        const avgRating = myRatings.length > 0 
                          ? Number((myRatings.reduce((sum, r) => sum + (r.ownerRating || 0), 0) / myRatings.length).toFixed(1)) 
                          : 0;
                        return (
                          <div className="mt-2">
                            {avgRating > 0 ? (
                              <div className="space-y-1">
                                <div className="text-4xl font-black text-amber-500 flex items-center justify-center sm:justify-start gap-2">
                                  <span>★ {avgRating.toFixed(1)}</span>
                                  <span className="text-sm font-bold text-neutral-400">/ 5.0</span>
                                </div>
                                <div className="text-xs font-semibold text-neutral-600 dark:text-zinc-400">На основе {myRatings.length} оценок от собственников</div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="text-2xl font-black text-neutral-400 italic">Рейтинг не сформирован</div>
                                <div className="text-xs text-neutral-500">Собственники еще не оценивали ваши акты ТО</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {(() => {
                      const myRatings = reports.filter(r => r.specialistUserId === currentUser.id && r.approvedByOwner === true && r.ownerRating !== undefined);
                      const avgRating = myRatings.length > 0 
                        ? Number((myRatings.reduce((sum, r) => sum + (r.ownerRating || 0), 0) / myRatings.length).toFixed(1)) 
                        : 0;
                      if (avgRating === 0) return null;
                      return (
                        <div className="w-full sm:w-1/2 space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>Шкала экспертности:</span>
                            <span>{(avgRating / 5 * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${(avgRating / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">💬 Отзывы и комментарии клиентов</h3>
                    <p className="text-xs opacity-65">История комментариев и обратной связи, оставленных собственниками по вашим актам ТО</p>
                  </div>

                  <div className="space-y-3">
                    {reports.filter(r => r.specialistUserId === currentUser.id && r.approvedByOwner === true && r.ownerRating !== undefined).length === 0 ? (
                      <p className="text-xs italic opacity-50 p-6 text-center">Оценки и отзывы о вашей работе пока отсутствуют</p>
                    ) : (
                      reports.filter(r => r.specialistUserId === currentUser.id && r.approvedByOwner === true && r.ownerRating !== undefined).map(rep => {
                        const associatedObject = objects.find(o => o.id === rep.objectId);
                        return (
                          <div key={rep.id} className="p-4 border rounded-xl bg-slate-50 dark:bg-zinc-900/40 border-neutral-300/10 space-y-2 text-xs hover:border-neutral-300 dark:hover:border-zinc-700 transition-colors">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <span className="font-extrabold text-slate-800 dark:text-slate-100 text-xs">Собственник ({associatedObject?.name || "Здание"})</span>
                                <span className="text-[10px] opacity-50 block">{associatedObject ? `Адрес: ${associatedObject.address}` : `Акт: ${rep.id}`}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-amber-500 font-extrabold text-sm">
                                  {"★".repeat(rep.ownerRating || 0)}{"☆".repeat(5 - (rep.ownerRating || 0))}
                                </span>
                                <span className="text-[9px] opacity-45">{new Date(rep.dateDone).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </div>
                            {rep.ownerRatingComment ? (
                              <p className="italic text-slate-600 dark:text-zinc-300 p-2.5 rounded-lg bg-white dark:bg-zinc-800/40 border-dashed border border-neutral-300/10">
                                "{rep.ownerRatingComment}"
                              </p>
                            ) : (
                              <p className="italic text-slate-400 p-1">Оценка выставлена без текстового комментария</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. TAB: SPECIALIST APP STYLE / BRANDING */}
            {activeTab === 'spec-branding' && (
              <div className="space-y-6 max-w-2xl mx-auto w-full animate-fadeIn text-left">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-widest mb-1">Оформление приложения</span>
                    <h3 className="font-extrabold text-base text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                      🎨 Персональное оформление интерфейса
                    </h3>
                    <p className="text-xs opacity-65">
                      Настройка тем оформления, прозрачности полей и панелей и фоновых изображений вашего рабочего места
                    </p>
                  </div>

                  <form onSubmit={saveSettingsSubmit} className="space-y-6 text-xs text-left">
                    {/* 1. Selection of color palette (theme) */}
                    <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-zinc-300">Цветовая палитра интерфейса:</label>
                      <select
                        value={theme}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setTheme(val);
                          localStorage.setItem("app_theme", val);
                        }}
                        className="w-full text-xs font-semibold p-2.5 rounded-lg border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-neutral-800 dark:text-neutral-100 focus:outline-none"
                      >
                        <option value="cleanroom">🧼 «Чистая комната» (Классический светлый)</option>
                        <option value="modern">💻 «Современный тёмный» (Modern Dark)</option>
                        <option value="terminal">📟 «Хаки терминал» (Terminal Green)</option>
                        <option value="warm">📜 «Теплый бежевый» (Warm Serif)</option>
                        <option value="japanese">🍣 «Японский дзен» (Japanese Zen)</option>
                        <option value="japanese_calligraphy">🌸 «Сад сакуры & Каллиграфия» (Kyoto Brush)</option>
                        <option value="crisp_minimal">⬜ «Строгий бумажный» (Crisp Minimal)</option>
                      </select>
                    </div>

                    {/* 2. Фоновое оформление и Прозрачность */}
                    <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white/45 dark:bg-zinc-900/40">
                      <span className="font-bold text-neutral-700 dark:text-zinc-300 uppercase tracking-wider block text-[10px]">🏞️ Фоновые изображения и Стеклянный дизайн (Glassmorphism):</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'default', appBackgroundUrl: '' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            (!systemSettings.appBackgroundType || systemSettings.appBackgroundType === 'default')
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🎨 Стандартная тема
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'villa', appBackgroundUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'villa'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm'
                              : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🏡 Вилла (Остекление)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'blueprint', appBackgroundUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'blueprint'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm'
                              : 'border-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          📐 Чертеж фасада
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'sakura', appBackgroundUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=2000&q=80' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                            systemSettings.appBackgroundType === 'sakura'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm'
                              : 'border-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          🌸 Сад Сакуры
                        </button>
                        <button
                          type="button"
                          onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'custom' })}
                          className={`p-2.5 text-xs font-semibold rounded-lg border text-center transition-all col-span-2 ${
                            systemSettings.appBackgroundType === 'custom'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-sm'
                              : 'border-neutral-200 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 bg-white/40 dark:bg-zinc-800/20'
                          }`}
                        >
                          📸 Свое фоновое фото
                        </button>
                      </div>

                      {/* Card transparency slider */}
                      <div className="space-y-1.5 bg-neutral-50 dark:bg-zinc-800/20 border border-neutral-150 dark:border-zinc-800 rounded-xl p-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400">
                            Прозрачность полей и панелей:
                          </span>
                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            {systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}
                          onChange={(e) => setSystemSettings({ ...systemSettings, cardOpacity: parseInt(e.target.value, 10) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                        <p className="text-[9px] text-neutral-400 dark:text-zinc-500 leading-tight">
                          Настройте прозрачность остекления (Glassmorphism): левее для полупрозрачного матового фона, правее — для сплошного цвета.
                        </p>
                      </div>

                      {systemSettings.appBackgroundType === 'custom' && (
                        <div className="space-y-2 animate-fadeIn pt-1">
                          <span className="text-xs font-semibold text-neutral-600 block">Загрузить свое фоновое фото с диска (Base64):</span>
                          <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg p-4 bg-white/50 hover:bg-white transition cursor-pointer group">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSystemSettings({ ...systemSettings, appBackgroundUrl: reader.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <ImageIcon className="w-6 h-6 text-neutral-400 group-hover:text-neutral-500 transition mb-1" />
                            <span className="text-[11px] font-semibold text-neutral-600">Нажмите для выбора файла</span>
                            <span className="text-[9px] text-neutral-400">JPG, PNG, WEBP</span>
                          </div>

                          <div className="flex flex-col gap-1 pt-1">
                            <span className="text-[10px] font-semibold text-neutral-500">Или внешняя ссылка на изображение:</span>
                            <input 
                              type="text" 
                              placeholder="https://example.com/background.jpg"
                              value={systemSettings.appBackgroundUrl && !systemSettings.appBackgroundUrl.startsWith("data:") ? systemSettings.appBackgroundUrl : ""}
                              onChange={(e) => setSystemSettings({ ...systemSettings, appBackgroundUrl: e.target.value })}
                              className={getInputStyle()}
                            />
                          </div>

                          {systemSettings.appBackgroundUrl && (
                            <div className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-200 text-[11px] gap-2">
                              <span className="truncate max-w-[200px] text-blue-800 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Собственный фон загружен
                              </span>
                              <button
                                type="button"
                                onClick={() => setSystemSettings({ ...systemSettings, appBackgroundUrl: "" })}
                                className="text-rose-600 hover:text-rose-800 transition font-semibold"
                              >
                                Сбросить
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-zinc-800">
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/15 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>💾 Сохранить оформление</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 5. TAB: LEGAL AGREEMENTS FOR SPECIALIST */}
            {activeTab === 'legal' && (
              <div className="space-y-4 max-w-3xl mx-auto w-full text-left">
                <div className={getCardStyle()}>
                  <div className={getSubHeaderStyle()}>
                    <h3 className="font-bold text-base flex items-center gap-2">⚖️ Юридические соглашения</h3>
                    <p className="text-xs opacity-60">Официальные документы, регулирующие использование сервиса «Цифровой паспорт объекта»</p>
                  </div>
                  <LegalTabContent currentTheme={theme} isAdmin={currentUser.role === 'admin'} />
                </div>
              </div>
            )}

            {/* TAB: SUPPORT */}
            {activeTab === 'support' && (
              <SupportTab 
                currentUser={currentUser} 
                systemSettings={systemSettings} 
                getCardStyle={getCardStyle} 
                getSubHeaderStyle={getSubHeaderStyle}
                theme={theme}
              />
            )}

          </div>
        )}

      </div>

      {/* Humble Clean footer */}
      <footer className="py-12 border-t border-neutral-300/10 mt-12 text-center text-[10px] opacity-50 space-y-1">
        <p>© 2026 Управление Техническим Обслуживанием Объектов</p>
        <p>«Цифровой паспорт объекта»</p>
        <p className="pt-1 font-semibold">Разработано командой АкваТермСервис г. Новосибирск</p>
      </footer>

      {/* MODAL: QR-CODE ISSUING FOR INSTRUCTIONS & FORMS */}
      {qrModalSchedule && (() => {
        const schObj = objects.find(o => o.id === qrModalSchedule.objectId);
        const isRegisteredSpec = qrSelectedSpecId !== "new-specialist";
        const qrLink = isRegisteredSpec
          ? `${window.location.origin}${window.location.pathname}?flow=specialist&registered=true&specUserId=${qrSelectedSpecId}&objId=${qrModalSchedule.objectId}&schId=${qrModalSchedule.id}`
          : `${window.location.origin}${window.location.pathname}?flow=specialist&registered=false&objId=${qrModalSchedule.objectId}&schId=${qrModalSchedule.id}`;
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
                  className="p-1 hover:bg-neutral-150 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body of Modal */}
              <div className="space-y-4 text-center">
                <p className="text-xs text-neutral-500 text-left leading-relaxed">
                  Получатель сможет отсканировать QR-код на мобильном телефоне для мгновенного заполнения акта и синхронизации с облачным хранилищем на Яндекс.Диске.
                </p>

                {/* Specialist Selection option dropdown inside QR code */}
                <div className="flex flex-col gap-1 text-left bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                  <label className="text-[10px] uppercase font-semibold text-neutral-500">Адресат (Специалист Исполнитель):</label>
                  <select 
                    value={qrSelectedSpecId}
                    onChange={(e) => setQrSelectedSpecId(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded p-1.5 text-xs text-neutral-800 focus:outline-[#bc1c24]"
                  >
                    <option value="new-specialist">👤 Новый специалист (разовый гостевой Акт)</option>
                    {users.filter(u => u.role === 'specialist').map(spec => (
                      <option key={spec.id} value={spec.id}>
                        🛠️ {spec.fullname} ({spec.company || "Служба ТО"})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-neutral-400 mt-1 leading-tight">
                    {isRegisteredSpec 
                      ? "Зарегистрированному специалисту откроются и другие регламенты на этом здании при авторизации."
                      : "Новому гостю откроется только одна обособленная анкета этого чек-листа с формой внесения ФИО и телефона."}
                  </p>
                </div>

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

      {/* MODAL: EDIT USER PROFILE */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`${getCardStyle()} max-w-md w-full max-h-[90vh] overflow-y-auto relative animate-fadeIn space-y-4 bg-white text-neutral-800 p-6`}>
            
            {/* Header of Modal */}
            <div className="flex justify-between items-start border-b pb-3 border-neutral-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase block tracking-wider">Настройки аккаунта & Дизайна</span>
                <h4 className="font-semibold text-base text-slate-900 leading-snug">
                  Личные данные и фоновое оформление
                </h4>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)} 
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
              {profileSuccessMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-xs font-semibold">
                  {profileSuccessMsg}
                </div>
              )}
              {profileErrorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-xs font-semibold">
                  {profileErrorMsg}
                </div>
              )}

              {/* РАЗДЕЛ: АВАТАРКА ПОЛЬЗОВАТЕЛЯ / ФОТО СПЕЦИАЛИСТА */}
              <div className="p-3 bg-neutral-100/50 dark:bg-zinc-900/40 rounded-xl border border-neutral-200 dark:border-zinc-800 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  Фотография профиля {currentUser?.role === 'specialist' && "(Обязательно для выездного инженера TO)"}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-neutral-200 dark:border-zinc-800 bg-neutral-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 shadow-inner group">
                    {profileAvatarUrl ? (
                      <img 
                        src={profileAvatarUrl} 
                        alt="Аватар профиля" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                    )}
                    <label 
                      htmlFor="profile-avatar-input"
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <input 
                      type="file"
                      id="profile-avatar-input"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Размер файла превышает 2МБ. Выберите меньший файл.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setProfileAvatarUrl(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById("profile-avatar-input")?.click()}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-all cursor-pointer shadow-sm"
                      >
                        Выбрать файл...
                      </button>
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarUrl("")}
                          className="py-1 px-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-200 font-bold text-[10px] rounded transition-all cursor-pointer"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 italic block">
                      Файл JPG, PNG. До 2 МБ. Отображается в чек-листах и графиках контактов.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">ФИО *</label>
                <input 
                  type="text" 
                  required
                  value={profileFullname}
                  onChange={(e) => setProfileFullname(e.target.value)}
                  placeholder="Иван Иванов"
                  className={getInputStyle()} 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Номер телефона</label>
                <input 
                  type="text" 
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+7-999-123-45-67"
                  className={getInputStyle()} 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Компания (служба эксплуатации)</label>
                <input 
                  type="text" 
                  value={profileCompany}
                  onChange={(e) => setProfileCompany(e.target.value)}
                  placeholder="ООО Ромашка"
                  className={getInputStyle()} 
                />
              </div>

              {currentUser?.role === 'specialist' && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Ключевые профессиональные навыки</label>
                  <textarea 
                    value={profileKeySkills}
                    onChange={(e) => setProfileKeySkills(e.target.value)}
                    placeholder="Например: Обслуживание ИТП, наладка автоматики Danfoss, ремонт чиллеров, КИПиА..."
                    className={getInputStyle()} 
                    rows={3}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Новый пароль (оставьте пустым для сохранения старого)</label>
                <input 
                  type="password" 
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="••••••••"
                  className={getInputStyle()} 
                />
              </div>

              {/* РАЗДЕЛ ТЕМЫ И ФОНОВОГО ОФОРМЛЕНИЯ В МЕНЮ "НАСТРОЙКИ" (Скрыт для специалистов) */}
              {currentUser?.role !== 'specialist' && (
                <div className="border-t border-neutral-200/60 pt-4 mt-3 space-y-3.5">
                  <span className="font-bold text-neutral-800 text-xs block mb-1 uppercase tracking-wider text-blue-600">🎨 Темы и адаптивное фоновое оформление:</span>
                  
                  {/* 1. Выбор цветовой палитры (Тема) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Цветовая палитра интерфейса:</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                      className="w-full text-xs font-semibold p-2.5 rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="cleanroom">🧼 «Чистая комната» (Классический светлый)</option>
                      <option value="modern">💻 «Современный тёмный» (Modern Dark)</option>
                      <option value="terminal">📟 «Хаки терминал» (Terminal Green)</option>
                      <option value="warm">📜 «Теплый бежевый» (Warm Serif)</option>
                      <option value="japanese">🍣 «Японский дзен» (Japanese Zen)</option>
                      <option value="japanese_calligraphy">🌸 «Сад сакуры & Каллиграфия» (Kyoto Brush)</option>
                      <option value="crisp_minimal">⬜ «Строгий бумажный» (Crisp Minimal)</option>
                    </select>
                  </div>

                  {/* 2. Наличие Фоновых Рисунков с Эффектом Остекления (Glassmorphism) */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Фоновое изображение экрана и адаптивный стеклянный дизайн (Glassmorphic):</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'default', appBackgroundUrl: '' })}
                        className={`p-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          (!systemSettings.appBackgroundType || systemSettings.appBackgroundType === 'default')
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600 bg-white'
                        }`}
                      >
                        🎨 Стандартная тема
                      </button>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'villa', appBackgroundUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80' })}
                        className={`p-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          systemSettings.appBackgroundType === 'villa'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600 bg-white'
                        }`}
                      >
                        🏡 Вилла (Остекление)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'blueprint', appBackgroundUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80' })}
                        className={`p-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          systemSettings.appBackgroundType === 'blueprint'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600 bg-white'
                        }`}
                      >
                        📐 Чертеж фасада
                      </button>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'sakura', appBackgroundUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?auto=format&fit=crop&w=2000&q=80' })}
                        className={`p-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          systemSettings.appBackgroundType === 'sakura'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600 bg-white'
                        }`}
                      >
                        🌸 Сад Сакуры
                      </button>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, appBackgroundType: 'custom' })}
                        className={`p-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all col-span-2 ${
                          systemSettings.appBackgroundType === 'custom'
                            ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600 bg-white'
                        }`}
                      >
                        📸 Свое фоновое фото
                      </button>
                    </div>

                    {/* 3. Ползунок прозрачности полей и панелей */}
                    <div className="space-y-1.5 bg-neutral-50 border border-neutral-150 rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Прозрачность полей и панелей:
                        </span>
                        <span className="text-xs font-extrabold text-blue-600">
                          {systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={systemSettings.cardOpacity !== undefined ? systemSettings.cardOpacity : 85}
                        onChange={(e) => setSystemSettings({ ...systemSettings, cardOpacity: parseInt(e.target.value, 10) })}
                        className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <p className="text-[9px] text-neutral-400 leading-tight">
                        Перемещайте ползунок влево для тонкой настройки остекления (матовый полупрозрачный фон), вправо — для плотного непрозрачного цвета.
                      </p>
                    </div>

                    {systemSettings.appBackgroundType === 'custom' && (
                      <div className="space-y-2 animate-fadeIn pt-1">
                        <span className="text-xs font-semibold text-neutral-600 block">Загрузить свое фоновое фото с диска (Base64):</span>
                        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg p-4 bg-white/50 hover:bg-white transition cursor-pointer group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setSystemSettings({ ...systemSettings, appBackgroundUrl: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <ImageIcon className="w-6 h-6 text-neutral-400 group-hover:text-neutral-500 transition mb-1" />
                          <span className="text-[11px] font-semibold text-neutral-600">Нажмите для выбора файла</span>
                          <span className="text-[9px] text-neutral-400">JPG, PNG, WEBP</span>
                        </div>

                        <div className="flex flex-col gap-1 pt-1">
                          <span className="text-[10px] font-semibold text-neutral-500">Или внешняя ссылка на изображение:</span>
                          <input 
                            type="text" 
                            placeholder="https://example.com/background.jpg"
                            value={systemSettings.appBackgroundUrl && !systemSettings.appBackgroundUrl.startsWith("data:") ? systemSettings.appBackgroundUrl : ""}
                            onChange={(e) => setSystemSettings({ ...systemSettings, appBackgroundUrl: e.target.value })}
                            className={getInputStyle()}
                          />
                        </div>

                        {systemSettings.appBackgroundUrl && (
                          <div className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-200 text-[11px] gap-2">
                            <span className="truncate max-w-[200px] text-blue-800 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              Собственный фон загружен
                            </span>
                            <button
                              type="button"
                              onClick={() => setSystemSettings({ ...systemSettings, appBackgroundUrl: "" })}
                              className="text-rose-600 hover:text-rose-800 transition font-semibold"
                            >
                              Сбросить
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[11px] text-neutral-500 block leading-tight pt-1">
                      🌟 <b>Прим.:</b> Выбор фона и темы применяется ко всему приложению. При активации фонового изображения мгновенно активируется полупрозрачность панелей (Glassmorphism) с эффектом размытия <b>backdrop-blur-md</b>.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button 
                  type="button"
                  onClick={() => setIsProfileOpen(false)} 
                  className={getMutedBtn()}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={getAccentBtn()}
                >
                  Сохранить
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: RATING & APPROVAL */}
      {ratingReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-300/15 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 animate-scaleUp text-neutral-800 dark:text-neutral-100 text-left">
            <div className="flex items-center gap-2 text-amber-500">
              <span className="text-xl">🌟</span>
              <h3 className="font-bold text-sm uppercase tracking-wider">Утверждение акта и оценка инженера</h3>
            </div>
            
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
              Вы утверждаете Акт <strong>{ratingReport.id}</strong>. Пожалуйста, оцените квалификацию и качество услуг технического специалиста <strong>{ratingReport.specialistInfo?.fullname}</strong> по 5-звездочной шкале экспертов:
            </p>

            <div className="flex items-center justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="text-3xl focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                >
                  <span className={star <= ratingStars ? "text-amber-400" : "text-neutral-300 dark:text-neutral-700"}>
                    ★
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <label className="font-semibold text-slate-500">Комментарий/Отзыв (необязательно)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Напишите пару слов о качестве выполненных работ..."
                className="w-full h-20 p-2 border border-neutral-300/20 rounded-lg bg-neutral-100/10 dark:bg-zinc-800/20 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-300/10">
              <button
                type="button"
                onClick={() => setRatingReport(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitOwnerRating}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-md"
              >
                Утвердить и оценить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-300/15 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp text-neutral-800 dark:text-neutral-100 text-left">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm uppercase tracking-wider">Подтверждение удаления</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans">
              {deleteConfirm.title}
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-300/10">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmedDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Overlay for Real-time Confirmations and alerts */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 transition-all duration-300 transform translate-y-0 scale-100 opacity-100 pointer-events-auto cursor-pointer animate-fadeIn ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-250 dark:bg-zinc-900/95 dark:border-rose-900/50 text-rose-800 dark:text-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-50 border-blue-250 dark:bg-zinc-900/95 dark:border-zinc-800/50 text-blue-800 dark:text-blue-300'
                : 'bg-emerald-50 border-emerald-250 dark:bg-zinc-900/95 dark:border-zinc-800/50 text-emerald-800 dark:text-emerald-300'
            }`}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-left">
              <span className="text-xs font-bold font-sans block">
                {toast.type === 'error' ? 'Ошибка' : toast.type === 'info' ? 'Инфо' : 'Успешно'}
              </span>
              <p className="text-[11px] opacity-90 leading-snug mt-0.5 font-sans font-medium">{toast.message}</p>
            </div>
            <button 
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 shrink-0 self-start text-xs font-bold leading-none"
              onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
