/**
 * Client Portal Server Service
 *
 * Server-side data fetching for the client portal.
 * All queries filter by the authenticated user's client_id for security.
 */
import { createClient } from '@/lib/supabase/server';
import type { OrderStatus, PaymentMethod } from '@/lib/types/database';

// ============================================
// TYPES
// ============================================

export interface ClientProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string | null;
  address: string | null;
}

export interface ClientStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
}

export interface ClientOrderSummary {
  id: string;
  orderNumber: string;
  description: string;
  serviceType: string;
  status: OrderStatus;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string;
  createdAt: string;
  isUrgent: boolean;
  isDelayed: boolean;
  daysRemaining: number;
}

export interface ClientPanelData {
  profile: ClientProfile;
  stats: ClientStats;
  orders: ClientOrderSummary[];
  lastUpdated: string;
}

export interface StatusHistoryItem {
  id: string;
  status: OrderStatus;
  observations: string | null;
  changedAt: string;
  changedBy: string | null;
  photos: string[];
}

export interface PaymentItem {
  id: string;
  amount: number;
  method: PaymentMethod;
  notes: string | null;
  paymentDate: string;
  receivedBy: string | null;
  photos: string[];
}

export interface ClientOrderDetail {
  id: string;
  orderNumber: string;
  description: string;
  serviceType: string;
  quantity: number;
  status: OrderStatus;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  dueDate: string;
  createdAt: string;
  isUrgent: boolean;
  isDelayed: boolean;
  daysRemaining: number;
  statusHistory: StatusHistoryItem[];
  payments: PaymentItem[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

/**
 * Get the client record for the authenticated user
 * Returns null if no client is associated with this user
 */
async function getClientForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase.from('clients').select('*').eq('user_id', userId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No client found for this user
      return null;
    }
    console.error('Error fetching client:', error);
    throw new Error('Error al obtener datos del cliente');
  }

  return data;
}

/**
 * Get all data for the client panel page
 * Includes profile, stats, and recent orders
 */
export async function getClientPanelData(): Promise<ClientPanelData | null> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error:', authError);
    return null;
  }

  // Get client record for this user
  const client = await getClientForUser(supabase, user.id);

  if (!client) {
    console.error('No client found for user:', user.id);
    return null;
  }

  // Get orders with payment info for this client
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders_with_payments')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    throw new Error('Error al cargar pedidos');
  }

  const orders = ordersData || [];

  // Calculate stats
  const activeStatuses = ['RECIBIDO', 'CONFECCION', 'RETIRO', 'PARCIALMENTE_ENTREGADO'];
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === 'ENTREGADO').length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total_paid || 0), 0);

  // Build profile
  const profile: ClientProfile = {
    id: client.id,
    name: client.name,
    initials: getInitials(client.name),
    email: client.email,
    phone: client.phone,
    cedula: client.cedula,
    address: client.address,
  };

  // Build stats
  const stats: ClientStats = {
    totalOrders: orders.length,
    activeOrders,
    completedOrders,
    totalSpent,
  };

  // Build orders list
  const ordersList: ClientOrderSummary[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    description: o.description,
    serviceType: o.service_type,
    status: o.status as OrderStatus,
    total: o.total,
    totalPaid: o.total_paid || 0,
    remainingBalance: o.remaining_balance || 0,
    dueDate: formatDate(o.due_date),
    createdAt: formatDate(o.created_at),
    isUrgent: o.is_urgent || false,
    isDelayed: o.is_delayed || false,
    daysRemaining: o.days_remaining || 0,
  }));

  return {
    profile,
    stats,
    orders: ordersList,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get detailed information for a specific order
 * Includes status history with photos and payments with photos
 * Verifies the order belongs to the authenticated client
 */
export async function getClientOrderDetail(
  orderIdOrNumber: string
): Promise<ClientOrderDetail | null> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error:', authError);
    return null;
  }

  // Get client record for this user
  const client = await getClientForUser(supabase, user.id);

  if (!client) {
    console.error('No client found for user:', user.id);
    return null;
  }

  // Get the order - try by order_number first, then by id
  let orderQuery = supabase.from('orders_with_payments').select('*').eq('client_id', client.id);

  // Check if it looks like a UUID or an order number
  if (orderIdOrNumber.startsWith('ORD-') || !orderIdOrNumber.includes('-')) {
    orderQuery = orderQuery.eq('order_number', orderIdOrNumber);
  } else {
    orderQuery = orderQuery.eq('id', orderIdOrNumber);
  }

  const { data: orderData, error: orderError } = await orderQuery.single();

  if (orderError) {
    if (orderError.code === 'PGRST116') {
      // Order not found or doesn't belong to this client
      return null;
    }
    console.error('Error fetching order:', orderError);
    throw new Error('Error al cargar el pedido');
  }

  if (!orderData) {
    return null;
  }

  // Get status history with photos
  const { data: statusHistoryData, error: statusError } = await supabase
    .from('order_status_history')
    .select(
      `
      id,
      status,
      observations,
      changed_at,
      changed_by,
      order_status_photos (photo_url)
    `
    )
    .eq('order_id', orderData.id)
    .order('changed_at', { ascending: false });

  if (statusError) {
    console.error('Error fetching status history:', statusError);
  }

  // Get user names for status history
  const statusHistory: StatusHistoryItem[] = await Promise.all(
    (statusHistoryData || []).map(async (sh) => {
      let changedByName: string | null = null;

      if (sh.changed_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', sh.changed_by)
          .single();

        if (profileData) {
          changedByName = `${profileData.first_name} ${profileData.last_name}`.trim();
        }
      }

      return {
        id: sh.id,
        status: sh.status as OrderStatus,
        observations: sh.observations,
        changedAt: sh.changed_at,
        changedBy: changedByName,
        photos: (sh.order_status_photos || []).map((p: { photo_url: string }) => p.photo_url),
      };
    })
  );

  // Get payments with photos
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select(
      `
      id,
      amount,
      method,
      notes,
      payment_date,
      received_by,
      payment_photos (photo_url)
    `
    )
    .eq('order_id', orderData.id)
    .order('payment_date', { ascending: false });

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError);
  }

  // Get user names for payments
  const payments: PaymentItem[] = await Promise.all(
    (paymentsData || []).map(async (p) => {
      let receivedByName: string | null = null;

      if (p.received_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', p.received_by)
          .single();

        if (profileData) {
          receivedByName = `${profileData.first_name} ${profileData.last_name}`.trim();
        }
      }

      return {
        id: p.id,
        amount: p.amount,
        method: p.method as PaymentMethod,
        notes: p.notes,
        paymentDate: p.payment_date,
        receivedBy: receivedByName,
        photos: (p.payment_photos || []).map((ph: { photo_url: string }) => ph.photo_url),
      };
    })
  );

  return {
    id: orderData.id,
    orderNumber: orderData.order_number,
    description: orderData.description,
    serviceType: orderData.service_type,
    quantity: orderData.quantity,
    status: orderData.status as OrderStatus,
    total: orderData.total,
    totalPaid: orderData.total_paid || 0,
    remainingBalance: orderData.remaining_balance || 0,
    dueDate: formatDate(orderData.due_date),
    createdAt: formatDate(orderData.created_at),
    isUrgent: orderData.is_urgent || false,
    isDelayed: orderData.is_delayed || false,
    daysRemaining: orderData.days_remaining || 0,
    statusHistory,
    payments,
  };
}

/**
 * Get client profile only (for profile page)
 */
export async function getClientProfile(): Promise<ClientProfile | null> {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Get client record for this user
  const client = await getClientForUser(supabase, user.id);

  if (!client) {
    return null;
  }

  return {
    id: client.id,
    name: client.name,
    initials: getInitials(client.name),
    email: client.email,
    phone: client.phone,
    cedula: client.cedula,
    address: client.address,
  };
}
