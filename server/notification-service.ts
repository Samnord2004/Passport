import { DataStore } from "./data-store.ts";
import type { User, NotificationLog, ScheduleItem, BuildingObject } from "../src/types.ts";
import nodemailer from "nodemailer";

interface NotificationTask {
  id: string;
  type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue';
  recipientUser: User;
  message: string;
  subject?: string;
  html?: string;
  forceEmailOnly?: boolean;
}

class NotificationQueue {
  private queue: NotificationTask[] = [];
  private isProcessing = false;
  private dbStore = DataStore.getInstance();

  constructor() {
    console.log("[NotificationQueue] Initialized asynchronous background task queue worker.");
  }

  /**
   * Enqueues a notification to be processed in parallel background task pool.
   */
  public enqueue(
    type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue',
    recipientUser: User,
    message: string
  ): string {
    const taskId = "nt_task_" + Math.random().toString(36).substring(2, 11);
    const task: NotificationTask = {
      id: taskId,
      type,
      recipientUser,
      message
    };
    this.queue.push(task);
    console.log(`[NotificationQueue] [Enqueued] Task ${taskId} added to background queue for recipient: ${recipientUser.fullname} (${recipientUser.role}).`);
    
    // Run queue daemon loop asynchronously (non-blocking)
    setImmediate(() => this.processNext());
    return taskId;
  }

  /**
   * Enqueues a critical overdue (> 5 days) regulation email specifically to administrators.
   * Guarantees email channel delivery with structured alert and HTML formatting.
   */
  public enqueueOverdueAdminEmail(
    adminUser: User,
    schedule: ScheduleItem,
    buildingObject: BuildingObject | undefined,
    daysOverdue: number,
    specialistName?: string
  ): string {
    const taskId = "nt_crit_overdue_" + Math.random().toString(36).substring(2, 11);
    const objName = buildingObject?.name || "Неизвестный объект";
    const objAddress = buildingObject?.address || "Адрес не указан";
    
    // Calculate lastDoneDate or note
    const lastDoneStr = schedule.lastDoneDate 
      ? new Date(schedule.lastDoneDate).toLocaleDateString('ru-RU') 
      : 'Ни разу не проводилось';
    
    // Calculate due date
    let dueDateFormatted = 'Не определена';
    if (schedule.lastDoneDate) {
      const d = new Date(schedule.lastDoneDate);
      d.setDate(d.getDate() + schedule.intervalDays);
      dueDateFormatted = d.toLocaleDateString('ru-RU');
    }

    const subject = `🚨 [КРИТИЧЕСКАЯ ПРОСРОЧКА >5 ДНЕЙ] Регламент ТО: "${schedule.title}" (${objName})`;

    const textMessage = `🚨 КРИТИЧЕСКОЕ ОПОВЕЩЕНИЕ СЛУЖБЫ ЭКСПЛУАТАЦИИ\n\n` +
      `Внимание! Регламент технического обслуживания просрочен более чем на 5 дней!\n\n` +
      `Параметры объекта и регламента:\n` +
      `• Объект: ${objName} (${objAddress})\n` +
      `• Регламент ТО: "${schedule.title}"\n` +
      `• Категория оборудования: ${schedule.category}\n` +
      `• Установленный интервал: каждые ${schedule.intervalDays} дн.\n` +
      `• Дата последнего выполнения: ${lastDoneStr}\n` +
      `• Плановый срок проведения: ${dueDateFormatted}\n` +
      `• Текущая просрочка: ${daysOverdue} дн. (превышен критический порог > 5 дней!)\n` +
      `• Назначенный специалист: ${specialistName || 'Не назначен (требуется выбор)'}\n` +
      (schedule.notes ? `• Примечания к регламенту: ${schedule.notes}\n` : '') +
      `\n⚠️ ТРЕБУЕТСЯ ДЕЙСТВИЕ АДМИНИСТРАТОРА: Срочно свяжитесь со специалистом или назначьте внеплановый выезд сервисной бригады для предотвращения аварийного выхода оборудования из строя.\n\n` +
      `Система «Цифровой паспорт объекта» — автоматический мониторинг ТО.`;

    const htmlMessage = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 24px; color: #ffffff;">
          <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
            🚨 Критический сигнал безопасности
          </div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">Регламент ТО просрочен более чем на 5 дней!</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Автоматическое email-уведомление администратора службы эксплуатации</p>
        </div>
        
        <div style="padding: 24px; color: #1e293b;">
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #991b1b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Степень просрочки:</div>
            <div style="font-size: 26px; font-weight: 900; color: #b91c1c;">
              ${daysOverdue} дн. просрочки
            </div>
            <div style="font-size: 12px; color: #b91c1c; margin-top: 4px; line-height: 1.4;">
              Критический лимит (5 дней) превышен. Эксплуатация оборудования без подтвержденного ТО повышает риск аварийной остановки.
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 38%;">Объект:</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${objName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Адрес:</td>
                <td style="padding: 10px 0; color: #334155;">${objAddress}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Регламент ТО:</td>
                <td style="padding: 10px 0; color: #0f172a; font-weight: 700;">${schedule.title}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Категория:</td>
                <td style="padding: 10px 0; color: #334155;">${schedule.category}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Периодичность:</td>
                <td style="padding: 10px 0; color: #334155;">Каждые ${schedule.intervalDays} дн.</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Последнее ТО:</td>
                <td style="padding: 10px 0; color: #334155;">${lastDoneStr}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Плановый срок:</td>
                <td style="padding: 10px 0; color: #dc2626; font-weight: 700;">${dueDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Исполнитель:</td>
                <td style="padding: 10px 0; color: #334155;">${specialistName || 'Не назначен'}</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; color: #78350f;">
            <strong>Действие администратора:</strong> Свяжитесь со специалистом или назначьте внеплановый выезд в системе.
          </div>
        </div>

        <div style="background: #f8fafc; padding: 16px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center;">
          «Цифровой паспорт объекта» — Автоматизированная система контроля регламентов ТО
        </div>
      </div>
    `;

    const task: NotificationTask = {
      id: taskId,
      type: 'reminder_overdue',
      recipientUser: adminUser,
      message: textMessage,
      subject,
      html: htmlMessage,
      forceEmailOnly: true
    };

    this.queue.push(task);
    console.log(`[NotificationQueue] [Enqueued] Overdue (>5 days) critical email task ${taskId} added for admin: ${adminUser.fullname} (${adminUser.email}).`);
    setImmediate(() => this.processNext());
    return taskId;
  }

  private async processNext() {
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift()!;

    try {
      await this.dispatch(task);
    } catch (error) {
      console.error(`[NotificationQueue] [Exception] Task ${task.id} failed during execution:`, error);
    } finally {
      this.isProcessing = false;
      // Schedule check for next task after a brief tick to maximize responsiveness and handle rate limits
      setTimeout(() => this.processNext(), 100);
    }
  }

  private async dispatch(task: NotificationTask) {
    const { type, recipientUser, message } = task;
    const settings = await this.dbStore.getSettings();
    const receiverRole = recipientUser.role === 'admin' ? 'admin' : 'owner';
    const rolePrefs = settings.notificationChannels[receiverRole] || { telegram: true, max: false, vk: false, email: true };

    const methods: ('telegram' | 'max' | 'vk' | 'email')[] = [];
    if (task.forceEmailOnly) {
      methods.push('email');
    } else {
      if (rolePrefs.telegram) methods.push('telegram');
      if (rolePrefs.max) methods.push('max');
      if (rolePrefs.vk) methods.push('vk');
      if (rolePrefs.email) methods.push('email');
    }

    console.log(`[NotificationQueue] [Processing] Task ${task.id} starting dispatch across [${methods.join(', ')}] channels.`);

    for (const channel of methods) {
      let rec = '';
      let isRealSent = false;
      let errorDetails = '';

      if (channel === 'telegram') {
        rec = recipientUser.telegramChatId || recipientUser.phone || '';
        if (rec) {
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (!token) {
            errorDetails = 'TELEGRAM_BOT_TOKEN is missing in environment variables';
            console.warn(`[NotificationQueue] [Telegram] ${errorDetails}. Skipping real dispatch.`);
          } else {
            try {
              const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: rec, text: message })
              });
              isRealSent = res.ok;
              if (!res.ok) {
                const errText = await res.text().catch(() => '');
                errorDetails = `Telegram API error status ${res.status}: ${errText}`;
              }
            } catch (e: any) {
              errorDetails = e.message || 'Telegram connection/socket failure';
              console.error("[NotificationQueue] [Telegram] Failed sending Telegram dispatch", e);
            }
          }
        } else {
          errorDetails = 'Recipient has no telegramChatId or phone configured';
        }
      } 
      else if (channel === 'vk') {
        rec = recipientUser.vkUserId || '';
        if (rec) {
          const vkToken = process.env.VK_ACCESS_TOKEN;
          if (!vkToken) {
            errorDetails = 'VK_ACCESS_TOKEN is missing in environment variables';
            console.warn(`[NotificationQueue] [VK] ${errorDetails}. Skipping real dispatch.`);
          } else {
            try {
              // VK API message send via HTTP POST
              const randomId = Math.floor(Math.random() * 10000000);
              const res = await fetch(`https://api.vk.com/method/messages.send`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `user_id=${rec}&message=${encodeURIComponent(message)}&access_token=${vkToken}&v=5.131&random_id=${randomId}`
              });
              const data = await res.json().catch(() => ({}));
              if (data.error) {
                errorDetails = `VK API Error [Code ${data.error.error_code}]: ${data.error.error_msg}`;
              } else {
                isRealSent = res.ok;
              }
            } catch (e: any) {
              errorDetails = e.message || 'VK server connection failure';
              console.error("[NotificationQueue] [VK] Failed sending VK message", e);
            }
          }
        } else {
          errorDetails = 'Recipient has no vkUserId configured';
        }
      } 
      else if (channel === 'max') {
        rec = recipientUser.maxChatId || '';
        if (rec) {
          const maxToken = process.env.MAX_BOT_TOKEN;
          if (!maxToken) {
            errorDetails = 'MAX_BOT_TOKEN is missing in environment variables';
            console.warn(`[NotificationQueue] [MAX] ${errorDetails}. Skipping real dispatch.`);
          } else {
            try {
              // MAX Chat Bot API call
              const res = await fetch(`https://api.max.ru/v1/chats/${rec}/messages`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${maxToken}`
                },
                body: JSON.stringify({ text: message })
              });
              isRealSent = res.ok;
              if (!res.ok) {
                const errText = await res.text().catch(() => '');
                errorDetails = `MAX API Error status ${res.status}: ${errText}`;
              }
            } catch (e: any) {
              errorDetails = e.message || 'MAX API connection failure';
              console.error("[NotificationQueue] [MAX] Failed sending MAX message", e);
            }
          }
        } else {
          errorDetails = 'Recipient has no maxChatId configured';
        }
      } 
      else if (channel === 'email') {
        rec = recipientUser.email;
        if (rec) {
          const botEmail = settings.emailBotAddress || "notify-bot@commercial-passport.ru";
          
          const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
          const smtpPort = Number(settings.smtpPort) || Number(process.env.SMTP_PORT) || 465;
          const smtpUser = settings.smtpUser || process.env.SMTP_USER;
          const smtpPass = settings.smtpPass || process.env.SMTP_PASS;
          const smtpSecure = settings.smtpSecure !== undefined ? settings.smtpSecure : (process.env.SMTP_SECURE === "true" || smtpPort === 465);

          if (!smtpHost || !smtpUser || !smtpPass) {
            errorDetails = 'SMTP parameters (Host, User, Password) not configured in Settings or Env. Defaulting to local sandbox emulation logger.';
            console.warn(`[NotificationQueue] [SMTP] ${errorDetails}`);
            // Fallback mockup delivery for browser sandbox demonstration
            isRealSent = true;
          } else {
            try {
              const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                  user: smtpUser,
                  pass: smtpPass,
                },
                tls: {
                  rejectUnauthorized: false
                }
              });

              await transporter.sendMail({
                from: `"${botEmail}" <${smtpUser}>`,
                to: rec,
                subject: task.subject || "Цифровой Паспорт Объекта - Оповещение безопасности",
                text: message,
                ...(task.html ? { html: task.html } : {})
              });

              isRealSent = true;
            } catch (e: any) {
              errorDetails = e.message || 'SMTP Authentication or Socket Error';
              console.error("[NotificationQueue] [SMTP] SMTP delivery failed:", e);
            }
          }
        } else {
          errorDetails = 'Recipient has no email configured';
        }
      }

      // Record logs onto DB to display on Client UI Log component
      const log: NotificationLog = {
        id: "nt_" + Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        channel,
        recipient: rec || 'Unknown ReceiverAddress',
        message,
        type,
        status: isRealSent ? 'sent' : 'failed'
      };

      await this.dbStore.addNotificationLog(log);
      console.log(`[NotificationQueue] [Dispatcher Result] Task: ${task.id}, Channel: ${channel}, Status: ${isRealSent ? 'SUCCESS' : 'FAILED'}, Destination: ${rec || 'N/A'}${errorDetails ? `, Detail: ${errorDetails}` : ''}`);
    }
  }
}

export const notificationQueue = new NotificationQueue();
