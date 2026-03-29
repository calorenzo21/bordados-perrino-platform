/**
 * Clients Server Service
 *
 * Server-side data fetching for clients.
 * Uses the server Supabase client for SSR.
 * React.cache() deduplicates within the same request.
 */
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { ClientDetail } from '@/lib/types/admin.types';

export interface ClientOrder {
  id: string;
  description: string;
  status: string;
  total: number;
  date: string;
}

export interface Client {
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
  orders: ClientOrder[];
}

export interface ClientsData {
  clients: Client[];
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
 * Fetch all clients on the server
 * This is called from Server Components
 * React.cache() deduplicates calls within the same request
 */
export const getClientsData = cache(async function getClientsData(): Promise<ClientsData> {
  const supabase = await createClient();

  // Get clients with stats
  const { data: clientsData, error: clientsError } = await supabase
    .from('clients_with_stats')
    .select('*')
    .order('created_at', { ascending: false });

  if (clientsError) {
    console.error('Error fetching clients:', clientsError);
    throw new Error('Error al cargar clientes');
  }

  // Get orders for each client (optimized: single query)
  const clientIds = (clientsData || []).map((c) => c.id);

  const { data: allOrdersData } = await supabase
    .from('orders')
    .select('id, order_number, description, status, total, created_at, client_id')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false });

  // Group orders by client
  const ordersByClient: Record<string, ClientOrder[]> = {};
  (allOrdersData || []).forEach((o) => {
    if (!ordersByClient[o.client_id]) {
      ordersByClient[o.client_id] = [];
    }
    // Limit to 5 orders per client
    if (ordersByClient[o.client_id].length < 5) {
      ordersByClient[o.client_id].push({
        id: o.order_number || o.id,
        description: o.description,
        status: o.status,
        total: o.total,
        date: o.created_at?.split('T')[0] || '',
      });
    }
  });

  const clients: Client[] = (clientsData || []).map((client) => ({
    id: client.id,
    name: client.name,
    initials: getInitials(client.name),
    email: client.email,
    phone: client.phone || '',
    cedula: client.cedula || '',
    address: client.address || '',
    totalOrders: client.total_orders || 0,
    activeOrders: client.active_orders || 0,
    totalSpent: client.total_spent || 0,
    lastOrderDate: client.last_order_date?.split('T')[0] || '',
    createdAt: client.created_at?.split('T')[0] || '',
    orders: ordersByClient[client.id] || [],
  }));

  return {
    clients,
    lastUpdated: new Date().toISOString(),
  };
});

/**
 * Fetch a single client for the detail view (admin).
 * Returns null if not found. Mirrors adminClientFetcher from use-clients.ts
 * but uses the server Supabase client for SSR.
 */
export const getAdminClientDetail = cache(async function getAdminClientDetail(
  clientId: string
): Promise<ClientDetail | null> {
  const supabase = await createClient();

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

  if (clientRes.error) {
    if (clientRes.error.code === 'PGRST116') return null;
    throw clientRes.error;
  }

  const clientData = clientRes.data;

  const orders: ClientDetail['orders'] = (ordersRes.data || []).map(
    (o: Record<string, unknown>) => ({
      id: String(o.order_number ?? o.id ?? ''),
      description: String(o.description ?? ''),
      serviceType: String(o.service_type ?? ''),
      status: String(o.status ?? ''),
      total: Number(o.total) || 0,
      quantity: Number(o.quantity) || 0,
      date: (o.created_at as string)?.split('T')[0] || '',
      dueDate: String(o.due_date ?? ''),
    })
  );

  const nonCancelledOrders = orders.filter((o) => o.status !== 'CANCELADO');
  const completedOrders = orders.filter((o) => o.status === 'ENTREGADO').length;
  const totalSpent = clientData.total_spent || 0;
  // totalOrders includes cancelled (visible in history table)
  // averageOrderValue only divides by non-cancelled orders
  const averageOrderValue =
    nonCancelledOrders.length > 0 ? Math.round(totalSpent / nonCancelledOrders.length) : 0;

  return {
    id: clientData.id,
    name: clientData.name,
    initials: getInitials(clientData.name),
    email: clientData.email,
    phone: clientData.phone || '',
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
});
