'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import useSWR from 'swr';

import { createClient } from '@/lib/supabase/browser';

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

export function useClients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    if (!isMounted.current || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedClients: Client[] = (clientsData || []).map((client: any) => ({
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

      if (isMounted.current) {
        setClients(mappedClients);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar clientes');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    isMounted.current = true;
    if (user) fetchClients();

    return () => {
      isMounted.current = false;
    };
  }, [user, fetchClients]);

  return { clients, isLoading, error, refetch: fetchClients };
}

// Interfaz extendida para la página de detalle del cliente (exportada para prefetch)
export interface ClientDetail {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string;
  address: string;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  createdAt: string;
  notes: string;
  orders: {
    id: string;
    description: string;
    serviceType: string;
    status: string;
    total: number;
    quantity: number;
    date: string;
    dueDate: string;
  }[];
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
} as const;

export function useClient(clientId: string) {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const key = authUser && clientId ? getAdminClientSwrKey(clientId) : null;

  const {
    data: client,
    error,
    isLoading: swrLoading,
    mutate,
  } = useSWR(key, adminClientFetcher, {
    ...SWR_OPTIONS,
    onError(err) {
      if (err?.message === 'Unauthorized' || err?.status === 401) {
        router.replace('/login');
      }
    },
  });

  const refetch = useCallback(() => mutate(), [mutate]);

  return {
    client: client ?? null,
    // auth loading: esperamos la sesión | key not null + swr loading: primera carga de datos
    isLoading: authLoading || (key !== null && swrLoading),
    error: error ? (error instanceof Error ? error.message : 'Error al cargar cliente') : null,
    refetch,
  };
}
