import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  XCircle: (props: Record<string, unknown>) => <svg data-testid="icon-x-circle" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="icon-chevron" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div data-testid="glass-card" className={className} {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, ...props }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; isLoading?: boolean; [key: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading && <span data-testid="loading-spinner" />}
      {children}
    </button>
  ),
  buttonVariants: () => 'mock-button-class',
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

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
