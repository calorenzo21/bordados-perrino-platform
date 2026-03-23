import { cn } from '@/lib/utils';
import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

interface OrderStatusBadgeProps {
  status: OrderStatusType;
  className?: string;
}

const statusStyles: Record<OrderStatusType, string> = {
  [OrderStatus.RECIBIDO]:
    'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
  [OrderStatus.CONFECCION]:
    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
  [OrderStatus.RETIRO]:
    'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
  [OrderStatus.PARCIALMENTE_ENTREGADO]:
    'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50',
  [OrderStatus.ENTREGADO]:
    'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/50',
  [OrderStatus.CANCELADO]:
    'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700/50',
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {OrderStatusLabels[status]}
    </span>
  );
}
