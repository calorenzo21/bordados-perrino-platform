import { defaultCache } from '@serwist/turbopack/worker';
import { NetworkFirst, NetworkOnly, Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching = [
  // Never cache: RSC payloads, Supabase API, Next.js API routes
  {
    matcher: ({ url, request }: { url: URL; request: Request }) => {
      if (url.searchParams.has('_rsc')) return true;
      if (request.headers.get('RSC') === '1') return true;
      if (url.hostname.includes('supabase')) return true;
      if (url.pathname.startsWith('/api/')) return true;
      return false;
    },
    handler: new NetworkOnly(),
  },
  // Navigation requests (HTML documents): always try network first so the PWA
  // always gets fresh HTML with up-to-date auth cookies when it reopens.
  // Falls back to cache only when the network is unreachable (offline support).
  {
    matcher: ({ request }: { request: Request }) => request.mode === 'navigate',
    handler: new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 5,
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();

// Push notification handler — show notification when received in background
self.addEventListener('push', (event: PushEvent) => {
  const data = (event.data?.json() ?? {}) as {
    title?: string;
    body?: string;
    url?: string;
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Bordados Perrino', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/client/panel' },
    })
  );
});

// Notification click — open or focus the app at the relevant URL
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url: string = (event.notification.data as { url?: string })?.url ?? '/client/panel';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
