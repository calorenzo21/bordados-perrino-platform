'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import type { SupabaseClient } from '@supabase/supabase-js';
import useSWR, { useSWRConfig } from 'swr';

import { createClient } from '@/lib/supabase/browser';
import type { OrderForDetail } from '@/lib/types/admin.types';

export type { OrderForDetail };

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
  // No getSession() here: the SWR key is only set when authUser exists (see useOrder),
  // so the session is guaranteed valid. An extra getSession() just wastes a round-trip.
  return fetchOrderForDetail(orderId, supabase);
}

const SWR_OPTIONS = {
  revalidateOnFocus: true,
  dedupingInterval: 20000,
  errorRetryCount: 2,
  keepPreviousData: true,
} as const;

export function useOrder(orderId: string, options: { fallbackData?: OrderForDetail | null } = {}) {
  const { mutate: globalMutate } = useSWRConfig();
  const router = useRouter();
  // La ruta está protegida por middleware — si el componente renderiza, la auth está garantizada.
  // Eliminamos la dependencia de authUser para que SWR fetchee inmediatamente al montar.
  const key = orderId ? getAdminOrderSwrKey(orderId) : null;

  const {
    data: order,
    error,
    isLoading: swrLoading,
    mutate,
  } = useSWR(key, adminOrderFetcher, {
    ...SWR_OPTIONS,
    fallbackData: options.fallbackData ?? undefined,
    onError(err) {
      if (err?.message === 'Unauthorized' || err?.status === 401) {
        router.replace('/login');
      }
    },
  });

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
    isLoading: key !== null && swrLoading,
    error: error ? (error instanceof Error ? error.message : 'Error al cargar pedido') : null,
    refetch,
  };
}
