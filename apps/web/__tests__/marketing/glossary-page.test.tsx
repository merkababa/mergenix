import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Hoisted shared mock factories ────────────────────────────────────────────
const {
  createIconMock,
  glassCardModule,
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
    sectionHeadingModule,
    pageHeaderModule,
    nextLinkModule,
  };
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Search: createIconMock('icon-search'),
  BookOpen: createIconMock('icon-book-open'),
}));

vi.mock('@/components/ui/glass-card', glassCardModule);

vi.mock('@/components/ui/input', () => ({
  Input: (props: { placeholder?: string; 'aria-label'?: string }) =>
    React.createElement('input', {
      placeholder: props.placeholder,
      'aria-label': props['aria-label'],
    }),
}));

vi.mock('@/components/marketing/section-heading', sectionHeadingModule);
vi.mock('@/components/layout/page-header', pageHeaderModule);
vi.mock('next/link', nextLinkModule);

vi.mock('@/lib/glossary-data', () => ({
  GLOSSARY_TERMS: [
    {
      term: 'Allele',
      definition: 'One of two or more versions of a gene.',
    },
    {
      term: 'Carrier',
      definition: 'An individual who has one copy of a mutated gene.',
    },
  ],
  RELATED_TERMS: {
    Allele: ['Carrier'],
  },
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { GlossaryContent } from '../../app/(marketing)/glossary/_components/glossary-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GlossaryPage', () => {
  it('renders the Genetic Glossary heading', () => {
    render(<GlossaryContent />);

    expect(screen.getByRole('heading', { level: 1, name: /Genetic Glossary/i })).toBeInTheDocument();
  });

  it('renders glossary terms in GlassCard components', () => {
    render(<GlossaryContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders glossary term names and definitions', () => {
    render(<GlossaryContent />);

    expect(screen.getByText('Allele')).toBeInTheDocument();
    expect(screen.getByText(/One of two or more versions of a gene/i)).toBeInTheDocument();
    // 'Carrier' appears as both a term heading and a related-term button
    expect(screen.getAllByText('Carrier').length).toBeGreaterThan(0);
  });

  it('renders search input for filtering glossary terms', () => {
    render(<GlossaryContent />);

    const searchInput = screen.getByRole('textbox', { name: /Search glossary terms/i });
    expect(searchInput).toBeInTheDocument();
  });

  it('renders alphabet navigation for browsing by letter', () => {
    render(<GlossaryContent />);

    const nav = screen.getByRole('navigation', { name: /Browse by letter/i });
    expect(nav).toBeInTheDocument();
  });

  it('shows count of terms visible', () => {
    render(<GlossaryContent />);

    // Status region announces how many terms are shown
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<GlossaryContent />);

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
