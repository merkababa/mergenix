import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { mockGlassCardFactory, mockButtonFactory } from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

// ─── Modal manager mock ───────────────────────────────────────────────────────

const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();

const mockModalState: Record<string, any> = {
  modalStack: [],
  isAnyOpen: false,
  openModal: mockOpenModal,
  closeModal: mockCloseModal,
};

vi.mock('@/hooks/use-modal-manager', () => ({
  useModalManager: Object.assign(
    (selector?: (state: any) => any) => (selector ? selector(mockModalState) : mockModalState),
    { getState: () => mockModalState, setState: vi.fn() },
  ),
}));

// ─── Focus trap mock ──────────────────────────────────────────────────────────

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: vi.fn(),
}));

// ─── Animation mocks ─────────────────────────────────────────────────────────

vi.mock('@/lib/animations/modal-variants', () => ({
  overlayVariants: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  modalVariants: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { SensitiveContentGuard } from '../../../components/ui/sensitive-content-guard';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SensitiveContentGuard', () => {
  const childContent = 'Carrier result: CFTR pathogenic variant detected';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: Free tier user sees upgrade CTA, content NOT in DOM ──────────

  it('shows upgrade CTA for free tier user, content not in DOM', () => {
    const onUpgrade = vi.fn();

    render(
      <SensitiveContentGuard
        category="carrier"
        tier="free"
        requiredTier="premium"
        onUpgrade={onUpgrade}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Upgrade button is inside aria-hidden container, so use { hidden: true }
    expect(
      screen.getByRole('button', { name: /unlock with premium/i, hidden: true }),
    ).toBeInTheDocument();

    // Real content should NOT be in the DOM
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();

    // Should not show "Reveal Results" button
    expect(
      screen.queryByRole('button', { name: /reveal results/i, hidden: true }),
    ).not.toBeInTheDocument();
  });

  // ── Test 2: Premium tier user sees blurred state with reveal button ──────

  it('shows blurred state with Reveal Results button for premium tier', () => {
    render(
      <SensitiveContentGuard category="carrier" tier="premium" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Reveal button should be visible
    expect(screen.getByRole('button', { name: /reveal results/i })).toBeInTheDocument();

    // Real content should NOT be in the DOM yet
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();

    // Upgrade CTA should NOT be shown
    expect(screen.queryByRole('button', { name: /unlock with/i })).not.toBeInTheDocument();
  });

  // ── Test 3: Reveal non-AD content → content becomes visible ──────────────

  it('reveals content immediately when clicking Reveal on non-AD content', () => {
    render(
      <SensitiveContentGuard
        category="prs"
        tier="premium"
        requiredTier="premium"
        isAutosomalDominant={false}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Content not in DOM before reveal
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();

    // Click reveal
    fireEvent.click(screen.getByRole('button', { name: /reveal results/i }));

    // Content should now be visible
    expect(screen.getByText(childContent)).toBeInTheDocument();

    // Reveal button should be gone
    expect(screen.queryByRole('button', { name: /reveal results/i })).not.toBeInTheDocument();
  });

  // ── Test 4: Reveal AD content → warning modal appears first ──────────────

  it('shows AD warning modal when clicking Reveal on AD content', () => {
    render(
      <SensitiveContentGuard
        category="carrier"
        tier="premium"
        requiredTier="premium"
        isAutosomalDominant={true}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Click reveal
    fireEvent.click(screen.getByRole('button', { name: /reveal results/i }));

    // Warning modal should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // Title contains the text
    expect(screen.getByText(/Important: Autosomal Dominant Condition/)).toBeInTheDocument();
    // Description contains the warning message
    expect(screen.getByText(/direct medical implications for you/i)).toBeInTheDocument();

    // Content should still NOT be in the DOM
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();

    // Both action buttons should be present
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  // ── Test 5: AD warning "Continue" → content revealed ─────────────────────

  it('reveals content after clicking Continue in AD warning', () => {
    render(
      <SensitiveContentGuard
        category="carrier"
        tier="premium"
        requiredTier="premium"
        isAutosomalDominant={true}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Click reveal to show warning
    fireEvent.click(screen.getByRole('button', { name: /reveal results/i }));

    // Click Continue
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Warning modal should be gone
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Content should be visible
    expect(screen.getByText(childContent)).toBeInTheDocument();
  });

  // ── Test 6: AD warning "Go Back" → stays blurred ─────────────────────────

  it('stays blurred after clicking Go Back in AD warning', () => {
    render(
      <SensitiveContentGuard
        category="carrier"
        tier="premium"
        requiredTier="premium"
        isAutosomalDominant={true}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Click reveal to show warning
    fireEvent.click(screen.getByRole('button', { name: /reveal results/i }));

    // Click Go Back
    fireEvent.click(screen.getByRole('button', { name: /go back/i }));

    // Warning modal should be gone
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Content should NOT be in the DOM
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();

    // Reveal button should still be there
    expect(screen.getByRole('button', { name: /reveal results/i })).toBeInTheDocument();
  });

  // ── Test 7: aria-expanded toggles correctly ──────────────────────────────

  it('toggles aria-expanded on the reveal button correctly', () => {
    render(
      <SensitiveContentGuard
        category="pgx"
        tier="pro"
        requiredTier="premium"
        isAutosomalDominant={false}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    const revealButton = screen.getByRole('button', {
      name: /reveal results/i,
    });

    // Before reveal: aria-expanded should be false
    expect(revealButton).toHaveAttribute('aria-expanded', 'false');

    // Click reveal
    fireEvent.click(revealButton);

    // After reveal: the button is gone and content is shown with aria-hidden="false"
    expect(screen.queryByRole('button', { name: /reveal results/i })).not.toBeInTheDocument();
    expect(screen.getByText(childContent)).toBeInTheDocument();
  });

  // ── Test 8: Upgrade button fires onUpgrade callback ──────────────────────

  it('fires onUpgrade callback when upgrade button is clicked', () => {
    const onUpgrade = vi.fn();

    render(
      <SensitiveContentGuard
        category="carrier"
        tier="free"
        requiredTier="premium"
        onUpgrade={onUpgrade}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    fireEvent.click(screen.getByRole('button', { name: /unlock with premium/i, hidden: true }));

    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  // ── Additional edge case tests ──────────────────────────────────────────

  it("shows 'Unlock with Pro' for pro-required content", () => {
    render(
      <SensitiveContentGuard category="carrier" tier="premium" requiredTier="pro">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    expect(
      screen.getByRole('button', { name: /unlock with pro/i, hidden: true }),
    ).toBeInTheDocument();
    expect(screen.queryByText(childContent)).not.toBeInTheDocument();
  });

  it('pro tier can access premium-required content', () => {
    render(
      <SensitiveContentGuard category="prs" tier="pro" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    // Should show reveal button, NOT upgrade CTA
    expect(screen.getByRole('button', { name: /reveal results/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock with/i })).not.toBeInTheDocument();
  });

  it('AD warning modal has correct ARIA role and labels', () => {
    render(
      <SensitiveContentGuard
        category="carrier"
        tier="premium"
        requiredTier="premium"
        isAutosomalDominant={true}
      >
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    fireEvent.click(screen.getByRole('button', { name: /reveal results/i }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });

  it("upgrade CTA outer container does NOT have aria-hidden='true' (upgrade button must be accessible)", () => {
    render(
      <SensitiveContentGuard category="carrier" tier="free" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );

    const card = screen.getByTestId('glass-card');
    expect(card).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('displays correct category label in upgrade message', () => {
    const { rerender } = render(
      <SensitiveContentGuard category="carrier" tier="free" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );
    expect(screen.getByText(/Carrier Screening results require/i)).toBeInTheDocument();

    rerender(
      <SensitiveContentGuard category="pgx" tier="free" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );
    expect(screen.getByText(/Pharmacogenomics results require/i)).toBeInTheDocument();

    rerender(
      <SensitiveContentGuard category="prs" tier="free" requiredTier="premium">
        <p>{childContent}</p>
      </SensitiveContentGuard>,
    );
    expect(screen.getByText(/Polygenic Risk Scores results require/i)).toBeInTheDocument();
  });
});
