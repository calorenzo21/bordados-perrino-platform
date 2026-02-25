/**
 * Orders Repository
 *
 * Data access layer for orders and related tables.
 */
import { SupabaseClient } from '@supabase/supabase-js';

import type {
  Order,
  OrderFilters,
  OrderImage,
  OrderInsert,
  OrderStatus,
  OrderStatusHistory,
  OrderStatusHistoryInsert,
  OrderUpdate,
  OrderWithPayments,
  OrdersByMonth,
  OrdersByService,
  OrdersByStatus,
  PaginatedResponse,
  Payment,
  PaymentInsert,
  ServiceType,
} from '@/lib/types/database';

export class OrdersRepository {
  constructor(private supabase: SupabaseClient) {}

  // ============================================
  // ORDERS
  // ============================================

  /**
   * Get all orders with payment info
   */
  async findAll(): Promise<OrderWithPayments[]> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('*')
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get recent orders ordered strictly by date (most recent first)
   */
  async findRecentByDate(limit: number = 5): Promise<OrderWithPayments[]> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get orders with pagination and filters
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: OrderFilters
  ): Promise<PaginatedResponse<OrderWithPayments>> {
    let query = this.supabase.from('orders_with_payments').select('*', { count: 'exact' });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.isUrgent !== undefined) {
      query = query.eq('is_urgent', filters.isUrgent);
    }
    if (filters?.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`
      );
    }
    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('created_at', filters.toDate);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Get a single order by ID
   */
  async findById(id: string): Promise<OrderWithPayments | null> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Get orders by client ID
   */
  async findByClientId(clientId: string): Promise<OrderWithPayments[]> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get active orders (not completed or cancelled)
   */
  async findActive(): Promise<OrderWithPayments[]> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('*')
      .in('status', ['RECIBIDO', 'CONFECCION', 'RETIRO', 'PARCIALMENTE_ENTREGADO'])
      .order('is_urgent', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Create a new order
   */
  async create(order: OrderInsert): Promise<Order> {
    const { data, error } = await this.supabase.from('orders').insert(order).select().single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Update an order
   */
  async update(id: string, updates: OrderUpdate): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Update order status
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.update(id, { status });
  }

  /**
   * Delete an order
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('orders').delete().eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // ORDER STATUS HISTORY
  // ============================================

  /**
   * Get status history for an order
   */
  async getStatusHistory(orderId: string): Promise<(OrderStatusHistory & { photos: string[] })[]> {
    const { data, error } = await this.supabase
      .from('order_status_history')
      .select(
        `
        *,
        order_status_photos (photo_url)
      `
      )
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item) => ({
      ...item,
      photos: item.order_status_photos?.map((p: { photo_url: string }) => p.photo_url) || [],
    }));
  }

  /**
   * Add status history entry
   */
  async addStatusHistory(entry: OrderStatusHistoryInsert): Promise<OrderStatusHistory> {
    const { data, error } = await this.supabase
      .from('order_status_history')
      .insert(entry)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Add photos to status history
   */
  async addStatusPhotos(historyId: string, photoUrls: string[]): Promise<void> {
    const photos = photoUrls.map((url) => ({
      status_history_id: historyId,
      photo_url: url,
    }));

    const { error } = await this.supabase.from('order_status_photos').insert(photos);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // ORDER IMAGES
  // ============================================

  /**
   * Get images for an order
   */
  async getImages(orderId: string): Promise<OrderImage[]> {
    const { data, error } = await this.supabase
      .from('order_images')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Add images to an order
   */
  async addImages(orderId: string, imageUrls: string[]): Promise<void> {
    const images = imageUrls.map((url) => ({
      order_id: orderId,
      image_url: url,
    }));

    const { error } = await this.supabase.from('order_images').insert(images);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // PAYMENTS
  // ============================================

  /**
   * Get payments for an order
   */
  async getPayments(orderId: string): Promise<(Payment & { photos: string[] })[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select(
        `
        *,
        payment_photos (photo_url)
      `
      )
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((item) => ({
      ...item,
      photos: item.payment_photos?.map((p: { photo_url: string }) => p.photo_url) || [],
    }));
  }

  /**
   * Add a payment
   */
  async addPayment(payment: PaymentInsert): Promise<Payment> {
    const { data, error } = await this.supabase.from('payments').insert(payment).select().single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Add photos to a payment
   */
  async addPaymentPhotos(paymentId: string, photoUrls: string[]): Promise<void> {
    const photos = photoUrls.map((url) => ({
      payment_id: paymentId,
      photo_url: url,
    }));

    const { error } = await this.supabase.from('payment_photos').insert(photos);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // STATISTICS / DASHBOARD
  // ============================================

  /**
   * Count orders by status
   */
  async countByStatus(): Promise<OrdersByStatus[]> {
    const { data, error } = await this.supabase.from('orders').select('status');

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    data?.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      status: status as OrderStatus,
      count,
    }));
  }

  /**
   * Get orders grouped by month
   */
  async getOrdersByMonth(months: number = 12): Promise<OrdersByMonth[]> {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months + 1);
    fromDate.setDate(1);

    const { data, error } = await this.supabase
      .from('orders')
      .select('created_at, total')
      .gte('created_at', fromDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    // Group by month
    const monthlyData: Record<string, { count: number; revenue: number }> = {};

    data?.forEach((order) => {
      const date = new Date(order.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[key]) {
        monthlyData[key] = { count: 0, revenue: 0 };
      }
      monthlyData[key].count++;
      monthlyData[key].revenue += order.total;
    });

    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const monthNamesFull = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return Object.entries(monthlyData).map(([key, value]) => {
      const [year, month] = key.split('-');
      const monthIndex = parseInt(month) - 1;
      return {
        month: monthNames[monthIndex],
        monthFull: `${monthNamesFull[monthIndex]} ${year}`,
        count: value.count,
        revenue: value.revenue,
      };
    });
  }

  /**
   * Get orders grouped by service type
   */
  async getOrdersByService(): Promise<OrdersByService[]> {
    // Obtener todos los tipos de servicio con sus estadísticas
    const { data: serviceTypes, error: stError } = await this.supabase
      .from('service_types')
      .select('id, name, color, icon')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (stError) throw new Error(stError.message);

    // Obtener pedidos agrupados por service_type (campo de texto existente)
    const { data: orders, error } = await this.supabase
      .from('orders')
      .select('service_type, total');

    if (error) throw new Error(error.message);

    // Agrupar por nombre del servicio
    const serviceData: Record<string, { count: number; total: number }> = {};

    orders?.forEach((order) => {
      const serviceName = order.service_type;
      if (!serviceData[serviceName]) {
        serviceData[serviceName] = { count: 0, total: 0 };
      }
      serviceData[serviceName].count++;
      serviceData[serviceName].total += order.total;
    });

    // Combinar con los tipos de servicio para obtener colores e íconos
    return (serviceTypes || []).map((st) => ({
      serviceType: st.name as ServiceType,
      count: serviceData[st.name]?.count || 0,
      total: serviceData[st.name]?.total || 0,
      color: st.color,
      icon: st.icon,
    })); // Mostrar todos los servicios, incluso con 0 pedidos
  }

  /**
   * Count active orders
   */
  async countActive(): Promise<number> {
    const { count, error } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['RECIBIDO', 'CONFECCION', 'RETIRO', 'PARCIALMENTE_ENTREGADO']);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  /**
   * Count completed orders
   */
  async countCompleted(): Promise<number> {
    const { count, error } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ENTREGADO');

    if (error) throw new Error(error.message);
    return count || 0;
  }

  /**
   * Sum of remaining balance across all orders (pending to collect).
   */
  async getTotalPendingToCollect(): Promise<number> {
    const { data, error } = await this.supabase
      .from('orders_with_payments')
      .select('remaining_balance');

    if (error) throw new Error(error.message);
    return (data || []).reduce((sum, row) => sum + (Number(row.remaining_balance) || 0), 0);
  }

  /**
   * Get monthly revenue (from payments)
   */
  async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfMonth.toISOString());

    if (error) throw new Error(error.message);

    return data?.reduce((sum, p) => sum + p.amount, 0) || 0;
  }
}
