/**
 * Orders Server Service
 *
 * Server-side data fetching for orders.
 * Uses the server Supabase client for SSR.
 */
import { createClient } from '@/lib/supabase/server';

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
 */
export async function getOrdersData(): Promise<OrdersData> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders_with_payments')
    .select('*')
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Error al cargar pedidos');
  }

  const orders: Order[] = (data || []).map((o) => ({
    id: o.order_number || o.id,
    client: {
      id: o.client_id,
      name: o.client_name || 'Cliente',
      initials: getInitials(o.client_name || 'C'),
      email: o.client_email || '',
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

  return {
    orders,
    lastUpdated: new Date().toISOString(),
  };
}
