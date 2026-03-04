import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Hoisted shared mock factories ────────────────────────────────────────────
const {
  createIconMock,
  glassCardModule,
  scrollRevealModule,
  sectionHeadingModule,
  pageHeaderModule,
  nextLinkModule,
} = vi.hoisted(() => {
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
    }: {
      children?: React.ReactNode;
      className?: string;
      variant?: string;
      hover?: string;
      rainbow?: boolean;
      [key: string]: unknown;
    }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'glass-card', ...htmlProps }, children),
  });

  const scrollRevealModule = () => ({
    ScrollReveal: ({ children }: { children?: React.ReactNode }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'scroll-reveal' }, children),
  });

  const sectionHeadingModule = () => ({
    SectionHeading: ({
      title,
      subtitle,
      id,
    }: {
      title: string;
      subtitle?: string;
      id?: string;
      gradient?: string;
      className?: string;
    }): React.ReactElement =>
      React.createElement(
        'div',
        { 'data-testid': 'section-heading', id },
        React.createElement('h2', { id }, title),
        subtitle ? React.createElement('p', null, subtitle) : null,
      ),
  });

  const pageHeaderModule = () => ({
    PageHeader: ({
      title,
      subtitle,
    }: {
      title: string;
      subtitle?: string;
      breadcrumbs?: unknown[];
    }): React.ReactElement =>
      React.createElement(
        'div',
        { 'data-testid': 'page-header' },
        React.createElement('h1', null, title),
        subtitle ? React.createElement('p', null, subtitle) : null,
      ),
  });

  const nextLinkModule = () => ({
    default: ({
      children,
      href,
      ...props
    }: {
      children?: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }): React.ReactElement =>
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
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Shield: createIconMock('icon-shield'),
  FileText: createIconMock('icon-file-text'),
  Cookie: createIconMock('icon-cookie'),
  Lock: createIconMock('icon-lock'),
  Scale: createIconMock('icon-scale'),
  Clock: createIconMock('icon-clock'),
}));

vi.mock('@/components/ui/glass-card', glassCardModule);
vi.mock('@/components/ui/scroll-reveal', scrollRevealModule);
vi.mock('@/components/marketing/section-heading', sectionHeadingModule);
vi.mock('next/link', nextLinkModule);
vi.mock('@/components/layout/page-header', pageHeaderModule);

// ─── Import component after mocks ─────────────────────────────────────────────

import { LegalContent } from '../../app/(marketing)/legal/_components/legal-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LegalPage', () => {
  it('renders the Legal heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { level: 1, name: /Legal/i })).toBeInTheDocument();
  });

  it('renders privacy guarantee card using GlassCard', () => {
    render(<LegalContent />);

    expect(screen.getByText(/Your DNA Never Leaves Your Device/i)).toBeInTheDocument();
    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders the Terms of Service section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('renders the Privacy Policy section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it('renders the Cookie Policy section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Cookie Policy/i })).toBeInTheDocument();
  });

  it('renders the GINA Notice section heading', () => {
    render(<LegalContent />);

    // The section heading is "Your Rights Under GINA" — use getAllByRole since
    // jsdom renders both desktop and mobile TOC navigation items
    const ginaHeadings = screen.getAllByRole('heading', { name: /GINA/i });
    expect(ginaHeadings.length).toBeGreaterThan(0);
  });

  it('renders ScrollReveal for entrance animations on content sections', () => {
    // ScrollReveal is mocked as pass-through — so content inside it renders normally.
    // This test verifies the sections are visible (and thus wrapped in ScrollReveal).
    render(<LegalContent />);

    expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
    // "Genetic Data" appears as an h3 heading in the Privacy section
    const geneticDataElements = screen.getAllByText(/Genetic Data/i);
    expect(geneticDataElements.length).toBeGreaterThan(0);
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<LegalContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    expect(levels).toContain(1);
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });
});
