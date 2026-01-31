'use client';

import { useEffect } from 'react';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Orders error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <AlertCircle className="h-6 w-6 text-rose-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-slate-900">
            Error al cargar los Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-slate-500">
            Hubo un problema al cargar la lista de pedidos. Esto puede deberse a un problema de
            conexión o del servidor.
          </p>

          {error.message && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-mono text-slate-600">{error.message}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={reset}
              className="gap-2 rounded-full bg-blue-500 px-6 hover:bg-blue-600"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="rounded-full"
            >
              Recargar página
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
