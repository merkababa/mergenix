import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mergenix/shared-types", "@mergenix/genetics-engine", "@mergenix/genetics-data"],
  images: {
    formats: ["image/avif", "image/webp"],
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
};

export default nextConfig;
