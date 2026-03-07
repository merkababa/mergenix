/**
 * Marketing page shared mock factories.
 *
 * ## Hoisting constraint
 *
 * `vi.mock()` factory functions are hoisted above all imports by Vitest.
 * This means standard ES imports are not available when mock factories execute.
 * Marketing tests solve this by defining factories inside `vi.hoisted()`.
 *
 * This file provides a `createMarketingMocks()` function that returns all the
 * canonical mock factories used across marketing page tests. Use it inside
 * `vi.hoisted()` to make them available to `vi.mock()` calls:
 *
 * @example
 * ```ts
 * const {
 *   createIconMock,
 *   glassCardModule,
 *   scrollRevealModule,
 *   sectionHeadingModule,
 *   pageHeaderModule,
 *   nextLinkModule,
 * } = vi.hoisted(() => {
 *   // Dynamic import via require() works inside vi.hoisted()
 *   // eslint-disable-next-line @typescript-eslint/no-require-imports
 *   const { createMarketingMocks } = require('../__helpers__/mock-marketing');
 *   return createMarketingMocks();
 * });
 *
 * vi.mock('@/components/ui/glass-card', glassCardModule);
 * vi.mock('@/components/ui/scroll-reveal', scrollRevealModule);
 * vi.mock('@/components/marketing/section-heading', sectionHeadingModule);
 * vi.mock('@/components/layout/page-header', pageHeaderModule);
 * vi.mock('next/link', nextLinkModule);
 * vi.mock('lucide-react', () => ({
 *   Shield: createIconMock('icon-shield'),
 *   Lock: createIconMock('icon-lock'),
 * }));
 * ```
 */

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

// Duplicates mockGlassCardFactory in mock-components.tsx — uses React.createElement
// instead of JSX for vi.hoisted() compatibility (JSX requires transpilation that
// is not available inside vi.hoisted() blocks).
interface GlassCardMockProps {
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  hover?: string;
  rainbow?: boolean;
  [key: string]: unknown;
}

interface SectionHeadingMockProps {
  title: string;
  subtitle?: string;
  id?: string;
  gradient?: string;
  className?: string;
}

interface PageHeaderMockProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: unknown[];
}

interface NextLinkMockProps {
  children?: React.ReactNode;
  href: string;
  [key: string]: unknown;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export interface MarketingMocks {
  createIconMock: (testId: string) => (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  glassCardModule: () => { GlassCard: (props: GlassCardMockProps) => React.ReactElement };
  scrollRevealModule: () => {
    ScrollReveal: (props: { children?: React.ReactNode }) => React.ReactElement;
  };
  sectionHeadingModule: () => {
    SectionHeading: (props: SectionHeadingMockProps) => React.ReactElement;
  };
  pageHeaderModule: () => { PageHeader: (props: PageHeaderMockProps) => React.ReactElement };
  nextLinkModule: () => { default: (props: NextLinkMockProps) => React.ReactElement };
}

/**
 * Creates all marketing page mock factories.
 *
 * Each factory returns a mock module object (the shape expected by `vi.mock()`).
 * The module-level factories (glassCardModule, scrollRevealModule, etc.) are
 * themselves functions that return the mock module — this is because `vi.mock()`
 * expects a factory function, not a direct object.
 */
export function createMarketingMocks(): MarketingMocks {
  const createIconMock =
    (testId: string) =>
    (props: React.SVGProps<SVGSVGElement>): React.ReactElement =>
      React.createElement('svg', { 'data-testid': testId, ...props });

  const glassCardModule = () => ({
    GlassCard: ({
      children,
      variant: _v,
      hover: _h,
      rainbow: _r,
      ...htmlProps
    }: GlassCardMockProps): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'glass-card', ...htmlProps }, children),
  });

  const scrollRevealModule = () => ({
    ScrollReveal: ({ children }: { children?: React.ReactNode }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'scroll-reveal' }, children),
  });

  const sectionHeadingModule = () => ({
    SectionHeading: ({ title, subtitle, id }: SectionHeadingMockProps): React.ReactElement =>
      React.createElement(
        'div',
        { 'data-testid': 'section-heading', id },
        React.createElement('h2', { id }, title),
        subtitle ? React.createElement('p', null, subtitle) : null,
      ),
  });

  const pageHeaderModule = () => ({
    PageHeader: ({ title, subtitle }: PageHeaderMockProps): React.ReactElement =>
      React.createElement(
        'div',
        { 'data-testid': 'page-header' },
        React.createElement('h1', null, title),
        subtitle ? React.createElement('p', null, subtitle) : null,
      ),
  });

  const nextLinkModule = () => ({
    default: ({ children, href, ...props }: NextLinkMockProps): React.ReactElement =>
      React.createElement('a', { href, ...props }, children),
  });

  return {
    createIconMock,
    glassCardModule,
    scrollRevealModule,
    sectionHeadingModule,
    pageHeaderModule,
    nextLinkModule,
  };
}
