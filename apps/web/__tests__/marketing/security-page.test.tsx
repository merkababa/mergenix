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

import { SecurityContent } from '../../app/(marketing)/security/_components/security-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SecurityPage', () => {
  it('renders the main page heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Your Genetic Data Never Leaves Your Browser/i })
    ).toBeInTheDocument();
  });

  it('renders Zero-Knowledge Architecture section heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { name: /Zero-Knowledge Architecture/i })
    ).toBeInTheDocument();
  });

  it('renders How Your Data Flows section heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { name: /How Your Data Flows/i })
    ).toBeInTheDocument();
  });

  it('renders privacy promise cards using GlassCard', () => {
    render(<SecurityContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders privacy promise content', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/We never see your DNA data/i)).toBeInTheDocument();
    expect(screen.getByText(/No server-side genetic processing/i)).toBeInTheDocument();
  });

  it('renders FAQ section heading', () => {
    render(<SecurityContent />);

    expect(screen.getByRole('heading', { name: /Security FAQ/i })).toBeInTheDocument();
  });

  it('renders FAQ items', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/Can you see my DNA data/i)).toBeInTheDocument();
    expect(screen.getByText(/What data do you store on your servers/i)).toBeInTheDocument();
  });

  it('renders Compliance section heading', () => {
    render(<SecurityContent />);

    expect(screen.getByRole('heading', { name: /Compliance/i })).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<SecurityContent />);

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
