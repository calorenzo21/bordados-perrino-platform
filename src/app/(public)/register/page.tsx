'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signUp } from '../actions';
import { useAuth } from '@/hooks/use-auth';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth();

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
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signUp(formData);

      if (!result.success) {
        setError(result.error || 'Error al crear la cuenta');
        return;
      }

      // If there's a message but also success (email confirmation)
      if (result.error) {
        setSuccess(result.error);
        return;
      }

      // Redirect to the appropriate page
      if (result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
            <span className="text-xl font-bold text-white">BP</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Crear Cuenta</CardTitle>
          <CardDescription className="text-slate-500">
            Regístrate para comenzar a usar Bordados Perrino
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                {success}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                  Nombre
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Juan"
                  required
                  disabled={isPending}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                  Apellido
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Pérez"
                  required
                  disabled={isPending}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
                />
              </div>
            </div>
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
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+54 9 XXX XXX-XXXX"
                disabled={isPending}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isPending}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-blue-500"
              />
              <p className="text-xs text-slate-400">
                Mínimo 6 caracteres
              </p>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full rounded-xl bg-blue-500 font-semibold text-white hover:bg-blue-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear Cuenta'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
              Inicia sesión
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            Al registrarte, aceptas nuestros{' '}
            <Link href="/terms" className="text-blue-500 hover:text-blue-600">
              Términos de servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="text-blue-500 hover:text-blue-600">
              Política de privacidad
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
