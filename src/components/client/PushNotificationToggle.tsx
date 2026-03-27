'use client';

import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Bell, BellOff } from 'lucide-react';

import { Switch } from '@/components/ui/switch';

export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        Tu navegador o dispositivo no soporta notificaciones push.
      </p>
    );
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-muted-foreground">
        Las notificaciones están bloqueadas en tu navegador. Permítelas en la configuración del
        sitio para activarlas.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {isSubscribed ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isSubscribed ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed
              ? 'Recibirás alertas de tus pedidos en este dispositivo.'
              : 'Activá para recibir alertas de pedidos y abonos.'}
          </p>
        </div>
      </div>
      <Switch
        checked={isSubscribed}
        disabled={isLoading}
        onCheckedChange={(checked) => {
          if (checked) subscribe();
          else unsubscribe();
        }}
        aria-label="Activar notificaciones push"
      />
    </div>
  );
}
