import { type NextRequest, NextResponse } from 'next/server';

import { createHandoff } from '@/lib/services/agent.service';
import { createAdminClient } from '@/lib/supabase/server';
import { HandoffRequestSchema } from '@/lib/types/agent';
import { Errors, handleApiError, successResponse } from '@/lib/utils/errors';

import { getXAgentPhone, verifyAgentBearer, verifyPhoneClientBinding } from '@/app/api/agent/_auth';

/**
 * EP-5 — POST /api/agent/handoff
 *
 * Records a human-handoff request from the agent. Inserts into
 * conversations_needing_attention. The agent calls this when:
 *   - The customer explicitly asks for a human (UC-IN-08).
 *   - The agent decides the question is out of its scope or it's a
 *     complaint / cancel / modify / RTBF intent.
 *
 * The phone in the body MUST match the X-Agent-Phone header — defence in
 * depth against a confused agent posting handoffs against the wrong client.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    verifyAgentBearer(req);
    const phone = getXAgentPhone(req);

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      throw Errors.badRequest('Body must be a JSON object');
    }

    const dto = HandoffRequestSchema.parse(rawBody);

    if (dto.phone !== phone) {
      throw Errors.badRequest('phone in body must match X-Agent-Phone header');
    }

    const supabase = await createAdminClient();
    await verifyPhoneClientBinding(phone, dto.client_id, supabase);

    const inserted = await createHandoff(supabase, dto);

    const res = successResponse({ queued: true, id: inserted.id }, 201);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
