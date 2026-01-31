/**
 * Business Logic Services
 *
 * This folder contains all business logic and orchestration.
 * Each domain should have its own service file following the pattern: <domain>.service.ts
 *
 * Conventions:
 * - Services orchestrate business logic (validation, repo calls, side effects)
 * - Services can call multiple repositories
 * - Services handle side effects like sending emails, notifications
 * - API Routes should call services, not repositories directly
 *
 * Server Services (*.server.ts):
 * - Used in Server Components for SSR data fetching
 * - Import from '@/lib/supabase/server' for server-side Supabase client
 */

export { AuthService } from './auth.service';
export { DashboardService } from './dashboard.service';

// Server-side data fetching services (for Server Components)
export { getDashboardData } from './dashboard.server';
export type { DashboardData, RecentExpense, TopClient } from './dashboard.server';

export { getOrdersData } from './orders.server';
export type { OrdersData, Order, OrderClient } from './orders.server';

export { getClientsData } from './clients.server';
export type { ClientsData, Client, ClientOrder } from './clients.server';

export { getExpensesData } from './expenses.server';
export type { ExpensesData, Expense, ExpenseType } from './expenses.server';
