'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/browser';

import { PerrinoLogo } from '@/components/PerrinoLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { signIn } from '../actions';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const { user, isLoading, isAdmin, refreshSession } = useAuth();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (!isLoading && user) {
      const destination = isAdmin ? '/admin/dashboard' : '/client/panel';
      router.replace(destination);
    }
  }, [isLoading, user, isAdmin, router]);

  // Mostrar loading mientras verifica o si ya está autenticado
  if (isLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
            <span className="text-lg font-bold text-white">BP</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">
            {user ? 'Redirigiendo...' : 'Verificando sesión...'}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn(formData);

      if (!result.success) {
        setError(result.error || 'Error al iniciar sesión');
        return;
      }

      // Refrescar la sesión en el contexto de auth para cargar el perfil
      await refreshSession();

      // Determine the final destination
      // If there's a redirectTo param, validate it matches the user's role
      let destination = result.redirectTo || '/admin/dashboard';

      if (redirectTo) {
        const isAdminRoute = redirectTo.startsWith('/admin');
        const isClientRoute = redirectTo.startsWith('/client');
        const userIsAdmin = result.redirectTo === '/admin/dashboard';

        // Only use redirectTo if user has permission for that route
        if ((isAdminRoute && userIsAdmin) || (isClientRoute && !userIsAdmin)) {
          destination = redirectTo;
        }
        // Otherwise, use the role-based destination from result
      }

      router.push(destination);
      router.refresh();
    });
  };

  const handleGoogleSignIn = async () => {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError('Error al conectar con Google');
    } else if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-4">
            <PerrinoLogo size="lg" rounded="2xl" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Bienvenido</CardTitle>
          <CardDescription className="text-slate-500">
            Ingresa a tu cuenta de Bordados Perrino
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Correo electrónico
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                disabled={isPending}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-500 hover:text-blue-600">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-xl bg-blue-500 font-semibold text-white hover:bg-blue-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">O continúa con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="mt-4 h-11 w-full rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-blue-500 hover:text-blue-600">
              Regístrate aquí
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Fallback de carga para Suspense
function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Cargando...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
