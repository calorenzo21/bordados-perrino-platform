import { Resend } from 'resend';

import { env } from '@/config/env';

// Initialize Resend client
const resend = new Resend(env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

/**
 * Send an email using Resend
 *
 * @example
 * const result = await sendEmail({
 *   to: 'cliente@example.com',
 *   subject: 'Tu pedido está listo',
 *   html: '<h1>¡Tu pedido está listo para retirar!</h1>',
 * });
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'Bordados Perrino <noreply@bordadosperrino.com>',
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    });

    if (error) {
      console.error('[Email] Failed to send:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: { id: data?.id || '' } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Exception:', message);
    return { success: false, error: message };
  }
}

/**
 * Email templates - Add your transactional email templates here
 */
export const emailTemplates = {
  orderReceived: (orderNumber: string, clientName: string) => ({
    subject: `Pedido #${orderNumber} recibido`,
    html: `
      <h1>¡Hola ${clientName}!</h1>
      <p>Hemos recibido tu pedido <strong>#${orderNumber}</strong>.</p>
      <p>Te notificaremos cuando esté listo para retirar.</p>
      <p>Gracias por confiar en Bordados Perrino.</p>
    `,
  }),

  orderReady: (orderNumber: string, clientName: string) => ({
    subject: `¡Tu pedido #${orderNumber} está listo!`,
    html: `
      <h1>¡Hola ${clientName}!</h1>
      <p>Tu pedido <strong>#${orderNumber}</strong> está listo para retirar.</p>
      <p>Te esperamos en nuestro local.</p>
      <p>Gracias por confiar en Bordados Perrino.</p>
    `,
  }),
};

