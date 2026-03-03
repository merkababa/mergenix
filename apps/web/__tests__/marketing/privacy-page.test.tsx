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
  ChevronRight: (props: any) => <svg data-testid="icon-chevron-right" {...props} />,
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

// ─── Import component after mocks ─────────────────────────────────────────────

import { PrivacyContent } from '../../app/(marketing)/privacy/_components/privacy-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PrivacyPage', () => {
  it('renders the Privacy Notice heading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Notice/i })).toBeInTheDocument();
  });

  it('renders section headings via SectionHeading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { name: /Data Controller/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Categories of Personal Data/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your Rights/i })).toBeInTheDocument();
  });

  it('renders data category cards using GlassCard', () => {
    render(<PrivacyContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders data subject rights content', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Right of Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Erasure/i)).toBeInTheDocument();
  });

  it('renders contact information', () => {
    render(<PrivacyContent />);

    const emailLinks = screen.getAllByRole('link', { name: /privacy@mergenix\.com/i });
    expect(emailLinks.length).toBeGreaterThan(0);
  });

  it('renders retention heading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { name: /Data Retention/i })).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<PrivacyContent />);

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
