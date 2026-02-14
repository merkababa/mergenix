import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Crown: (props: Record<string, unknown>) => <svg data-testid="icon-crown" {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg data-testid="icon-sparkles" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="icon-chevron" {...props} />,
  CreditCard: (props: Record<string, unknown>) => <svg data-testid="icon-credit-card" {...props} />,
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
  Download: (props: Record<string, unknown>) => <svg data-testid="icon-download" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="icon-alert" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="icon-shield" {...props} />,
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: { children: React.ReactNode; variant?: string; [key: string]: unknown }) => (
    <span data-testid={`badge-${variant}`} {...props}>{children}</span>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Store mocks ──────────────────────────────────────────────────────────────

const mockFetchPaymentHistory = vi.fn();
const mockFetchSubscriptionStatus = vi.fn();
const mockCreateCheckout = vi.fn();
const mockClearError = vi.fn();
const mockReset = vi.fn();

vi.mock('@/lib/stores/payment-store', () => ({
  usePaymentStore: vi.fn(),
}));

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

import { usePaymentStore } from '@/lib/stores/payment-store';
import { useAuthStore } from '@/lib/stores/auth-store';

const mockUsePaymentStore = vi.mocked(usePaymentStore);
const mockUseAuthStore = vi.mocked(useAuthStore);

// ─── Import component after mocks ─────────────────────────────────────────────

import SubscriptionPage from '../../../app/(app)/subscription/page';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupAuthStore(tier: 'free' | 'premium' | 'pro' = 'premium') {
  mockUseAuthStore.mockImplementation((selector: any) => {
    const state = {
      user: {
        id: 'u1',
        email: 'test@test.com',
        name: 'Test User',
        tier,
        emailVerified: true,
        totpEnabled: false,
        createdAt: '2024-01-01',
      },
    };
    return selector(state);
  });
}

function setupPaymentStore(overrides: Record<string, unknown> = {}) {
  const defaultState = {
    paymentHistory: [
      {
        id: 'p1',
        amount: 1499,
        currency: 'USD',
        status: 'succeeded',
        tierGranted: 'premium',
        createdAt: '2024-01-15T00:00:00Z',
      },
    ],
    subscriptionStatus: {
      tier: 'premium' as const,
      isActive: true,
      paymentsCount: 1,
    },
    isLoading: false,
    isCheckoutLoading: false,
    error: null,
    createCheckout: mockCreateCheckout,
    fetchPaymentHistory: mockFetchPaymentHistory,
    fetchSubscriptionStatus: mockFetchSubscriptionStatus,
    clearError: mockClearError,
    reset: mockReset,
    ...overrides,
  };

  mockUsePaymentStore.mockImplementation((selector?: any) => {
    if (selector) return selector(defaultState);
    return defaultState;
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubscriptionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPaymentHistory.mockResolvedValue(undefined);
    mockFetchSubscriptionStatus.mockResolvedValue(undefined);
    setupAuthStore('premium');
    setupPaymentStore();
  });

  it('should render current plan heading', () => {
    render(<SubscriptionPage />);
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  it('should show Premium plan name for premium user', () => {
    render(<SubscriptionPage />);
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show Free plan for free user', () => {
    setupAuthStore('free');
    setupPaymentStore({
      subscriptionStatus: { tier: 'free' as const, isActive: false, paymentsCount: 0 },
    });

    render(<SubscriptionPage />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('should show Pro plan for pro user', () => {
    setupAuthStore('pro');
    setupPaymentStore({
      subscriptionStatus: { tier: 'pro' as const, isActive: true, paymentsCount: 1 },
    });

    render(<SubscriptionPage />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('should show upgrade to Pro option for premium user', () => {
    render(<SubscriptionPage />);
    // "Upgrade to Pro" appears in both h3 heading and button text
    const upgradeTexts = screen.getAllByText('Upgrade to Pro');
    expect(upgradeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('should show both Premium and Pro upgrades for free user', () => {
    setupAuthStore('free');
    setupPaymentStore({
      subscriptionStatus: { tier: 'free' as const, isActive: false, paymentsCount: 0 },
    });

    render(<SubscriptionPage />);
    // Each upgrade option has an h3 heading and a button, so text appears twice per tier
    const premiumUpgrades = screen.getAllByText('Upgrade to Premium');
    const proUpgrades = screen.getAllByText('Upgrade to Pro');
    expect(premiumUpgrades.length).toBeGreaterThanOrEqual(1);
    expect(proUpgrades.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "You have the best plan" for pro user', () => {
    setupAuthStore('pro');
    setupPaymentStore({
      subscriptionStatus: { tier: 'pro' as const, isActive: true, paymentsCount: 1 },
    });

    render(<SubscriptionPage />);
    expect(screen.getByText('You have the best plan')).toBeInTheDocument();
  });

  it('should show payment history items', () => {
    render(<SubscriptionPage />);
    expect(screen.getByText('Premium Plan Purchase')).toBeInTheDocument();
    // $14.99 appears in both the current plan price and in payment history
    const priceElements = screen.getAllByText(/\$14\.99/);
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "No payments yet" for empty history', () => {
    setupPaymentStore({ paymentHistory: [] });

    render(<SubscriptionPage />);
    expect(screen.getByText('No payments yet')).toBeInTheDocument();
  });

  it('should call fetchPaymentHistory on mount', () => {
    render(<SubscriptionPage />);
    expect(mockFetchPaymentHistory).toHaveBeenCalled();
  });

  it('should call fetchSubscriptionStatus on mount', () => {
    render(<SubscriptionPage />);
    expect(mockFetchSubscriptionStatus).toHaveBeenCalled();
  });

  it('should show error banner when error exists', () => {
    setupPaymentStore({ error: 'Something went wrong' });

    render(<SubscriptionPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should show loading skeleton when loading with no data', () => {
    setupPaymentStore({
      isLoading: true,
      paymentHistory: null,
      subscriptionStatus: null,
    });

    render(<SubscriptionPage />);
    // Loading skeleton has aria-busy="true" and role="status"
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading subscription information...')).toBeInTheDocument();
  });

  it('should show Compare All Plans link', () => {
    render(<SubscriptionPage />);
    const link = screen.getByText('Compare All Plans');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/products');
  });

  it('should call createCheckout when upgrade button clicked', async () => {
    mockCreateCheckout.mockResolvedValue({ checkoutUrl: 'https://stripe.com/checkout', sessionId: 'sess_1' });

    // Mock window.location.href assignment
    const locationHrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    render(<SubscriptionPage />);

    // The upgrade button for Pro (for a premium user)
    const upgradeButton = screen.getByLabelText(/Upgrade to Pro/);

    await act(async () => {
      fireEvent.click(upgradeButton);
    });

    await waitFor(() => {
      expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
    });

    locationHrefSpy.mockRestore();
  });
});
