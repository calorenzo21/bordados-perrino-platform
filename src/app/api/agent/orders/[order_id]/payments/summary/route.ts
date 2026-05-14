import { type NextRequest, NextResponse } from 'next/server';

import { getOrderPaymentSummary } from '@/lib/services/agent.service';
import { createAdminClient } from '@/lib/supabase/server';
import { Errors, errorResponse, handleApiError, successResponse } from '@/lib/utils/errors';

import { getXAgentPhone, verifyAgentBearer, verifyPhoneClientBinding } from '@/app/api/agent/_auth';

// Orders can be addressed by EITHER their UUID primary key OR their
// human-readable order_number (e.g. "ORD-003"). The LLM tends to use the
// latter because it's what customers see in invoices and the admin UI.
const ORDER_ID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ORD-\d+)$/i;

/**
 * EP-4 — GET /api/agent/orders/{order_id}/payments/summary?client_id={client_id}
 *
 * Returns total, paid, due (in cents), payment count, and last_payment_at.
 * Never returns individual payment rows — those contain method / notes /
 * received_by, none of which the agent is allowed to see (ADR-0006).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ order_id: string }> }
): Promise<NextResponse> {
  try {
    verifyAgentBearer(req);
    const phone = getXAgentPhone(req);

    const { order_id } = await context.params;
    if (!ORDER_ID_REGEX.test(order_id)) {
      throw Errors.badRequest('Invalid order_id (must be UUID or ORD-NNN)');
    }

    const clientId = req.nextUrl.searchParams.get('client_id');
    if (
      !clientId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)
    ) {
      throw Errors.badRequest('Missing or invalid client_id query parameter');
    }

    const supabase = await createAdminClient();
    await verifyPhoneClientBinding(phone, clientId, supabase);

    const summary = await getOrderPaymentSummary(supabase, order_id, clientId);
    if (!summary) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    const res = successResponse(summary);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
