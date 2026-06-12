import type { NextConfig } from 'next';

import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // NO externalizar @serwist/turbopack: al ser external traía su propia copia de
  // React, y su SerwistProvider (client component con hooks, en el root layout)
  // rompía el SSR en producción → TypeError useState null → HTTP 500 en TODAS las
  // páginas. Solo `esbuild` queda externo.
  serverExternalPackages: ['esbuild'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default withSerwist(nextConfig);
