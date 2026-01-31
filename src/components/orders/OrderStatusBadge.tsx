import { cn } from '@/lib/utils';
import {
  OrderStatusLabels,
  type OrderStatusType,
  OrderStatus,
} from '@/lib/utils/status';

interface OrderStatusBadgeProps {
  status: OrderStatusType;
  className?: string;
}

const statusStyles: Record<OrderStatusType, string> = {
  [OrderStatus.RECIBIDO]: 'bg-blue-50 text-blue-600 border-blue-100',
  [OrderStatus.CONFECCION]: 'bg-amber-50 text-amber-600 border-amber-100',
  [OrderStatus.RETIRO]: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  [OrderStatus.PARCIALMENTE_ENTREGADO]: 'bg-purple-50 text-purple-600 border-purple-100',
  [OrderStatus.ENTREGADO]: 'bg-sky-50 text-sky-600 border-sky-100',
  [OrderStatus.CANCELADO]: 'bg-rose-50 text-rose-600 border-rose-100',
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
