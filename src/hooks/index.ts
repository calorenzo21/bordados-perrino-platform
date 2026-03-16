/**
 * Hooks Index
 *
 * Admin list pages use Server Components with ISR (dashboard.server.ts, orders.server.ts, etc.).
 * Detail pages use SWR hooks (useOrder, useClient).
 * useClients is used in the new order form for client selection.
 * Client portal uses useClientPanel and useClientOrder (SWR + API routes).
 */

export { useAuth } from './use-auth';

export { useClients, useClient } from './use-clients';

export { useOrder, adminOrderFetcher, getAdminOrderSwrKey } from './use-orders';

export { useServiceTypes } from './use-service-types';
