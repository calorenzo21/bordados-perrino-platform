/**
 * Orders Server Service
 *
 * Server-side data fetching for orders.
 * Uses the server Supabase client for SSR.
 * React.cache() deduplicates within the same request.
 */
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { OrderStatus } from '@/lib/utils/status';

/** Fila de la vista orders_with_payments (campos usados en orden + mapeo) */
interface OrdersWithPaymentsViewRow {
  id: string;
  order_number?: string | null;
  client_id: string;
  client_name?: string | null;
  client_email?: string | null;
  description: string;
  service_type: string;
  quantity: number;
  total: number;
  status: string;
  due_date: string;
  created_at?: string | null;
  is_delayed?: boolean | null;
  days_remaining?: number | null;
  is_urgent?: boolean | null;
  remaining_balance?: number | string | null;
}

/**
 * 1) Activos primero; Entregados al final.
 * 2) Entre activos: urgentes primero.
 * 3) Mismo grupo: FIFO (más antiguos arriba, los nuevos van quedando al final).
 */
function sortOrdersQueue(rows: OrdersWithPaymentsViewRow[]): OrdersWithPaymentsViewRow[] {
  return [...rows].sort((a, b) => {
    const aEnt = a.status === OrderStatus.ENTREGADO;
    const bEnt = b.status === OrderStatus.ENTREGADO;
    if (aEnt !== bEnt) return aEnt ? 1 : -1;

    const aUrgent = !!a.is_urgent;
    const bUrgent = !!b.is_urgent;
    if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;

    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return ta - tb;
  });
}

export interface OrderClient {
  id: string;
  name: string;
  initials: string;
  email: string;
}

export interface Order {
  id: string;
  client: OrderClient;
  description: string;
  serviceType: string;
  quantity: number;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
  isDelayed: boolean;
  daysRemaining: number;
  isUrgent: boolean;
  /** Saldo pendiente por cobrar (total - abonos). > 0 = no cancelado en su totalidad */
  remainingBalance: number;
}

export interface OrdersData {
  orders: Order[];
  lastUpdated: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Fetch all orders on the server
 * This is called from Server Components
 * React.cache() deduplicates calls within the same request
 */
export const getOrdersData = cache(async function getOrdersData(): Promise<OrdersData> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('orders_with_payments').select('*');

  if (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Error al cargar pedidos');
  }

  const sorted = sortOrdersQueue((data || []) as OrdersWithPaymentsViewRow[]);

  const orders: Order[] = sorted.map((o) => ({
    id: String(o.order_number || o.id),
    client: {
      id: String(o.client_id),
      name: o.client_name ?? 'Cliente',
      initials: getInitials(o.client_name ?? 'C'),
      email: o.client_email ?? '',
    },
    description: o.description,
    serviceType: o.service_type,
    quantity: o.quantity,
    total: Number(o.total),
    status: o.status,
    dueDate: String(o.due_date),
    createdAt: o.created_at?.split('T')[0] ?? '',
    isDelayed: Boolean(o.is_delayed),
    daysRemaining: Number(o.days_remaining) || 0,
    isUrgent: Boolean(o.is_urgent),
    remainingBalance: Number(o.remaining_balance) || 0,
  }));

  return {
    orders,
    lastUpdated: new Date().toISOString(),
  };
});
