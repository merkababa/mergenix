import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

import {
  mockLucideIcons,
  mockGlassCardFactory,
  mockButtonFactory,
  mockNextLinkFactory,
} from '../../__helpers__';

vi.mock('lucide-react', () => mockLucideIcons('CheckCircle2', 'ChevronRight', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

const mockRouterPush = vi.fn();
let mockSearchParamsMap = new Map<string, string>();

vi.mock('next/link', () => mockNextLinkFactory());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParamsMap.get(key) ?? null,
  }),
}));

const mockFetchProfile = vi.fn();
const mockStoreState: Record<string, unknown> = {
  fetchProfile: mockFetchProfile,
  user: { tier: 'premium' },
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign((selector: (state: any) => any) => selector(mockStoreState), {
    getState: () => mockStoreState,
    setState: vi.fn(),
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import PaymentSuccessPage from '../../../app/(app)/payment/success/page';

// ─── Helper: flush microtasks + advance fake timers ───────────────────────────

async function flushAndAdvance(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSearchParamsMap = new Map([['session_id', 'sess_test_123']]);
    mockFetchProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show verifying state initially when session_id is present', () => {
    mockFetchProfile.mockReturnValue(new Promise(() => {}));
    render(<PaymentSuccessPage />);
    expect(screen.getByText('Verifying your purchase...')).toBeInTheDocument();
  });

  it('should render "Payment Successful!" heading after verification', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
  });

  it('should call fetchProfile on mount with session_id', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    expect(mockFetchProfile).toHaveBeenCalled();
  });

  it('should show session ID from search params after verification', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    expect(screen.getByText(/sess_test_123/)).toBeInTheDocument();
  });

  it('should show countdown timer after verification', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    // Visible countdown text + sr-only announcement both contain the text
    const matches = screen.getAllByText(/Redirecting in 20 second/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('should redirect to /subscription after countdown reaches 0', async () => {
    render(<PaymentSuccessPage />);
    // Flush verification promise
    await act(() => flushAndAdvance());

    // Advance countdown: 21 ticks (20 to reach 0, +1 for the redirect effect)
    for (let i = 0; i < 21; i++) {
      await act(() => flushAndAdvance(1000));
    }

    expect(mockRouterPush).toHaveBeenCalledWith('/subscription');
  });

  it('should show "Go to My Plan" link after verification', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    const link = screen.getByText('Go to My Plan');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/subscription');
  });

  it('should show "View Products" link after verification', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    const link = screen.getByText('View Products');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/products');
  });

  it('should show user tier in success message', async () => {
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    expect(screen.getByText(/upgraded to Premium/)).toBeInTheDocument();
  });

  it('should still show success even if fetchProfile fails', async () => {
    mockFetchProfile.mockRejectedValue(new Error('Network error'));
    render(<PaymentSuccessPage />);
    await act(() => flushAndAdvance());
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
  });

  it('should not show session ID when not in params', () => {
    mockSearchParamsMap = new Map();
    render(<PaymentSuccessPage />);
    // Without session_id, isVerifying starts as false
    expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
    expect(screen.queryByText(/Session:/)).not.toBeInTheDocument();
  });
});
