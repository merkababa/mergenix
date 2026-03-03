import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useScrollProgress: () => ({
    scrollYProgress: { get: () => 0 },
    opacity: 1,
    y: 0,
  }),
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

// Mock useCountUp to return stable values — avoids timer/animation complexity in tests
vi.mock('@/hooks/use-count-up', () => ({
  useCountUp: (target: number) => ({
    count: target,
    ref: { current: null },
  }),
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { SocialProof } from '../../app/_components/social-proof';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SocialProof', () => {
  it('renders the section heading', () => {
    render(<SocialProof />);
    expect(screen.getByRole('heading', { name: /Trusted by Families and Clinicians/i })).toBeInTheDocument();
  });

  it('renders all 3 testimonial cards', () => {
    render(<SocialProof />);
    // Each testimonial contains a unique blockquote — query by card author names
    expect(screen.getByText('Sarah K.')).toBeInTheDocument();
    expect(screen.getByText('Dr. James L.')).toBeInTheDocument();
    expect(screen.getByText('Maria & David R.')).toBeInTheDocument();
  });

  it('renders testimonial role labels', () => {
    render(<SocialProof />);
    expect(screen.getByText('Expecting Parent')).toBeInTheDocument();
    expect(screen.getByText('Clinical Geneticist')).toBeInTheDocument();
    expect(screen.getByText('Planning Parents')).toBeInTheDocument();
  });

  it('renders testimonial quotes', () => {
    render(<SocialProof />);
    // Use getAllByText with partial match since quotes contain HTML entities (curly quotes)
    // and the text may be split across nodes
    expect(screen.getByText(/explains results in plain language/i)).toBeInTheDocument();
    expect(screen.getByText(/carrier screening was incredibly thorough/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy-first approach/i)).toBeInTheDocument();
  });

  it('renders the count-up stat with the diseases label', () => {
    render(<SocialProof />);
    expect(screen.getByText(/diseases in database/i)).toBeInTheDocument();
  });

  it('renders the section as a social proof landmark', () => {
    render(<SocialProof />);
    expect(screen.getByRole('region', { name: /Social proof and testimonials/i })).toBeInTheDocument();
  });
});
