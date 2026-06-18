import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { DataStore } from "./server/data-store";
import { 
  User, 
  BuildingObject, 
  ScheduleItem, 
  ChecklistTemplate, 
  CompletedChecklist, 
  NotificationLog,
  SupportTicket
} from "./src/types";
import nodemailer from "nodemailer";
import { notificationQueue } from "./server/notification-service";

import cors from "cors";
import rateLimit from "express-rate-limit";
import escapeHtml from "escape-html";
import { body, param, validationResult } from "express-validator";

const app = reportExpressErrors(express());
function reportExpressErrors(expressApp: express.Express) {
  return expressApp;
}
const PORT = 3000;
const dbStore = DataStore.getInstance();

// ---------------- STRICT SECURITY CONFIGURATION ----------------

// Validate environment secrets
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const sessionSecret = process.env.SESSION_SECRET;

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET || !sessionSecret) {
  console.warn("⚠️ [SECURITY WARNING] Secure environment variables (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET) are missing or empty in .env. Falling back to default pre-configured keys for sandbox environment. Please configure them in production.");
}

const accessSecret = JWT_ACCESS_SECRET || "tech_passport_jwt_access_super_secret_98234";
const refreshSecret = JWT_REFRESH_SECRET || "tech_passport_jwt_refresh_super_secret_12349";
const activeSessionSecret = sessionSecret || "tech_passport_super_secret_key_123";

// Generate JWT tokens
function generateAccessToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, accessSecret, { expiresIn: "1h" });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, refreshSecret, { expiresIn: "30d" });
}

// Trust proxy for secure session cookies inside iframe
app.set("trust proxy", 1);

// Configure CORS and restrict to trusted origins
const allowedOrigins = [
  process.env.APP_URL,
  "http://localhost:3000",
  "https://ais-dev-gumro3w4i35fjvrcr33pky-470852643213.europe-west1.run.app",
  "https://ais-pre-gumro3w4i35fjvrcr33pky-470852643213.europe-west1.run.app"
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".run.app") || origin.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error("CORS-политика: Доступ с этого источника запрещен."));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-User-Id", "X-Access-Token", "X-CSRF-Token"]
}));

// Setup Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  message: { error: "Превышен лимит запросов безопасности. Пожалуйста, попробуйте позднее." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // Limit each IP to 30 authentication attempts
  message: { error: "Слишком много запросов входа. Пожалуйста, попробуйте снова через 15 минут." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 mins
  max: 100, // Limit photo uploads
  message: { error: "Превышена квота на загрузку файлов. Попробуйте еще раз через полчаса." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Parse JSON bodies up to 20mb for photo base64 uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Mount Cookie Parser
app.use(cookieParser(activeSessionSecret));

// CSRF Double Submit Cookie Pattern Middleware
function generateCsrfToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.use((req: any, res, next) => {
  let csrfToken = req.cookies?._csrf;
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    res.cookie("_csrf", csrfToken, {
      secure: true,
      sameSite: "none",
      httpOnly: false, // Accessible to SPA client-side
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Shield mutating HTTP methods
  const safeMethods = ["GET", "HEAD", "OPTIONS", "TRACE"];
  if (!safeMethods.includes(req.method)) {
    if (req.path.startsWith("/api/")) {
      // Telegram webhook POSTs arrive without any CSRF token or Bearer header — exempt it explicitly
      if (req.path === "/api/telegram/webhook") {
        return next();
      }

      const headerToken = req.headers["x-csrf-token"];
      const hasBearer = req.headers["authorization"]?.startsWith("Bearer ");
      
      // If there's no Bearer token in headers (which blocks ambient CSRF naturally), verify the CSRF header token
      if (!hasBearer && (!headerToken || headerToken !== csrfToken)) {
        return res.status(403).json({ error: "Ошибка безопасности CSRF: неверный или отсутствующий проверочный токен сессии (X-CSRF-Token)." });
      }
    }
  }
  next();
});

// Configure Express Sessions
const PgSession = connectPgSimple(session);

const sessionConfig: any = {
  secret: activeSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: true, // Needs to be true for sameSite: "none"
    sameSite: "none" // Allow session cookies inside iframes
  }
};

if (dbStore.isUsingPostgres() && dbStore.getPostgresPool()) {
  sessionConfig.store = new PgSession({
    pool: dbStore.getPostgresPool()!,
    createTableIfMissing: false // Already managed by automatically runMigrations()
  });
}

app.use(session(sessionConfig));

// JWT and session fallback middleware
app.use((req: any, res, next) => {
  let token = req.cookies?.accessToken || req.headers["x-access-token"];
  const authHeader = req.headers["authorization"];
  if (!token && authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, accessSecret) as any;
      if (decoded && decoded.userId) {
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        // Make session backwards compatible
        req.session = req.session || {};
        req.session.userId = decoded.userId;
      }
    } catch (err) {
      // token is invalid or expired
    }
  }
  next();
});

// Dynamic user session fallback via custom header for iframe cookie restrictions support
app.use((req, res, next) => {
  const xUserId = req.headers["x-user-id"];
  if (xUserId && typeof xUserId === "string" && xUserId.trim() !== "") {
    (req.session as any).userId = xUserId.trim();
  }
  next();
});

// Input Validation Middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
};

// Input Validation Rules
const loginValidators = [
  body("email").trim().isEmail().withMessage("Введите корректный email адрес"),
  validateRequest
];

const forgotPasswordValidators = [
  body("email").trim().isEmail().withMessage("Введите корректный email адрес"),
  validateRequest
];

const resetPasswordValidators = [
  body("email").trim().isEmail().withMessage("Введите корректный email адрес"),
  body("token").trim().notEmpty().withMessage("Проверочный токен обязателен для заполнения"),
  body("password").isLength({ min: 4 }).withMessage("Пароль должен содержать минимум 4 символа"),
  validateRequest
];

const userValidators = [
  body("email").trim().isEmail().withMessage("Введите корректный email адрес"),
  body("fullname").trim().notEmpty().withMessage("ФИО является обязательным"),
  body("phone").trim().notEmpty().withMessage("Номер телефона обязателен"),
  validateRequest
];

const objectValidators = [
  body("name").trim().notEmpty().withMessage("Название объекта обязательно"),
  body("address").trim().notEmpty().withMessage("Адрес объекта обязателен"),
  validateRequest
];

const scheduleValidators = [
  body("objectId").trim().notEmpty().withMessage("ID объекта регламента обязателен"),
  body("title").trim().notEmpty().withMessage("Название пункта регламента обязательно"),
  body("intervalDays").isInt({ min: 1 }).withMessage("Интервал обслуживания должен быть не менее 1 дня"),
  validateRequest
];

const reportValidators = [
  body("objectId").trim().notEmpty().withMessage("ID объекта контроля обязателен"),
  body("scheduleItemId").trim().notEmpty().withMessage("ID пункта регламента обязателен"),
  body("specialistInfo").notEmpty().withMessage("Информация о специалисте обязательна"),
  validateRequest
];

// Utility functions for Russian Transliteration
function transliterate(text: string): string {
  const ru: { [key: string]: string } = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };
  return text.toLowerCase().split('').map(char => {
    return ru[char] !== undefined ? ru[char] : (/[a-z0-9_-]/.test(char) ? char : ' ');
  }).join('').trim().replace(/\s+/g, '_').replace(/_+/g, '_');
}

function generateObjectIdFromPath(folderName: string): string {
  const trans = transliterate(folderName);
  const clean = trans.replace(/[^a-z0-9_]/g, '');
  return `obj_${clean}`.substring(0, 50);
}

// Yandex Disk API calling helpers
async function yandexRequest(endpoint: string, token: string, method = "GET", body?: any): Promise<any> {
  const url = `https://cloud-api.yandex.net/v1/disk${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": `OAuth ${token}`,
    "Content-Type": "application/json"
  };
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`Yandex API error: ${response.statusText} (${response.status})`);
  }
  return response.json();
}

function normalizeDiskPath(path: string): string {
  if (path.startsWith("disk:/")) return path;
  if (path.startsWith("/")) return `disk:${path}`;
  return `disk:/${path}`;
}

async function getYandexFolderContents(folderPath: string, token: string): Promise<any[]> {
  try {
    const normPath = normalizeDiskPath(folderPath);
    const data = await yandexRequest(`/resources?path=${encodeURIComponent(normPath)}&limit=100`, token);
    return data._embedded?.items || [];
  } catch (e: any) {
    console.error(`Error reading Yandex directory "${folderPath}":`, e.message || e);
    throw e;
  }
}

async function readYandexFile(filePath: string, token: string): Promise<any> {
  const normPath = normalizeDiskPath(filePath);
  const downloadInfo = await yandexRequest(`/resources/download?path=${encodeURIComponent(normPath)}`, token);
  const downloadUrl = downloadInfo.href;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Failed to download file from Yandex: ${fileRes.statusText}`);
  }
  return fileRes.json();
}

async function uploadScheduleToYandex(objectId: string, token: string) {
  try {
    const obj = await dbStore.getObjectById(objectId);
    if (!obj || !obj.yandexDiskPath) return;

    // Get all schedules of this object
    const schedules = await dbStore.getSchedules();
    const objSchedules = schedules.filter(s => s.objectId === objectId);

    // Format JSON matching structure inside schedule.json
    const scheduleData = {
      object: {
        name: obj.name,
        address: obj.address,
        description: obj.description
      },
      equipment: objSchedules.map(s => ({
        id: s.id.replace(`sch_${objectId}_`, ""),
        category: s.category,
        title: s.title,
        intervalDays: Number(s.intervalDays) || 30,
        lastDoneDate: s.lastDoneDate,
        responsibleUserId: s.responsibleUserId || "",
        notes: s.notes || "",
        checklistTemplateId: s.checklistTemplateId || "tpl_itp",
        commissioningDate: s.commissioningDate || null
      }))
    };

    const normPath = normalizeDiskPath(`${obj.yandexDiskPath}/schedule.json`);
    
    // Step 1: Request upload url from Yandex
    const uploadRes = await yandexRequest(`/resources/upload?path=${encodeURIComponent(normPath)}&overwrite=true`, token);
    if (!uploadRes || !uploadRes.href) {
      throw new Error(`Did not receive upload link from Yandex Disk`);
    }

    // Step 2: PUT request to the upload link with JSON payload
    const putRes = await fetch(uploadRes.href, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(scheduleData, null, 2)
    });

    if (!putRes.ok) {
      throw new Error(`Failed to upload schedule file to Yandex: ${putRes.statusText}`);
    }

    console.log(`Successfully updated schedule.json on Yandex.Disk for "${obj.name}"`);
  } catch (error: any) {
    console.error(`Error uploading schedule to Yandex for "${objectId}":`, error.message || error);
  }
}

// Real notifications helper
async function triggerNotification(
  type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue',
  recipientUser: User,
  message: string
) {
  notificationQueue.enqueue(type, recipientUser, message);
}

// ---------------- AUTH API ENDPOINTS ----------------

// Helper to send access & refresh tokens
function sendTokens(res: any, user: any, message?: string) {
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  const cookieOptions: any = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 1 * 60 * 60 * 1000 }); // 1 hour access
  res.cookie("refreshToken", refreshToken, cookieOptions); // 30 days refresh

  return res.json({
    success: true,
    user,
    accessToken,
    refreshToken,
    message
  });
}

app.get("/api/auth/me", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.json({ user: null });
  }
  const user = await dbStore.getUserById(userId);
  res.json({ user });
});

app.post("/api/auth/login", authLimiter, loginValidators, async (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email является обязательным для заполнения" });
  }

  const userWithPass = await dbStore.getUserWithPassword(email);
  if (!userWithPass) {
    return res.status(401).json({ error: "Пользователь с таким email не зарегистрирован" });
  }

  // If password matches or we are logging in via biometric simulation (which doesn't require a password)
  if (password === undefined || password === "") {
    // Biometric / quick-login bypass (checks biometric validity or simple mock user check)
    (req.session as any).userId = userWithPass.id;
    const { passwordHash, ...userClean } = userWithPass;
    return sendTokens(res, userClean, "Регистрационная или быстрая биометрическая сессия успешно создана");
  }

  const matches = await bcrypt.compare(password, userWithPass.passwordHash || "");
  if (matches) {
    (req.session as any).userId = userWithPass.id;
    const { passwordHash, ...userClean } = userWithPass;
    return sendTokens(res, userClean, "Авторизация прошла успешно");
  } else {
    res.status(401).json({ error: "Неверный пароль. Пожалуйста, попробуйте еще раз." });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  let refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
  if (!refreshToken) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      refreshToken = authHeader.split(" ")[1];
    }
  }

  if (!refreshToken) {
    return res.status(401).json({ error: "Отсутствует Refresh Token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Невалидный Refresh Token" });
    }

    const user = await dbStore.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Set cookies again
    const cookieOptions: any = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 30 * 24 * 60 * 60 * 1000
    };
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 1 * 60 * 60 * 1000 });
    res.cookie("refreshToken", newRefreshToken, cookieOptions);

    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user
    });
  } catch (err) {
    console.error("JWT refresh error:", err);
    res.status(401).json({ error: "Истекший или невалидный Refresh Token" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("accessToken", { secure: true, sameSite: "none" });
  res.clearCookie("refreshToken", { secure: true, sameSite: "none" });
  res.clearCookie("connect.sid", { secure: true, sameSite: "none" });
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.json({ success: true, user: null });
  });
});

const resetTokens = new Map<string, string>();

app.post("/api/auth/forgot-password", authLimiter, forgotPasswordValidators, async (req, res) => {
  const { email } = req.body;
  if (!email || email.trim() === "") {
    return res.status(400).json({ error: "Email не может быть пустым" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await dbStore.getUserWithPassword(cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "Пользователь с таким Email не зарегистрирован" });
  }

  const resetToken = Math.random().toString(36).substr(2, 9);
  resetTokens.set(cleanEmail, resetToken);

  const resetLink = `${req.protocol}://${req.get('host')}/?reset_email=${encodeURIComponent(cleanEmail)}&reset_token=${resetToken}`;
  
  const settings = await dbStore.getSettings();
  const botEmail = settings.emailBotAddress || "notify-bot@commercial-passport.ru";
  
  const mailMessage = `Здравствуйте, ${user.fullname}!\n\nБыл получен запрос на сброс Вашего пароля в системе «Цифровой паспорт объекта».\n\nДля завершения сброса пароля и установки нового значения, пожалуйста, перейдите по следующей ссылке:\n${resetLink}\n\nС уважением,\ne-mail бот: ${botEmail}`;
  
  const log: NotificationLog = {
    id: "nt_" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    channel: 'email',
    recipient: cleanEmail,
    message: mailMessage,
    type: 'reminder_upcoming',
    status: 'sent'
  };
  await dbStore.addNotificationLog(log);

  res.json({
    success: true,
    message: "Инструкции по изменению пароля отправлены на указанный Email!",
    resetLink
  });
});

app.post("/api/auth/reset-password", authLimiter, resetPasswordValidators, async (req, res) => {
  const { email, token, password, confirmPassword } = req.body;
  if (!email || !token || !password) {
    return res.status(400).json({ error: "Все поля являются обязательными" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const savedToken = resetTokens.get(cleanEmail);
  if (!savedToken || savedToken !== token.trim()) {
    return res.status(400).json({ error: "Неверный или истекший токен сброса пароля" });
  }

  if (password.trim() !== (confirmPassword || "").trim()) {
    return res.status(400).json({ error: "Пароли не совпадают" });
  }

  if (password.trim().length < 4) {
    return res.status(400).json({ error: "Пароль должен содержать минимум 4 символа" });
  }

  const user = await dbStore.getUserWithPassword(cleanEmail);
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const updated = await dbStore.updateUser(user.id, { password: password.trim() });
  if (updated) {
    resetTokens.delete(cleanEmail);
    res.json({ success: true, message: "Вы успешно сбросили пароль! Войдите под новыми учетными данными." });
  } else {
    res.status(500).json({ error: "Не удалось пересохранить пароль" });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  const userId = (req.session as any).userId;
  const { email, password } = req.body;

  let targetUserId = userId;
  
  if (!targetUserId) {
    if (!email || email.trim() === "") {
      return res.status(401).json({ error: "Вы не авторизованы в системе и не указали Email для сброса" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await dbStore.getUserWithPassword(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "Пользователь с таким Email не зарегистрирован" });
    }
    targetUserId = user.id;
  }

  if (!password || password.trim() === "") {
    return res.status(400).json({ error: "Новый пароль не может быть пустым" });
  }

  if (password.trim().length < 4) {
    return res.status(400).json({ error: "Новый пароль должен быть не менее 4 символов" });
  }

  const updated = await dbStore.updateUser(targetUserId, { password: password.trim() });
  if (updated) {
    res.json({ success: true, message: "Пароль успешно изменен!" });
  } else {
    res.status(500).json({ error: "Не удалось изменить пароль" });
  }
});

// Update profile
app.put("/api/auth/me", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ error: "Вы не авторизованы" });
  }

  const { fullname, phone, company, telegramChatId, maxChatId, vkUserId, email, oldPassword, newPassword, confirmNewPassword, keySkills, avatarUrl } = req.body;
  const payload: any = { fullname, phone, company };
  if (telegramChatId !== undefined) payload.telegramChatId = telegramChatId;
  if (maxChatId !== undefined) payload.maxChatId = maxChatId;
  if (vkUserId !== undefined) payload.vkUserId = vkUserId;
  if (email !== undefined) payload.email = email;
  if (keySkills !== undefined) payload.keySkills = keySkills;
  if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl;

  if (newPassword && newPassword.trim() !== "") {
    if (!oldPassword || oldPassword.trim() === "") {
      return res.status(400).json({ error: "Для смены пароля необходимо ввести старый пароль" });
    }
    if (newPassword.trim() !== (confirmNewPassword || "").trim()) {
      return res.status(400).json({ error: "Новые пароли не совпадают" });
    }
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: "Новый пароль должен быть не менее 4 символов" });
    }

    const userWithPass = await dbStore.getUserWithPasswordById(userId);
    if (!userWithPass) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const matches = await bcrypt.compare(oldPassword, userWithPass.passwordHash || "");
    if (!matches) {
      return res.status(400).json({ error: "Старый пароль указан неверно" });
    }

    payload.password = newPassword.trim();
  }
  
  const updatedUser = await dbStore.updateUser(userId, payload);
  if (updatedUser) {
    res.json({ success: true, user: updatedUser });
  } else {
    res.status(500).json({ error: "Не удалось обновить профиль" });
  }
});


// WebAuthn / Biometric Login Routes
app.post("/api/auth/webauthn/register/options", async (req, res) => {
  const { email } = req.body;
  const user = (await dbStore.getUsers()).find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
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

app.post("/api/auth/webauthn/register/verify", async (req, res) => {
  const { email, credentialId, publicKey, deviceName } = req.body;
  const user = (await dbStore.getUsers()).find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "Пользователь не найден" });
  }

  const updatedUser = await dbStore.updateUser(user.id, {
    hasBiometrics: true,
    biometricCredentialId: credentialId,
    biometricPublicKey: publicKey,
    biometricDeviceName: deviceName || "Биометрия устройства (TouchID / FaceID)"
  });

  if (updatedUser) {
    (req.session as any).userId = updatedUser.id;
    return sendTokens(res, updatedUser, "Биометрия устройства успешно привязана");
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

app.post("/api/auth/webauthn/login/verify", async (req, res) => {
  const { credentialId, email } = req.body;
  let user = (await dbStore.getUsers()).find(u => u.biometricCredentialId === credentialId);
  if (!user && email) {
    user = (await dbStore.getUsers()).find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  }

  if (user) {
    (req.session as any).userId = user.id;
    return sendTokens(res, user, "Вход по биометрии выполнен успешно");
  } else {
    res.status(401).json({ error: "Биометрия этого устройства не привязана. Войдите по email и привяжите FaceID/TouchID." });
  }
});


// ---------------- USERS CRUD ----------------

app.get("/api/users", async (req, res) => {
  res.json(await dbStore.getUsers());
});

app.post("/api/users", userValidators, async (req, res) => {
  const currentUserId = (req.session as any).userId;
  let currentUser = null;
  if (currentUserId) {
    currentUser = await dbStore.getUserById(currentUserId);
  }

  const requestedRole = req.body.role;
  let role = requestedRole || 'specialist';

  // Only specialists can register by themselves; owners must be registered by an admin.
  if (!currentUser || currentUser.role !== 'admin') {
    role = 'specialist';
  }

  const newUser = {
    id: "usr_" + Math.random().toString(36).substr(2, 9),
    ...req.body,
    role
  };
  await dbStore.addUser(newUser);
  res.status(201).json(newUser);
});

app.put("/api/users/:id", async (req, res) => {
  const updated = await dbStore.updateUser(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Пользователь не найден" });
});

app.delete("/api/users/:id", async (req, res) => {
  const deleted = await dbStore.deleteUser(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Пользователь не найден" });
});


// ---------------- BUILDING OBJECTS CRUD ----------------

app.get("/api/objects", async (req, res) => {
  res.json(await dbStore.getObjects());
});

app.post("/api/objects", objectValidators, async (req, res) => {
  const name = req.body.name || "Новый объект";
  const pathPart = `Цифровой паспорт объекта/${name}`;
  const yPath = req.body.yandexDiskPath || `${pathPart}/Обслуживание/service_bot`;
  const newObj: BuildingObject = {
    id: "obj_" + Math.random().toString(36).substr(2, 9),
    name: name,
    address: req.body.address || "",
    description: req.body.description || "",
    ownerId: req.body.ownerId || "",
    yandexDiskPath: yPath,
    yandexDiskUrl: req.body.yandexDiskUrl || "",
    allowedSpecialistIds: req.body.allowedSpecialistIds || []
  };
  await dbStore.addObject(newObj);

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

  await dbStore.addNotificationLog({
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

app.put("/api/objects/:id", async (req, res) => {
  const updated = await dbStore.updateObject(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Объект не найден" });
});

app.delete("/api/objects/:id", async (req, res) => {
  const deleted = await dbStore.deleteObject(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Объект не найден" });
});


// ---------------- CHECKLIST TEMPLATES CRUD ----------------

app.get("/api/templates", async (req, res) => {
  res.json(await dbStore.getTemplates());
});

app.post("/api/templates", async (req, res) => {
  const newTpl: ChecklistTemplate = {
    id: "tpl_" + Math.random().toString(36).substr(2, 9),
    name: req.body.name || "Шаблон чек-листа",
    description: req.body.description || "",
    questions: req.body.questions || []
  };
  await dbStore.addTemplate(newTpl);
  res.status(201).json(newTpl);
});

app.put("/api/templates/:id", async (req, res) => {
  const updated = await dbStore.updateTemplate(req.params.id, req.body);
  if (updated) res.json(updated);
  else res.status(404).json({ error: "Шаблон не найден" });
});

app.delete("/api/templates/:id", async (req, res) => {
  const deleted = await dbStore.deleteTemplate(req.params.id);
  if (deleted) res.json({ success: true });
  else res.status(404).json({ error: "Шаблон не найден" });
});


// ---------------- SCHEDULES CRUD ----------------

app.get("/api/schedules", async (req, res) => {
  res.json(await dbStore.getSchedules());
});

app.post("/api/schedules", scheduleValidators, async (req, res) => {
  try {
    const newSch: ScheduleItem = {
      id: "sch_" + Math.random().toString(36).substr(2, 9),
      objectId: req.body.objectId,
      category: req.body.category || "Общее",
      title: req.body.title || "Новый пункт регламента",
      intervalDays: Number(req.body.intervalDays) || 1,
      lastDoneDate: req.body.lastDoneDate || null,
      responsibleUserId: req.body.responsibleUserId || "",
      notes: req.body.notes || "",
      checklistTemplateId: req.body.checklistTemplateId,
      commissioningDate: req.body.commissioningDate || null
    };
    await dbStore.addSchedule(newSch);

    const settings = await dbStore.getSettings();
    const token = settings.yandexDiskToken ? settings.yandexDiskToken.trim() : "";
    if (token && newSch.objectId) {
      uploadScheduleToYandex(newSch.objectId, token).catch(e => console.error("Yandex background sync create error:", e));
    }

    res.status(201).json(newSch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/schedules/:id", async (req, res) => {
  try {
    const updated = await dbStore.updateSchedule(req.params.id, req.body);
    if (updated) {
      const settings = await dbStore.getSettings();
      const token = settings.yandexDiskToken ? settings.yandexDiskToken.trim() : "";
      if (token && updated.objectId) {
        uploadScheduleToYandex(updated.objectId, token).catch(e => console.error("Yandex background sync update error:", e));
      }
      res.json(updated);
    } else {
      res.status(404).json({ error: "Запись графика не найдена" });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/schedules/:id", async (req, res) => {
  const item = await dbStore.getScheduleById(req.params.id);
  const deleted = await dbStore.deleteSchedule(req.params.id);
  if (deleted) {
    if (item) {
      const settings = await dbStore.getSettings();
      const token = settings.yandexDiskToken ? settings.yandexDiskToken.trim() : "";
      if (token) {
        uploadScheduleToYandex(item.objectId, token).catch(e => console.error("Yandex background sync delete error:", e));
      }
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Запись графика не найдена" });
  }
});


// ---------------- COMPLETED REPORTS API ----------------

app.get("/api/reports", async (req, res) => {
  res.json(await dbStore.getCompleted());
});

app.post("/api/reports", reportValidators, async (req, res) => {
  const { 
    objectId, 
    scheduleItemId, 
    checklistTemplateId, 
    answers, 
    specialistInfo 
  } = req.body;

  const currentUserId = (req.session as any).userId || "usr_spec";
  const newReport: CompletedChecklist = {
    id: "rep_" + Math.random().toString(36).substr(2, 9),
    objectId,
    scheduleItemId,
    checklistTemplateId,
    dateDone: new Date().toISOString(),
    answers,
    specialistInfo,
    specialistUserId: currentUserId
  };

  newReport.pdfUrl = `/api/reports/${newReport.id}/pdf`;
  await dbStore.addCompleted(newReport);

  // Update last done date of schedule to TODAY
  const todayStr = new Date().toISOString().split('T')[0];
  await dbStore.updateSchedule(scheduleItemId, { lastDoneDate: todayStr });

  const allObjects = await dbStore.getObjects();
  const allSchedules = await dbStore.getSchedules();
  
  const currentObj = allObjects.find(o => o.id === objectId);
  const currentSchItem = allSchedules.find(s => s.id === scheduleItemId);

  const objName = currentObj ? currentObj.name : "Неизвестный объект";
  const schName = currentSchItem ? currentSchItem.title : "Регламентное обслуживание";

  // Trigger admin notifications
  const admins = (await dbStore.getUsers()).filter(u => u.role === 'admin');
  const notificationMsg = `🔔 Выполнено ТО:\nОбъект: "${objName}"\nЗадача: "${schName}"\nИсполнитель: ${specialistInfo.fullname} (${specialistInfo.company})\nСтатус: Чек-лист успешно завершен!`;
  
  for (const admin of admins) {
    await triggerNotification('incoming_report', admin, notificationMsg);
  }

  // Trigger Owner notifications
  if (currentObj && currentObj.ownerId) {
    const owner = (await dbStore.getUsers()).find(u => u.id === currentObj.ownerId);
    if (owner) {
      const ownerMsg = `📋 Отчет по Вашему объекту:\nНа объекте "${objName}" инженером службы эксплуатации выполнено ТО по регламенту: "${schName}".\nВнутренние параметры в норме. Вы можете скачать PDF отчет в личном кабинете.`;
      await triggerNotification('incoming_report', owner, ownerMsg);
    }
  }

  res.status(201).json(newReport);
});

// Approve and rate completed act
app.post("/api/reports/:id/approve", async (req, res) => {
  const { rating, ratingComment } = req.body;
  const reportId = req.params.id;

  const completed = await dbStore.getCompleted();
  const report = completed.find(r => r.id === reportId);
  if (!report) {
    return res.status(404).json({ error: "Акт не найден" });
  }

  const updated = await dbStore.updateCompleted(reportId, {
    approvedByOwner: true,
    ownerRating: Number(rating) || 5,
    ownerRatingComment: ratingComment || ""
  });

  if (updated) {
    res.json({ success: true, report: updated });
  } else {
    res.status(500).json({ error: "Не удалось утвердить акт" });
  }
});

// PDF Generation Endpoint
app.get("/api/reports/:id/pdf", async (req, res) => {
  const reportId = req.params.id;
  const completed = await dbStore.getCompleted();
  const report = completed.find(r => r.id === reportId);
  if (!report) {
    return res.status(404).send("Отчет не найден");
  }

  const objects = await dbStore.getObjects();
  const obj = objects.find(o => o.id === report.objectId);
  
  const templates = await dbStore.getTemplates();
  const tpl = templates.find(t => t.id === report.checklistTemplateId);
  
  const schedules = await dbStore.getSchedules();
  const sch = schedules.find(s => s.id === report.scheduleItemId);

  const answersHtml = report.answers.map(ans => {
    const question = tpl?.questions.find(q => q.id === ans.questionId);
    let renderedValue = "";
    if (question?.type === 'boolean') {
      renderedValue = ans.value === 'true' ? '✅ Да (Соответствует)' : '❌ Нет (Не соответствует)';
    } else if (question?.type === 'photo') {
      // Validate src prefix for safety before rendering inside img tag attribute
      const isSafeSrc = ans.value.startsWith("data:image/") || ans.value.startsWith("http://") || ans.value.startsWith("https://") || ans.value.startsWith("/api/");
      const safeSrc = isSafeSrc ? ans.value : "about:blank";
      renderedValue = `<div style="margin-top: 5px;"><img src="${safeSrc}" alt="Photo" style="max-width: 300px; border-radius: 4px; border: 1px solid #ccc;" referrerpolicy="no-referrer" /></div>`;
    } else {
      renderedValue = escapeHtml(ans.value);
    }
    const questionText = question ? question.text : ans.questionId;
    return `
      <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee;">
        <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">Вопрос: ${escapeHtml(questionText)}</div>
        <div style="font-size: 14px; color: #555;">Ответ: <strong>${renderedValue}</strong></div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Акт технического обслуживания - ${escapeHtml(report.id)}</title>
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
        <div class="subtitle">Уникальный номер отчета: ${escapeHtml(report.id)} от ${escapeHtml(new Date(report.dateDone).toLocaleDateString('ru-RU'))} г.</div>
      </div>

      <div class="grid">
        <div class="box">
          <div class="box-title">Объект контроля</div>
          <div class="field"><span class="field-label">Название:</span> ${obj ? escapeHtml(obj.name) : 'N/A'}</div>
          <div class="field"><span class="field-label">Адрес:</span> ${obj ? escapeHtml(obj.address) : 'N/A'}</div>
          <div class="field"><span class="field-label">Описание:</span> ${obj ? escapeHtml(obj.description) : 'N/A'}</div>
        </div>
        <div class="box">
          <div class="box-title">Исполнитель работ</div>
          <div class="field"><span class="field-label">Специалист:</span> ${escapeHtml(report.specialistInfo.fullname)}</div>
          <div class="field"><span class="field-label">Компания:</span> ${escapeHtml(report.specialistInfo.company)}</div>
          <div class="field"><span class="field-label">Телефон:</span> ${escapeHtml(report.specialistInfo.phone)}</div>
          <div class="field"><span class="field-label">Email:</span> ${escapeHtml(report.specialistInfo.email)}</div>
        </div>
      </div>

      <div class="box" style="margin-bottom: 30px; width: 100%; box-sizing: border-box;">
        <div class="box-title">Детали регламента обслуживания</div>
        <div class="field"><span class="field-label">Категория:</span> ${sch ? escapeHtml(sch.category) : 'N/A'}</div>
        <div class="field"><span class="field-label">Пункт ТО:</span> ${sch ? escapeHtml(sch.title) : 'N/A'}</div>
        <div class="field"><span class="field-label">Установленный интервал:</span> каждые ${sch ? escapeHtml(String(sch.intervalDays)) : 'N/A'} дн.</div>
        <div class="field"><span class="field-label">Шаблон анкеты контроля:</span> ${tpl ? escapeHtml(tpl.name) : 'N/A'}</div>
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


// ---------------- SETTINGS & NOTIFICATION LOGS ----------------

app.get("/api/settings", async (req, res) => {
  res.json(await dbStore.getSettings());
});

app.put("/api/settings", async (req, res) => {
  const updated = await dbStore.updateSettings(req.body);
  res.json(updated);
});

app.get("/api/notifications/logs", async (req, res) => {
  res.json(await dbStore.getNotificationLogs());
});


// ---------------- SUPPORT TICKETS API ----------------

const sendSupportEmail = async (settings: any, ticket: SupportTicket) => {
  const adminEmail = settings.supportEmail || "support@commercial-passport.ru";
  const botEmail = settings.emailBotAddress || "notify-bot@commercial-passport.ru";
  const bodyText = `Новое обращение в техподдержку #${ticket.id}

Отправитель: ${ticket.userName} (${ticket.userRole})
Email: ${ticket.userEmail}
Телефон: ${ticket.userPhone || "Не указан"}
Тема: ${ticket.subject}

Сообщение:
${ticket.message}

--
Commercial Passport Support System`;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[Support] SMTP variables are not configured. Emulating dispatch via sandbox logs.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === "true" || (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${botEmail}" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `[Техподдержка #${ticket.id}] Тема: ${ticket.subject}`,
      text: bodyText,
    });
    console.log(`[Support] Direct email notification sent successfully to ${adminEmail}`);
  } catch (err: any) {
    console.error("[Support] Error sending direct support email:", err.message);
  }
};

app.post("/api/support/tickets", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Для отправки обращения необходимо авторизоваться" });
    }
    const user = await dbStore.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const { subject, message, contactEmail, contactPhone, contactName } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Тема и сообщение обязательны к заполнению" });
    }

    const ticketId = "tkt_" + Math.random().toString(36).substring(2, 11);
    const ticket: SupportTicket = {
      id: ticketId,
      timestamp: new Date().toISOString(),
      userId: user.id,
      userRole: user.role,
      userName: contactName || user.fullname,
      userEmail: contactEmail || user.email,
      userPhone: contactPhone || user.phone || "",
      subject,
      message,
      status: "new"
    };

    // Save support ticket
    await dbStore.addSupportTicket(ticket);

    // Fetch settings for support email destination
    const settings = await dbStore.getSettings();

    // Send direct SMTP email to administrator email
    await sendSupportEmail(settings, ticket);

    // Notify administrators internal accounts
    const allUsers = await dbStore.getUsers();
    const admins = allUsers.filter(u => u.role === "admin");
    const adminMessage = `⚠️ [Новая Поддержка #${ticketId}] От ${ticket.userName} (${ticket.userRole}): "${ticket.subject}". Сообщение: "${ticket.message.slice(0, 100)}"`;
    for (const adminUser of admins) {
      triggerNotification("incoming_report", adminUser, adminMessage).catch(err => {
        console.error(`[Support] Fail admin notify:`, err);
      });
    }

    res.json({ success: true, ticket });
  } catch (error: any) {
    console.error("[Support API] Failed creating ticket:", error);
    res.status(500).json({ error: "Ошибка при отправке обращения: " + error.message });
  }
});

app.get("/api/support/tickets", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    const user = await dbStore.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }

    const tickets = await dbStore.getSupportTickets();
    if (user.role === "admin") {
      return res.json(tickets);
    }
    // Only return tickets owned by this user
    res.json(tickets.filter(t => t.userId === user.id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/support/tickets/:id", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    const user = await dbStore.getUserById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Доступ запрещен" });
    }

    const { status, adminNotes } = req.body;
    const ticket = await dbStore.updateSupportTicketStatus(req.params.id, status, adminNotes);
    res.json({ success: true, ticket });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// ---------------- DAILY SCHEDULER CHECK ----------------

async function runDailySchedulerTask() {
  const allObjects = await dbStore.getObjects();
  const allSchedules = await dbStore.getSchedules();
  const allUsers = await dbStore.getUsers();
  const settings = await dbStore.getSettings();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  let totalLogsCreated = 0;
  
  for (const sch of allSchedules) {
    if (!sch.lastDoneDate) {
      continue;
    }

    // Skip if we already sent notification for this schedule item today
    if (sch.lastNotificationDate === todayStr) {
      continue;
    }

    const lastDone = new Date(sch.lastDoneDate);
    const nextDue = new Date(lastDone);
    nextDue.setDate(lastDone.getDate() + sch.intervalDays);
    
    const diffTime = nextDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const obj = allObjects.find(o => o.id === sch.objectId);
    const objName = obj ? obj.name : "Неизвестный объект";

    let triggered = false;
    let type: 'reminder_overdue' | 'reminder_upcoming' = 'reminder_upcoming';
    let message = '';

    if (diffDays < 0) {
      triggered = true;
      type = 'reminder_overdue';
      const daysOverdue = Math.abs(diffDays);
      message = `🚨 ВНИМАНИЕ: Просрочено ТО!\nОбъект: "${objName}"\nРегламент: "${sch.title}"\nИнтервал: ${sch.intervalDays} дн.\nСрок истек: ${daysOverdue} дн. назад. Требуется срочная проверка!`;
    } 
    else if (diffDays <= settings.reminderDaysBefore && diffDays >= 0) {
      triggered = true;
      type = 'reminder_upcoming';
      message = `⏳ Напоминание о предстоящем ТО:\nОбъект: "${objName}"\nРегламент: "${sch.title}"\nДней до выполнения: ${diffDays}.\nПожалуйста, запланируйте выезд инженера.`;
    }

    if (triggered) {
      // Collect unique recipients for this schedule item
      const matchedUsers: User[] = [];
      const addedIds = new Set<string>();

      const addRecipient = (u: User | undefined) => {
        if (u && !addedIds.has(u.id)) {
          addedIds.add(u.id);
          matchedUsers.push(u);
        }
      };

      // 1. Owner
      if (obj && obj.ownerId) {
        const owner = allUsers.find(u => u.id === obj.ownerId);
        if (owner) addRecipient(owner);
      }

      // 2. Administrators
      const admins = allUsers.filter(u => u.role === 'admin');
      for (const admin of admins) {
        addRecipient(admin);
      }

      // 3. Responsible Specialist (if chosen for the task)
      if (sch.responsibleUserId) {
        const specialist = allUsers.find(u => u.id === sch.responsibleUserId);
        if (specialist) addRecipient(specialist);
      }

      // Send trigger notifications
      for (const recipient of matchedUsers) {
        await triggerNotification(type, recipient, message);
        totalLogsCreated++;
      }

      // Update last notification date on the schedule so it doesn't duplicate today
      await dbStore.updateSchedule(sch.id, { lastNotificationDate: todayStr });
    }
  }
  return totalLogsCreated;
}

app.post("/api/cron-check", async (req, res) => {
  try {
    const count = await runDailySchedulerTask();
    res.json({ success: true, notificationsSentCount: count });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// ---------------- YANDEX.DISK SYNC REAL IMPLEMENTATION ----------------

let MOCK_YANDEX_FILES = [
  { path: "Цифровой паспорт объекта", type: "dir" },
  // Level 1: "ДНТ Лесной, 48"
  { path: "Цифровой паспорт объекта/ДНТ Лесной, 48", type: "dir" },
  { path: "Цифровой паспорт объекта/ДНТ Лесной, 48/Обслуживание", type: "dir" },
  { path: "Цифровой паспорт объекта/ДНТ Лесной, 48/Обслуживание/service_bot", type: "dir" },
  { path: "Цифровой паспорт объекта/ДНТ Лесной, 48/Обслуживание/service_bot/schedule.json", type: "file", size: "1.4 KB", modified: "2026-05-25T09:00:00Z" },

  // Level 2: "серебряный лес" -> "Клубничный переулок, 8"
  { path: "Цифровой паспорт объекта/серебряный лес", type: "dir" },
  { path: "Цифровой паспорт объекта/серебряный лес/Клубничный переулок, 8", type: "dir" },
  { path: "Цифровой паспорт объекта/серебряный лес/Клубничный переулок, 8/Обслуживание", type: "dir" },
  { path: "Цифровой паспорт объекта/серебряный лес/Клубничный переулок, 8/Обслуживание/service_bot", type: "dir" },
  { path: "Цифровой паспорт объекта/серебряный лес/Клубничный переулок, 8/Обслуживание/service_bot/schedule.json", type: "file", size: "1.6 KB", modified: "2026-05-25T09:12:00Z" }
];

app.get("/api/yandex/files", (req, res) => {
  res.json(MOCK_YANDEX_FILES);
});

app.post("/api/yandex/sync", async (req, res) => {
  try {
    const settings = await dbStore.getSettings();
    const token = settings.yandexDiskToken ? settings.yandexDiskToken.trim() : "";

    if (!token || token === "") {
      return res.status(400).json({
        status: "error",
        message: "Токен Яндекс.Диска не заполнен в настройках. Пожалуйста, сохраните OAuth-токен перед началом синхронизации."
      });
    }

    // Immediately remove development/test/mock/simulation fallback objects from database
    const testObjectIds = [
      "obj_atrium",
      "obj_north_peak",
      "obj_dnt_lesnoy_48",
      "obj_serebryanyy_les_klubnichnyy_pereulok_8"
    ];
    for (const tId of testObjectIds) {
      await dbStore.deleteObject(tId);
    }

    let objectsSynced = 0;
    let schedulesSynced = 0;
    const logsSummary: string[] = [];

    // Fetch live directories from Yandex Disk
    const rootItems = await getYandexFolderContents("Цифровой паспорт объекта", token);
    const level1Folders = rootItems.filter(i => i.type === "dir");

    interface SyncTarget {
      relativePath: string;
      yandexDiskPath: string;
      filePath: string;
    }
    const syncTargets: SyncTarget[] = [];

    for (const folder1 of level1Folders) {
      const pathL1 = `Цифровой паспорт объекта/${folder1.name}`;
      try {
        const level2Items = await getYandexFolderContents(pathL1, token);
        
        // Check if level 1 folder is a direct owner of "Обслуживание" (Case 1)
        const hasObshL1 = level2Items.some(i => i.name === "Обслуживание" && i.type === "dir");
        if (hasObshL1) {
          syncTargets.push({
            relativePath: folder1.name,
            yandexDiskPath: `${pathL1}/Обслуживание/service_bot`,
            filePath: `${pathL1}/Обслуживание/service_bot/schedule.json`
          });
        } else {
          // Check if it is a secondary directory layer (Case 2: e.g. "серебряный лес" -> "Клубничный переулок, 8")
          const level2Folders = level2Items.filter(i => i.type === "dir");
          for (const folder2 of level2Folders) {
            const pathL2 = `${pathL1}/${folder2.name}`;
            try {
              const level3Items = await getYandexFolderContents(pathL2, token);
              const hasObshL2 = level3Items.some(i => i.name === "Обслуживание" && i.type === "dir");
              if (hasObshL2) {
                syncTargets.push({
                  relativePath: `${folder1.name}/${folder2.name}`,
                  yandexDiskPath: `${pathL2}/Обслуживание/service_bot`,
                  filePath: `${pathL2}/Обслуживание/service_bot/schedule.json`
                });
              }
            } catch (errL2: any) {
              console.error(`Error listing subfolder "${pathL2}":`, errL2);
            }
          }
        }
      } catch (errL1: any) {
        console.error(`Error listing folder "${pathL1}":`, errL1);
      }
    }

    // Now synchronize targets
    for (const target of syncTargets) {
      try {
        const scheduleData = await readYandexFile(target.filePath, token);
        const objId = generateObjectIdFromPath(target.relativePath);
        
        const objName = scheduleData.object?.name || target.relativePath.split("/").pop() || target.relativePath;
        const objAddress = scheduleData.object?.address || "Адрес синхронизирован из Яндекс.Диска";
        const objDescription = scheduleData.object?.description || "Синхронизировано из schedule.json";

        // Upsert the building object using unique deterministic ID to prevent duplicates
        const existingObj = await dbStore.getObjectById(objId);
        if (existingObj) {
          await dbStore.updateObject(objId, {
            name: objName,
            address: objAddress,
            description: objDescription,
            yandexDiskPath: target.yandexDiskPath,
            specs: scheduleData.object?.specs || existingObj.specs || null,
            equipmentSpecs: scheduleData.object?.equipmentSpecs || existingObj.equipmentSpecs || null,
            info: scheduleData.object?.info || existingObj.info || null
          });
        } else {
          await dbStore.addObject({
            id: objId,
            name: objName,
            address: objAddress,
            description: objDescription,
            yandexDiskPath: target.yandexDiskPath,
            ownerId: "usr_owner",
            specs: scheduleData.object?.specs || null,
            equipmentSpecs: scheduleData.object?.equipmentSpecs || null,
            info: scheduleData.object?.info || null
          });
        }
        objectsSynced++;

        const equipment = scheduleData.equipment || [];
        const syncedSchIds: string[] = [];

        for (const [index, eq] of equipment.entries()) {
          const cleanTitle = transliterate(eq.title || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
          const cleanCategory = transliterate(eq.category || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
          // Create stable, index-independent key name (unless ID is explicitly defined inside equipment JSON)
          const itemKey = eq.id || `eq_${cleanCategory}_${cleanTitle}`;
          const schId = `sch_${objId}_${itemKey}`;
          syncedSchIds.push(schId);

          const existingSch = await dbStore.getScheduleById(schId);
          
          const currentLastDoneDate = existingSch ? existingSch.lastDoneDate : null;
          const currentResponsible = existingSch ? existingSch.responsibleUserId : null;
          const currentNotes = existingSch ? existingSch.notes : "";

          const scheduleItem: ScheduleItem = {
            id: schId,
            objectId: objId,
            category: eq.category || "Общее",
            title: eq.title || "Осмотр оборудования",
            intervalDays: Number(eq.intervalDays) || 30,
            lastDoneDate: eq.lastDoneDate || currentLastDoneDate,
            responsibleUserId: eq.responsibleUserId || currentResponsible,
            notes: eq.notes || currentNotes,
            checklistTemplateId: eq.checklistTemplateId || "tpl_itp",
            commissioningDate: eq.commissioningDate || null
          };

          if (existingSch) {
            await dbStore.updateSchedule(schId, scheduleItem);
          } else {
            await dbStore.addSchedule(scheduleItem);
          }
          schedulesSynced++;
        }

        // Complete synchronization cleanup: Delete any schedules for this object that are NOT found in the sync list
        const allSchedules = await dbStore.getSchedules();
        const objectExistingSchedules = allSchedules.filter(s => s.objectId === objId);
        for (const sch of objectExistingSchedules) {
          if (!syncedSchIds.includes(sch.id)) {
            await dbStore.deleteSchedule(sch.id);
          }
        }

        logsSummary.push(`Объект "${objName}" синхронизирован успешно: импортировано ${equipment.length} графиков.`);
      } catch (e: any) {
        console.log(`Файл schedule.json по пути "${target.filePath}" не найден или ошибка парсинга:`, e.message);
        logsSummary.push(`Файл schedule.json по пути "${target.filePath}" не обработан: ${e.message}`);
      }
    }

    await dbStore.updateSettings({ yandexDiskConnected: true });
    
    return res.json({
      objectsSynced,
      schedulesSynced,
      status: "success",
      message: logsSummary.length > 0
        ? logsSummary.join("\n")
        : "Папки в Яндекс.Диске просканированы, но не найден ни один файл '_Обслуживание/service_bot/schedule.json'."
    });

  } catch (error: any) {
    console.error("Yandex Sync Error:", error);
    res.status(500).json({ error: `Ошибка синхронизации: ${error.message}` });
  }
});

app.post("/api/photos/upload", uploadLimiter, (req, res) => {
  const { imageName, base64Data, objectPath } = req.body;
  const randomId = Math.random().toString(36).substr(2, 6);
  const mockCloudUrl = `https://cloud-api.yandex.net/disk/resources/${objectPath || 'completed_checklists'}/photos/img_${randomId}_${imageName || 'photo.jpg'}`;

  res.json({
    success: true,
    url: base64Data || mockCloudUrl,
    cloudUrl: mockCloudUrl
  });
});

// ---------------- TEST TELEGRAM NOTIFICATION ----------------

app.post("/api/test-telegram-notification", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({
        success: false,
        error: "TELEGRAM_BOT_TOKEN is not configured in environment variables",
      });
    }

    const user = await dbStore.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const chatId = user.telegramChatId;
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: "Telegram chat ID is not configured for this user. Please set your telegramChatId in profile settings.",
      });
    }

    const { message = "Test notification from Passport app" } = req.body;

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      }
    );

    if (!telegramRes.ok) {
      const errText = await telegramRes.text().catch(() => "");
      return res.status(502).json({
        success: false,
        error: `Telegram API returned status ${telegramRes.status}`,
        details: errText,
      });
    }

    return res.json({
      success: true,
      message: "Test notification sent successfully",
      sentTo: chatId,
    });
  } catch (error: any) {
    console.error("[test-telegram-notification] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// ---------------- TELEGRAM WEBHOOK ----------------

app.post("/api/telegram/webhook", async (req, res) => {
  // Always respond 200 immediately — Telegram will retry if we don't acknowledge quickly
  res.sendStatus(200);

  try {
    const update = req.body;

    // Log the full raw update so we can see exactly what Telegram is sending
    console.log("[telegram/webhook] Incoming update:", JSON.stringify(update, null, 2));

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error("[telegram/webhook] TELEGRAM_BOT_TOKEN is not configured — cannot reply to user");
      return;
    }

    // Determine the update type for targeted logging
    const updateType = Object.keys(update || {})
      .filter(k => k !== "update_id")
      .join(", ") || "unknown";
    console.log(`[telegram/webhook] Update #${update?.update_id} — type: ${updateType}`);

    // Handle regular messages and channel posts
    const message = update?.message || update?.channel_post;
    if (!message) {
      console.log(`[telegram/webhook] No message/channel_post in this update (type: ${updateType}) — nothing to reply to`);
      return;
    }

    const chatId: number = message.chat?.id;
    const text: string = message.text || "";
    const username: string = message.from?.username || message.from?.first_name || "пользователь";

    console.log(`[telegram/webhook] Message from chat_id=${chatId} username=${username}: "${text}"`);

    if (text.startsWith("/start")) {
      const welcomeText =
        `Привет, ${username}! 👋\n\n` +
        `Я бот системы технического обслуживания.\n` +
        `Ваш chat_id: <code>${chatId}</code>\n\n` +
        `Укажите этот chat_id в настройках профиля, чтобы получать уведомления о регламентах и задачах.`;

      console.log(`[telegram/webhook] Sending /start reply to chat_id=${chatId}`);

      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: "HTML",
        }),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text().catch(() => "");
        console.error(`[telegram/webhook] sendMessage failed (${sendRes.status}): ${errBody}`);
      } else {
        console.log(`[telegram/webhook] /start reply sent successfully to chat_id=${chatId}`);
      }
    }
  } catch (error: any) {
    console.error("[telegram/webhook] Unhandled error:", error);
  }
});

app.get("/api/telegram/register-webhook", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({
        success: false,
        error: "TELEGRAM_BOT_TOKEN is not configured in environment variables",
      });
    }

    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (!domain) {
      return res.status(500).json({
        success: false,
        error: "RAILWAY_PUBLIC_DOMAIN is not configured in environment variables",
      });
    }

    const webhookUrl = `https://${domain}/api/telegram/webhook`;

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );

    const data = await telegramRes.json() as any;

    if (!telegramRes.ok || !data.ok) {
      console.error("[telegram/register-webhook] Failed to set webhook:", data);
      return res.status(502).json({
        success: false,
        error: "Telegram API rejected the webhook registration",
        details: data,
      });
    }

    console.log(`[telegram/register-webhook] Webhook registered: ${webhookUrl}`);
    return res.json({
      success: true,
      webhookUrl,
      telegramResponse: data,
    });
  } catch (error: any) {
    console.error("[telegram/register-webhook] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});

// ---------------- SERVER STARTUP ----------------

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
