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
 * Order status colors for charts/indicators
 */
export const OrderStatusColors: Record<OrderStatusType, string> = {
  [OrderStatus.RECIBIDO]: '#6366f1', // Indigo
  [OrderStatus.CONFECCION]: '#f59e0b', // Amber
  [OrderStatus.RETIRO]: '#10b981', // Emerald
  [OrderStatus.PARCIALMENTE_ENTREGADO]: '#a855f7', // Purple
  [OrderStatus.ENTREGADO]: '#0ea5e9', // Sky (Celeste)
  [OrderStatus.CANCELADO]: '#ef4444', // Red
};

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
    [OrderStatus.RETIRO]: [OrderStatus.PARCIALMENTE_ENTREGADO, OrderStatus.ENTREGADO, OrderStatus.CANCELADO],
    [OrderStatus.PARCIALMENTE_ENTREGADO]: [OrderStatus.PARCIALMENTE_ENTREGADO, OrderStatus.ENTREGADO, OrderStatus.CANCELADO], // Can add more partial deliveries or complete
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

