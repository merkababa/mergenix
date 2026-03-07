import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockLucideIcons,
  mockGlassCardFactory,
  mockButtonFactory,
  mockNextLinkFactory,
} from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => mockLucideIcons('XCircle', 'ChevronRight'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('next/link', () => mockNextLinkFactory());

// ─── Import component after mocks ─────────────────────────────────────────────

import PaymentCancelPage from '../../../app/(app)/payment/cancel/page';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentCancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render "Payment Cancelled" heading', () => {
    render(<PaymentCancelPage />);
    expect(screen.getByText('Payment Cancelled')).toBeInTheDocument();
  });

  it('should show "no charges were made" message', () => {
    render(<PaymentCancelPage />);
    expect(screen.getByText(/No charges were made/i)).toBeInTheDocument();
  });

  it('should show "Try Again" link pointing to /products', () => {
    render(<PaymentCancelPage />);
    const link = screen.getByText('Try Again');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/products');
  });

  it('should show "Go to Dashboard" link pointing to /analysis', () => {
    render(<PaymentCancelPage />);
    const link = screen.getByText('Go to Dashboard');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/analysis');
  });

  it('should render cancel icon', () => {
    render(<PaymentCancelPage />);
    expect(screen.getByTestId('icon-x-circle')).toBeInTheDocument();
  });
});
