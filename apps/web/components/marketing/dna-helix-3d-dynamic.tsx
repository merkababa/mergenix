/**
 * Dynamic import wrapper for DnaHelix3D.
 *
 * Use this export in page-level components to:
 * - Disable SSR (Three.js is browser-only)
 * - Code-split the heavy Three.js bundle (~150KB)
 * - Show the CSS fallback while the 3D canvas loads
 */

import dynamic from 'next/dynamic';
import { HelixFallback } from './helix-animation-fallback';
import type { DnaHelix3DProps } from './dna-helix-3d';

export const DnaHelix3DDynamic = dynamic<DnaHelix3DProps>(
  () => import('./dna-helix-3d').then((m) => ({ default: m.DnaHelix3D })),
  {
    ssr: false,
    loading: () => <HelixFallback />,
  },
);
