export type UserRole = 'admin' | 'owner' | 'specialist' | 'family_member';

export interface User {
  id: string;
  email: string;
  fullname: string;
  role: UserRole;
  phone?: string;
  company?: string;
  telegramChatId?: string;
  maxChatId?: string;
  vkUserId?: string;
  hasBiometrics?: boolean;
  biometricCredentialId?: string;
  biometricPublicKey?: string;
  biometricDeviceName?: string;
  keySkills?: string;
  rating?: number;
  ratingCount?: number;
  avatarUrl?: string;
}

// ─── НОВЫЙ ТИП: Семейный / доверенный доступ к объекту ───────────────────────
export type FamilyAccessLevel = 'view' | 'edit';

export interface FamilyAccess {
  id: string;
  objectId: string;       // к какому объекту относится
  grantedByOwnerId: string; // кто выдал доступ (владелец)
  userId?: string;          // существующий пользователь (если уже есть аккаунт)
  inviteEmail: string;      // email приглашённого
  inviteName: string;       // имя приглашённого
  accessLevel: FamilyAccessLevel; // 'view' — только просмотр, 'edit' — редактирование
  createdAt: string;        // ISO дата создания
  acceptedAt?: string;      // ISO дата принятия приглашения
  status: 'pending' | 'active' | 'revoked';
}

// ─── НОВЫЙ ТИП: Элемент реестра оборудования ─────────────────────────────────
export interface EquipmentItem {
  id: string;
  name: string;           // Название оборудования
  model?: string;         // Модель
  serialNumber?: string;  // Серийный номер
  manufacturer?: string;  // Производитель
  installDate?: string;   // Дата установки
  warrantyExpiry?: string;// Гарантия до
  location?: string;      // Место расположения (этаж, помещение)
  notes?: string;         // Примечания
}

// ─── НОВЫЙ ТИП: Система жизнеобеспечения (техпаспорт) ────────────────────────
export interface LifeSystemItem {
  id: string;
  name: string;       // Наименование системы (напр. "Система отопления")
  description: string;// Описание работы системы
  parameters?: string;// Технические параметры
  notes?: string;     // Примечания
}

export interface BuildingObject {
  id: string;
  name: string;
  address: string;
  description: string;
  ownerId?: string;
  yandexDiskPath: string;
  yandexDiskUrl?: string;
  allowedSpecialistIds?: string[];
  // Старые текстовые поля (сохраняем для обратной совместимости)
  specs?: string;
  equipmentSpecs?: string;
  info?: string;
  objectType?: 'house' | 'admin_building' | 'land' | 'dacha' | 'other';
  // ─── НОВЫЕ СТРУКТУРИРОВАННЫЕ ПОЛЯ ────────────────────────────────────────
  // Реестр оборудования (таблица)
  equipmentRegistry?: EquipmentItem[];
  // Системы жизнеобеспечения (технический паспорт)
  lifeSystems?: LifeSystemItem[];
  // Семейный / доверенный доступ
  familyAccess?: FamilyAccess[];
}

export interface ScheduleItem {
  id: string;
  objectId: string;
  category: string;
  title: string;
  intervalDays: number;
  lastDoneDate: string | null;
  responsibleUserId?: string;
  notes?: string;
  checklistTemplateId: string;
  commissioningDate?: string | null;
  lastNotificationDate?: string | null;
}

export type QuestionType = 'boolean' | 'number' | 'text' | 'select' | 'photo';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
}

export interface Answer {
  questionId: string;
  value: string;
  photoUrl?: string;
}

export interface CompletedChecklist {
  id: string;
  objectId: string;
  scheduleItemId: string;
  checklistTemplateId: string;
  dateDone: string;
  answers: Answer[];
  specialistInfo: {
    fullname: string;
    company: string;
    phone: string;
    email: string;
  };
  specialistUserId: string;
  pdfUrl?: string;
  approvedByOwner?: boolean;
  ownerRating?: number;
  ownerRatingComment?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  channel: 'telegram' | 'max' | 'vk' | 'email';
  recipient: string;
  message: string;
  type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue';
  status: 'sent' | 'failed';
}

export interface SystemSettings {
  yandexDiskToken: string;
  yandexDiskConnected: boolean;
  reminderDaysBefore: number;
  logoUrl?: string;
  customLogoEnabled?: boolean;
  emailBotAddress?: string;
  telegramBotUsername?: string;
  maxBotUsername?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportTelegram?: string;
  supportWhatsapp?: string;
  supportMax?: string;
  notificationChannels: {
    admin: { telegram: boolean; max: boolean; vk: boolean; email: boolean };
    owner: { telegram: boolean; max: boolean; vk: boolean; email: boolean };
  };
  appBackgroundType?: 'default' | 'villa' | 'blueprint' | 'custom' | 'sakura';
  appBackgroundUrl?: string;
  cardOpacity?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
}

export interface SupportTicket {
  id: string;
  timestamp: string;
  userId: string;
  userRole: 'specialist' | 'owner' | 'admin' | 'operator' | 'family_member';
  userName: string;
  userEmail: string;
  userPhone: string;
  subject: string;
  message: string;
  adminNotes?: string;
  status: 'new' | 'in_progress' | 'resolved';
}

