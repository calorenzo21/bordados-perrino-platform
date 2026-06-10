import { Fragment } from 'react';

import type { Metadata } from 'next';
import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { PerrinoLogo } from '@/components/PerrinoLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description:
    'Política de Privacidad de Bordados Perrino: qué datos personales tratamos, con qué fin y cómo ejercer sus derechos.',
};

const EMPRESA = {
  razonSocial: 'Perrino Compañía Anónima',
  nombreComercial: 'Bordados Perrino',
  rif: 'J-29706045-8',
  domicilio:
    'Av. Atlántico, C.C. Centro Atlántico, Nivel P.B., Local 8, Sector El Tiamo, Puerto Ordaz, Ciudad Guayana, Estado Bolívar. Zona Postal 8050',
  telefono: '0424-9747761',
  correo: 'soporte@bordadosperrino.com',
  url: 'https://bordadosperrino.com/privacidad',
  fecha: '10 de junio de 2026',
};

interface Section {
  heading: string;
  body: string;
  bullets?: string[];
}

const INTRO = `En ${EMPRESA.razonSocial} (RIF ${EMPRESA.rif}), identificada comercialmente como «${EMPRESA.nombreComercial}», respetamos su privacidad. Esta Política de Privacidad explica, de forma breve, qué datos personales tratamos, con qué finalidad y cómo puede ejercer sus derechos. El tratamiento de sus datos se rige por la Constitución de la República Bolivariana de Venezuela (artículos 28, 48 y 60) y demás normativa aplicable, incluida la Ley sobre Mensajes de Datos y Firmas Electrónicas.`;

const SECTIONS: Section[] = [
  {
    heading: '1. Responsable del tratamiento',
    body: `El responsable de sus datos personales es ${EMPRESA.razonSocial} («${EMPRESA.nombreComercial}»), RIF ${EMPRESA.rif}, con domicilio en ${EMPRESA.domicilio}. Para cualquier asunto relacionado con sus datos puede contactarnos por correo a ${EMPRESA.correo} o por teléfono al ${EMPRESA.telefono}.`,
  },
  {
    heading: '2. Datos que recabamos',
    body: 'Tratamos únicamente los datos necesarios para atenderle:',
    bullets: [
      'Identificación y contacto: nombre, número de teléfono, correo electrónico (opcional) y dirección.',
      'Pedidos: descripción del trabajo, tipo de servicio (bordado, DTF, sublimación, planchado, etc.), montos, estado y fechas de entrega.',
      'Pagos: los montos abonados, el saldo pendiente y el método de pago. No almacenamos números de tarjeta ni datos de cuentas bancarias.',
      'Mensajes de WhatsApp: el número de teléfono desde el que nos escribe y el contenido de sus mensajes.',
      'Imágenes que usted o nuestro personal carguen, como diseños de referencia o comprobantes de pago.',
    ],
  },
  {
    heading: '3. Para qué usamos sus datos',
    body: 'Usamos sus datos para:',
    bullets: [
      'Registrar y dar seguimiento a sus pedidos y a sus pagos.',
      'Atenderle por WhatsApp: identificarlo por su número de teléfono y responder consultas sobre sus propios pedidos.',
      'Notificarle los cambios de estado de su pedido y los pagos recibidos.',
      'Garantizar la seguridad del servicio y prevenir fraudes.',
    ],
  },
  {
    heading: '4. Asistente de WhatsApp y proveedores',
    body: `El contenido de sus mensajes de WhatsApp es procesado por un sistema de inteligencia artificial (Anthropic) con el único fin de entender su consulta y responderle sobre sus pedidos; el asistente solo informa sobre los pedidos asociados a su propio número de teléfono y no modifica nada. Para operar nos apoyamos en proveedores que tratan datos por nuestra cuenta y bajo nuestras instrucciones: WhatsApp (Meta) para la mensajería, y servicios de base de datos, hospedaje y correo electrónico (Supabase, Vercel y Resend). No vendemos ni cedemos sus datos personales a terceros con fines comerciales.`,
  },
  {
    heading: '5. Conservación de los datos',
    body: `Conservamos sus datos mientras exista relación comercial con usted o sea necesario para cumplir las finalidades indicadas y nuestras obligaciones legales. El historial de su conversación con el asistente de WhatsApp se elimina automáticamente a las 24 horas.`,
  },
  {
    heading: '6. Sus derechos',
    body: `Conforme al artículo 28 de la Constitución (habeas data), usted tiene derecho a acceder a sus datos personales, conocer su uso y finalidad, y solicitar que se rectifiquen, actualicen o eliminen cuando sean erróneos o afecten indebidamente sus derechos. Para ejercerlos, escríbanos a ${EMPRESA.correo} o llámenos al ${EMPRESA.telefono}, indicando su solicitud y un medio para responderle; podremos pedirle que acredite su identidad antes de atenderla.`,
  },
  {
    heading: '7. Cambios a esta política',
    body: `Podemos actualizar esta Política de Privacidad cuando sea necesario. La versión vigente estará siempre disponible en ${EMPRESA.url}, indicando la fecha de su última actualización.`,
  },
];

export default function PrivacidadPage() {
  const year = new Date().getFullYear();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* Encabezado: marca + volver */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <a href="https://bordadosperrino.com" className="flex items-center gap-3">
          <PerrinoLogo size="md" />
          <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Bordados Perrino
          </span>
        </a>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      {/* Título */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Última actualización: {EMPRESA.fecha}
        </p>
      </header>

      {/* Cuerpo */}
      <Card className="rounded-2xl border-0 shadow-lg dark:bg-slate-800 dark:shadow-slate-900/50">
        <CardContent className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{INTRO}</p>

          {SECTIONS.map((section) => (
            <Fragment key={section.heading}>
              <Separator className="bg-slate-100 dark:bg-slate-700" />
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {section.heading}
                </h2>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">{section.body}</p>
                {section.bullets && (
                  <ul className="space-y-2.5">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-3 leading-relaxed text-slate-600 dark:text-slate-300"
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Pie */}
      <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        © {year} {EMPRESA.razonSocial}. Todos los derechos reservados.
      </footer>
    </main>
  );
}
