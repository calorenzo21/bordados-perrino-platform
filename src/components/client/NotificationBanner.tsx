'use client';

import { useEffect, useState } from 'react';

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, Loader2, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'push_banner_dismissed';

export function NotificationBanner() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  // Start as true (hidden) to avoid SSR flash; synced from localStorage on mount
  const [dismissed, setDismissed] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Sync dismissed state from localStorage (external system — valid setState-in-effect use)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const shouldShow = !dismissed && isSupported && permission === 'default' && !isSubscribed;

  // Trigger entrance animation after mount
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [shouldShow]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!shouldShow) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-blue-200/60 bg-white/80 backdrop-blur-sm shadow-lg shadow-blue-100/60 transition-all duration-300 dark:border-blue-800/40 dark:bg-slate-800/80 dark:shadow-blue-900/30 ${
        animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {/* Top gradient bar */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-blue-400 via-blue-500 to-indigo-500" />

      {/* Background glows */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl dark:bg-blue-500/10" />
      <div className="absolute -left-4 -bottom-6 h-24 w-24 rounded-full bg-indigo-400/10 blur-2xl dark:bg-indigo-500/10" />

      <div className="relative flex items-center gap-4 p-4 sm:p-5">
        {/* Icon with pulse ring */}
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200/60 dark:shadow-blue-900/50">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <span className="absolute -inset-1 animate-ping rounded-xl bg-blue-400/25 dark:bg-blue-500/20" />
          <div className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 shadow-sm">
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </div>
        </div>

        {/* Text + CTA */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Activa las notificaciones
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Recibí alertas cuando tu pedido esté listo para retirar o cambie de estado.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={subscribe}
              disabled={isLoading}
              className="h-8 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-200/60 hover:from-blue-600 hover:to-blue-700 active:scale-95 disabled:opacity-70 dark:shadow-blue-900/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  Activar ahora
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              disabled={isLoading}
              className="h-8 rounded-xl px-3 text-xs text-slate-400 hover:bg-slate-100/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700/60 dark:hover:text-slate-300"
            >
              Ahora no
            </Button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
