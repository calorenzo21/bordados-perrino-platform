import { OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

const LOGO_URL = 'https://bordados-perrino-platform.vercel.app/icons/perrino-logo.png';
const BRAND_COLOR = '#3b82f6';
const BRAND_NAME = 'Bordados Perrino';

/** Escape HTML special characters to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:28px 32px;text-align:center;">
              <img src="${LOGO_URL}" alt="${BRAND_NAME}" width="48" height="48" style="display:inline-block;border-radius:12px;margin-bottom:8px;" />
              <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${BRAND_NAME}</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                Este correo fue enviado automáticamente por ${BRAND_NAME}.<br/>
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:#0f172a;">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:12px;margin:16px 0 24px;border:1px solid #e2e8f0;">
    ${rows}
  </table>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.6;">Hola <strong>${name}</strong>,</p>`;
}

function footer(): string {
  return `<p style="margin:24px 0 0;font-size:14px;color:#64748b;line-height:1.6;">Gracias por confiar en <strong>${BRAND_NAME}</strong>.</p>`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function statusChangeEmail(
  clientName: string,
  orderNumber: string,
  newStatus: OrderStatusType,
  observations?: string
): { subject: string; html: string } {
  const statusLabel = OrderStatusLabels[newStatus] || newStatus;
  const safeOrderNumber = escapeHtml(orderNumber);
  const subject = `Pedido #${safeOrderNumber} — ${statusLabel}`;

  const obsHtml = observations
    ? `<p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;"><strong>Observaciones:</strong> ${escapeHtml(observations)}</p>`
    : '';

  const body = `
    ${greeting(escapeHtml(clientName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">El estado de tu pedido ha sido actualizado:</p>
    ${infoTable(
      infoRow('Pedido', `#${safeOrderNumber}`) +
        infoRow(
          'Nuevo estado',
          `<span style="color:${BRAND_COLOR};font-weight:700;">${statusLabel}</span>`
        )
    )}
    ${obsHtml}
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}

export function paymentReceivedEmail(
  clientName: string,
  orderNumber: string,
  amount: number,
  method: string,
  remainingBalance: number
): { subject: string; html: string } {
  const safeOrderNumber = escapeHtml(orderNumber);
  const subject = `Abono registrado — Pedido #${safeOrderNumber}`;
  const fmt = (n: number) =>
    n.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    tarjeta: 'Tarjeta',
    otro: 'Otro',
  };

  const body = `
    ${greeting(escapeHtml(clientName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">Se ha registrado un abono en tu pedido:</p>
    ${infoTable(
      infoRow('Pedido', `#${safeOrderNumber}`) +
        infoRow('Monto abonado', `<strong style="color:#16a34a;">$${fmt(amount)}</strong>`) +
        infoRow('Método', methodLabels[method] || escapeHtml(method)) +
        infoRow(
          'Saldo restante',
          remainingBalance <= 0
            ? '<strong style="color:#16a34a;">Pagado en su totalidad</strong>'
            : `<strong>$${fmt(remainingBalance)}</strong>`
        )
    )}
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}

export function partialDeliveryEmail(
  clientName: string,
  orderNumber: string,
  qtyDelivered: number,
  qtyRemaining: number
): { subject: string; html: string } {
  const safeOrderNumber = escapeHtml(orderNumber);
  const subject = `Entrega parcial — Pedido #${safeOrderNumber}`;

  const body = `
    ${greeting(escapeHtml(clientName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">Se ha realizado una entrega parcial de tu pedido:</p>
    ${infoTable(
      infoRow('Pedido', `#${safeOrderNumber}`) +
        infoRow('Cantidad entregada', `<strong>${qtyDelivered}</strong> unidad(es)`) +
        infoRow('Pendiente por entregar', `<strong>${qtyRemaining}</strong> unidad(es)`)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;">Te notificaremos cuando el resto de tu pedido esté listo.</p>
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}

export function newOrderEmail(
  clientName: string,
  orderNumber: string,
  description: string,
  dueDate: string
): { subject: string; html: string } {
  const safeOrderNumber = escapeHtml(orderNumber);
  const subject = `Nuevo pedido registrado — #${safeOrderNumber}`;

  const formattedDate = new Date(dueDate).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const body = `
    ${greeting(escapeHtml(clientName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">Se ha registrado un nuevo pedido a tu nombre:</p>
    ${infoTable(
      infoRow('Pedido', `#${safeOrderNumber}`) +
        infoRow('Descripción', escapeHtml(description)) +
        infoRow('Fecha de entrega estimada', formattedDate)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;">Te notificaremos cuando haya novedades sobre tu pedido.</p>
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}

export function newClientWelcomeEmail(
  clientName: string,
  email: string,
  tempPassword: string
): { subject: string; html: string } {
  const subject = `Bienvenido a ${BRAND_NAME}`;

  const body = `
    ${greeting(escapeHtml(clientName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">
      Se ha creado tu cuenta en nuestra plataforma. Puedes iniciar sesión con los siguientes datos:
    </p>
    ${infoTable(
      infoRow('Correo', escapeHtml(email)) +
        infoRow(
          'Contraseña temporal',
          `<code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:1px;color:#0f172a;">${escapeHtml(tempPassword)}</code>`
        )
    )}
    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
        <strong>Importante:</strong> Te recomendamos cambiar tu contraseña la primera vez que inicies sesión.
      </p>
    </div>
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}

export function newAdminWelcomeEmail(
  adminName: string,
  email: string,
  tempPassword: string
): { subject: string; html: string } {
  const subject = `Acceso de administrador — ${BRAND_NAME}`;

  const body = `
    ${greeting(escapeHtml(adminName))}
    <p style="margin:0 0 4px;font-size:15px;color:#334155;line-height:1.6;">
      Se te ha otorgado acceso como <strong>administrador</strong> en nuestra plataforma. Aquí están tus credenciales:
    </p>
    ${infoTable(
      infoRow('Correo', escapeHtml(email)) +
        infoRow(
          'Contraseña temporal',
          `<code style="background:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:1px;color:#0f172a;">${escapeHtml(tempPassword)}</code>`
        )
    )}
    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">
        <strong>Importante:</strong> Cambia tu contraseña inmediatamente después de iniciar sesión. No compartas estas credenciales con nadie.
      </p>
    </div>
    ${footer()}
  `;

  return { subject, html: buildEmailHtml(subject, body) };
}
