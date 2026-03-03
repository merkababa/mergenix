import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  ShieldCheck: (props: any) => <svg data-testid="icon-shield-check" {...props} />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} className={className} {...props}>
      {children}
    </button>
  ),
}));

// ─── Router mock ──────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockVerifyAge = vi.fn();

const mockStoreState: Record<string, any> = {
  ageVerified: false,
  verifyAge: mockVerifyAge,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── localStorage mock ──────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

function mockLocalStorage(data: Record<string, string> = {}) {
  Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  Object.assign(localStorageStore, data);

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      localStorageStore[key] = value;
    },
  );
}

// ─── Import component + safe-storage fallback (for cleanup) ──────────────────

import { AgeVerificationModal } from '../../../components/legal/age-verification-modal';
import { memoryFallback } from '../../../lib/utils/safe-storage';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AgeVerificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAge.mockResolvedValue(undefined);
    mockStoreState.ageVerified = false;
    mockPush.mockReset();
    // Reset body overflow
    document.body.style.overflow = '';
    // Clear in-memory fallback so safeLocalStorageGet doesn't return stale
    // values from prior tests (e.g. verifyAge sets 'mergenix_age_verified').
    Object.keys(memoryFallback).forEach((key) => delete memoryFallback[key]);
  });

  it('renders modal when no localStorage age verification exists', () => {
    mockLocalStorage({}); // no age verified
    render(<AgeVerificationModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Age Verification Required')).toBeInTheDocument();
  });

  it('does NOT render modal when localStorage has verification', () => {
    mockLocalStorage({ mergenix_age_verified: 'true' });
    render(<AgeVerificationModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT render modal when store has ageVerified=true', () => {
    mockLocalStorage({});
    mockStoreState.ageVerified = true;
    render(<AgeVerificationModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('checkbox toggles checked state', () => {
    mockLocalStorage({});
    render(<AgeVerificationModal />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('Continue button is disabled when checkbox is unchecked', () => {
    mockLocalStorage({});
    render(<AgeVerificationModal />);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('Continue button is enabled when checkbox is checked', () => {
    mockLocalStorage({});
    render(<AgeVerificationModal />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('calls onVerified callback after confirmation', async () => {
    mockLocalStorage({});
    const onVerified = vi.fn();
    render(<AgeVerificationModal onVerified={onVerified} />);

    // Check the checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Click Continue
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    });

    expect(mockVerifyAge).toHaveBeenCalled();
    expect(onVerified).toHaveBeenCalled();
  });

  it('has correct ARIA attributes (role="dialog", aria-modal)', () => {
    mockLocalStorage({});
    render(<AgeVerificationModal />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'age-verify-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'age-verify-description');
  });

  it('"I am under 18" button sets localStorage and redirects to home', () => {
    mockLocalStorage({});
    render(<AgeVerificationModal />);

    const under18Button = screen.getByRole('button', { name: /i am under 18/i });
    fireEvent.click(under18Button);

    // Should set the under-18 key in localStorage with a timestamp
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      'mergenix_under_18',
      expect.stringMatching(/^\d+$/),
    );

    // Should redirect to home
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('locks body scroll when modal is open and restores on unmount', async () => {
    mockLocalStorage({});
    const { unmount } = render(<AgeVerificationModal />);

    // Wait for useEffect to fire (sets isOpen=true, then locks body scroll)
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });

    unmount();

    // After unmount, body scroll should be restored
    expect(document.body.style.overflow).toBe('');
  });

  // ── Under-18 block expiry tests ───────────────────────────────────────

  it('redirects to "/" on mount when a recent under-18 timestamp exists (within 182 days)', async () => {
    // Set a timestamp from 1 day ago — well within the 182-day expiry window
    const recentTimestamp = (Date.now() - 1 * 24 * 60 * 60 * 1000).toString();
    mockLocalStorage({ mergenix_under_18: recentTimestamp });
    // Also populate memoryFallback so safeLocalStorageGet is consistent
    memoryFallback['mergenix_under_18'] = recentTimestamp;

    render(<AgeVerificationModal />);

    // The useEffect should call router.push("/") and NOT show the modal
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    // Modal content should NOT be rendered (the effect returns early)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows modal when under-18 timestamp has expired (older than 182 days)', async () => {
    // Set a timestamp from 183 days ago — past the 182-day expiry window
    const expiredTimestamp = (Date.now() - 183 * 24 * 60 * 60 * 1000).toString();
    mockLocalStorage({ mergenix_under_18: expiredTimestamp });
    memoryFallback['mergenix_under_18'] = expiredTimestamp;

    render(<AgeVerificationModal />);

    // The expired under-18 block should be ignored — modal should appear
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Should NOT have redirected
    expect(mockPush).not.toHaveBeenCalled();
  });
});
