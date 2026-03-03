import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Search: (props: any) => <svg data-testid="icon-search" {...props} />,
  BookOpen: (props: any) => <svg data-testid="icon-book-open" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => {
    const { variant, hover, rainbow, ...htmlProps } = props;
    return <div data-testid="glass-card" {...htmlProps}>{children}</div>;
  },
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input placeholder={props.placeholder} aria-label={props['aria-label']} />,
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle, id }: any) => (
    <div>
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

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
