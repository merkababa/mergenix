/**
 * Shared mock type definitions and reference implementations for marketing page tests.
 *
 * IMPORTANT — Vitest hoisting constraint:
 * vi.mock() calls are hoisted above all import statements by Vitest.
 * This means you CANNOT import from this file and then use those imports
 * directly inside vi.mock() factory functions — they will be undefined at
 * the time the factory runs.
 *
 * CORRECT pattern (used in all marketing test files):
 *   const { createIconMock, glassCardModule, ... } = vi.hoisted(() => {
 *     // Copy the factory definitions inline here — they run before imports
 *     const createIconMock = (testId: string) => ...
 *     return { createIconMock, ... };
 *   });
 *   vi.mock('@/components/ui/glass-card', glassCardModule);
 *
 * This file documents the canonical factory implementations for reference
 * and provides the shared prop types used across marketing tests.
 */

import React from 'react';

// ─── Shared prop interfaces ────────────────────────────────────────────────────

export interface GlassCardProps {
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  hover?: string;
  rainbow?: boolean;
  [key: string]: unknown;
}

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  id?: string;
  gradient?: string;
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: unknown[];
}

export interface LinkProps {
  children?: React.ReactNode;
  href: string;
  [key: string]: unknown;
}

// ─── Reference implementations (used as canonical definitions) ─────────────────

export function createIconMock(
  testId: string,
): (props: React.SVGProps<SVGSVGElement>) => React.ReactElement {
  return function IconMock(props) {
    return React.createElement('svg', { 'data-testid': testId, ...props });
  };
}

export function mockGlassCard({
  children,
  variant: _v,
  hover: _h,
  rainbow: _r,
  ...htmlProps
}: GlassCardProps): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'glass-card', ...htmlProps }, children);
}

export function mockSectionHeading({
  title,
  subtitle,
  id,
}: SectionHeadingProps): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': 'section-heading', id },
    React.createElement('h2', { id }, title),
    subtitle ? React.createElement('p', null, subtitle) : null,
  );
}

export function mockPageHeader({ title, subtitle }: PageHeaderProps): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-testid': 'page-header' },
    React.createElement('h1', null, title),
    subtitle ? React.createElement('p', null, subtitle) : null,
  );
}

export function mockScrollReveal({
  children,
}: {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}): React.ReactElement {
  return React.createElement('div', { 'data-testid': 'scroll-reveal' }, children);
}

export function mockLink({ children, href, ...props }: LinkProps): React.ReactElement {
  return React.createElement('a', { href, ...props }, children);
}
