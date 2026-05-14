import { env } from '@/config/env';
import { createHmac, randomUUID } from 'node:crypto';

import { type OrderStatusChangedWebhook, OrderStatusChangedWebhookSchema } from '@/lib/types/agent';

/**
 * Path on the agent that receives status-change webhooks. Hardcoded — it is
 * part of the wire contract, not config.
 */
const WEBHOOK_PATH = '/v1/webhooks/platform/order-status-changed';

/**
 * Default request timeout (ms). The agent should ack with 202 in well under
 * a second; anything longer suggests the agent is unhealthy and we should
 * not block the platform request that triggered us.
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Push a signed `order_status_changed` webhook to bordados-perrino-agent.
 *
 * The signing string format matches what the agent verifies:
 *   HMAC-SHA256(AGENT_WEBHOOK_SECRET, `${unix_seconds}.${raw_body}`)
 *
 * Fire-and-forget. Network errors and non-2xx responses are logged but
 * NEVER thrown — a transient agent outage must not roll back the order
 * status change that triggered us.
 */
export async function dispatchAgentWebhook(
  payload: OrderStatusChangedWebhook,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  let parsed: OrderStatusChangedWebhook;
  try {
    parsed = OrderStatusChangedWebhookSchema.parse(payload);
  } catch (err) {
    console.error('[agent-webhook] refused to dispatch: payload failed validation', err);
    return;
  }

  const body = JSON.stringify(parsed);
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const signature = createHmac('sha256', env.AGENT_WEBHOOK_SECRET)
    .update(`${ts}.${body}`)
    .digest('hex');

  const url = new URL(WEBHOOK_PATH, env.AGENT_WEBHOOK_URL).toString();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Agent-Signature': signature,
        'X-Agent-Timestamp': ts,
        'X-Agent-Nonce': nonce,
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      console.warn('[agent-webhook] non-2xx from agent', {
        status: res.status,
        order_id: parsed.order_id,
        nonce,
        body_excerpt: text.slice(0, 200),
      });
    }
  } catch (err) {
    console.warn('[agent-webhook] dispatch failed', {
      order_id: parsed.order_id,
      nonce,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
