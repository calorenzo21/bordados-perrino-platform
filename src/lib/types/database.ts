/**
 * Database Types - Generated from Supabase schema
 *
 * These types represent the database schema and should be kept in sync
 * with the actual database structure.
 */

// ============================================
// ENUMS
// ============================================

export type OrderStatus =
  | 'RECIBIDO'
  | 'CONFECCION'
  | 'RETIRO'
  | 'PARCIALMENTE_ENTREGADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type ServiceType =
  | 'Llaveros'
  | 'DTF'
  | 'Impresión'
  | 'Impresión y Planchado'
  | 'Impresión, Planchado y Tela'
  | 'Sublimación'
  | 'Bordados';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export type UserRole = 'ADMIN' | 'CLIENT';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

// ============================================
// BASE TABLES
// ============================================

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string;
  cedula: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_type_id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  description: string;
  service_type: ServiceType;
  quantity: number;
  total: number;
  status: OrderStatus;
  is_urgent: boolean;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  observations: string | null;
  changed_by: string | null;
  changed_at: string;
  quantity_delivered?: number | null;
}

export interface OrderStatusPhoto {
  id: string;
  status_history_id: string;
  photo_url: string;
  created_at: string;
}

export interface OrderImage {
  id: string;
  order_id: string;
  image_url: string;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  notes: string | null;
  received_by: string | null;
  payment_date: string;
  created_at: string;
}

export interface PaymentPhoto {
  id: string;
  payment_id: string;
  photo_url: string;
  created_at: string;
}

// ============================================
// VIEW TYPES (Joined data)
// ============================================

export interface ClientWithStats extends Client {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_spent: number;
  last_order_date: string | null;
}

export interface OrderWithPayments extends Order {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_cedula: string | null;
  client_address: string | null;
  total_paid: number;
  remaining_balance: number;
  payment_status: PaymentStatus;
  is_delayed: boolean;
  days_remaining: number;
}

export interface ExpenseWithType extends Expense {
  type_name: string;
  type_color: string;
}

// ============================================
// INSERT/UPDATE TYPES
// ============================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>;

export type ExpenseTypeInsert = Omit<ExpenseType, 'id' | 'created_at'>;
export type ExpenseTypeUpdate = Partial<Omit<ExpenseType, 'id' | 'created_at'>>;

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
export type ExpenseUpdate = Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at'>>;

export type OrderInsert = Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>;
export type OrderUpdate = Partial<Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>>;

export type OrderStatusHistoryInsert = Omit<OrderStatusHistory, 'id' | 'changed_at'>;

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>;
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'created_at'>>;

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// FILTER TYPES
// ============================================

export interface OrderFilters {
  status?: OrderStatus;
  clientId?: string;
  isUrgent?: boolean;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ExpenseFilters {
  typeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ClientFilters {
  search?: string;
  hasActiveOrders?: boolean;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardMetrics {
  activeOrders: number;
  activeOrdersChange: number;
  monthlyRevenue: number;
  prevMonthlyRevenue?: number;
  monthlyRevenueChange: number;
  monthlyExpenses: number;
  prevMonthlyExpenses?: number;
  monthlyExpensesChange: number;
  totalClients: number;
  totalClientsChange: number;
  /** Suma del saldo pendiente de cobro en todos los pedidos (total - abonos) */
  pendingToCollect: number;
  completedOrders: number;
  completedOrdersChange: number;
}

export interface OrdersByMonth {
  month: string;
  monthFull: string;
  count: number;
  revenue: number;
}

export interface OrdersByStatus {
  status: OrderStatus;
  count: number;
}

export interface OrdersByService {
  serviceType: ServiceType;
  count: number;
  total: number;
  color?: string;
  icon?: string;
}
