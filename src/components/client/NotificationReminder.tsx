'use client';

import { useEffect, useRef, useState } from 'react';

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

/** Milliseconds before the toast appears after mount */
const SHOW_DELAY_MS = 2500;
/** Milliseconds the toast stays visible before auto-dismissing */
const AUTO_DISMISS_MS = 12000;

export function NotificationReminder() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(100);
  const dismissedRef = useRef(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setEntered(false);
    if (progressRef.current) clearInterval(progressRef.current);
    setTimeout(() => setVisible(false), 350);
  };

  useEffect(() => {
    if (!isSupported || permission !== 'default' || isSubscribed) return;

    // Show after delay
    const showTimer = setTimeout(() => {
      setVisible(true);
      // Trigger CSS entrance on next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));

      // Progress countdown
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
        setProgress(remaining);
        if (remaining === 0) dismiss();
      }, 80);
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(showTimer);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isSupported, permission, isSubscribed]);

  // Hide immediately if permission state changed externally (granted/denied/subscribed).
  // Derived from props — no effect needed.
  if (!visible || permission !== 'default' || isSubscribed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-sm -translate-x-1/2 transition-all duration-350 sm:left-auto sm:right-5 sm:translate-x-0 ${
        entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/95 shadow-xl shadow-slate-200/60 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-800/95 dark:shadow-slate-900/60">
        {/* Progress bar — depletes from right to left */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full bg-linear-to-r from-blue-400 to-indigo-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Subtle side accent */}
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-linear-to-b from-blue-400 to-indigo-500" />

        <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
          {/* Icon */}
          <div className="relative mt-0.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-200/60 dark:shadow-blue-900/40">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <span className="absolute -inset-0.5 animate-ping rounded-xl bg-blue-400/20 dark:bg-blue-500/15" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
              ¿Recibir alertas de tus pedidos?
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Enterate al instante cuando tu pedido esté listo.
            </p>
            <Button
              size="sm"
              onClick={async () => {
                await subscribe();
                dismiss();
              }}
              disabled={isLoading}
              className="mt-2.5 h-7 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-blue-600 hover:to-blue-700 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Activando...
                </>
              ) : (
                <>
                  <Bell className="mr-1 h-3 w-3" />
                  Activar notificaciones
                </>
              )}
            </Button>
          </div>

          {/* Close */}
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
