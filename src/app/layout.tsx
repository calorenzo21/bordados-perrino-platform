import type { Metadata, Viewport } from 'next';

import { AuthProvider } from '@/context/auth-context';

import { SerwistProvider } from '@/components/SerwistProvider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Bordados Perrino',
    template: '%s | Bordados Perrino',
  },
  description:
    'Plataforma de gestión de pedidos de bordados personalizados. Uniformes, gorras, camisetas y más.',
  keywords: ['bordados', 'uniformes', 'personalización', 'bordados perrino'],
  manifest: '/api/manifest',
  applicationName: 'Bordados Perrino',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bordados Perrino',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icons/perrino-logo.png',
    apple: '/icons/perrino-logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Cargar fuentes de Google Fonts via link para evitar errores de build */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <SerwistProvider swUrl="/serwist/sw.js">
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
