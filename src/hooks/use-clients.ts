'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Crear cliente una sola vez
  const supabase = useMemo(() => createClient(), []);

  const fetchClients = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar que hay sesión antes de hacer la query
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchClients();
          }, 500);
        }
        return;
      }

      // Obtener clientes con estadísticas
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      hasFetched.current = true;

      // Obtener pedidos para cada cliente
      const clientsWithOrders = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('id, order_number, description, status, total, created_at')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(5);

          const orders: Order[] = (ordersData || []).map(o => ({
            id: o.order_number || o.id,
            description: o.description,
            status: o.status,
            total: o.total,
            date: o.created_at?.split('T')[0] || '',
          }));

          return {
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
            orders,
          };
        })
      );

      if (isMounted.current) {
        setClients(clientsWithOrders);
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
    hasFetched.current = false;
    fetchClients();

    return () => {
      isMounted.current = false;
    };
  }, [fetchClients]);

  return { clients, isLoading, error, refetch: fetchClients };
}

// Interfaz extendida para la página de detalle del cliente
interface ClientDetail {
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

export function useClient(clientId: string) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchClient = useCallback(async () => {
    if (!clientId || !isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchClient();
          }, 500);
        }
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from('clients_with_stats')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      hasFetched.current = true;

      // Obtener pedidos del cliente con información extendida
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, description, service_type, status, total, quantity, created_at, due_date')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      const orders = (ordersData || []).map(o => ({
        id: o.order_number || o.id,
        description: o.description,
        serviceType: o.service_type,
        status: o.status,
        total: o.total,
        quantity: o.quantity,
        date: o.created_at?.split('T')[0] || '',
        dueDate: o.due_date || '',
      }));

      const completedOrders = orders.filter(o => o.status === 'ENTREGADO' || o.status === 'CANCELADO').length;
      const totalSpent = clientData.total_spent || 0;
      const averageOrderValue = clientData.total_orders > 0 ? Math.round(totalSpent / clientData.total_orders) : 0;

      if (isMounted.current) {
        setClient({
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
        });
      }
    } catch (err) {
      console.error('Error fetching client:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar cliente');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [clientId, supabase]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    fetchClient();

    return () => {
      isMounted.current = false;
    };
  }, [fetchClient]);

  return { client, isLoading, error, refetch: fetchClient };
}
