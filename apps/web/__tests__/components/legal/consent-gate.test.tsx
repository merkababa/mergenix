/**
 * L5 — ConsentGate component tests.
 *
 * TDD: Tests written FIRST (RED), then implementation (GREEN).
 *
 * Coverage:
 * - ConsentGate renders children when consent is granted
 * - ConsentGate renders null when consent is NOT granted (no fallback)
 * - ConsentGate renders fallback prop when consent is NOT granted
 * - ConsentGate renders children (not fallback) when consent IS granted
 * - Default fallback (omitted) still renders null for backward compatibility
 * - Works for 'analytics' category
 * - Works for 'marketing' category
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Store mock ─────────────────────────────────────────────────────────────

const mockStoreState: Record<string, any> = {
  analyticsEnabled: false,
  marketingEnabled: false,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── Import component after mocks ────────────────────────────────────────────

import { ConsentGate } from '../../../components/legal/consent-gate';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ConsentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.analyticsEnabled = false;
    mockStoreState.marketingEnabled = false;
  });

  // ── Analytics category ──────────────────────────────────────────────────

  it('renders null when analytics consent is NOT granted', () => {
    mockStoreState.analyticsEnabled = false;
    render(
      <ConsentGate category="analytics">
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    expect(screen.queryByTestId('analytics-child')).not.toBeInTheDocument();
  });

  it('renders children when analytics consent IS granted', () => {
    mockStoreState.analyticsEnabled = true;
    render(
      <ConsentGate category="analytics">
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('analytics-child')).toBeInTheDocument();
    expect(screen.getByText('Analytics Widget')).toBeInTheDocument();
  });

  // ── Marketing category ──────────────────────────────────────────────────

  it('renders null when marketing consent is NOT granted', () => {
    mockStoreState.marketingEnabled = false;
    render(
      <ConsentGate category="marketing">
        <div data-testid="marketing-child">Marketing Script</div>
      </ConsentGate>,
    );
    expect(screen.queryByTestId('marketing-child')).not.toBeInTheDocument();
  });

  it('renders children when marketing consent IS granted', () => {
    mockStoreState.marketingEnabled = true;
    render(
      <ConsentGate category="marketing">
        <div data-testid="marketing-child">Marketing Script</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('marketing-child')).toBeInTheDocument();
    expect(screen.getByText('Marketing Script')).toBeInTheDocument();
  });

  // ── Independence ────────────────────────────────────────────────────────

  it('analytics gate does NOT render when only marketing is enabled', () => {
    mockStoreState.analyticsEnabled = false;
    mockStoreState.marketingEnabled = true;
    render(
      <ConsentGate category="analytics">
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    expect(screen.queryByTestId('analytics-child')).not.toBeInTheDocument();
  });

  it('marketing gate does NOT render when only analytics is enabled', () => {
    mockStoreState.analyticsEnabled = true;
    mockStoreState.marketingEnabled = false;
    render(
      <ConsentGate category="marketing">
        <div data-testid="marketing-child">Marketing Script</div>
      </ConsentGate>,
    );
    expect(screen.queryByTestId('marketing-child')).not.toBeInTheDocument();
  });

  // ── Fallback prop ────────────────────────────────────────────────────────

  it('renders fallback when analytics consent is NOT granted and fallback is provided', () => {
    mockStoreState.analyticsEnabled = false;
    render(
      <ConsentGate
        category="analytics"
        fallback={<p data-testid="fallback-msg">Enable analytics to see this.</p>}
      >
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('fallback-msg')).toBeInTheDocument();
    expect(screen.getByText('Enable analytics to see this.')).toBeInTheDocument();
    expect(screen.queryByTestId('analytics-child')).not.toBeInTheDocument();
  });

  it('renders fallback when marketing consent is NOT granted and fallback is provided', () => {
    mockStoreState.marketingEnabled = false;
    render(
      <ConsentGate
        category="marketing"
        fallback={<p data-testid="fallback-msg">Enable marketing cookies to see this.</p>}
      >
        <div data-testid="marketing-child">Marketing Widget</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('fallback-msg')).toBeInTheDocument();
    expect(screen.queryByTestId('marketing-child')).not.toBeInTheDocument();
  });

  it('renders children (NOT fallback) when analytics consent IS granted', () => {
    mockStoreState.analyticsEnabled = true;
    render(
      <ConsentGate
        category="analytics"
        fallback={<p data-testid="fallback-msg">Fallback content</p>}
      >
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('analytics-child')).toBeInTheDocument();
    expect(screen.queryByTestId('fallback-msg')).not.toBeInTheDocument();
  });

  it('renders children (NOT fallback) when marketing consent IS granted', () => {
    mockStoreState.marketingEnabled = true;
    render(
      <ConsentGate
        category="marketing"
        fallback={<p data-testid="fallback-msg">Fallback content</p>}
      >
        <div data-testid="marketing-child">Marketing Widget</div>
      </ConsentGate>,
    );
    expect(screen.getByTestId('marketing-child')).toBeInTheDocument();
    expect(screen.queryByTestId('fallback-msg')).not.toBeInTheDocument();
  });

  it('renders null (not fallback) when no fallback prop is provided and consent NOT granted', () => {
    mockStoreState.analyticsEnabled = false;
    const { container } = render(
      <ConsentGate category="analytics">
        <div data-testid="analytics-child">Analytics Widget</div>
      </ConsentGate>,
    );
    // Nothing should be rendered — backward-compatible default
    expect(screen.queryByTestId('analytics-child')).not.toBeInTheDocument();
    // Container should be empty (null render)
    expect(container.firstChild).toBeNull();
  });
});
