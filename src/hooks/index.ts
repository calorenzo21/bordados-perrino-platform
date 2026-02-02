/**
 * Hooks Index
 *
 * Export all custom hooks from this file.
 *
 * Note: List hooks (useDashboard, useOrders, useExpenses) are deprecated for main list pages.
 * Main admin pages now use Server Components with ISR for data fetching.
 * Individual item hooks (useOrder, useClient) are still used for detail pages.
 * useClients is still used in the new order form for client selection.
 */

export { useAuth } from './use-auth';

// @deprecated - Dashboard now uses server-side data fetching
export { useDashboard } from './use-dashboard';

// useClients is still used in orders/new for client selection
// useClient is used in clients/[id] detail page
export { useClients, useClient } from './use-clients';

// @deprecated useOrders - Orders list now uses server-side data fetching
// useOrder is still used in orders/[id] detail page
export { useOrders, useOrder } from './use-orders';

// @deprecated useExpenses - Expenses list now uses server-side data fetching
export { useExpenses, useExpense } from './use-expenses';

export { useServiceTypes } from './use-service-types';
