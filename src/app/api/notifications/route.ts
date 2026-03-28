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

const STATUS_PUSH: Record<
  OrderStatusType,
  { title: string; body: (orderNumber: string, obs?: string) => string }
> = {
  RECIBIDO: {
    title: '📦 Pedido recibido',
    body: (n) => `Tu pedido #${n} fue registrado y está en cola. ¡Ya empezamos a trabajar en él!`,
  },
  CONFECCION: {
    title: '🧵 ¡En producción!',
    body: (n, obs) =>
      obs
        ? `Tu pedido #${n} está siendo confeccionado. Nota: ${obs}`
        : `Tu pedido #${n} ya está en confección. Te avisamos cuando esté listo.`,
  },
  RETIRO: {
    title: '✅ ¡Listo para retirar!',
    body: (n, obs) =>
      obs
        ? `Tu pedido #${n} está listo. ${obs}`
        : `Tu pedido #${n} está listo para que lo pases a buscar. ¡Te esperamos!`,
  },
  PARCIALMENTE_ENTREGADO: {
    title: '📬 Entrega parcial',
    body: (n, obs) =>
      obs
        ? `Parte de tu pedido #${n} fue entregada. ${obs}`
        : `Una parte de tu pedido #${n} fue entregada. El resto estará listo pronto.`,
  },
  ENTREGADO: {
    title: '🎉 ¡Pedido entregado!',
    body: (n) => `Tu pedido #${n} fue entregado completamente. ¡Gracias por elegirnos! 🙌`,
  },
  CANCELADO: {
    title: '❌ Pedido cancelado',
    body: (n, obs) =>
      obs
        ? `Tu pedido #${n} fue cancelado. Motivo: ${obs}`
        : `Tu pedido #${n} fue cancelado. Contactanos si tenés alguna duda.`,
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
        body: tpl.body(payload.orderNumber, payload.observations),
        url: '/client/panel',
      };
    }
    case 'payment': {
      const fmt = (n: number) =>
        n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const paidOff = payload.remainingBalance <= 0;
      return {
        title: '💰 Abono registrado',
        body: paidOff
          ? `Recibimos tu pago de $${fmt(payload.amount)} para el pedido #${payload.orderNumber}. ¡Está saldado! 🎉`
          : `Recibimos un abono de $${fmt(payload.amount)} para el pedido #${payload.orderNumber}. Saldo restante: $${fmt(payload.remainingBalance)}.`,
        url: '/client/panel',
      };
    }
    case 'new_order':
      return {
        title: '🆕 Nuevo pedido registrado',
        body: `Registramos tu pedido #${payload.orderNumber}: "${payload.description}". ¡Manos a la obra! 🧵`,
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
