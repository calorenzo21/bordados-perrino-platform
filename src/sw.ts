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
