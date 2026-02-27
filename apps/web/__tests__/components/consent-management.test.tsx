import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  ShieldOff: (props: any) => <svg data-testid="icon-shield-off" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="icon-alert-triangle" {...props} />,
  Check: (props: any) => <svg data-testid="icon-check" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
  ShieldCheck: (props: any) => <svg data-testid="icon-shield-check" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => {
    const { variant, hover, rainbow, ...htmlProps } = props;
    return <div data-testid="glass-card" {...htmlProps}>{children}</div>;
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} className={className} {...props}>
      {children}
    </button>
  ),
}));

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockWithdrawGeneticConsent = vi.fn();
const mockReGrantGeneticConsent = vi.fn();

let mockStoreState: Record<string, any> = {
  geneticDataConsentGiven: true,
  consentWithdrawn: false,
  withdrawGeneticConsent: mockWithdrawGeneticConsent,
  reGrantGeneticConsent: mockReGrantGeneticConsent,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    {
      getState: () => mockStoreState,
      setState: (partial: Record<string, any>) => {
        Object.assign(mockStoreState, partial);
      },
    },
  ),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { ConsentManagement } from '../../components/account/consent-management';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConsentManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      geneticDataConsentGiven: true,
      consentWithdrawn: false,
      withdrawGeneticConsent: mockWithdrawGeneticConsent,
      reGrantGeneticConsent: mockReGrantGeneticConsent,
    };
  });

  it('renders consent management section with current consent status', () => {
    render(<ConsentManagement />);

    expect(screen.getByText(/Consent Management/i)).toBeInTheDocument();
    // Should show that consent is currently active
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
  });

  it('shows withdraw genetic data consent button', () => {
    render(<ConsentManagement />);

    expect(
      screen.getByRole('button', { name: /withdraw consent/i }),
    ).toBeInTheDocument();
  });

  it('withdrawal shows confirmation dialog listing consequences', () => {
    render(<ConsentManagement />);

    // Click withdraw consent button
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    // Confirmation dialog should appear
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    // Should list consequences
    expect(
      screen.getByText(/locally saved analysis results will be cleared/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/genetic data consent will be revoked/i),
    ).toBeInTheDocument();
  });

  it('confirming withdrawal updates consent state', () => {
    render(<ConsentManagement />);

    // Click withdraw consent button
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    // Click confirm button in the dialog
    fireEvent.click(
      screen.getByRole('button', { name: /confirm withdrawal/i }),
    );

    expect(mockWithdrawGeneticConsent).toHaveBeenCalled();
  });

  it('canceling withdrawal keeps consent unchanged', () => {
    render(<ConsentManagement />);

    // Click withdraw consent button
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    // Click cancel in the dialog
    fireEvent.click(
      screen.getByRole('button', { name: /cancel/i }),
    );

    // Dialog should close
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Should NOT have called withdraw
    expect(mockWithdrawGeneticConsent).not.toHaveBeenCalled();
  });

  it('shows re-consent option after withdrawal', () => {
    // Set state to withdrawn
    mockStoreState = {
      ...mockStoreState,
      geneticDataConsentGiven: false,
      consentWithdrawn: true,
    };

    render(<ConsentManagement />);

    // Should show withdrawn status
    expect(screen.getByText(/Withdrawn/i)).toBeInTheDocument();

    // Should show re-consent button
    const reConsentButton = screen.getByRole('button', { name: /re-consent/i });
    expect(reConsentButton).toBeInTheDocument();

    // Click re-consent
    fireEvent.click(reConsentButton);
    expect(mockReGrantGeneticConsent).toHaveBeenCalled();
  });

  it('withdraw action is called exactly once per confirmation (no double-fire)', () => {
    render(<ConsentManagement />);

    // Click withdraw consent button
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    // Confirm withdrawal
    fireEvent.click(
      screen.getByRole('button', { name: /confirm withdrawal/i }),
    );

    // The store's withdrawGeneticConsent should have been called exactly once
    expect(mockWithdrawGeneticConsent).toHaveBeenCalledTimes(1);

    // And the dialog should now be closed
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('accessible: dialog has proper ARIA attributes', () => {
    render(<ConsentManagement />);

    // Click withdraw consent button
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    // The aria-labelledby should reference a visible heading
    const labelledById = dialog.getAttribute('aria-labelledby');
    const labelElement = document.getElementById(labelledById!);
    expect(labelElement).toBeInTheDocument();

    // The aria-describedby should reference visible content
    const describedById = dialog.getAttribute('aria-describedby');
    const descElement = document.getElementById(describedById!);
    expect(descElement).toBeInTheDocument();
  });

  it('pressing Escape closes the alertdialog without withdrawing consent', () => {
    render(<ConsentManagement />);

    // Open the dialog
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    // Verify dialog is open
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    // Press Escape — the dialog should close
    fireEvent.keyDown(document, {
      key: 'Escape',
      code: 'Escape',
    });

    // The dialog should be closed
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Consent should NOT have been withdrawn
    expect(mockWithdrawGeneticConsent).not.toHaveBeenCalled();
  });

  it('focus is trapped within the dialog when Tab is pressed', () => {
    render(<ConsentManagement />);

    // Open the dialog
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();

    // Get the focusable buttons within the dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /confirm withdrawal/i });

    // The focus trap implementation focuses the first focusable element on open.
    // Simulate Tab on the last element — focus should wrap to the first
    confirmButton.focus();
    expect(document.activeElement).toBe(confirmButton);

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });

    // After Tab on the last element, focus should wrap to the first (Cancel button)
    expect(document.activeElement).toBe(cancelButton);
  });

  it('focus wraps backwards with Shift+Tab from first element', () => {
    render(<ConsentManagement />);

    // Open the dialog
    fireEvent.click(
      screen.getByRole('button', { name: /withdraw consent/i }),
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /confirm withdrawal/i });

    // Focus the first element
    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);

    // Shift+Tab on the first element should wrap to the last
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(confirmButton);
  });

  it('locks body scroll when dialog is open and restores on close', () => {
    render(<ConsentManagement />);

    // Body should not be locked initially
    expect(document.body.style.overflow).not.toBe('hidden');

    // Open the dialog
    fireEvent.click(screen.getByRole('button', { name: /withdraw consent/i }));

    // Body should be locked
    expect(document.body.style.overflow).toBe('hidden');

    // Close dialog via cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Body scroll should be restored
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
