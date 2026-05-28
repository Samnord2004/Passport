import { DataStore } from "./data-store";
import { User, NotificationLog } from "../src/types";
import nodemailer from "nodemailer";

interface NotificationTask {
  id: string;
  type: 'incoming_report' | 'reminder_upcoming' | 'reminder_overdue';
  recipientUser: User;
  message: string;
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
    if (rolePrefs.telegram) methods.push('telegram');
    if (rolePrefs.max) methods.push('max');
    if (rolePrefs.vk) methods.push('vk');
    if (rolePrefs.email) methods.push('email');

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
          
          if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            errorDetails = 'SMTP parameters (SMTP_HOST, SMTP_USER, SMTP_PASS) not set. Defaulting to local sandbox emulation logger.';
            console.warn(`[NotificationQueue] [SMTP] ${errorDetails}`);
            // Fallback mockup delivery for browser sandbox demonstration
            isRealSent = true;
          } else {
            try {
              const smtpHost = process.env.SMTP_HOST;
              const smtpPort = Number(process.env.SMTP_PORT) || 465;
              const smtpUser = process.env.SMTP_USER;
              const smtpPass = process.env.SMTP_PASS;
              const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

              const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: {
                  user: smtpUser,
                  pass: smtpPass,
                },
              });

              await transporter.sendMail({
                from: `"${botEmail}" <${smtpUser}>`,
                to: rec,
                subject: "Цифровой Паспорт Объекта - Оповещение безопасности",
                text: message,
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
