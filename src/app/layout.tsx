import type { Metadata } from 'next';

import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/auth-context';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bordados Perrino',
    template: '%s | Bordados Perrino',
  },
  description:
    'Plataforma de gestión de pedidos de bordados personalizados. Uniformes, gorras, camisetas y más.',
  keywords: ['bordados', 'uniformes', 'personalización', 'bordados perrino'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Cargar fuentes de Google Fonts via link para evitar errores de build */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
