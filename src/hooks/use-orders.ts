'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import useSWR, { useSWRConfig } from 'swr';

import { createClient } from '@/lib/supabase/browser';

// Tipos que coinciden con la interfaz existente
interface OrderClient {
  id: string;
  name: string;
  initials: string;
  email: string;
}

interface Order {
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
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Crear cliente una sola vez
  const supabase = useMemo(() => createClient(), []);

  const fetchOrders = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar que hay sesión antes de hacer la query
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // No hay sesión, esperar un poco y reintentar
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchOrders();
          }, 500);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from('orders_with_payments')
        .select('*')
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      hasFetched.current = true;

      const transformedOrders: Order[] = (data || []).map((o) => ({
        id: o.order_number || o.id,
        client: {
          id: o.client_id,
          name: o.client_name,
          initials: getInitials(o.client_name),
          email: o.client_email,
        },
        description: o.description,
        serviceType: o.service_type,
        quantity: o.quantity,
        total: o.total,
        status: o.status,
        dueDate: o.due_date,
        createdAt: o.created_at?.split('T')[0] || '',
        isDelayed: o.is_delayed || false,
        daysRemaining: o.days_remaining || 0,
        isUrgent: o.is_urgent || false,
      }));

      if (isMounted.current) {
        setOrders(transformedOrders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    fetchOrders();

    return () => {
      isMounted.current = false;
    };
  }, [fetchOrders]);

  return { orders, isLoading, error, refetch: fetchOrders };
}

// Tipos usados en el mapeo de datos del pedido (interfaces locales)
interface _OrderDetail {
  id: string;
  orderNumber: string;
  client: {
    id: string;
    name: string;
    initials: string;
    email: string;
    phone: string;
    cedula: string;
    address: string;
  };
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
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: string;
}

interface _Payment {
  id: string;
  amount: number;
  method: string;
  notes: string;
  date: string;
  photos: string[];
}

interface _StatusHistoryItem {
  id: string;
  status: string;
  observations: string;
  date: string;
  photos: string[];
}

// Para la página de detalle del pedido (formato compatible con la interfaz existente)
export interface OrderForDetail {
  id: string;
  uuid: string; // UUID real del pedido para operaciones con Supabase
  client: {
    id: string;
    name: string;
    initials: string;
    email: string;
    phone: string;
    cedula: string;
    address: string;
  };
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
  statusHistory: {
    id: string;
    status: string;
    date: string;
    time: string;
    observations: string;
    photos: string[];
    user: string;
    quantityDelivered?: number | null;
  }[];
  payments: {
    id: string;
    amount: number;
    date: string;
    time: string;
    method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
    notes: string;
    photos: string[];
    user: string;
  }[];
}

const ADMIN_ORDER_SWR_KEY_PREFIX = 'admin-order' as const;

export function getAdminOrderSwrKey(orderId: string): readonly [string, string] {
  return [ADMIN_ORDER_SWR_KEY_PREFIX, orderId];
}

async function fetchOrderForDetail(
  orderId: string,
  supabase: SupabaseClient
): Promise<OrderForDetail> {
  let query = supabase.from('orders_with_payments').select('*');
  if (orderId.startsWith('ORD-')) {
    query = query.eq('order_number', orderId);
  } else {
    query = query.eq('id', orderId);
  }
  const { data: orderData, error: orderError } = await query.single();
  if (orderError) throw orderError;

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
      const notes = p.notes;
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
        notes: typeof notes === 'string' ? notes : '',
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
      const observations = h.observations;
      return {
        id: String(h.id ?? ''),
        status: String(h.status ?? ''),
        date: dateTime[0] || '',
        time: (dateTime[1] as string)?.slice(0, 8) || '00:00:00',
        observations: typeof observations === 'string' ? observations : '',
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
}

export async function adminOrderFetcher(key: readonly [string, string]): Promise<OrderForDetail> {
  const [, orderId] = key;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');
  return fetchOrderForDetail(orderId, supabase);
}

const SWR_OPTIONS = {
  revalidateOnFocus: true,
  dedupingInterval: 20000,
} as const;

export function useOrder(orderId: string) {
  const { user: authUser } = useAuth();
  const { mutate: globalMutate } = useSWRConfig();
  const key = authUser && orderId ? getAdminOrderSwrKey(orderId) : null;

  const { data: order, error, isLoading, mutate } = useSWR(key, adminOrderFetcher, SWR_OPTIONS);

  const setOrder = useCallback(
    (update: OrderForDetail | null | ((prev: OrderForDetail | null) => OrderForDetail | null)) => {
      if (!key) return;
      const next = typeof update === 'function' ? update(order ?? null) : update;
      globalMutate(key, next, { revalidate: false });
    },
    [key, order, globalMutate]
  );

  const refetch = useCallback(() => mutate(), [mutate]);

  return {
    order: order ?? null,
    setOrder,
    isLoading: key === null ? true : isLoading,
    error: error ? (error instanceof Error ? error.message : 'Error al cargar pedido') : null,
    refetch,
  };
}
