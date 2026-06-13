import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  User, 
  Filter, 
  Check, 
  ChevronDown, 
  ExternalLink,
  MessageCircle,
  FolderOpen
} from 'lucide-react';
import { SupportTicket, SystemSettings, User as UserType } from '../types';

interface SupportTabProps {
  currentUser: UserType;
  systemSettings: SystemSettings;
  getCardStyle: () => string;
  getSubHeaderStyle: () => string;
  theme?: string;
  globalSupportTickets?: SupportTicket[];
  onTicketsRefresh?: () => void;
}

export default function SupportTab({ 
  currentUser, 
  systemSettings, 
  getCardStyle, 
  getSubHeaderStyle,
  theme = 'cleanroom',
  globalSupportTickets,
  onTicketsRefresh
}: SupportTabProps) {
  // Feedback form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState(currentUser.fullname || '');
  const [contactEmail, setContactEmail] = useState(currentUser.email || '');
  const [contactPhone, setContactPhone] = useState(currentUser.phone || '');
  
  // App-side submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Tickets list
  const [tickets, setTickets] = useState<SupportTicket[]>(globalSupportTickets || []);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');

  useEffect(() => {
    if (globalSupportTickets) {
      setTickets(globalSupportTickets);
    }
  }, [globalSupportTickets]);

  // Admin resolution action states
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [adminNotesText, setAdminNotesText] = useState('');
  const [adminStatusVal, setAdminStatusVal] = useState<'new' | 'in_progress' | 'resolved'>('resolved');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load tickets on mount
  const fetchTickets = async () => {
    if (onTicketsRefresh) {
      onTicketsRefresh();
      return;
    }
    setIsLoadingTickets(true);
    try {
      const response = await fetch('/api/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (err) {
      console.warn('Error fetching support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  // Handle support ticket creation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setSubmitError('Пожалуйста, заполните тему и текст обращения');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          contactName,
          contactEmail,
          contactPhone
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitSuccess(true);
        setSubject('');
        setMessage('');
        fetchTickets(); // reload tickets list
      } else {
        setSubmitError(result.error || 'Произошла непредвиденная ошибка при отправке');
      }
    } catch (err: any) {
      setSubmitError('Сегмент сети недоступен. Проверьте соединение с сервером.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin update ticket status & resolution comments
  const handleAdminUpdateTicket = async (ticketId: string) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: adminStatusVal,
          adminNotes: adminNotesText
        })
      });

      if (response.ok) {
        setEditingTicketId(null);
        setAdminNotesText('');
        fetchTickets(); // reload
      } else {
        const res = await response.json();
        alert(res.error || 'Ошибка при обновлении статуса');
      }
    } catch (err) {
      alert('Ошибка при обновлении статуса обращения.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper translations and colors
  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Новое</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>В работе</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Решено</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'specialist':
        return <span className="opacity-80 text-[10px] uppercase font-bold text-amber-600 border border-amber-600/25 px-1.5 py-0.5 rounded">Специалист</span>;
      case 'owner':
        return <span className="opacity-80 text-[10px] uppercase font-bold text-blue-600 border border-blue-600/25 px-1.5 py-0.5 rounded">Собственник</span>;
      default:
        return <span className="opacity-80 text-[10px] uppercase font-bold text-neutral-500 border border-neutral-500/25 px-1.5 py-0.5 rounded">{role}</span>;
    }
  };

  const filteredTickets = tickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter);

  // Default values
  const supportPhone = systemSettings.supportPhone || "+7 (800) 555-35-35";
  const supportEmail = systemSettings.supportEmail || "support@commercial-passport.ru";
  const supportTelegram = systemSettings.supportTelegram || "cp_support_bot";
  const supportWhatsapp = systemSettings.supportWhatsapp || "+79234567890";
  const supportMax = systemSettings.supportMax || "";

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto w-full text-left">
      
      {/* 2-Column Dashboard Grid: Support Contacts & New Support Ticket Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Support Information Card / Messengers */}
        <div className="space-y-6 md:col-span-1">
          <div className={`${getCardStyle()} bg-gradient-to-br from-indigo-500/5 to-cyan-500/5`}>
            <div className={getSubHeaderStyle()}>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-indigo-500" />
                Служба поддержки
              </h3>
              <p className="text-xs opacity-60">
                Мы рады помочь вам решить возникающие технические вопросы 24/7. Свяжитесь напрямую с дежурным оператором или используйте мессенджер.
              </p>
            </div>

            <div className="space-y-5 pt-3">
              {/* Telephone Contact */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Горячая линия</div>
                  <a 
                    href={`tel:${supportPhone}`} 
                    className="font-extrabold text-sm hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 block"
                  >
                    {supportPhone}
                  </a>
                </div>
              </div>

              {/* Email Contact */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Email техподдержки</div>
                  <a 
                    href={`mailto:${supportEmail}`} 
                    className="font-extrabold text-sm hover:underline hover:text-cyan-600 block break-all"
                  >
                    {supportEmail}
                  </a>
                </div>
              </div>

              {/* Telegram Link */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Телеграм чат-бот</div>
                  <a 
                    href={supportTelegram.startsWith('http') ? supportTelegram : `https://t.me/${supportTelegram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-extrabold text-sm hover:underline hover:text-blue-500 flex items-center gap-1"
                  >
                    <span>{supportTelegram.startsWith('http') ? 'cp_support_bot' : supportTelegram}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* WhatsApp Link */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">WhatsApp оператор</div>
                  <a 
                    href={supportWhatsapp.startsWith('http') ? supportWhatsapp : `https://wa.me/${supportWhatsapp.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-extrabold text-sm hover:underline hover:text-emerald-500 flex items-center gap-1"
                  >
                    <span>Чат в WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* MAX Link */}
              {supportMax && (
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Чат в MAX</div>
                    <a 
                      href={supportMax.startsWith('http') ? supportMax : `https://max.mail.ru/${supportMax.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="font-extrabold text-sm hover:underline hover:text-purple-500 flex items-center gap-1"
                    >
                      <span>Написать в MAX</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-5 border-t border-indigo-500/15 text-[10px] opacity-75 leading-relaxed text-neutral-500 dark:text-neutral-400 font-medium">
              При отправке запроса через форму справа, письмо дублируется на почту администратора. История ваших заявок сохраняется в вашем личном кабинете.
            </div>
          </div>
        </div>

        {/* Feedback Form Card */}
        <div className="md:col-span-2">
          <div className={getCardStyle()}>
            <div className={getSubHeaderStyle()}>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Форма обратной связи
              </h3>
              <p className="text-xs opacity-60">
                Заполните форму ниже. Технические инженеры и системные администраторы увидят ваше сообщение и пришлют ответ прямо сюда.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
              
              {/* Optional override contact details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Имя контакта</label>
                  <input 
                    type="text" 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-100/60 dark:bg-zinc-800/65 rounded-xl border border-neutral-300/10 text-xs focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Ваше имя"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Email отправки ответа</label>
                  <input 
                    type="email" 
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-100/60 dark:bg-zinc-800/65 rounded-xl border border-neutral-300/10 text-xs focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Ваш email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Контактный телефон</label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100/60 dark:bg-zinc-800/65 rounded-xl border border-neutral-300/10 text-xs focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="Ваш номер телефона"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Тема заявки</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100/60 dark:bg-zinc-800/65 rounded-xl border border-neutral-300/10 text-xs focus:ring-2 focus:ring-indigo-500/50 font-semibold"
                  placeholder="Например: Не открывается технический паспорт или Ошибка синхронизации Яндекс.Диска"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Подробный текст сообщения</label>
                <textarea 
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100/60 dark:bg-zinc-800/65 rounded-xl border border-neutral-300/10 text-xs focus:ring-2 focus:ring-indigo-500/50 leading-relaxed font-sans"
                  placeholder="Опишите проблему или предложение..."
                  required
                />
              </div>

              {submitError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Обращение успешно зарегистрировано в системе и направлено администратору! Мы свяжемся с вами в течение часа.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Отправить обращение</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      </div>

      {/* HISTORIC TICKETS LOG */}
      <div className={getCardStyle()}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-neutral-300/15">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              {currentUser.role === 'admin' ? 'Все поступившие обращения' : 'Реестр отправленных обращений'}
            </h3>
            <p className="text-xs opacity-60">История заявок и текущий статус ответов технической поддержки</p>
          </div>

          {/* Ticket Status Filter */}
          <div className="flex items-center gap-1.5 p-0.5 bg-neutral-100/50 dark:bg-zinc-800/40 border border-neutral-300/10 rounded-xl">
            {(['all', 'new', 'in_progress', 'resolved'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTicketFilter(f)}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer uppercase tracking-wider ${
                  ticketFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {f === 'all' ? 'Все' : f === 'new' ? 'Новые' : f === 'in_progress' ? 'В работе' : 'Решено'}
              </button>
            ))}
          </div>
        </div>

        {isLoadingTickets ? (
          <div className="py-12 text-center text-xs opacity-60 flex flex-col items-center justify-center gap-2">
            <Clock className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Загрузка данных технической поддержки...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-xs opacity-50 flex flex-col items-center justify-center gap-2">
            <FolderOpen className="w-8 h-8 text-neutral-400" />
            <span>Обращений не найдено</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map(ticket => (
              <div 
                key={ticket.id} 
                className="p-4 rounded-xl bg-neutral-500/5 border border-neutral-300/10 hover:border-indigo-500/25 transition-all text-xs"
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">
                      #{ticket.id}
                    </span>
                    <span className="text-neutral-400 font-mono text-[10px]">
                      {new Date(ticket.timestamp).toLocaleString('ru-RU')}
                    </span>
                    {getRoleBadge(ticket.userRole)}
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {ticket.userName}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>

                {/* Body Row */}
                <div className="space-y-2 mt-2">
                  <div className="font-black text-sm text-neutral-950 dark:text-neutral-50">
                    Тема: {ticket.subject}
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {ticket.message}
                  </div>
                  {ticket.userPhone && (
                    <div className="text-[10px] text-neutral-400">
                      Контакты: {ticket.userPhone} | {ticket.userEmail}
                    </div>
                  )}
                </div>

                {/* Resolution/Admin response section */}
                {ticket.adminNotes ? (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-neutral-300/15 bg-blue-500/5 p-3.5 rounded-lg">
                    <div className="font-extrabold text-[10px] uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-1">
                      Ответ технической службы
                    </div>
                    <div className="leading-relaxed font-semibold font-sans text-neutral-800 dark:text-neutral-200 text-xs whitespace-pre-wrap">
                      {ticket.adminNotes}
                    </div>
                  </div>
                ) : (
                  ticket.status !== 'resolved' && (
                    <div className="mt-3 text-[10px] text-amber-500 italic flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Ожидает рассмотрения дежурным оператором...</span>
                    </div>
                  )
                )}

                {/* Administrator interaction controls */}
                {currentUser.role === 'admin' && (
                  <div className="mt-4 pt-3 border-t border-neutral-300/10 flex justify-end">
                    {editingTicketId === ticket.id ? (
                      <div className="w-full space-y-3 p-3 bg-neutral-100 dark:bg-zinc-800/50 rounded-xl border border-neutral-300/10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">Редактирование статуса</span>
                          <button 
                            type="button" 
                            onClick={() => setEditingTicketId(null)}
                            className="text-[10px] text-rose-500 font-bold hover:underline"
                          >
                            Отмена
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold tracking-wide opacity-65">Новый статус</label>
                          <div className="flex gap-2">
                            {(['new', 'in_progress', 'resolved'] as const).map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setAdminStatusVal(s)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  adminStatusVal === s ? 'bg-blue-600 text-white' : 'bg-neutral-200 dark:bg-zinc-700 opacity-70'
                                }`}
                              >
                                {s === 'new' ? 'Новое' : s === 'in_progress' ? 'В работе' : 'Решено'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] uppercase font-bold tracking-wide opacity-65">Ответ / Внутренние заметки</label>
                          <textarea
                            value={adminNotesText}
                            onChange={(e) => setAdminNotesText(e.target.value)}
                            rows={3}
                            className="w-full p-2 bg-white dark:bg-zinc-950 rounded-lg text-xs border"
                            placeholder="Напишите ответ пользователю..."
                          />
                        </div>

                        <button
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => handleAdminUpdateTicket(ticket.id)}
                          className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all"
                        >
                          <Check className="w-3 h-3" />
                          <span>Сохранить решение</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTicketId(ticket.id);
                          setAdminStatusVal(ticket.status);
                          setAdminNotesText(ticket.adminNotes || '');
                        }}
                        className="py-1.5 px-3 bg-neutral-100/10 hover:bg-neutral-200/20 text-neutral-800 dark:text-neutral-200 font-bold rounded-lg text-[10px] border border-neutral-300/15 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Ответить / Изменить статус</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
