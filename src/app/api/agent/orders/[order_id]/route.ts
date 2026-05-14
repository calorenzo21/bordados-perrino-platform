import { type NextRequest, NextResponse } from 'next/server';

import { getOrder } from '@/lib/services/agent.service';
import { createAdminClient } from '@/lib/supabase/server';
import { Errors, errorResponse, handleApiError, successResponse } from '@/lib/utils/errors';

import { getXAgentPhone, verifyAgentBearer, verifyPhoneClientBinding } from '@/app/api/agent/_auth';

// Orders can be addressed by EITHER their UUID primary key OR their
// human-readable order_number (e.g. "ORD-003"). The LLM tends to use the
// latter because it's what customers see in invoices and the admin UI.
const ORDER_ID_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|ORD-\d+)$/i;

/**
 * EP-3 — GET /api/agent/orders/{order_id}?client_id={client_id}
 *
 * Fetches a single order. `client_id` is required in the query string and
 * cross-checked against the X-Agent-Phone owner. The service layer ALSO
 * filters by client_id in the WHERE clause as defence in depth.
 *
 * 404 covers all four failure cases — not-found, wrong-client, soft-deleted
 * client, malformed UUID — to avoid leaking which one applies.
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

    const order = await getOrder(supabase, order_id, clientId);
    if (!order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    const res = successResponse(order);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
