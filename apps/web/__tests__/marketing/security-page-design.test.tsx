import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  Lock: (props: any) => <svg data-testid="icon-lock" {...props} />,
  EyeOff: (props: any) => <svg data-testid="icon-eye-off" {...props} />,
  Server: (props: any) => <svg data-testid="icon-server" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="icon-chevron-down" {...props} />,
  Cpu: (props: any) => <svg data-testid="icon-cpu" {...props} />,
  Globe: (props: any) => <svg data-testid="icon-globe" {...props} />,
  KeyRound: (props: any) => <svg data-testid="icon-key-round" {...props} />,
  ShieldCheck: (props: any) => <svg data-testid="icon-shield-check" {...props} />,
  HardDrive: (props: any) => <svg data-testid="icon-hard-drive" {...props} />,
  Workflow: (props: any) => <svg data-testid="icon-workflow" {...props} />,
  XCircle: (props: any) => <svg data-testid="icon-x-circle" {...props} />,
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

import { SecurityContent } from '../../app/(marketing)/security/_components/security-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SecurityPage (design system)', () => {
  it('uses SectionHeading for Zero-Knowledge Architecture section', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Zero-Knowledge Architecture/i }),
    ).toBeInTheDocument();
  });

  it('uses SectionHeading for Privacy Promises section', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Privacy Promises/i }),
    ).toBeInTheDocument();
  });

  it('uses GlassCard for content blocks', () => {
    render(<SecurityContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('uses ScrollReveal for section entrance animations', () => {
    // ScrollReveal is mocked as pass-through — content inside should render normally
    render(<SecurityContent />);

    expect(screen.getByText(/Zero-Knowledge Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/How Your Data Flows/i)).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<SecurityContent />);

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
