/**
 * Order Status Constants
 *
 * Use these constants instead of raw strings throughout the application
 * to ensure consistency and type safety.
 */
export const OrderStatus = {
  /** Order has been received and is pending processing */
  RECIBIDO: 'RECIBIDO',
  /** Order is being manufactured/embroidered */
  CONFECCION: 'CONFECCION',
  /** Order is ready for pickup */
  RETIRO: 'RETIRO',
  /** Order has been partially delivered (allows multiple partial deliveries) */
  PARCIALMENTE_ENTREGADO: 'PARCIALMENTE_ENTREGADO',
  /** Order has been delivered/completed */
  ENTREGADO: 'ENTREGADO',
  /** Order has been cancelled */
  CANCELADO: 'CANCELADO',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * All possible order statuses as an array (useful for forms/selects)
 */
export const ORDER_STATUSES = Object.values(OrderStatus);

/**
 * Order status display labels in Spanish
 */
export const OrderStatusLabels: Record<OrderStatusType, string> = {
  [OrderStatus.RECIBIDO]: 'Recibido',
  [OrderStatus.CONFECCION]: 'En Confección',
  [OrderStatus.RETIRO]: 'Listo para Retiro',
  [OrderStatus.PARCIALMENTE_ENTREGADO]: 'Parcialmente Entregado',
  [OrderStatus.ENTREGADO]: 'Entregado',
  [OrderStatus.CANCELADO]: 'Cancelado',
};

/**
 * Order status badge variants for UI (shadcn Badge component)
 */
export const OrderStatusVariants: Record<
  OrderStatusType,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [OrderStatus.RECIBIDO]: 'secondary',
  [OrderStatus.CONFECCION]: 'default',
  [OrderStatus.RETIRO]: 'outline',
  [OrderStatus.PARCIALMENTE_ENTREGADO]: 'default',
  [OrderStatus.ENTREGADO]: 'secondary',
  [OrderStatus.CANCELADO]: 'destructive',
};

/**
 * Order status colors for charts/indicators (hex values)
 */
export const OrderStatusColors: Record<OrderStatusType, string> = {
  [OrderStatus.RECIBIDO]: '#6366f1',
  [OrderStatus.CONFECCION]: '#f59e0b',
  [OrderStatus.RETIRO]: '#10b981',
  [OrderStatus.PARCIALMENTE_ENTREGADO]: '#a855f7',
  [OrderStatus.ENTREGADO]: '#0ea5e9',
  [OrderStatus.CANCELADO]: '#ef4444',
};

/**
 * Tailwind class-based color sets for status badges, backgrounds, and borders.
 * Superset of all properties used across admin and client UIs.
 */
export interface StatusColorSet {
  bg: string;
  bgLight: string;
  light: string;
  text: string;
  border: string;
  borderDark: string;
  gradient: string;
  hex: string;
  hoverClasses: string;
}

export const STATUS_COLOR_MAP: Record<OrderStatusType, StatusColorSet> = {
  [OrderStatus.RECIBIDO]: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100 dark:bg-blue-900/30',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50',
    borderDark: 'border-blue-400',
    gradient: 'from-blue-500 to-blue-600',
    hex: '#3b82f6',
    hoverClasses: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
  },
  [OrderStatus.CONFECCION]: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-100 dark:bg-amber-900/30',
    light: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
    borderDark: 'border-amber-400',
    gradient: 'from-amber-500 to-amber-600',
    hex: '#f59e0b',
    hoverClasses: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
  },
  [OrderStatus.RETIRO]: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100 dark:bg-emerald-900/30',
    light: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    borderDark: 'border-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
    hex: '#10b981',
    hoverClasses: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
  },
  [OrderStatus.PARCIALMENTE_ENTREGADO]: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100 dark:bg-purple-900/30',
    light: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800/50',
    borderDark: 'border-purple-400',
    gradient: 'from-purple-500 to-purple-600',
    hex: '#a855f7',
    hoverClasses: 'hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700',
  },
  [OrderStatus.ENTREGADO]: {
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-100 dark:bg-sky-900/30',
    light: 'bg-sky-50 dark:bg-sky-900/20',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-200 dark:border-sky-800/50',
    borderDark: 'border-sky-400',
    gradient: 'from-sky-500 to-sky-600',
    hex: '#0ea5e9',
    hoverClasses: 'hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700',
  },
  [OrderStatus.CANCELADO]: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-100 dark:bg-rose-900/30',
    light: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/50',
    borderDark: 'border-rose-400',
    gradient: 'from-rose-500 to-rose-600',
    hex: '#f43f5e',
    hoverClasses: 'hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700',
  },
};

/**
 * Ordered flow of statuses for timeline UI (excludes CANCELADO).
 */
export const STATUS_FLOW: OrderStatusType[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.CONFECCION,
  OrderStatus.RETIRO,
  OrderStatus.PARCIALMENTE_ENTREGADO,
  OrderStatus.ENTREGADO,
];

/**
 * Segment/timeline bar colors (one per status in STATUS_FLOW order).
 */
export const SEGMENT_COLORS = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-sky-500',
];

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: OrderStatusType,
  newStatus: OrderStatusType
): boolean {
  const validTransitions: Record<OrderStatusType, OrderStatusType[]> = {
    [OrderStatus.RECIBIDO]: [OrderStatus.CONFECCION, OrderStatus.CANCELADO],
    [OrderStatus.CONFECCION]: [OrderStatus.RETIRO, OrderStatus.CANCELADO],
    [OrderStatus.RETIRO]: [
      OrderStatus.PARCIALMENTE_ENTREGADO,
      OrderStatus.ENTREGADO,
      OrderStatus.CANCELADO,
    ],
    [OrderStatus.PARCIALMENTE_ENTREGADO]: [
      OrderStatus.PARCIALMENTE_ENTREGADO,
      OrderStatus.ENTREGADO,
      OrderStatus.CANCELADO,
    ], // Can add more partial deliveries or complete
    [OrderStatus.ENTREGADO]: [], // Terminal state
    [OrderStatus.CANCELADO]: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * User Roles
 */
export const UserRole = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

/**
 * Payment Status
 */
export const PaymentStatus = {
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentStatusLabels: Record<PaymentStatusType, string> = {
  [PaymentStatus.PENDING]: 'Pendiente',
  [PaymentStatus.PARTIAL]: 'Pago Parcial',
  [PaymentStatus.PAID]: 'Pagado',
};
