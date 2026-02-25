/**
 * Dashboard Data Fetching
 *
 * Server-side data fetching for the dashboard.
 * Falls back to mock data if database is not available.
 */
import { DashboardService } from '@/lib/services/dashboard.service';
import { createClient } from '@/lib/supabase/server';
import type {
  DashboardMetrics,
  OrderWithPayments,
  OrdersByMonth,
  OrdersByService,
  OrdersByStatus,
} from '@/lib/types/database';

// Mock data for fallback
const mockMetrics: DashboardMetrics = {
  activeOrders: 27,
  activeOrdersChange: 12,
  monthlyRevenue: 284500,
  monthlyRevenueChange: 8.2,
  monthlyExpenses: 309500,
  monthlyExpensesChange: -3.4,
  totalClients: 20,
  totalClientsChange: 5,
  pendingToCollect: 0,
  completedOrders: 156,
  completedOrdersChange: 15,
};

const mockOrdersByMonth: OrdersByMonth[] = [
  { month: 'Feb', monthFull: 'Febrero 2025', count: 42, revenue: 126000 },
  { month: 'Mar', monthFull: 'Marzo 2025', count: 48, revenue: 144000 },
  { month: 'Abr', monthFull: 'Abril 2025', count: 35, revenue: 105000 },
  { month: 'May', monthFull: 'Mayo 2025', count: 52, revenue: 156000 },
  { month: 'Jun', monthFull: 'Junio 2025', count: 45, revenue: 135000 },
  { month: 'Jul', monthFull: 'Julio 2025', count: 58, revenue: 174000 },
  { month: 'Ago', monthFull: 'Agosto 2025', count: 63, revenue: 189000 },
  { month: 'Sep', monthFull: 'Septiembre 2025', count: 55, revenue: 165000 },
  { month: 'Oct', monthFull: 'Octubre 2025', count: 72, revenue: 216000 },
  { month: 'Nov', monthFull: 'Noviembre 2025', count: 68, revenue: 204000 },
  { month: 'Dic', monthFull: 'Diciembre 2025', count: 85, revenue: 255000 },
  { month: 'Ene', monthFull: 'Enero 2026', count: 32, revenue: 96000 },
];

export interface DashboardData {
  metrics: DashboardMetrics;
  ordersByMonth: OrdersByMonth[];
  ordersByStatus: OrdersByStatus[];
  ordersByService: OrdersByService[];
  recentOrders: OrderWithPayments[];
  isUsingMockData: boolean;
}

/**
 * Fetch dashboard data from database or return mock data
 */
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const service = new DashboardService(supabase);

    const [metrics, ordersByMonth, ordersByStatus, ordersByService, recentOrders] =
      await Promise.all([
        service.getMetrics(),
        service.getOrdersByMonth(12),
        service.getOrdersByStatus(),
        service.getOrdersByService(),
        service.getRecentOrders(5),
      ]);

    return {
      metrics,
      ordersByMonth: ordersByMonth.length > 0 ? ordersByMonth : mockOrdersByMonth,
      ordersByStatus,
      ordersByService,
      recentOrders,
      isUsingMockData: false,
    };
  } catch (error) {
    console.error('Error fetching dashboard data, using mock data:', error);

    // Return mock data if database is not available
    return {
      metrics: mockMetrics,
      ordersByMonth: mockOrdersByMonth,
      ordersByStatus: [
        { status: 'RECIBIDO', count: 8 },
        { status: 'CONFECCION', count: 12 },
        { status: 'RETIRO', count: 4 },
        { status: 'PARCIALMENTE_ENTREGADO', count: 3 },
        { status: 'ENTREGADO', count: 156 },
        { status: 'CANCELADO', count: 3 },
      ],
      ordersByService: [
        { serviceType: 'Bordados', count: 45, total: 135000 },
        { serviceType: 'DTF', count: 32, total: 96000 },
        { serviceType: 'Sublimación', count: 28, total: 84000 },
        { serviceType: 'Impresión', count: 15, total: 45000 },
      ],
      recentOrders: [],
      isUsingMockData: true,
    };
  }
}
