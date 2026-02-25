/**
 * Dashboard Server Service
 *
 * Server-side data fetching for the dashboard.
 * Uses the server Supabase client for SSR.
 *
 * Note: Page-level caching via `revalidate` handles query optimization.
 * unstable_cache cannot be used here because createClient() uses cookies().
 * React.cache() deduplicates within the same request.
 */
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type {
  DashboardMetrics,
  OrderWithPayments,
  OrdersByMonth,
  OrdersByService,
  OrdersByStatus,
  ServiceType as _ServiceType,
} from '@/lib/types/database';

import { DashboardService } from './dashboard.service';

export interface RecentExpense {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
}

export interface TopClient {
  id: string;
  name: string;
  initials: string;
  orders: number;
  revenue: number;
}

export interface DashboardData {
  metrics: DashboardMetrics | null;
  ordersByMonth: OrdersByMonth[];
  ordersByStatus: OrdersByStatus[];
  ordersByService: OrdersByService[];
  recentOrders: OrderWithPayments[];
  recentExpenses: RecentExpense[];
  topClients: TopClient[];
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
 * Fetch all dashboard data on the server
 * This is called from Server Components
 *
 * Caching is handled at the page level via `revalidate = 60`
 * React.cache() deduplicates calls within the same request
 */
export const getDashboardData = cache(async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const service = new DashboardService(supabase);

  // Fetch all data in parallel
  const [
    metricsData,
    monthlyData,
    statusData,
    serviceData,
    recentOrdersData,
    expensesResult,
    clientsResult,
  ] = await Promise.all([
    service.getMetrics().catch(() => null),
    service.getOrdersByMonth(12).catch(() => []),
    service.getOrdersByStatus().catch(() => []),
    service.getOrdersByService().catch(() => []),
    service.getRecentOrders(5).catch(() => []),
    supabase
      .from('expenses')
      .select(
        `
        id,
        description,
        amount,
        date,
        expense_types (name)
      `
      )
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('clients_with_stats')
      .select('id, name, total_orders, total_spent')
      .order('total_spent', { ascending: false })
      .limit(4),
  ]);

  // Transform expenses
  const recentExpenses: RecentExpense[] = (expensesResult.data || []).map((e) => ({
    id: e.id,
    type: (e.expense_types as { name?: string } | null)?.name || 'Sin tipo',
    amount: e.amount,
    date: e.date,
    description: e.description,
  }));

  // Transform top clients
  const topClients: TopClient[] = (clientsResult.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    initials: getInitials(c.name),
    orders: c.total_orders || 0,
    revenue: c.total_spent || 0,
  }));

  return {
    metrics: metricsData,
    ordersByMonth: monthlyData,
    ordersByStatus: statusData,
    ordersByService: serviceData,
    recentOrders: recentOrdersData,
    recentExpenses,
    topClients,
    lastUpdated: new Date().toISOString(),
  };
});
