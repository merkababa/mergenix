import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const enforceUseClient = require('./apps/web/eslint-rules/enforce-use-client.js');

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
  // PRIVACY: Enforce "use client" in all files that handle genetic/DNA data.
  // Without this, Next.js 15 RSC would process DNA data server-side.
  {
    files: [
      'apps/web/app/(app)/analysis/**/*.{ts,tsx}',
      'apps/web/components/genetics/**/*.{ts,tsx}',
    ],
    plugins: {
      'privacy': {
        rules: {
          'enforce-use-client': enforceUseClient,
        },
      },
    },
    rules: {
      'privacy/enforce-use-client': 'error',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  // no-console: ban console.log in production source files.
  // console.warn and console.error are permitted for legitimate runtime warnings.
  // Test files and scripts are excluded via the ignores config below.
  {
    files: [
      'apps/web/**/*.{ts,tsx}',
      'packages/genetics-engine/src/**/*.ts',
      'packages/genetics-data/**/*.ts',
      'packages/shared-types/**/*.ts',
    ],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      '*.py',
      'Source/**',
      'pages/**',
      // Exclude test files from no-console enforcement
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'data/**',
      'sample_data/**',
      // Exclude scripts/ — utility scripts may use console intentionally
      'scripts/**',
    ],
  },
);
