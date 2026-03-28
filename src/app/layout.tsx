import type { Metadata, Viewport } from 'next';

import { AuthProvider } from '@/context/auth-context';

import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types/database';

import { SerwistProvider } from '@/components/SerwistProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
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
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user + profile server-side para eliminar el waterfall de auth client-side.
  // getUser() valida el JWT localmente (sin DB). getProfile() solo corre si hay sesión.
  // Es la misma query que ocurría en onAuthStateChange, pero adelantada al servidor.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    initialProfile = data ?? null;
  }

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
        <ThemeProvider>
          <SerwistProvider swUrl="/serwist/sw.js">
            <AuthProvider initialProfile={initialProfile}>
              {children}
              <Toaster position="top-right" richColors />
            </AuthProvider>
          </SerwistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
