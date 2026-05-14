import { type NextRequest } from 'next/server';

import { env } from '@/config/env';
import { type SupabaseClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

import { Errors } from '@/lib/utils/errors';

const E164_REGEX = /^\+\d{10,15}$/;

/**
 * Constant-time string compare. Returns false immediately if lengths differ
 * (length is not considered secret here — AGENT_API_KEY length is fixed config).
 */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates `Authorization: Bearer <AGENT_API_KEY>`. Throws AppError(401)
 * on missing header, wrong scheme, or token mismatch. Intentionally vague
 * error message — never reveal whether the header was absent vs wrong.
 */
export function verifyAgentBearer(req: NextRequest): void {
  const header = req.headers.get('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw Errors.unauthorized('Missing or invalid Authorization header');
  }
  const token = header.slice('bearer '.length).trim();
  if (!constantTimeEquals(token, env.AGENT_API_KEY)) {
    throw Errors.unauthorized('Invalid agent credentials');
  }
}

/**
 * Extracts and validates the `X-Agent-Phone` header. Throws AppError(400)
 * if absent or malformed. Returns the E.164-formatted phone string.
 */
export function getXAgentPhone(req: NextRequest): string {
  const raw = req.headers.get('x-agent-phone');
  if (!raw) {
    throw Errors.badRequest('Missing X-Agent-Phone header');
  }
  const trimmed = raw.trim();
  if (!E164_REGEX.test(trimmed)) {
    throw Errors.badRequest('Invalid X-Agent-Phone format (expected E.164: +<10-15 digits>)');
  }
  return trimmed;
}

/**
 * Anti-enumeration phone↔client_id binding check.
 *
 * Returns silently if the phone owns the client_id.
 * Throws AppError(404) — NOT 403 — when the binding fails. A 403 would
 * confirm resource existence to an attacker (T-I-05). We deliberately
 * shadow "found but wrong owner" behind the same response as "not found".
 *
 * Failures are logged at WARN as `security.cross_tenant_attempt` so admins
 * can spot a phone systematically probing for foreign client_ids.
 */
export async function verifyPhoneClientBinding(
  phone: string,
  clientId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .eq('id', clientId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[agent/_auth] verifyPhoneClientBinding query error', error);
    throw Errors.internal('Failed to verify client binding');
  }

  if (!data) {
    // Log without leaking phone in the message body; structured fields stay
    // in the JSON so log aggregators can correlate without grepping prose.
    console.warn('[security.cross_tenant_attempt]', {
      event: 'cross_tenant_attempt',
      phone_hash: hashForLog(phone),
      client_id: clientId,
    });
    throw Errors.notFound('Resource');
  }
}

/**
 * Truncated, salted hash for log correlation. Not cryptographically strong —
 * just enough to spot patterns without writing raw phone numbers to logs.
 */
function hashForLog(value: string): string {
  // 8-char hex prefix of base64(value). Reversible only if you already
  // know the value; not useful for an attacker reading logs.
  return Buffer.from(value, 'utf8').toString('base64').slice(0, 12);
}
