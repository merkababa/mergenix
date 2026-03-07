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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMarketingMocks } = require('../__helpers__/mock-marketing.ts');
  return createMarketingMocks();
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Search: createIconMock('icon-search'),
  Filter: createIconMock('icon-filter'),
  Microscope: createIconMock('icon-microscope'),
  Dna: createIconMock('icon-dna'),
  Activity: createIconMock('icon-activity'),
  ChevronRight: createIconMock('icon-chevron-right'),
  ChevronLeft: createIconMock('icon-chevron-left'),
  RotateCcw: createIconMock('icon-rotate-ccw'),
}));

vi.mock('@/components/ui/glass-card', glassCardModule);

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('span', props, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('button', props, children),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: {
    'aria-label'?: string;
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
  }) =>
    React.createElement('input', {
      'aria-label': props['aria-label'],
      placeholder: props.placeholder,
      value: props.value,
      onChange: props.onChange,
    }),
}));

vi.mock('@/components/ui/select-filter', () => ({
  SelectFilter: (props: { ariaLabel?: string }) =>
    React.createElement('select', { 'aria-label': props.ariaLabel }),
}));

vi.mock('@/components/marketing/section-heading', sectionHeadingModule);

// Uses custom useSearchParams (plain object) — incompatible with
// mockNextNavigationFactory() which returns URLSearchParams.
// CatalogContent calls searchParams.get() and searchParams.toString()
// directly, so a plain object mock is sufficient here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));

vi.mock('@/components/layout/page-header', pageHeaderModule);
vi.mock('@/components/ui/scroll-reveal', scrollRevealModule);
vi.mock('next/link', nextLinkModule);

vi.mock('@/lib/disease-data', () => ({
  DISEASES: [
    {
      slug: 'cystic-fibrosis',
      name: 'Cystic Fibrosis',
      description: 'A hereditary disease affecting the lungs and digestive system.',
      category: 'Respiratory',
      inheritance: 'Autosomal Recessive',
      severity: 'high',
      confidence: 'high',
      snpCount: 3,
    },
  ],
  getAllCategories: () => ['Respiratory'],
  getAllInheritanceModels: () => ['Autosomal Recessive'],
  getDiseaseStats: () => ({
    totalDiseases: 500,
    totalSnps: 2000,
    inheritanceModels: 5,
    categoryCount: 12,
  }),
  inheritanceVariant: (_v: string) => 'default',
}));

vi.mock('@/lib/animation-variants', () => ({
  createStaggerContainer: () => ({ hidden: {}, visible: {} }),
}));

vi.mock('@mergenix/genetics-data', () => ({
  CARRIER_PANEL_COUNT_DISPLAY: '500+',
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { CatalogContent } from '../../app/(marketing)/diseases/_components/catalog-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DiseaseCatalogPage', () => {
  it('renders the Disease Catalog heading', () => {
    render(<CatalogContent />);

    // h1 heading should be present
    expect(screen.getByRole('heading', { level: 1, name: /Disease Catalog/i })).toBeInTheDocument();
  });

  it('renders stat cards using GlassCard', () => {
    render(<CatalogContent />);

    // GlassCard should be used for stat items
    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders disease cards with name and description', () => {
    render(<CatalogContent />);

    expect(screen.getByText('Cystic Fibrosis')).toBeInTheDocument();
    expect(screen.getByText(/A hereditary disease affecting the lungs/i)).toBeInTheDocument();
  });

  it('renders search input for filtering diseases', () => {
    render(<CatalogContent />);

    const searchInput = screen.getByRole('textbox', { name: /Search diseases/i });
    expect(searchInput).toBeInTheDocument();
  });

  it('renders filter controls for category, inheritance, and severity', () => {
    render(<CatalogContent />);

    expect(screen.getByRole('combobox', { name: /Filter by category/i })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: /Filter by inheritance model/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by severity/i })).toBeInTheDocument();
  });

  it('shows results count status message', () => {
    render(<CatalogContent />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<CatalogContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) => parseInt(h.tagName.replace('H', ''), 10));

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
