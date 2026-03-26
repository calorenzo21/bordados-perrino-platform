'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ClientError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error('[ClientError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Algo salió mal</h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Ocurrió un error inesperado. Puedes intentar recargar la sección o volver a tus pedidos.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
            Código: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/client/panel')}>
          Mis Pedidos
        </Button>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
