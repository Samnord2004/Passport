import React, { useState, useEffect } from "react";
import { 
  Scale, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  Lock, 
  LogOut, 
  Check, 
  AlertCircle,
  Eye,
  Calendar,
  Sparkles,
  UserCheck,
  HardHat,
  Key
} from "lucide-react";
import { User, UserRole } from "../types";
import { 
  getCustomLegalDocs, 
  getCurrentLegalDocsVersion, 
  saveUserLegalConsent, 
  getUserLegalConsent,
  LegalDoc 
} from "./LegalAgreements";

export interface MandatoryLegalConsentModalProps {
  isOpen: boolean;
  currentUser: User;
  onConsentConfirmed: () => void;
  onLogout: () => void;
  isUpdateNotice?: boolean;
}

export const MandatoryLegalConsentModal: React.FC<MandatoryLegalConsentModalProps> = ({
  isOpen,
  currentUser,
  onConsentConfirmed,
  onLogout,
  isUpdateNotice = false
}) => {
  const [docs, setDocs] = useState<Record<string, LegalDoc>>({});
  const [selectedDocKey, setSelectedDocKey] = useState<string>("user_agreement");
  const [viewedDocs, setViewedDocs] = useState<Record<string, boolean>>({
    user_agreement: true,
    privacy_policy: false,
    data_consent: false,
    public_offer: false
  });

  // Individual agreement checkboxes
  const [agreeUserAgreement, setAgreeUserAgreement] = useState(false);
  const [agreePrivacyPolicy, setAgreePrivacyPolicy] = useState(false);
  const [agreeDataConsent, setAgreeDataConsent] = useState(false);
  const [agreePublicOffer, setAgreePublicOffer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessNotice, setShowSuccessNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDocs(getCustomLegalDocs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentVersion = getCurrentLegalDocsVersion();
  const currentDoc = docs[selectedDocKey] || { title: "", lastUpdated: "", content: [] };

  const handleSelectDoc = (key: string) => {
    setSelectedDocKey(key);
    setViewedDocs(prev => ({ ...prev, [key]: true }));
  };

  const allAgreed = agreeUserAgreement && agreePrivacyPolicy && agreeDataConsent && agreePublicOffer;

  const handleToggleSelectAll = () => {
    if (allAgreed) {
      setAgreeUserAgreement(false);
      setAgreePrivacyPolicy(false);
      setAgreeDataConsent(false);
      setAgreePublicOffer(false);
    } else {
      setAgreeUserAgreement(true);
      setAgreePrivacyPolicy(true);
      setAgreeDataConsent(true);
      setAgreePublicOffer(true);
      setViewedDocs({
        user_agreement: true,
        privacy_policy: true,
        data_consent: true,
        public_offer: true
      });
    }
  };

  const handleConfirm = () => {
    if (!allAgreed) return;
    setIsSubmitting(true);

    try {
      saveUserLegalConsent(currentUser.id, currentUser.email, currentUser.role, currentVersion);
      setShowSuccessNotice(true);
      setTimeout(() => {
        setIsSubmitting(false);
        onConsentConfirmed();
      }, 700);
    } catch (e) {
      setIsSubmitting(false);
      onConsentConfirmed();
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return { label: 'Собственник недвижимости', icon: UserCheck, color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' };
      case 'family':
        return { label: 'Член семьи собственника', icon: UserCheck, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'manager':
        return { label: 'Управляющий объектом', icon: Key, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'specialist':
        return { label: 'Сервисный специалист / Инженер ТО', icon: HardHat, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
      default:
        return { label: 'Пользователь системы', icon: UserCheck, color: 'text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 border-neutral-500/20' };
    }
  };

  const roleMeta = getRoleLabel(currentUser.role);
  const RoleIcon = roleMeta.icon;

  const docTabs = [
    { key: "user_agreement", label: "Пользовательское соглашение", icon: FileText, requiredName: "Пользовательское соглашение" },
    { key: "privacy_policy", label: "Политика конфиденциальности", icon: Lock, requiredName: "Политика конфиденциальности" },
    { key: "data_consent", label: "Согласие на обработку данных", icon: ShieldCheck, requiredName: "Согласие 152-ФЗ" },
    { key: "public_offer", label: "Публичная оферта", icon: Scale, requiredName: "Публичная оферта" }
  ];

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp text-neutral-800 dark:text-neutral-100">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50/80 dark:bg-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-sm">
                <Scale className="w-5 h-5" />
              </span>
              <h2 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                {isUpdateNotice 
                  ? "Обновление условий: Ознакомление с новой редакцией документов" 
                  : "Обязательное ознакомление с правовыми документами сервиса"}
              </h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Портал «Цифровой паспорт объекта» • Нормативные условия эксплуатации и обработки данных (152-ФЗ)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${roleMeta.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleMeta.label}</span>
            </span>

            {isUpdateNotice ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>Новая редакция</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-3 h-3" />
                <span>Первый вход</span>
              </span>
            )}
          </div>
        </div>

        {/* NOTICE BAR */}
        <div className="px-4 sm:px-5 py-2.5 bg-blue-500/5 dark:bg-blue-500/10 border-b border-blue-500/15 text-[11px] sm:text-xs text-neutral-700 dark:text-neutral-300 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Пользователь: <strong>{currentUser.fullname}</strong> ({currentUser.email || "вход по номеру/логину"}). Пожалуйста, ознакомьтесь со всеми 4 документами ниже и подтвердите согласие.
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono hidden md:inline shrink-0">
            Версия документов: {currentVersion.replace("v_", "").slice(0, 16)}
          </span>
        </div>

        {/* DOCUMENT TABS */}
        <div className="flex border-b border-neutral-200 dark:border-zinc-800 bg-neutral-100/60 dark:bg-zinc-800/40 p-1.5 gap-1.5 overflow-x-auto shrink-0">
          {docTabs.map((tab) => {
            const isSelected = selectedDocKey === tab.key;
            const isViewed = viewedDocs[tab.key];
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectDoc(tab.key)}
                className={`flex-1 min-w-[170px] sm:min-w-0 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm border border-neutral-200/80 dark:border-zinc-700"
                    : "hover:bg-white/50 dark:hover:bg-zinc-850 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                {isViewed ? (
                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                    ✓
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Не просмотрен" />
                )}
              </button>
            );
          })}
        </div>

        {/* DOCUMENT CONTENT VIEWER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white dark:bg-zinc-900 text-neutral-750 dark:text-neutral-250 text-xs sm:text-[13px] leading-relaxed select-text min-h-[180px] max-h-[40vh] sm:max-h-[44vh]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-neutral-100 dark:border-zinc-800">
            <div>
              <h3 className="font-black text-sm sm:text-base text-neutral-900 dark:text-white">
                {currentDoc.title || "Документ сервиса"}
              </h3>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                <span>Редакция действительна с: {currentDoc.lastUpdated || "2026 г."}</span>
              </p>
            </div>
            <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono self-start sm:self-auto">
              Официальный регламент
            </span>
          </div>

          <div className="space-y-3.5 font-sans">
            {currentDoc.content && currentDoc.content.length > 0 ? (
              currentDoc.content.map((paragraph, idx) => {
                const isHeading = paragraph.startsWith("1.") || paragraph.startsWith("2.") || paragraph.startsWith("3.") || paragraph.startsWith("4.") || paragraph.toUpperCase() === paragraph;
                return (
                  <p 
                    key={idx} 
                    className={isHeading 
                      ? "font-extrabold text-xs sm:text-sm text-neutral-900 dark:text-white pt-2 border-b border-neutral-100 dark:border-zinc-800/60 pb-1" 
                      : "text-neutral-700 dark:text-neutral-300 leading-relaxed"
                    }
                  >
                    {paragraph}
                  </p>
                );
              })
            ) : (
              <p className="italic text-neutral-400">Текст документа загружается...</p>
            )}
          </div>
        </div>

        {/* CONSENT CHECKBOXES AND ACTION FOOTER */}
        <div className="p-4 sm:p-5 border-t border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900/95 space-y-4 shrink-0">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <span className="font-extrabold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Подтверждение согласия с 4 документами:</span>
            </span>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
            >
              {allAgreed ? "Снять все отметки" : "✓ Отметить все 4 документа"}
            </button>
          </div>

          {/* 4 Checkbox Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-colors text-xs">
              <input
                type="checkbox"
                checked={agreeUserAgreement}
                onChange={(e) => setAgreeUserAgreement(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="leading-tight">
                Ознакомлен(а) с <strong>Пользовательским соглашением</strong> сервиса
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-colors text-xs">
              <input
                type="checkbox"
                checked={agreePrivacyPolicy}
                onChange={(e) => setAgreePrivacyPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="leading-tight">
                Принимаю условия <strong>Политики конфиденциальности</strong>
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-colors text-xs">
              <input
                type="checkbox"
                checked={agreeDataConsent}
                onChange={(e) => setAgreeDataConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="leading-tight">
                Даю согласие на <strong>обработку персональных данных</strong> (152-ФЗ)
              </span>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/40 cursor-pointer transition-colors text-xs">
              <input
                type="checkbox"
                checked={agreePublicOffer}
                onChange={(e) => setAgreePublicOffer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="leading-tight">
                Безоговорочно принимаю условия <strong>Публичной оферты</strong>
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Отказаться и выйти из учетной записи"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти из учетной записи</span>
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
              {!allAgreed && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold text-center sm:text-right">
                  Отметьте согласие со всеми 4 документами
                </span>
              )}

              <button
                type="button"
                disabled={!allAgreed || isSubmitting}
                onClick={handleConfirm}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                  allAgreed && !isSubmitting
                    ? "bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20"
                    : "bg-neutral-300 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-600 cursor-not-allowed shadow-none"
                }`}
              >
                {showSuccessNotice ? (
                  <>
                    <Check className="w-4 h-4 text-white animate-bounce" />
                    <span>Согласие принято! Входим...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ознакомлен и согласен</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MandatoryLegalConsentModal;
