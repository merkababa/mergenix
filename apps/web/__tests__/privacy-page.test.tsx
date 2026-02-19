import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, whileInView, viewport, ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
    section: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, whileInView, viewport, ...htmlProps
      } = props;
      return <section {...htmlProps}>{children}</section>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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
  PageHeader: ({ title, subtitle, breadcrumbs }: any) => (
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

import { PrivacyContent } from '../app/(marketing)/privacy/_components/privacy-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PrivacyPage', () => {
  it('renders privacy notice page with GDPR Article 13/14 information', () => {
    render(<PrivacyContent />);

    // The page should reference GDPR Articles 13 and 14
    expect(screen.getByText(/Article 13/i)).toBeInTheDocument();
    expect(screen.getByText(/Article 14/i)).toBeInTheDocument();
  });

  it('displays data controller information', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Data Controller/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mergenix/).length).toBeGreaterThan(0);
  });

  it('lists categories of personal data processed', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Categories of Personal Data/i)).toBeInTheDocument();
    expect(screen.getByText(/account info/i)).toBeInTheDocument();
    expect(screen.getByText(/payment info/i)).toBeInTheDocument();
    expect(screen.getByText(/encrypted analysis results/i)).toBeInTheDocument();
  });

  it('explains legal basis for processing', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Legal Basis/i)).toBeInTheDocument();
    // GDPR Art 6(1)(a) — consent
    expect(screen.getByText(/Art(?:icle)?\s*6\(1\)\(a\)/i)).toBeInTheDocument();
    // GDPR Art 6(1)(b) — contract
    expect(screen.getByText(/Art(?:icle)?\s*6\(1\)\(b\)/i)).toBeInTheDocument();
  });

  it('describes data subject rights (access, rectification, erasure, portability)', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Your Rights/i)).toBeInTheDocument();
    expect(screen.getByText(/Right of Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Rectification/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Erasure/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Data Portability/i)).toBeInTheDocument();
  });

  it('includes contact information for data protection queries', () => {
    render(<PrivacyContent />);

    // Should have at least one contact email for privacy queries
    expect(screen.getAllByText(/privacy@mergenix\.com/).length).toBeGreaterThan(0);
  });

  it('heading hierarchy is correct', () => {
    const { container } = render(<PrivacyContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    // Should have at least h1 and h2
    expect(levels).toContain(1);
    expect(levels).toContain(2);

    // No skipped levels
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });
});
