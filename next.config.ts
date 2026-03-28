import type { NextConfig } from 'next';

import { withSerwist } from '@serwist/turbopack';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Prevent Next.js from bundling these packages into serverless functions.
  // @serwist/turbopack dynamically requires next/dist/server/config.js at runtime;
  // marking it external lets Node.js resolve it from node_modules normally.
  serverExternalPackages: ['@serwist/turbopack', 'esbuild'],
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
