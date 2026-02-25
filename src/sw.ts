import { defaultCache } from '@serwist/turbopack/worker';
import { NetworkOnly, Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching = [
  // Never cache Next.js RSC payloads or Supabase API calls
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
