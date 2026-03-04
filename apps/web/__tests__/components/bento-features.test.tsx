import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockGlassCardFactory,
  mockSectionHeadingFactory,
  mockScrollRevealFactory,
  mockNextLinkFactory,
  mockScrollProgressResult,
  mockLucideIcons,
} from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/scroll-reveal', () => ({
  ...mockScrollRevealFactory(),
  useScrollProgress: () => mockScrollProgressResult(),
}));

vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('next/link', () => mockNextLinkFactory());
// Mock lucide-react icons used by BentoFeatures
vi.mock('lucide-react', () => mockLucideIcons('Microscope', 'Dna', 'Pill', 'BarChart3', 'ArrowRight'));

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
