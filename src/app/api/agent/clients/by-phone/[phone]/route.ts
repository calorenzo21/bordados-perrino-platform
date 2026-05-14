import { type NextRequest, NextResponse } from 'next/server';

import { findClientByPhone } from '@/lib/services/agent.service';
import { createAdminClient } from '@/lib/supabase/server';
import { Errors, errorResponse, handleApiError, successResponse } from '@/lib/utils/errors';

import { verifyAgentBearer } from '@/app/api/agent/_auth';

const E164_REGEX = /^\+\d{10,15}$/;

/**
 * EP-1 — GET /api/agent/clients/by-phone/{phone}
 *
 * Resolves a phone number to a ClientDTO. No X-Agent-Phone header here —
 * the phone is the lookup key itself, and the agent calls this first to
 * discover whose client_id corresponds to an inbound WhatsApp number.
 *
 * 404 covers BOTH "not found" and "not active" (T-I-05 anti-enumeration).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ phone: string }> }
): Promise<NextResponse> {
  try {
    verifyAgentBearer(req);

    const { phone } = await context.params;
    // Next.js decodes path params for us; we still validate format.
    if (!E164_REGEX.test(phone)) {
      throw Errors.badRequest('Invalid phone format (expected E.164: +<10-15 digits>)');
    }

    const supabase = await createAdminClient();
    const client = await findClientByPhone(supabase, phone);
    if (!client) {
      return errorResponse('NOT_FOUND', 'Client not found', 404);
    }

    const res = successResponse(client);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
