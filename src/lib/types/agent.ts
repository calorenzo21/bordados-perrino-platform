/**
 * DTO schemas for the /api/agent/* namespace and outbound webhook to the
 * bordados-perrino-agent. These are the wire-format types — they MUST stay
 * in sync with the Pydantic models on the agent side
 * (`src/bordados_agent/infrastructure/platform/dtos.py`).
 *
 * Money is always in cents. Dates are ISO-8601 UTC. `OrderStatus` mirrors
 * `src/lib/utils/status.ts` and `domain/value_objects/order_status.py`.
 */
import { z } from 'zod';

const OrderStatusType = z.enum([
  'RECIBIDO',
  'CONFECCION',
  'RETIRO',
  'PARCIALMENTE_ENTREGADO',
  'ENTREGADO',
  'CANCELADO',
]);

const E164 = z.string().regex(/^\+\d{10,15}$/, 'phone must be E.164');

// ============================================================
// Response DTOs
// ============================================================

export const ClientDTOSchema = z.object({
  id: z.string().uuid(),
  phone: E164,
  first_name: z.string().min(1),
  last_name: z.string().nullable(),
});
export type ClientDTO = z.infer<typeof ClientDTOSchema>;

export const OrderAgentDTOSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  status: OrderStatusType,
  description: z.string(),
  service_type: z.string().nullable(),
  total_amount_cents: z.number().int().nonnegative(),
  currency: z.literal('USD'),
  created_at: z.string().datetime(),
  estimated_ready_at: z.string().datetime().nullable(),
  last_status_change_at: z.string().datetime().nullable(),
});
export type OrderAgentDTO = z.infer<typeof OrderAgentDTOSchema>;

export const PaymentSummaryDTOSchema = z.object({
  order_id: z.string().uuid(),
  total_amount_cents: z.number().int().nonnegative(),
  amount_paid_cents: z.number().int().nonnegative(),
  balance_due_cents: z.number().int(),
  currency: z.literal('USD'),
  last_payment_at: z.string().datetime().nullable(),
  payment_count: z.number().int().nonnegative(),
});
export type PaymentSummaryDTO = z.infer<typeof PaymentSummaryDTOSchema>;

// ============================================================
// Request DTOs
// ============================================================

export const HandoffRequestSchema = z.object({
  phone: E164,
  client_id: z.string().uuid(),
  summary: z.string().min(1).max(500),
  reason: z.enum(['complaint', 'cancel', 'modify', 'rtbf', 'explicit', 'out_of_scope']),
});
export type HandoffRequest = z.infer<typeof HandoffRequestSchema>;

export const ListOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(5),
  include: z.enum(['active', 'all']).default('active'),
});
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;

// ============================================================
// Outbound webhook payload
// ============================================================

export const OrderStatusChangedWebhookSchema = z.object({
  order_id: z.string().uuid(),
  client_id: z.string().uuid(),
  phone: E164,
  customer_first_name: z.string().min(1).max(100),
  new_status: OrderStatusType,
  old_status: OrderStatusType,
  changed_at: z.string().datetime(),
  // Customer-facing order code ("ORD-NNN") + description, shown in the WhatsApp
  // notification. The agent caps the description length on its side; we bound
  // it here too so the payload stays small.
  order_number: z.string().regex(/^ORD-\d+$/, 'order_number must be ORD-NNN'),
  order_description: z.string().max(2000),
});
export type OrderStatusChangedWebhook = z.infer<typeof OrderStatusChangedWebhookSchema>;

// ============================================================
// Internal helper — convert DECIMAL(12,2) money to integer cents.
// Math.round(total * 100) accumulates float error for values like 1499.99.
// Going through toFixed(2) anchors the value to 2 decimals first.
// ============================================================

export function toCents(amount: number | string): number {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return 0;
  return Math.round(parseFloat(n.toFixed(2)) * 100);
}
