import type { NextConfig } from 'next';
import { getSecurityHeaders } from './config/security';

// Trigger initial Vercel deployment
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@mergenix/shared-types',
    '@mergenix/genetics-engine',
    '@mergenix/genetics-data',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config, { isServer }) => {
    // Ensure Web Worker .ts files from workspace packages are handled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: getSecurityHeaders(isDev),
      },
    ];
  },
};

export default nextConfig;
