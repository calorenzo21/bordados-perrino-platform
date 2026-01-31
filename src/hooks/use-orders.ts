'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
    .map(n => n[0])
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
      const { data: { session } } = await supabase.auth.getSession();
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

      const transformedOrders: Order[] = (data || []).map(o => ({
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
interface OrderForDetail {
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

export function useOrder(orderId: string) {
  const [order, setOrder] = useState<OrderForDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchOrder = useCallback(async () => {
    if (!orderId || !isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchOrder();
          }, 500);
        }
        return;
      }

      // Buscar por order_number o por id
      let query = supabase
        .from('orders_with_payments')
        .select('*');

      if (orderId.startsWith('ORD-')) {
        query = query.eq('order_number', orderId);
      } else {
        query = query.eq('id', orderId);
      }

      const { data: orderData, error: orderError } = await query.single();

      if (orderError) throw orderError;

      hasFetched.current = true;

      // Obtener pagos con el nombre del usuario que los registró
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          payment_photos (photo_url),
          profiles:received_by (first_name, last_name)
        `)
        .eq('order_id', orderData.id)
        .order('payment_date', { ascending: false });

      // Obtener historial de estados con el nombre del usuario
      const { data: historyData } = await supabase
        .from('order_status_history')
        .select(`
          *,
          order_status_photos (photo_url),
          profiles:changed_by (first_name, last_name)
        `)
        .eq('order_id', orderData.id)
        .order('changed_at', { ascending: true });

      // Transformar pagos al formato esperado
      const payments = (paymentsData || []).map(p => {
        const dateTime = p.payment_date?.split('T') || ['', ''];
        // Obtener el nombre del usuario desde el perfil
        const profile = p.profiles as { first_name?: string; last_name?: string } | null;
        const userName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
          : 'Admin';
        return {
          id: p.id,
          amount: p.amount,
          date: dateTime[0] || '',
          time: dateTime[1]?.slice(0, 8) || '00:00:00',
          method: (p.method?.toLowerCase() || 'efectivo') as 'efectivo' | 'transferencia' | 'tarjeta' | 'otro',
          notes: p.notes || '',
          photos: p.payment_photos?.map((ph: { photo_url: string }) => ph.photo_url) || [],
          user: userName,
        };
      });

      // Transformar historial de estados al formato esperado
      const statusHistory = (historyData || []).map(h => {
        const dateTime = h.changed_at?.split('T') || ['', ''];
        // Obtener el nombre del usuario desde el perfil
        const profile = h.profiles as { first_name?: string; last_name?: string } | null;
        const userName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
          : 'Admin';
        return {
          id: h.id,
          status: h.status,
          date: dateTime[0] || '',
          time: dateTime[1]?.slice(0, 8) || '00:00:00',
          observations: h.observations || '',
          photos: h.order_status_photos?.map((ph: { photo_url: string }) => ph.photo_url) || [],
          user: userName,
        };
      });

      if (isMounted.current) {
        setOrder({
          id: orderData.order_number || orderData.id,
          uuid: orderData.id, // UUID real para operaciones con Supabase
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
        });
      }

    } catch (err) {
      console.error('Error fetching order:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar pedido');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [orderId, supabase]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    fetchOrder();

    return () => {
      isMounted.current = false;
    };
  }, [fetchOrder]);

  return { order, setOrder, isLoading, error, refetch: fetchOrder };
}
