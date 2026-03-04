import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockGlassCardFactory,
  mockSectionHeadingFactory,
  mockPageHeaderFactory,
  mockScrollRevealFactory,
  mockNextLinkFactory,
  mockButtonFactory,
  mockLucideIcons,
  installSimpleIntersectionObserver,
  mockInputFactory,
  mockBadgeFactory,
} from '../__helpers__';

// jsdom doesn't implement IntersectionObserver — mock it globally
beforeAll(() => {
  installSimpleIntersectionObserver();
});

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Search', 'Filter', 'Microscope', 'Dna', 'Activity', 'ChevronRight', 'ChevronLeft', 'RotateCcw'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/badge', () => mockBadgeFactory());
vi.mock('@/components/ui/input', () => mockInputFactory());
vi.mock('@/components/ui/select-filter', () => ({
  SelectFilter: (props: any) => <select aria-label={props.ariaLabel} />,
}));
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));
vi.mock('@/components/layout/page-header', () => mockPageHeaderFactory());
vi.mock('@/components/ui/scroll-reveal', () => mockScrollRevealFactory());
vi.mock('next/link', () => mockNextLinkFactory());

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
    expect(screen.getByRole('combobox', { name: /Filter by inheritance model/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Filter by severity/i })).toBeInTheDocument();
  });

  it('shows results count status message', () => {
    render(<CatalogContent />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<CatalogContent />);

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
