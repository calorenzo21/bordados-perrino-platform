import { type NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import {
  newClientWelcomeEmail,
  partialDeliveryEmail,
  paymentReceivedEmail,
  statusChangeEmail,
} from '@/lib/email/templates';
import { createClient } from '@/lib/supabase/server';
import type { OrderStatusType } from '@/lib/utils/status';

type NotificationType = 'status_change' | 'payment' | 'partial_delivery' | 'new_client';

interface BasePayload {
  type: NotificationType;
  email: string;
}

interface StatusChangePayload extends BasePayload {
  type: 'status_change';
  clientName: string;
  orderNumber: string;
  newStatus: OrderStatusType;
  observations?: string;
}

interface PaymentPayload extends BasePayload {
  type: 'payment';
  clientName: string;
  orderNumber: string;
  amount: number;
  method: string;
  remainingBalance: number;
}

interface PartialDeliveryPayload extends BasePayload {
  type: 'partial_delivery';
  clientName: string;
  orderNumber: string;
  qtyDelivered: number;
  qtyRemaining: number;
}

interface NewClientPayload extends BasePayload {
  type: 'new_client';
  clientName: string;
  tempPassword: string;
}

type NotificationPayload =
  | StatusChangePayload
  | PaymentPayload
  | PartialDeliveryPayload
  | NewClientPayload;

function buildEmailContent(payload: NotificationPayload): { subject: string; html: string } {
  switch (payload.type) {
    case 'status_change':
      return statusChangeEmail(
        payload.clientName,
        payload.orderNumber,
        payload.newStatus,
        payload.observations
      );
    case 'payment':
      return paymentReceivedEmail(
        payload.clientName,
        payload.orderNumber,
        payload.amount,
        payload.method,
        payload.remainingBalance
      );
    case 'partial_delivery':
      return partialDeliveryEmail(
        payload.clientName,
        payload.orderNumber,
        payload.qtyDelivered,
        payload.qtyRemaining
      );
    case 'new_client':
      return newClientWelcomeEmail(payload.clientName, payload.email, payload.tempPassword);
  }
}

function buildIdempotencyKey(payload: NotificationPayload): string {
  const ts = Date.now();
  switch (payload.type) {
    case 'status_change':
      return `status/${payload.orderNumber}/${payload.newStatus}/${ts}`;
    case 'payment':
      return `payment/${payload.orderNumber}/${payload.amount}/${ts}`;
    case 'partial_delivery':
      return `delivery/${payload.orderNumber}/${ts}`;
    case 'new_client':
      return `welcome/${payload.email}/${ts}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload: NotificationPayload = await request.json();

    if (!payload.type || !payload.email) {
      return NextResponse.json({ error: 'Faltan campos requeridos: type, email' }, { status: 400 });
    }

    const { subject, html } = buildEmailContent(payload);
    const idempotencyKey = buildIdempotencyKey(payload);

    const result = await sendEmail({
      to: payload.email,
      subject,
      html,
      idempotencyKey,
    });

    if (!result.success) {
      console.error('[Notifications] Email send failed:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.data?.id });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
