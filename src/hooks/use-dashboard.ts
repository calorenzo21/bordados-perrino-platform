'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

import { createClient } from '@/lib/supabase/browser';
import { DashboardService } from '@/lib/services/dashboard.service';
import type {
  DashboardMetrics,
  OrdersByMonth,
  OrdersByStatus,
  OrdersByService,
  OrderWithPayments,
} from '@/lib/types/database';

interface RecentExpense {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
}

interface TopClient {
  id: string;
  name: string;
  initials: string;
  orders: number;
  revenue: number;
}

interface DashboardData {
  metrics: DashboardMetrics | null;
  ordersByMonth: OrdersByMonth[];
  ordersByStatus: OrdersByStatus[];
  ordersByService: OrdersByService[];
  recentOrders: OrderWithPayments[];
  recentExpenses: RecentExpense[];
  topClients: TopClient[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useDashboard(): DashboardData {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [ordersByMonth, setOrdersByMonth] = useState<OrdersByMonth[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([]);
  const [ordersByService, setOrdersByService] = useState<OrdersByService[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderWithPayments[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Crear cliente una sola vez
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Verificar que hay sesión antes de hacer las queries
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchData();
          }, 500);
        }
        return;
      }

      const service = new DashboardService(supabase);

      const [
        metricsData,
        monthlyData,
        statusData,
        serviceData,
        recentData,
      ] = await Promise.all([
        service.getMetrics(),
        service.getOrdersByMonth(12),
        service.getOrdersByStatus(),
        service.getOrdersByService(),
        service.getRecentOrders(5),
      ]);

      hasFetched.current = true;

      if (!isMounted.current) return;

      setMetrics(metricsData);
      setOrdersByMonth(monthlyData);
      setOrdersByStatus(statusData);
      setOrdersByService(serviceData);
      setRecentOrders(recentData);

      // Fetch recent expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select(`
          id,
          description,
          amount,
          date,
          expense_types (name)
        `)
        .order('date', { ascending: false })
        .limit(5);

      if (isMounted.current) {
        setRecentExpenses((expensesData || []).map(e => ({
          id: e.id,
          type: (e.expense_types as { name?: string } | null)?.name || 'Sin tipo',
          amount: e.amount,
          date: e.date,
          description: e.description,
        })));
      }

      // Fetch top clients
      const { data: clientsData } = await supabase
        .from('clients_with_stats')
        .select('id, name, total_orders, total_spent')
        .order('total_spent', { ascending: false })
        .limit(4);

      if (isMounted.current) {
        setTopClients((clientsData || []).map(c => ({
          id: c.id,
          name: c.name,
          initials: getInitials(c.name),
          orders: c.total_orders || 0,
          revenue: c.total_spent || 0,
        })));
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
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
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return {
    metrics,
    ordersByMonth,
    ordersByStatus,
    ordersByService,
    recentOrders,
    recentExpenses,
    topClients,
    isLoading,
    error,
    refresh: fetchData,
  };
}
