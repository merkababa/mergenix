import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock the payment API client ───────────────────────────────────────────
const mockCreateCheckout = vi.fn();
const mockGetPaymentHistory = vi.fn();
const mockGetSubscriptionStatus = vi.fn();

vi.mock('@/lib/api/payment-client', () => ({
  createCheckout: (...args: unknown[]) => mockCreateCheckout(...args),
  getPaymentHistory: (...args: unknown[]) => mockGetPaymentHistory(...args),
  getSubscriptionStatus: (...args: unknown[]) => mockGetSubscriptionStatus(...args),
}));

import { usePaymentStore } from '@/lib/stores/payment-store';

// ── Fixtures ──────────────────────────────────────────────────────────────

const mockCheckoutResponse = {
  checkoutUrl: 'https://checkout.stripe.com/c/pay_abc',
  sessionId: 'cs_test_123',
} as const;

const mockPaymentHistory = [
  {
    id: 'pay_1',
    amount: 2999,
    currency: 'USD',
    status: 'succeeded',
    tierGranted: 'premium',
    createdAt: '2024-06-15T10:30:00Z',
  },
  {
    id: 'pay_2',
    amount: 4999,
    currency: 'USD',
    status: 'succeeded',
    tierGranted: 'pro',
    createdAt: '2024-07-01T14:00:00Z',
  },
] as const;

const mockSubscriptionStatus = {
  tier: 'premium' as const,
  isActive: true,
  paymentsCount: 2,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────

function resetStore() {
  usePaymentStore.setState({
    paymentHistory: null,
    subscriptionStatus: null,
    isLoading: false,
    isCheckoutLoading: false,
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('usePaymentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // ── Initial state ───────────────────────────────────────────────────────

  describe('initial state', () => {
    it('should start with null paymentHistory', () => {
      expect(usePaymentStore.getState().paymentHistory).toBeNull();
    });

    it('should start with null subscriptionStatus', () => {
      expect(usePaymentStore.getState().subscriptionStatus).toBeNull();
    });

    it('should start with isLoading false', () => {
      expect(usePaymentStore.getState().isLoading).toBe(false);
    });

    it('should start with isCheckoutLoading false', () => {
      expect(usePaymentStore.getState().isCheckoutLoading).toBe(false);
    });

    it('should start with null error', () => {
      expect(usePaymentStore.getState().error).toBeNull();
    });
  });

  // ── createCheckout ──────────────────────────────────────────────────────

  describe('createCheckout', () => {
    it('should set isCheckoutLoading to true during checkout', async () => {
      let loadingDuringCall = false;
      mockCreateCheckout.mockImplementation(async () => {
        loadingDuringCall = usePaymentStore.getState().isCheckoutLoading;
        return mockCheckoutResponse;
      });

      await usePaymentStore.getState().createCheckout('premium');

      expect(loadingDuringCall).toBe(true);
    });

    it('should return checkout response on success', async () => {
      mockCreateCheckout.mockResolvedValue(mockCheckoutResponse);

      const result = await usePaymentStore.getState().createCheckout('premium');

      expect(result).toEqual(mockCheckoutResponse);
    });

    it('should set isCheckoutLoading to false on success', async () => {
      mockCreateCheckout.mockResolvedValue(mockCheckoutResponse);

      await usePaymentStore.getState().createCheckout('premium');

      expect(usePaymentStore.getState().isCheckoutLoading).toBe(false);
    });

    it('should set error and isCheckoutLoading false on failure', async () => {
      mockCreateCheckout.mockRejectedValue(new Error('Checkout failed'));

      await expect(usePaymentStore.getState().createCheckout('premium')).rejects.toThrow(
        'Checkout failed',
      );

      const state = usePaymentStore.getState();
      expect(state.error).toBe('Checkout failed');
      expect(state.isCheckoutLoading).toBe(false);
    });

    it('should pass correct tier to API client', async () => {
      mockCreateCheckout.mockResolvedValue(mockCheckoutResponse);

      await usePaymentStore.getState().createCheckout('pro');

      expect(mockCreateCheckout).toHaveBeenCalledWith('pro');
    });
  });

  // ── fetchPaymentHistory ─────────────────────────────────────────────────

  describe('fetchPaymentHistory', () => {
    it('should set isLoading to true during fetch', async () => {
      let loadingDuringCall = false;
      mockGetPaymentHistory.mockImplementation(async () => {
        loadingDuringCall = usePaymentStore.getState().isLoading;
        return mockPaymentHistory;
      });

      await usePaymentStore.getState().fetchPaymentHistory();

      expect(loadingDuringCall).toBe(true);
    });

    it('should set paymentHistory on success', async () => {
      mockGetPaymentHistory.mockResolvedValue([...mockPaymentHistory]);

      await usePaymentStore.getState().fetchPaymentHistory();

      expect(usePaymentStore.getState().paymentHistory).toEqual(mockPaymentHistory);
    });

    it('should set isLoading to false on success', async () => {
      mockGetPaymentHistory.mockResolvedValue([...mockPaymentHistory]);

      await usePaymentStore.getState().fetchPaymentHistory();

      expect(usePaymentStore.getState().isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockGetPaymentHistory.mockRejectedValue(new Error('Network error'));

      await expect(usePaymentStore.getState().fetchPaymentHistory()).rejects.toThrow(
        'Network error',
      );

      const state = usePaymentStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('should handle empty payment history', async () => {
      mockGetPaymentHistory.mockResolvedValue([]);

      await usePaymentStore.getState().fetchPaymentHistory();

      expect(usePaymentStore.getState().paymentHistory).toEqual([]);
      expect(usePaymentStore.getState().paymentHistory).toHaveLength(0);
    });
  });

  // ── fetchSubscriptionStatus ─────────────────────────────────────────────

  describe('fetchSubscriptionStatus', () => {
    it('should set isLoading to true during fetch', async () => {
      let loadingDuringCall = false;
      mockGetSubscriptionStatus.mockImplementation(async () => {
        loadingDuringCall = usePaymentStore.getState().isLoading;
        return mockSubscriptionStatus;
      });

      await usePaymentStore.getState().fetchSubscriptionStatus();

      expect(loadingDuringCall).toBe(true);
    });

    it('should set subscriptionStatus on success', async () => {
      mockGetSubscriptionStatus.mockResolvedValue({ ...mockSubscriptionStatus });

      await usePaymentStore.getState().fetchSubscriptionStatus();

      expect(usePaymentStore.getState().subscriptionStatus).toEqual(mockSubscriptionStatus);
    });

    it('should set isLoading to false on success', async () => {
      mockGetSubscriptionStatus.mockResolvedValue({ ...mockSubscriptionStatus });

      await usePaymentStore.getState().fetchSubscriptionStatus();

      expect(usePaymentStore.getState().isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockGetSubscriptionStatus.mockRejectedValue(new Error('Unauthorized'));

      await expect(usePaymentStore.getState().fetchSubscriptionStatus()).rejects.toThrow(
        'Unauthorized',
      );

      const state = usePaymentStore.getState();
      expect(state.error).toBe('Unauthorized');
      expect(state.isLoading).toBe(false);
    });
  });

  // ── clearError ──────────────────────────────────────────────────────────

  describe('clearError', () => {
    it('should clear error state', () => {
      usePaymentStore.setState({ error: 'Some previous error' });

      usePaymentStore.getState().clearError();

      expect(usePaymentStore.getState().error).toBeNull();
    });
  });

  // ── reset ───────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set non-initial state
      usePaymentStore.setState({
        paymentHistory: [...mockPaymentHistory],
        subscriptionStatus: { ...mockSubscriptionStatus },
        isLoading: true,
        isCheckoutLoading: true,
        error: 'Something went wrong',
      });

      usePaymentStore.getState().reset();

      const state = usePaymentStore.getState();
      expect(state.paymentHistory).toBeNull();
      expect(state.subscriptionStatus).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isCheckoutLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear payment history and subscription status', () => {
      usePaymentStore.setState({
        paymentHistory: [...mockPaymentHistory],
        subscriptionStatus: { ...mockSubscriptionStatus },
      });

      usePaymentStore.getState().reset();

      expect(usePaymentStore.getState().paymentHistory).toBeNull();
      expect(usePaymentStore.getState().subscriptionStatus).toBeNull();
    });
  });
});
