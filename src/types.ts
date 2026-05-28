export type UserRole = 'admin' | 'owner' | 'specialist';

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
}

export interface BuildingObject {
  id: string;
  name: string;
  address: string;
  description: string;
  ownerId?: string; // Links to User.id (owner)
  yandexDiskPath: string; // Folder path on Yandex.Disk
  allowedSpecialistIds?: string[]; // Allowed specialist IDs
}

export interface ScheduleItem {
  id: string;
  objectId: string;
  category: string;
  title: string;
  intervalDays: number;
  lastDoneDate: string | null; // ISO Date "yyyy-mm-dd"
  responsibleUserId?: string; // Specialist who is responsible
  notes?: string;
  checklistTemplateId: string; // Reference to checklist template
  commissioningDate?: string | null; // Date of commissioning
  lastNotificationDate?: string | null; // ISO Date "yyyy-mm-dd" of last sent alert
}

export type QuestionType = 'boolean' | 'number' | 'text' | 'select' | 'photo';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Used if type is 'select'
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
  value: string; // can be number, boolean string, or text
  photoUrl?: string; // saved Yandex.Disk url or local uploaded url
}

export interface CompletedChecklist {
  id: string;
  objectId: string;
  scheduleItemId: string;
  checklistTemplateId: string;
  dateDone: string; // ISO String
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
  ownerRating?: number; // 1-5 stars
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
  reminderDaysBefore: number; // e.g. 3 days notice
  logoUrl?: string; // URL or Base64 of the custom logo
  customLogoEnabled?: boolean; // Whether custom logo is enabled
  emailBotAddress?: string; // Email of the custom email bot for notifications
  telegramBotUsername?: string; // Real telegram bot name
  maxBotUsername?: string; // Real MAX chat bot name
  notificationChannels: {
    admin: { telegram: boolean; max: boolean; vk: boolean; email: boolean };
    owner: { telegram: boolean; max: boolean; vk: boolean; email: boolean };
  };
}
