import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// jsdom doesn't implement IntersectionObserver — mock it globally
beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Search: (props: any) => <svg data-testid="icon-search" {...props} />,
  Filter: (props: any) => <svg data-testid="icon-filter" {...props} />,
  Microscope: (props: any) => <svg data-testid="icon-microscope" {...props} />,
  Dna: (props: any) => <svg data-testid="icon-dna" {...props} />,
  Activity: (props: any) => <svg data-testid="icon-activity" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="icon-chevron-right" {...props} />,
  ChevronLeft: (props: any) => <svg data-testid="icon-chevron-left" {...props} />,
  RotateCcw: (props: any) => <svg data-testid="icon-rotate-ccw" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => {
    const { variant, hover, rainbow, ...htmlProps } = props;
    return <div data-testid="glass-card" {...htmlProps}>{children}</div>;
  },
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input aria-label={props['aria-label']} placeholder={props.placeholder} value={props.value} onChange={props.onChange} />,
}));

vi.mock('@/components/ui/select-filter', () => ({
  SelectFilter: (props: any) => <select aria-label={props.ariaLabel} />,
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle, id }: any) => (
    <div>
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({
    get: () => null,
    toString: () => '',
  }),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children }: any) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

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
