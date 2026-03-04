import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockSectionHeadingFactory,
  mockScrollRevealFactory,
  mockScrollProgressResult,
} from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/scroll-reveal', () => ({
  ...mockScrollRevealFactory(),
  useScrollProgress: () => mockScrollProgressResult(),
}));

vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());

// ─── Import under test ────────────────────────────────────────────────────────

import { ProductDemo } from '../../app/_components/product-demo';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProductDemo', () => {
  it('renders the section heading', () => {
    render(<ProductDemo />);
    expect(screen.getByRole('heading', { name: /See Your Results Come to Life/i })).toBeInTheDocument();
  });

  it('renders the "Sample Data" badge so users know values are not real', () => {
    render(<ProductDemo />);
    expect(screen.getByText('Sample Data')).toBeInTheDocument();
  });

  it('renders mock carrier risk panel', () => {
    render(<ProductDemo />);
    expect(screen.getByText('Est. Carrier Risk')).toBeInTheDocument();
    expect(screen.getByText('Cystic Fibrosis')).toBeInTheDocument();
    expect(screen.getByText('Sickle Cell')).toBeInTheDocument();
    expect(screen.getByText('Fragile X')).toBeInTheDocument();
  });

  it('renders mock trait predictions panel', () => {
    render(<ProductDemo />);
    expect(screen.getByText('Trait Predictions')).toBeInTheDocument();
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    expect(screen.getByText('Hair Type')).toBeInTheDocument();
    expect(screen.getByText('Blood Type')).toBeInTheDocument();
  });

  it('renders progressbar roles for carrier risk bars with correct aria attributes', () => {
    render(<ProductDemo />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars.length).toBe(3);
    // Each bar should have aria-valuenow, min, max
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  it('renders the product demonstration landmark region', () => {
    render(<ProductDemo />);
    expect(screen.getByRole('region', { name: /Product demonstration/i })).toBeInTheDocument();
  });
});
