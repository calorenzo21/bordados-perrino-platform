/**
 * Orders Server Service
 *
 * Server-side data fetching for orders.
 * Uses the server Supabase client for SSR.
 * React.cache() deduplicates within the same request.
 */
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { OrderForDetail } from '@/lib/types/admin.types';
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

/**
 * Fetch a single order for the detail view (admin).
 * Returns null if not found. Mirrors fetchOrderForDetail from use-orders.ts
 * but uses the server Supabase client for SSR.
 */
export const getAdminOrderDetail = cache(async function getAdminOrderDetail(
  orderIdOrNumber: string
): Promise<OrderForDetail | null> {
  const supabase = await createClient();

  let query = supabase.from('orders_with_payments').select('*');
  if (orderIdOrNumber.startsWith('ORD-') || orderIdOrNumber.startsWith('PED-')) {
    query = query.eq('order_number', orderIdOrNumber);
  } else {
    query = query.eq('id', orderIdOrNumber);
  }

  const { data: orderData, error: orderError } = await query.single();

  if (orderError) {
    if (orderError.code === 'PGRST116') return null;
    throw orderError;
  }

  const [paymentsRes, historyRes] = await Promise.all([
    supabase
      .from('payments')
      .select(`*, payment_photos (photo_url), profiles:received_by (first_name, last_name)`)
      .eq('order_id', orderData.id)
      .order('payment_date', { ascending: false }),
    supabase
      .from('order_status_history')
      .select(`*, order_status_photos (photo_url), profiles:changed_by (first_name, last_name)`)
      .eq('order_id', orderData.id)
      .order('changed_at', { ascending: true }),
  ]);

  const payments: OrderForDetail['payments'] = (paymentsRes.data || []).map(
    (p: Record<string, unknown>) => {
      const dateTime = (p.payment_date as string)?.split('T') || ['', ''];
      const profile = p.profiles as { first_name?: string; last_name?: string } | null;
      const userName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
        : 'Admin';
      return {
        id: String(p.id ?? ''),
        amount: Number(p.amount) || 0,
        date: dateTime[0] || '',
        time: (dateTime[1] as string)?.slice(0, 8) || '00:00:00',
        method: ((p.method as string)?.toLowerCase() || 'efectivo') as
          | 'efectivo'
          | 'transferencia'
          | 'tarjeta'
          | 'otro',
        notes: typeof p.notes === 'string' ? p.notes : '',
        photos: ((p.payment_photos as { photo_url: string }[]) || []).map((ph) => ph.photo_url),
        user: userName,
      };
    }
  );

  const statusHistory: OrderForDetail['statusHistory'] = (historyRes.data || []).map(
    (h: Record<string, unknown>) => {
      const dateTime = (h.changed_at as string)?.split('T') || ['', ''];
      const profile = h.profiles as { first_name?: string; last_name?: string } | null;
      const userName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
        : 'Admin';
      return {
        id: String(h.id ?? ''),
        status: String(h.status ?? ''),
        date: dateTime[0] || '',
        time: (dateTime[1] as string)?.slice(0, 8) || '00:00:00',
        observations: typeof h.observations === 'string' ? h.observations : '',
        photos: ((h.order_status_photos as { photo_url: string }[]) || []).map(
          (ph) => ph.photo_url
        ),
        user: userName,
        quantityDelivered: h.quantity_delivered != null ? Number(h.quantity_delivered) : null,
      };
    }
  );

  return {
    id: orderData.order_number || orderData.id,
    uuid: orderData.id,
    client: {
      id: orderData.client_id,
      name: orderData.client_name,
      initials: getInitials(orderData.client_name),
      email: orderData.client_email,
      phone: orderData.client_phone || '',
      cedula: orderData.client_cedula || '',
      address: orderData.client_address || '',
    },
    description: orderData.description,
    serviceType: orderData.service_type,
    quantity: orderData.quantity,
    total: orderData.total,
    status: orderData.status,
    dueDate: orderData.due_date,
    createdAt: orderData.created_at?.split('T')[0] || '',
    isDelayed: orderData.is_delayed || false,
    daysRemaining: orderData.days_remaining || 0,
    isUrgent: orderData.is_urgent || false,
    statusHistory,
    payments,
  };
});
