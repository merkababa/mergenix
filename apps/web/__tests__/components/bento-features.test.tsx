import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useScrollProgress: () => ({ scrollYProgress: { get: () => 0 } }),
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

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock lucide-react icons used by BentoFeatures
vi.mock('lucide-react', () => ({
  Microscope: (props: Record<string, unknown>) => <svg data-testid="icon-microscope" {...props} />,
  Dna: (props: Record<string, unknown>) => <svg data-testid="icon-dna" {...props} />,
  Pill: (props: Record<string, unknown>) => <svg data-testid="icon-pill" {...props} />,
  BarChart3: (props: Record<string, unknown>) => <svg data-testid="icon-barchart3" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="icon-arrow-right" {...props} />,
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { BentoFeatures } from '../../app/_components/bento-features';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BentoFeatures', () => {
  it('renders the section heading', () => {
    render(<BentoFeatures />);
    expect(screen.getByRole('heading', { name: /Comprehensive Genetic Intelligence/i })).toBeInTheDocument();
  });

  it('renders the hero feature card with disease screening title', () => {
    render(<BentoFeatures />);
    expect(screen.getByText(/Disease Screening/i)).toBeInTheDocument();
  });

  it('renders all 4 feature cards (1 hero + 3 secondary)', () => {
    render(<BentoFeatures />);
    // All 4 features have distinctive badges
    expect(screen.getByText('Carrier Risk')).toBeInTheDocument();
    expect(screen.getByText('Traits')).toBeInTheDocument();
    expect(screen.getByText('PGx')).toBeInTheDocument();
    expect(screen.getByText('PRS')).toBeInTheDocument();
  });

  it('renders the secondary feature titles', () => {
    render(<BentoFeatures />);
    expect(screen.getByText(/Trait Predictions/i)).toBeInTheDocument();
    expect(screen.getByText(/Pharmacogenomics/i)).toBeInTheDocument();
    expect(screen.getByText(/Polygenic Risk Scores/i)).toBeInTheDocument();
  });

  it('renders the "Browse Disease Catalog" link pointing to /diseases', () => {
    render(<BentoFeatures />);
    const link = screen.getByRole('link', { name: /Browse the full disease catalog/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/diseases');
  });

  it('renders the section as a landmark with key features label', () => {
    render(<BentoFeatures />);
    expect(screen.getByRole('region', { name: /Key features/i })).toBeInTheDocument();
  });
});
