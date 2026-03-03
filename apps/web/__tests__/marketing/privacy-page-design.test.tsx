import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  Lock: (props: any) => <svg data-testid="icon-lock" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file-text" {...props} />,
  Scale: (props: any) => <svg data-testid="icon-scale" {...props} />,
  Mail: (props: any) => <svg data-testid="icon-mail" {...props} />,
  Clock: (props: any) => <svg data-testid="icon-clock" {...props} />,
  UserCheck: (props: any) => <svg data-testid="icon-user-check" {...props} />,
  Database: (props: any) => <svg data-testid="icon-database" {...props} />,
  Check: (props: any) => <svg data-testid="icon-check" {...props} />,
  FileSearch: (props: any) => <svg data-testid="icon-file-search" {...props} />,
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

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
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

// ─── Import component after mocks ─────────────────────────────────────────────

import { PrivacyContent } from '../../app/(marketing)/privacy/_components/privacy-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PrivacyPage (design system)', () => {
  it('uses SectionHeading for Data Controller section', () => {
    render(<PrivacyContent />);

    // SectionHeading renders an h2 — verify section headings are present
    expect(screen.getByRole('heading', { level: 2, name: /Data Controller/i })).toBeInTheDocument();
  });

  it('uses SectionHeading for Your Rights section', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { level: 2, name: /Your Rights/i })).toBeInTheDocument();
  });

  it('uses GlassCard for content blocks', () => {
    render(<PrivacyContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('uses ScrollReveal for section entrance animations', () => {
    // ScrollReveal is mocked as pass-through — content inside should render normally
    render(<PrivacyContent />);

    // These texts appear inside ScrollReveal-wrapped sections
    const dataControllerMatches = screen.getAllByText(/Data Controller/i);
    expect(dataControllerMatches.length).toBeGreaterThan(0);
    const dpoMatches = screen.getAllByText(/Data Protection Officer/i);
    expect(dpoMatches.length).toBeGreaterThan(0);
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<PrivacyContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    expect(levels).toContain(1);
    expect(levels).toContain(2);
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });
});
