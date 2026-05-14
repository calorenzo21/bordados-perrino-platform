/**
 * Service layer for the /api/agent/* namespace.
 *
 * Every method assumes the caller has already passed _auth checks
 * (Bearer + phone↔client binding). The service is the only place that
 * talks to Supabase for the agent; route handlers stay thin.
 *
 * Field projection is explicit and minimal — never `select('*')`. Internal
 * fields (cost, margin, internal_notes, order_number, etc.) must never
 * leak to the agent. This is enforced twice: (a) here in the SELECT and
 * (b) on the agent side via Pydantic `extra="forbid"`.
 */
import { type SupabaseClient } from '@supabase/supabase-js';

import {
  type ClientDTO,
  type HandoffRequest,
  type ListOrdersQuery,
  type OrderAgentDTO,
  type PaymentSummaryDTO,
  toCents,
} from '@/lib/types/agent';
import { type OrderStatusType } from '@/lib/utils/status';

// Statuses that count as "active" — i.e. anything the customer might
// reasonably ask about. ENTREGADO and CANCELADO are excluded.
const ACTIVE_STATUSES: OrderStatusType[] = [
  'RECIBIDO',
  'CONFECCION',
  'RETIRO',
  'PARCIALMENTE_ENTREGADO',
];

// ============================================================
// Internal row shapes — what we SELECT from each table. Kept private
// so callers can only see the DTOs.
// ============================================================

interface ClientRow {
  id: string;
  name: string;
  phone: string;
}

interface OrderRow {
  id: string;
  client_id: string;
  status: OrderStatusType;
  description: string;
  service_type: string | null;
  total: number;
  due_date: string | null;
  created_at: string;
  order_status_history: { changed_at: string }[] | null;
}

interface PaymentRow {
  amount: number;
  payment_date: string;
}

// ============================================================
// Helpers
// ============================================================

function splitName(fullName: string): { first_name: string; last_name: string | null } {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return {
    first_name: first ?? '',
    last_name: rest.length > 0 ? rest.join(' ') : null,
  };
}

function toIsoUtc(value: string | null | undefined): string | null {
  if (!value) return null;
  // Supabase returns dates as ISO strings already; normalising via Date
  // gives us a stable Z-suffixed UTC representation regardless of TZ.
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function lastStatusChange(history: OrderRow['order_status_history']): string | null {
  if (!history || history.length === 0) return null;
  let max = history[0].changed_at;
  for (const row of history) {
    if (row.changed_at > max) max = row.changed_at;
  }
  return toIsoUtc(max);
}

function projectOrder(row: OrderRow): OrderAgentDTO {
  return {
    id: row.id,
    client_id: row.client_id,
    status: row.status,
    description: row.description,
    service_type: row.service_type,
    total_amount_cents: toCents(row.total),
    currency: 'MXN',
    created_at: toIsoUtc(row.created_at) ?? new Date(row.created_at).toISOString(),
    estimated_ready_at: toIsoUtc(row.due_date),
    last_status_change_at: lastStatusChange(row.order_status_history),
  };
}

// ============================================================
// EP-1
// ============================================================

export async function findClientByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<ClientDTO | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone')
    .eq('phone', phone)
    .eq('is_active', true)
    .maybeSingle<ClientRow>();

  if (error) throw error;
  if (!data) return null;

  const { first_name, last_name } = splitName(data.name);
  return {
    id: data.id,
    phone: data.phone,
    first_name,
    last_name,
  };
}

// ============================================================
// EP-2
// ============================================================

export async function listOrdersForClient(
  supabase: SupabaseClient,
  clientId: string,
  query: ListOrdersQuery
): Promise<OrderAgentDTO[]> {
  let builder = supabase
    .from('orders')
    .select(
      'id, client_id, status, description, service_type, total, due_date, created_at, order_status_history(changed_at)'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(query.limit);

  if (query.include === 'active') {
    builder = builder.in('status', ACTIVE_STATUSES);
  }

  const { data, error } = await builder.returns<OrderRow[]>();
  if (error) throw error;

  return (data ?? []).map(projectOrder);
}

// ============================================================
// EP-3
// ============================================================

export async function getOrder(
  supabase: SupabaseClient,
  orderId: string,
  clientId: string
): Promise<OrderAgentDTO | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, client_id, status, description, service_type, total, due_date, created_at, order_status_history(changed_at)'
    )
    .eq('id', orderId)
    .eq('client_id', clientId)
    .maybeSingle<OrderRow>();

  if (error) throw error;
  if (!data) return null;
  return projectOrder(data);
}

// ============================================================
// EP-4
// ============================================================

export async function getOrderPaymentSummary(
  supabase: SupabaseClient,
  orderId: string,
  clientId: string
): Promise<PaymentSummaryDTO | null> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, total')
    .eq('id', orderId)
    .eq('client_id', clientId)
    .maybeSingle<{ id: string; total: number }>();

  if (orderErr) throw orderErr;
  if (!order) return null;

  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: false })
    .returns<PaymentRow[]>();

  if (payErr) throw payErr;

  const total_amount_cents = toCents(order.total);
  const amount_paid_cents = (payments ?? []).reduce((sum, p) => sum + toCents(p.amount), 0);
  const last_payment_at =
    payments && payments.length > 0 ? toIsoUtc(payments[0].payment_date) : null;

  return {
    order_id: order.id,
    total_amount_cents,
    amount_paid_cents,
    balance_due_cents: total_amount_cents - amount_paid_cents,
    currency: 'MXN',
    last_payment_at,
    payment_count: payments?.length ?? 0,
  };
}

// ============================================================
// EP-5
// ============================================================

export async function createHandoff(
  supabase: SupabaseClient,
  dto: HandoffRequest
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('conversations_needing_attention')
    .insert({
      client_id: dto.client_id,
      phone: dto.phone,
      summary: dto.summary,
      reason: dto.reason,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) throw error;
  return data;
}

// ============================================================
// Status-change context fetcher — used by the webhook dispatcher
// (task #8) to fill the customer_first_name + phone fields after
// an admin updates an order's status. Lives here because it's
// service-role read on the same tables.
// ============================================================

export interface StatusChangeContext {
  phone: string;
  client_id: string;
  customer_first_name: string;
}

export async function getStatusChangeContext(
  supabase: SupabaseClient,
  orderId: string
): Promise<StatusChangeContext | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('client_id, clients(name, phone, is_active)')
    .eq('id', orderId)
    .maybeSingle<{
      client_id: string;
      clients: { name: string; phone: string; is_active: boolean } | null;
    }>();

  if (error) throw error;
  if (!data || !data.clients || !data.clients.is_active) return null;

  const { first_name } = splitName(data.clients.name);
  return {
    phone: data.clients.phone,
    client_id: data.client_id,
    customer_first_name: first_name,
  };
}
