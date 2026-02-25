'use server';

/**
 * Server Actions for Cache Revalidation
 *
 * These actions can be called from client components after mutations
 * to invalidate the server-side cache and show fresh data.
 *
 * Note: We use revalidatePath to invalidate ISR cached pages.
 * When data changes, calling these functions will trigger a fresh
 * server render on the next request.
 */
import { revalidatePath } from 'next/cache';

/**
 * Revalidate after order mutations (create, update, delete)
 */
export async function revalidateOrders() {
  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
}

/**
 * Revalidate a specific order page
 */
export async function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  revalidatePath('/admin/dashboard');
  revalidatePath('/client/panel');
  revalidatePath(`/client/orders/${orderId}`);
}

/**
 * Revalidate after client mutations (create, update, delete)
 */
export async function revalidateClients() {
  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');
}

/**
 * Revalidate a specific client page
 */
export async function revalidateClient(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath('/admin/clients');
  revalidatePath('/admin/dashboard');
}

/**
 * Revalidate after expense mutations (create, update, delete)
 */
export async function revalidateExpenses() {
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/dashboard');
}

/**
 * Revalidate after expense type mutations
 */
export async function revalidateExpenseTypes() {
  revalidatePath('/admin/expenses');
}

/**
 * Revalidate after service type mutations
 */
export async function revalidateServiceTypes() {
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');
}

/**
 * Revalidate dashboard data
 */
export async function revalidateDashboard() {
  revalidatePath('/admin/dashboard');
}

/**
 * Revalidate all admin pages
 * Use sparingly - only when making large changes
 */
export async function revalidateAll() {
  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/clients');
  revalidatePath('/admin/expenses');
}
