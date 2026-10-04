import React from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Check, 
  AlertTriangle, 
  Hourglass,
  Calendar
} from 'lucide-react';
import { ScheduleItem, CompletedChecklist } from '../types';

export type MaintenanceStatusType = 
  | 'overdue'       // Просрочено
  | 'normal'        // В норме / Предстоит
  | 'upcoming'      // Предстоит в ближайшие дни
  | 'completed'     // Выполнено / Подписано
  | 'approved'      // Утверждено собственником
  | 'pending';      // Ожидает утверждения / В процессе

export interface StatusBadgeProps {
  /**
   * Прямой тип статуса:
   * - 'overdue': Просрочено (красный/rose)
   * - 'normal': В норме (изумрудный/зеленый)
   * - 'upcoming': Предстоит в ближайшие дни (янтарный/amber)
   * - 'completed': Выполнено (зеленый/emerald)
   * - 'approved': Утвержден (зеленый/emerald)
   * - 'pending': Ожидает проверки/утверждения (янтарный/amber)
   */
  status?: MaintenanceStatusType;

  /**
   * Текстовая метка статуса. Если не передана, берется стандартная по типу.
   */
  label?: string;

  /**
   * Разница в днях (для регламентов).
   * Отрицательное число = дней просрочки.
   * Положительное число = дней осталось.
   */
  diffDays?: number;

  /**
   * Передача регламента напрямую для авто-расчета статуса
   */
  schedule?: ScheduleItem;

  /**
   * Передача акта напрямую для авто-расчета статуса
   */
  report?: CompletedChecklist;

  /**
   * Порог упреждения в днях (по умолчанию 3)
   */
  reminderDaysBefore?: number;

  /**
   * Размер бейджа
   * @default 'sm'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';

  /**
   * Стиль отображения:
   * - 'badge': скругленный прямоугольник с фоном и рамкой (стандарт)
   * - 'pill': овальная форма full-round
   * - 'outline': только рамка без заливки
   * - 'dot': компактный с цветной точкой
   * @default 'badge'
   */
  variant?: 'badge' | 'pill' | 'outline' | 'dot';

  /**
   * Отображать ли иконку статуса
   * @default true
   */
  showIcon?: boolean;

  /**
   * Отображать ли пульсирующий индикатор точки
   * @default true
   */
  showDot?: boolean;

  /**
   * Включить/выключить анимацию пульса для критичных статусов
   */
  animate?: boolean;

  /**
   * Дополнительные CSS-классы
   */
  className?: string;
}

/**
 * Вспомогательная функция вычисления статуса регламента
 */
export function calculateScheduleStatus(
  sch: ScheduleItem, 
  reminderDaysBefore: number = 3,
  referenceDate: string = "2026-05-24"
): {
  type: MaintenanceStatusType;
  label: string;
  diffDays: number;
  isOverdue: boolean;
  isUpcoming: boolean;
} {
  if (!sch.lastDoneDate) {
    return {
      type: 'overdue',
      label: 'Ни разу не проводилось',
      diffDays: -999,
      isOverdue: true,
      isUpcoming: false
    };
  }

  const lastDone = new Date(sch.lastDoneDate);
  const nextDue = new Date(lastDone);
  nextDue.setDate(lastDone.getDate() + sch.intervalDays);
  const today = new Date(referenceDate);
  const diffTime = nextDue.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      type: 'overdue',
      label: `Просрочено на ${Math.abs(diffDays)} дн.`,
      diffDays,
      isOverdue: true,
      isUpcoming: false
    };
  } else if (diffDays === 0) {
    return {
      type: 'overdue',
      label: 'Требуется выполнить сегодня!',
      diffDays: 0,
      isOverdue: true,
      isUpcoming: false
    };
  } else if (diffDays <= reminderDaysBefore) {
    return {
      type: 'upcoming',
      label: `Предстоит выполнить через ${diffDays} дн.`,
      diffDays,
      isOverdue: false,
      isUpcoming: true
    };
  } else {
    return {
      type: 'normal',
      label: `В норме (Осталось ${diffDays} дн.)`,
      diffDays,
      isOverdue: false,
      isUpcoming: false
    };
  }
}

/**
 * Вспомогательная функция вычисления статуса акта
 */
export function calculateReportStatus(rep: CompletedChecklist): {
  type: MaintenanceStatusType;
  label: string;
} {
  if (rep.approvedByOwner) {
    return {
      type: 'approved',
      label: 'Утвержден'
    };
  }
  return {
    type: 'completed',
    label: 'Выполнено'
  };
}

/**
 * Универсальный компонент цветовой кодировки статусов
 * Используется в списках регламентов, актов, дашбордах и карточках объектов
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status: propStatus,
  label: propLabel,
  diffDays: propDiffDays,
  schedule,
  report,
  reminderDaysBefore = 3,
  size = 'sm',
  variant = 'badge',
  showIcon = true,
  showDot = true,
  animate,
  className = ''
}) => {
  // Вычисляем статус и метку исходя из переданных свойств
  let resolvedType: MaintenanceStatusType = propStatus || 'normal';
  let resolvedLabel = propLabel;
  let resolvedDiffDays = propDiffDays;

  if (schedule) {
    const calc = calculateScheduleStatus(schedule, reminderDaysBefore);
    resolvedType = calc.type;
    if (!resolvedLabel) resolvedLabel = calc.label;
    resolvedDiffDays = calc.diffDays;
  } else if (report) {
    const calc = calculateReportStatus(report);
    resolvedType = calc.type;
    if (!resolvedLabel) resolvedLabel = calc.label;
  }

  // Дефолтные заголовки, если не заданы
  if (!resolvedLabel) {
    switch (resolvedType) {
      case 'overdue':
        resolvedLabel = resolvedDiffDays !== undefined && resolvedDiffDays < 0 
          ? `Просрочено на ${Math.abs(resolvedDiffDays)} дн.` 
          : 'Просрочено';
        break;
      case 'upcoming':
        resolvedLabel = resolvedDiffDays !== undefined 
          ? `Предстоит через ${resolvedDiffDays} дн.` 
          : 'Предстоит выполнить';
        break;
      case 'completed':
        resolvedLabel = 'Выполнено';
        break;
      case 'approved':
        resolvedLabel = 'Утвержден';
        break;
      case 'pending':
        resolvedLabel = 'Ожидает';
        break;
      case 'normal':
      default:
        resolvedLabel = resolvedDiffDays !== undefined 
          ? `В норме (Осталось ${resolvedDiffDays} дн.)` 
          : 'В норме';
        break;
    }
  }

  // Разрешаем анимацию (пульсация для просрочки или срочных задач)
  const isPulseActive = animate !== undefined 
    ? animate 
    : (resolvedType === 'overdue' || (resolvedDiffDays !== undefined && resolvedDiffDays === 0));

  // Стили размеров
  const sizeClasses = {
    xs: {
      container: 'text-[9px] px-1.5 py-0.5 gap-1 leading-none font-bold',
      icon: 'w-2.5 h-2.5',
      dot: 'w-1.5 h-1.5'
    },
    sm: {
      container: 'text-[10px] sm:text-[11px] px-2 py-0.5 gap-1.5 leading-tight font-extrabold',
      icon: 'w-3 h-3',
      dot: 'w-1.5 h-1.5'
    },
    md: {
      container: 'text-xs px-2.5 py-1 gap-1.5 leading-snug font-extrabold',
      icon: 'w-3.5 h-3.5',
      dot: 'w-2 h-2'
    },
    lg: {
      container: 'text-sm px-3.5 py-1.5 gap-2 leading-normal font-black',
      icon: 'w-4 h-4',
      dot: 'w-2.5 h-2.5'
    }
  }[size];

  // Стили скругления по variant
  const radiusClass = {
    badge: 'rounded-md',
    pill: 'rounded-full',
    outline: 'rounded-md',
    dot: 'rounded-full'
  }[variant];

  // Цветовая схема по типу статуса
  let colorScheme = {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/25 dark:border-emerald-500/35',
    dot: 'bg-emerald-500',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle2
  };

  switch (resolvedType) {
    case 'overdue':
      colorScheme = {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-500/30 dark:border-rose-500/40',
        dot: 'bg-rose-500',
        iconColor: 'text-rose-600 dark:text-rose-400',
        Icon: AlertCircle
      };
      break;

    case 'upcoming':
      colorScheme = {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-500/30 dark:border-amber-500/40',
        dot: 'bg-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
        Icon: Clock
      };
      break;

    case 'completed':
      colorScheme = {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/25 dark:border-emerald-500/35',
        dot: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        Icon: CheckCircle2
      };
      break;

    case 'approved':
      colorScheme = {
        bg: 'bg-teal-500/10 dark:bg-teal-500/15',
        text: 'text-teal-700 dark:text-teal-300',
        border: 'border-teal-500/30 dark:border-teal-500/40',
        dot: 'bg-teal-500',
        iconColor: 'text-teal-600 dark:text-teal-400',
        Icon: Check
      };
      break;

    case 'pending':
      colorScheme = {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-500/30 dark:border-amber-500/40',
        dot: 'bg-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
        Icon: Hourglass
      };
      break;

    case 'normal':
    default:
      colorScheme = {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-500/25 dark:border-emerald-500/35',
        dot: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        Icon: CheckCircle2
      };
      break;
  }

  const { Icon } = colorScheme;

  // Если вариант outline, убираем фон
  const bgClass = variant === 'outline' ? 'bg-transparent' : colorScheme.bg;
  const borderClass = `border ${colorScheme.border}`;

  return (
    <span
      className={`inline-flex items-center tracking-wide uppercase transition-all select-none ${radiusClass} ${sizeClasses.container} ${bgClass} ${colorScheme.text} ${borderClass} ${className}`}
      title={resolvedLabel}
    >
      {/* Пульсирующая точка или индикатор */}
      {showDot && (
        <span className="relative flex items-center justify-center shrink-0">
          <span
            className={`${sizeClasses.dot} rounded-full ${colorScheme.dot} ${
              isPulseActive ? 'animate-ping opacity-75 absolute inline-flex' : ''
            }`}
          />
          <span className={`${sizeClasses.dot} rounded-full ${colorScheme.dot} relative inline-flex`} />
        </span>
      )}

      {/* Иконка */}
      {showIcon && (
        <Icon className={`${sizeClasses.icon} ${colorScheme.iconColor} shrink-0`} />
      )}

      {/* Текст статуса */}
      <span className="truncate max-w-[280px]">
        {resolvedLabel}
      </span>
    </span>
  );
};

export default StatusBadge;
