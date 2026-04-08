import { type NextRequest, NextResponse } from 'next/server';

import { sendEmail } from '@/lib/email/resend';
import {
  newAdminWelcomeEmail,
  newClientWelcomeEmail,
  newOrderEmail,
  partialDeliveryEmail,
  paymentReceivedEmail,
  statusChangeEmail,
} from '@/lib/email/templates';
import { sendPushToClient } from '@/lib/services/push.server';
import { createClient } from '@/lib/supabase/server';
import { type OrderStatusType } from '@/lib/utils/status';

type NotificationType =
  | 'status_change'
  | 'payment'
  | 'partial_delivery'
  | 'new_client'
  | 'new_admin'
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
  description?: string;
  newStatus: OrderStatusType;
  observations?: string;
  qtyDelivered?: number;
  qtyRemaining?: number;
}

interface PaymentPayload extends BasePayload {
  type: 'payment';
  clientName: string;
  orderNumber: string;
  description?: string;
  amount: number;
  method: string;
  remainingBalance: number;
}

interface PartialDeliveryPayload extends BasePayload {
  type: 'partial_delivery';
  clientName: string;
  orderNumber: string;
  description?: string;
  qtyDelivered: number;
  qtyRemaining: number;
}

interface NewClientPayload extends BasePayload {
  type: 'new_client';
  clientName: string;
  tempPassword: string;
}

interface NewAdminPayload extends BasePayload {
  type: 'new_admin';
  adminName: string;
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
  | NewAdminPayload
  | NewOrderPayload;

function buildEmailContent(payload: NotificationPayload): { subject: string; html: string } {
  switch (payload.type) {
    case 'status_change':
      return statusChangeEmail(payload.clientName, payload.orderNumber, payload.newStatus, {
        description: payload.description,
        observations: payload.observations,
        qtyDelivered: payload.qtyDelivered,
        qtyRemaining: payload.qtyRemaining,
      });
    case 'payment':
      return paymentReceivedEmail(
        payload.clientName,
        payload.orderNumber,
        payload.amount,
        payload.method,
        payload.remainingBalance,
        payload.description
      );
    case 'partial_delivery':
      return partialDeliveryEmail(
        payload.clientName,
        payload.orderNumber,
        payload.qtyDelivered,
        payload.qtyRemaining,
        payload.description
      );
    case 'new_client':
      return newClientWelcomeEmail(payload.clientName, payload.email, payload.tempPassword);
    case 'new_admin':
      return newAdminWelcomeEmail(payload.adminName, payload.email, payload.tempPassword);
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
  // Use a date-based window (per minute) instead of Date.now() so that
  // rapid duplicate calls within the same minute are deduplicated,
  // while still allowing legitimate re-sends over time.
  const window = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  switch (payload.type) {
    case 'status_change':
      return `status/${payload.orderNumber}/${payload.newStatus}/${window}`;
    case 'payment':
      return `payment/${payload.orderNumber}/${payload.amount}/${window}`;
    case 'partial_delivery':
      return `delivery/${payload.orderNumber}/${window}`;
    case 'new_client':
      return `welcome/${payload.email}/${window}`;
    case 'new_admin':
      return `admin-welcome/${payload.email}/${window}`;
    case 'new_order':
      return `neworder/${payload.orderNumber}/${window}`;
  }
}

const STATUS_PUSH: Record<
  OrderStatusType,
  { title: string; body: (orderNumber: string, description?: string) => string }
> = {
  RECIBIDO: {
    title: '📦 Pedido recibido',
    body: (n, desc) =>
      `Tu pedido #${n}${desc ? ` — ${desc}` : ''} fue registrado. ¡Ya empezamos a trabajar en él!`,
  },
  CONFECCION: {
    title: '🧵 ¡En producción!',
    body: (n, desc) =>
      `Tu pedido #${n}${desc ? ` — ${desc}` : ''} ya está en confección. Te avisamos cuando esté listo.`,
  },
  RETIRO: {
    title: '✅ ¡Listo para retirar!',
    body: (n, desc) =>
      `Tu pedido #${n}${desc ? ` — ${desc}` : ''} está listo para que lo pases a buscar. ¡Te esperamos!`,
  },
  PARCIALMENTE_ENTREGADO: {
    title: '📬 Entrega parcial',
    body: (n, desc) =>
      `Una parte de tu pedido #${n}${desc ? ` — ${desc}` : ''} fue entregada. El resto estará listo pronto.`,
  },
  ENTREGADO: {
    title: '🎉 ¡Pedido entregado!',
    body: (n, desc) =>
      `Tu pedido #${n}${desc ? ` — ${desc}` : ''} fue entregado. ¡Gracias por elegirnos! 🙌`,
  },
  CANCELADO: {
    title: '❌ Pedido cancelado',
    body: (n, desc) =>
      `Tu pedido #${n}${desc ? ` — ${desc}` : ''} fue cancelado. Contactanos si tenés alguna duda.`,
  },
};

function buildPushPayload(
  payload: NotificationPayload
): { title: string; body: string; url: string } | null {
  switch (payload.type) {
    case 'status_change': {
      const tpl = STATUS_PUSH[payload.newStatus];
      if (!tpl) return null;
      return {
        title: tpl.title,
        body: tpl.body(payload.orderNumber, payload.description),
        url: '/client/panel',
      };
    }
    case 'payment': {
      const fmt = (n: number) =>
        n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const paidOff = payload.remainingBalance <= 0;
      const desc = payload.description ? ` — ${payload.description}` : '';
      return {
        title: '💰 Abono registrado',
        body: paidOff
          ? `Recibimos tu pago de $${fmt(payload.amount)} para el pedido #${payload.orderNumber}${desc}. ¡Está saldado! 🎉`
          : `Recibimos un abono de $${fmt(payload.amount)} para el pedido #${payload.orderNumber}${desc}. Saldo restante: $${fmt(payload.remainingBalance)}.`,
        url: '/client/panel',
      };
    }
    case 'new_order':
      return {
        title: '🆕 Nuevo pedido registrado',
        body: `Registramos tu pedido #${payload.orderNumber} — ${payload.description}. ¡Manos a la obra! 🧵`,
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

    // Run email and push independently — one failure doesn't block the other
    const [emailResult] = await Promise.all([
      sendEmail({ to: payload.email, subject, html, idempotencyKey }).catch((err) => {
        console.error('[Notifications] Email send failed:', err);
        return { success: false as const, error: String(err) };
      }),
      payload.clientId
        ? (() => {
            const pushPayload = buildPushPayload(payload);
            if (!pushPayload) return Promise.resolve();
            return sendPushToClient(payload.clientId!, pushPayload).catch((err) => {
              console.error('[Notifications] Push send failed:', err);
            });
          })()
        : Promise.resolve(),
    ]);

    if (!emailResult.success) {
      console.error('[Notifications] Email send failed:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      emailId: emailResult.success ? (emailResult as { data?: { id?: string } }).data?.id : null,
    });
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
