import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock the base HTTP client ─────────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api/client', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
}));

import {
  createCheckout,
  getPaymentHistory,
  getSubscriptionStatus,
} from '@/lib/api/payment-client';
import type {
  CheckoutResponse,
  PaymentHistoryItem,
  SubscriptionStatus,
} from '@/lib/api/payment-client';

describe('payment-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createCheckout ────────────────────────────────────────────────────

  describe('createCheckout', () => {
    it('should call POST /payments/checkout with tier in body', async () => {
      mockPost.mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay_abc',
        session_id: 'cs_test_123',
      });

      await createCheckout('premium');

      expect(mockPost).toHaveBeenCalledWith('/payments/checkout', { tier: 'premium' });
    });

    it('should transform snake_case response to camelCase', async () => {
      mockPost.mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay_abc',
        session_id: 'cs_test_123',
      });

      const result = await createCheckout('premium');

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.stripe.com/c/pay_abc',
        sessionId: 'cs_test_123',
      });
    });

    it('should work for "premium" tier', async () => {
      mockPost.mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay_premium',
        session_id: 'cs_premium_001',
      });

      const result = await createCheckout('premium');

      expect(mockPost).toHaveBeenCalledWith('/payments/checkout', { tier: 'premium' });
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/c/pay_premium');
      expect(result.sessionId).toBe('cs_premium_001');
    });

    it('should work for "pro" tier', async () => {
      mockPost.mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay_pro',
        session_id: 'cs_pro_001',
      });

      const result = await createCheckout('pro');

      expect(mockPost).toHaveBeenCalledWith('/payments/checkout', { tier: 'pro' });
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/c/pay_pro');
      expect(result.sessionId).toBe('cs_pro_001');
    });

    it('should propagate errors from API client', async () => {
      mockPost.mockRejectedValue(new Error('CHECKOUT_FAILED'));

      await expect(createCheckout('premium')).rejects.toThrow('CHECKOUT_FAILED');
    });
  });

  // ── getPaymentHistory ─────────────────────────────────────────────────

  describe('getPaymentHistory', () => {
    it('should call GET /payments/history', async () => {
      mockGet.mockResolvedValue([]);

      await getPaymentHistory();

      expect(mockGet).toHaveBeenCalledWith('/payments/history');
    });

    it('should transform each item snake_case to camelCase', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'pay_1',
          amount: 2999,
          currency: 'USD',
          status: 'succeeded',
          tier_granted: 'premium',
          created_at: '2024-06-15T10:30:00Z',
        },
      ]);

      const result = await getPaymentHistory();

      expect(result).toEqual([
        {
          id: 'pay_1',
          amount: 2999,
          currency: 'USD',
          status: 'succeeded',
          tierGranted: 'premium',
          createdAt: '2024-06-15T10:30:00Z',
        },
      ]);
    });

    it('should return empty array when no payments', async () => {
      mockGet.mockResolvedValue([]);

      const result = await getPaymentHistory();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple payment items', async () => {
      mockGet.mockResolvedValue([
        {
          id: 'pay_1',
          amount: 2999,
          currency: 'USD',
          status: 'succeeded',
          tier_granted: 'premium',
          created_at: '2024-06-15T10:30:00Z',
        },
        {
          id: 'pay_2',
          amount: 4999,
          currency: 'USD',
          status: 'succeeded',
          tier_granted: 'pro',
          created_at: '2024-07-01T14:00:00Z',
        },
        {
          id: 'pay_3',
          amount: 2999,
          currency: 'EUR',
          status: 'refunded',
          tier_granted: 'premium',
          created_at: '2024-05-10T08:15:00Z',
        },
      ]);

      const result = await getPaymentHistory();

      expect(result).toHaveLength(3);
      expect(result[0].tierGranted).toBe('premium');
      expect(result[1].tierGranted).toBe('pro');
      expect(result[2].status).toBe('refunded');
      expect(result[2].currency).toBe('EUR');
    });

    it('should propagate errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(getPaymentHistory()).rejects.toThrow('Network error');
    });
  });

  // ── getSubscriptionStatus ─────────────────────────────────────────────

  describe('getSubscriptionStatus', () => {
    it('should call GET /payments/tier-status', async () => {
      mockGet.mockResolvedValue({
        tier: 'free',
        is_active: false,
        payments_count: 0,
      });

      await getSubscriptionStatus();

      expect(mockGet).toHaveBeenCalledWith('/payments/tier-status');
    });

    it('should transform snake_case to camelCase', async () => {
      mockGet.mockResolvedValue({
        tier: 'premium',
        is_active: true,
        payments_count: 3,
      });

      const result = await getSubscriptionStatus();

      expect(result).toEqual({
        tier: 'premium',
        isActive: true,
        paymentsCount: 3,
      });
    });

    it('should handle free tier (tier: "free", is_active: false)', async () => {
      mockGet.mockResolvedValue({
        tier: 'free',
        is_active: false,
        payments_count: 0,
      });

      const result = await getSubscriptionStatus();

      expect(result.tier).toBe('free');
      expect(result.isActive).toBe(false);
      expect(result.paymentsCount).toBe(0);
    });

    it('should handle premium tier (tier: "premium", is_active: true)', async () => {
      mockGet.mockResolvedValue({
        tier: 'premium',
        is_active: true,
        payments_count: 1,
      });

      const result = await getSubscriptionStatus();

      expect(result.tier).toBe('premium');
      expect(result.isActive).toBe(true);
      expect(result.paymentsCount).toBe(1);
    });

    it('should handle pro tier (tier: "pro", is_active: true)', async () => {
      mockGet.mockResolvedValue({
        tier: 'pro',
        is_active: true,
        payments_count: 5,
      });

      const result = await getSubscriptionStatus();

      expect(result.tier).toBe('pro');
      expect(result.isActive).toBe(true);
      expect(result.paymentsCount).toBe(5);
    });

    it('should propagate errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'));

      await expect(getSubscriptionStatus()).rejects.toThrow('Unauthorized');
    });
  });

  // ── Type safety ───────────────────────────────────────────────────────

  describe('type safety', () => {
    it('should return correctly typed CheckoutResponse', async () => {
      mockPost.mockResolvedValue({
        checkout_url: 'https://checkout.stripe.com/c/pay_typed',
        session_id: 'cs_typed_001',
      });

      const result: CheckoutResponse = await createCheckout('premium');

      // Verify the shape matches CheckoutResponse interface
      expect(typeof result.checkoutUrl).toBe('string');
      expect(typeof result.sessionId).toBe('string');
      // Verify snake_case keys do NOT exist on the returned object
      expect((result as unknown as Record<string, unknown>)['checkout_url']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['session_id']).toBeUndefined();
    });

    it('should return correctly typed SubscriptionStatus with Tier type', async () => {
      mockGet.mockResolvedValue({
        tier: 'pro',
        is_active: true,
        payments_count: 2,
      });

      const result: SubscriptionStatus = await getSubscriptionStatus();

      // Verify the shape matches SubscriptionStatus interface
      expect(typeof result.tier).toBe('string');
      expect(typeof result.isActive).toBe('boolean');
      expect(typeof result.paymentsCount).toBe('number');
      // Verify tier is a valid Tier value
      expect(['free', 'premium', 'pro']).toContain(result.tier);
      // Verify snake_case keys do NOT exist on the returned object
      expect((result as unknown as Record<string, unknown>)['is_active']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['payments_count']).toBeUndefined();
    });
  });
});
