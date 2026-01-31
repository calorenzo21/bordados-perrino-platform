/**
 * Clients Server Service
 *
 * Server-side data fetching for clients.
 * Uses the server Supabase client for SSR.
 */
import { createClient } from '@/lib/supabase/server';

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
 */
export async function getClientsData(): Promise<ClientsData> {
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
}
