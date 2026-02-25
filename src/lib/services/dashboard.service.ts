/**
 * Dashboard Service
 *
 * Business logic for dashboard metrics and statistics.
 */
import { SupabaseClient } from '@supabase/supabase-js';

import { ClientsRepository } from '@/lib/repositories/clients.repository';
import { ExpensesRepository } from '@/lib/repositories/expenses.repository';
import { OrdersRepository } from '@/lib/repositories/orders.repository';
import type {
  DashboardMetrics,
  OrdersByMonth,
  OrdersByService,
  OrdersByStatus,
} from '@/lib/types/database';

export class DashboardService {
  private ordersRepo: OrdersRepository;
  private expensesRepo: ExpensesRepository;
  private clientsRepo: ClientsRepository;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.ordersRepo = new OrdersRepository(supabase);
    this.expensesRepo = new ExpensesRepository(supabase);
    this.clientsRepo = new ClientsRepository(supabase);
  }

  /**
   * Get monthly revenue from payments
   */
  private async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data, error } = await this.supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfMonth.toISOString())
      .lte('payment_date', endOfMonth.toISOString());

    if (error) throw new Error(error.message);
    return data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  }

  /**
   * Get monthly expenses total
   */
  private async getMonthlyExpenses(year: number, month: number): Promise<number> {
    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) throw new Error(error.message);
    return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  }

  /**
   * Get all dashboard metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Mes anterior
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [
      activeOrders,
      completedOrders,
      monthlyRevenue,
      prevMonthlyRevenue,
      monthlyExpenses,
      prevMonthlyExpenses,
      totalClients,
      pendingToCollect,
    ] = await Promise.all([
      this.ordersRepo.countActive(),
      this.ordersRepo.countCompleted(),
      this.getMonthlyRevenue(currentYear, currentMonth),
      this.getMonthlyRevenue(prevYear, prevMonth),
      this.getMonthlyExpenses(currentYear, currentMonth),
      this.getMonthlyExpenses(prevYear, prevMonth),
      this.clientsRepo.count(),
      this.ordersRepo.getTotalPendingToCollect(),
    ]);

    return {
      activeOrders,
      activeOrdersChange: 0, // No se calcula por ahora
      monthlyRevenue,
      prevMonthlyRevenue,
      monthlyRevenueChange: 0, // No se calcula por ahora
      monthlyExpenses,
      prevMonthlyExpenses,
      monthlyExpensesChange: 0, // No se calcula por ahora
      totalClients,
      totalClientsChange: 0, // No se calcula por ahora
      pendingToCollect,
      completedOrders,
      completedOrdersChange: 0, // No se calcula por ahora
    };
  }

  /**
   * Get orders by month for charts
   */
  async getOrdersByMonth(months: number = 12): Promise<OrdersByMonth[]> {
    return this.ordersRepo.getOrdersByMonth(months);
  }

  /**
   * Get orders distribution by status
   */
  async getOrdersByStatus(): Promise<OrdersByStatus[]> {
    return this.ordersRepo.countByStatus();
  }

  /**
   * Get orders distribution by service type
   */
  async getOrdersByService(): Promise<OrdersByService[]> {
    return this.ordersRepo.getOrdersByService();
  }

  /**
   * Get recent orders for dashboard
   */
  async getRecentOrders(limit: number = 5) {
    return this.ordersRepo.findRecentByDate(limit);
  }

  /**
   * Get urgent/priority orders
   */
  async getUrgentOrders() {
    const orders = await this.ordersRepo.findActive();
    return orders.filter((o) => o.is_urgent || o.is_delayed);
  }
}
