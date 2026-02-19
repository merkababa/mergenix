import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: undefined,
        minForks: 1,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@mergenix/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@mergenix/genetics-engine': path.resolve(__dirname, '../../packages/genetics-engine/src'),
      '@mergenix/genetics-data': path.resolve(__dirname, '../../packages/genetics-data'),
    },
  },
});
