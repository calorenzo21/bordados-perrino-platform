import { env } from '@/config/env';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

/**
 * Send an email using Resend.
 *
 * Default `from` uses the Resend test address.
 * Replace with your verified domain for production
 * (e.g. "Bordados Perrino <noreply@bordadosperrino.com>").
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'Bordados Perrino <onboarding@resend.dev>',
  replyTo,
  idempotencyKey,
}: SendEmailParams): Promise<SendEmailResult> {
  const payload: Parameters<typeof resend.emails.send>[0] = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    replyTo,
  };

  const options: Parameters<typeof resend.emails.send>[1] = idempotencyKey
    ? { idempotencyKey }
    : undefined;

  const { data, error } = await resend.emails.send(payload, options);

  if (error) {
    console.error('[Email] Failed to send:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: { id: data?.id || '' } };
}
