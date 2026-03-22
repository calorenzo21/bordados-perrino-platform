'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import useSWR from 'swr';

import { createClient } from '@/lib/supabase/browser';
import type { ClientDetail } from '@/lib/types/admin.types';

export type { ClientDetail };

// Tipos que coinciden con la interfaz existente
interface Order {
  id: string;
  description: string;
  status: string;
  total: number;
  date: string;
}

interface Client {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string;
  address?: string;
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  createdAt: string;
  orders: Order[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const ADMIN_CLIENTS_LIST_KEY = 'admin-clients-list' as const;

// Fetcher puro — reutiliza la misma query y mapping, sin efectos secundarios
async function fetchClientsList(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('clients_with_stats')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((client: any) => ({
    id: client.id,
    name: client.name,
    initials: getInitials(client.name),
    email: client.email,
    phone: client.phone,
    cedula: client.cedula || '',
    address: client.address || '',
    totalOrders: client.total_orders || 0,
    activeOrders: client.active_orders || 0,
    totalSpent: client.total_spent || 0,
    lastOrderDate: client.last_order_date?.split('T')[0] || '',
    createdAt: client.created_at?.split('T')[0] || '',
    orders: [],
  }));
}

export function useClients() {
  const {
    data: clients,
    error,
    isLoading,
    mutate,
  } = useSWR(ADMIN_CLIENTS_LIST_KEY, fetchClientsList, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
  });

  return {
    clients: clients ?? [],
    isLoading,
    error: error instanceof Error ? error.message : error ? 'Error al cargar clientes' : null,
    refetch: () => mutate(),
  };
}

const ADMIN_CLIENT_SWR_KEY_PREFIX = 'admin-client' as const;

export function getAdminClientSwrKey(clientId: string): readonly [string, string] {
  return [ADMIN_CLIENT_SWR_KEY_PREFIX, clientId];
}

export async function adminClientFetcher(key: readonly [string, string]): Promise<ClientDetail> {
  const [, clientId] = key;
  const supabase = createClient();
  // No getSession() here: the SWR key is only set when authUser exists (see useClient),
  // so the session is guaranteed valid.

  // Fetch client and orders in parallel
  const [clientRes, ordersRes] = await Promise.all([
    supabase.from('clients_with_stats').select('*').eq('id', clientId).single(),
    supabase
      .from('orders')
      .select(
        'id, order_number, description, service_type, status, total, quantity, created_at, due_date'
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
  ]);

  if (clientRes.error) throw clientRes.error;
  const clientData = clientRes.data;

  const orders: ClientDetail['orders'] = (ordersRes.data || []).map(
    (o: Record<string, unknown>) => ({
      id: String(o.order_number ?? o.id ?? ''),
      description: String(o.description ?? ''),
      serviceType: String(o.service_type ?? ''),
      status: (o.status as string) ?? '',
      total: Number(o.total) || 0,
      quantity: Number(o.quantity) || 0,
      date: (o.created_at as string)?.split('T')[0] || '',
      dueDate: (o.due_date as string) || '',
    })
  );

  const completedOrders = orders.filter(
    (o) => o.status === 'ENTREGADO' || o.status === 'CANCELADO'
  ).length;
  const totalSpent = clientData.total_spent || 0;
  const averageOrderValue =
    clientData.total_orders > 0 ? Math.round(totalSpent / clientData.total_orders) : 0;

  return {
    id: clientData.id,
    name: clientData.name,
    initials: getInitials(clientData.name),
    email: clientData.email,
    phone: clientData.phone,
    cedula: clientData.cedula || '',
    address: clientData.address || '',
    totalOrders: clientData.total_orders || 0,
    activeOrders: clientData.active_orders || 0,
    completedOrders,
    totalSpent,
    averageOrderValue,
    lastOrderDate: clientData.last_order_date?.split('T')[0] || '',
    createdAt: clientData.created_at?.split('T')[0] || '',
    notes: clientData.notes || '',
    orders,
  };
}

const SWR_OPTIONS = {
  revalidateOnFocus: true,
  dedupingInterval: 20000,
  errorRetryCount: 2,
  keepPreviousData: true,
} as const;

export function useClient(clientId: string, options: { fallbackData?: ClientDetail | null } = {}) {
  const router = useRouter();
  // La ruta está protegida por middleware — si el componente renderiza, la auth está garantizada.
  // Eliminamos la dependencia de authUser para que SWR fetchee inmediatamente al montar.
  const key = clientId ? getAdminClientSwrKey(clientId) : null;

  const {
    data: client,
    error,
    isLoading: swrLoading,
    mutate,
  } = useSWR(key, adminClientFetcher, {
    ...SWR_OPTIONS,
    fallbackData: options.fallbackData ?? undefined,
    onError(err) {
      if (err?.message === 'Unauthorized' || err?.status === 401) {
        router.replace('/login');
      }
    },
  });

  const refetch = useCallback(() => mutate(), [mutate]);

  return {
    client: client ?? null,
    isLoading: key !== null && swrLoading,
    error: error ? (error instanceof Error ? error.message : 'Error al cargar cliente') : null,
    refetch,
  };
}
