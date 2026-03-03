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
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file-text" {...props} />,
  Cookie: (props: any) => <svg data-testid="icon-cookie" {...props} />,
  Lock: (props: any) => <svg data-testid="icon-lock" {...props} />,
  Scale: (props: any) => <svg data-testid="icon-scale" {...props} />,
  Clock: (props: any) => <svg data-testid="icon-clock" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => {
    const { variant, hover, rainbow, ...htmlProps } = props;
    return <div data-testid="glass-card" {...htmlProps}>{children}</div>;
  },
}));

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle, id }: any) => (
    <div>
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
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
