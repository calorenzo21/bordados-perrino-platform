import { type NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import {
  newClientWelcomeEmail,
  newOrderEmail,
  partialDeliveryEmail,
  paymentReceivedEmail,
  statusChangeEmail,
} from '@/lib/email/templates';
import { sendPushToClient } from '@/lib/services/push.server';
import { createClient } from '@/lib/supabase/server';
import { OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

type NotificationType =
  | 'status_change'
  | 'payment'
  | 'partial_delivery'
  | 'new_client'
  | 'new_order';

interface BasePayload {
  type: NotificationType;
  email: string;
  /** Optional: client DB id — used to send push notification */
  clientId?: string;
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

interface NewOrderPayload extends BasePayload {
  type: 'new_order';
  clientName: string;
  orderNumber: string;
  description: string;
  dueDate: string;
}

type NotificationPayload =
  | StatusChangePayload
  | PaymentPayload
  | PartialDeliveryPayload
  | NewClientPayload
  | NewOrderPayload;

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
    case 'new_order':
      return newOrderEmail(
        payload.clientName,
        payload.orderNumber,
        payload.description,
        payload.dueDate
      );
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
    case 'new_order':
      return `neworder/${payload.orderNumber}/${ts}`;
  }
}

function buildPushPayload(
  payload: NotificationPayload
): { title: string; body: string; url: string } | null {
  switch (payload.type) {
    case 'status_change':
      return {
        title: `Pedido #${payload.orderNumber}`,
        body: `Tu pedido pasó a: ${OrderStatusLabels[payload.newStatus] ?? payload.newStatus}`,
        url: '/client/panel',
      };
    case 'payment': {
      const fmt = (n: number) =>
        n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return {
        title: 'Abono registrado',
        body: `Recibimos un abono de $${fmt(payload.amount)} en tu pedido #${payload.orderNumber}`,
        url: '/client/panel',
      };
    }
    case 'new_order':
      return {
        title: 'Nuevo pedido registrado',
        body: `Se registró el pedido #${payload.orderNumber}: ${payload.description}`,
        url: '/client/panel',
      };
    // partial_delivery and new_client don't send push
    default:
      return null;
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

    // Send push notification — must be awaited before returning (Vercel kills non-awaited Promises)
    if (payload.clientId) {
      const pushPayload = buildPushPayload(payload);
      if (pushPayload) {
        try {
          await sendPushToClient(payload.clientId, pushPayload);
        } catch (err) {
          console.error('[Notifications] Push send failed:', err);
        }
      }
    }

    return NextResponse.json({ success: true, emailId: result.data?.id });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
