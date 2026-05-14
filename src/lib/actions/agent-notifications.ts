'use server';

import { getStatusChangeContext } from '@/lib/services/agent.service';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { type UserRole } from '@/lib/types/database';
import { dispatchAgentWebhook } from '@/lib/utils/agent-webhook';
import { hasAdminAccess } from '@/lib/utils/roles';
import { type OrderStatusType } from '@/lib/utils/status';

/**
 * Server-side admin guard for actions invoked from client components.
 * Throws if the caller is not authenticated or not ADMIN/SUPERADMIN.
 * (Defence in depth — RLS already blocks the underlying mutation, but
 * exported `'use server'` functions are callable by any logged-in user.)
 */
async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: UserRole }>();

  if (!hasAdminAccess(profile?.role)) throw new Error('Forbidden');
}

/**
 * Push an HMAC-signed status-change webhook to bordados-perrino-agent so
 * the customer gets a WhatsApp notification when an admin moves an order
 * forward. Called from the admin order-detail flow right after the
 * orders.status update succeeds.
 *
 * Fire-and-forget by design — never block the admin UI, never roll back
 * the status change if the agent is unreachable. The dispatcher already
 * swallows all errors and logs them; this function adds the contextual
 * fetch (phone, first_name) that the webhook payload requires.
 */
export async function notifyAgentOfOrderStatusChange(
  orderId: string,
  oldStatus: OrderStatusType,
  newStatus: OrderStatusType
): Promise<void> {
  await requireAdmin();

  if (oldStatus === newStatus) return;

  const admin = await createAdminClient();
  const ctx = await getStatusChangeContext(admin, orderId);
  if (!ctx) {
    // Order missing or client soft-deleted — no one to notify.
    console.warn('[agent-notifications] no status-change context', { orderId });
    return;
  }

  await dispatchAgentWebhook({
    order_id: orderId,
    client_id: ctx.client_id,
    phone: ctx.phone,
    customer_first_name: ctx.customer_first_name,
    new_status: newStatus,
    old_status: oldStatus,
    changed_at: new Date().toISOString(),
  });
}
