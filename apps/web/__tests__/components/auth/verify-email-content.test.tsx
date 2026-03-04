import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockNextLinkFactory } from '../../__helpers__';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => mockNextLinkFactory());

const mockVerifyEmail = vi.fn();
const mockResendVerification = vi.fn();

const mockStoreState: Record<string, unknown> = {
  verifyEmail: mockVerifyEmail,
  resendVerification: mockResendVerification,
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    {
      getState: () => mockStoreState,
      setState: vi.fn(),
    },
  ),
}));

vi.mock('@/components/auth/dna-dots', () => ({
  DnaDots: () => <div data-testid="dna-dots" />,
}));

vi.mock('@/components/auth/trust-signals', () => ({
  TrustSignals: () => <div data-testid="trust-signals" />,
}));

vi.mock('@/lib/animation-variants', () => ({
  fadeUp: { hidden: {}, visible: {} },
}));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => ({
  ...mockButtonFactory(),
  buttonVariants: ({ variant, size, className }: any) =>
    [variant, size, className].filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ label, error, icon, ref: _ref, ...props }: any) => {
    const inputId = label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && <label htmlFor={inputId}>{label}</label>}
        <input id={inputId} aria-label={label} {...props} />
        {error && <p role="alert">{error}</p>}
      </div>
    );
  },
}));

vi.mock('lucide-react', () => mockLucideIcons('CheckCircle', 'XCircle', 'Mail', 'ArrowLeft'));

// ── Import under test ────────────────────────────────────────────────────────

import { VerifyEmailContent } from '../../../app/(auth)/verify-email/_components/verify-email-content';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('VerifyEmailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('token=valid-verify-token');
    // By default, verifyEmail is a pending promise (never resolves) to hold loading state
    mockVerifyEmail.mockReturnValue(new Promise(() => {}));
    mockResendVerification.mockResolvedValue(undefined);
  });

  it('shows error state when no token is present', () => {
    mockSearchParams = new URLSearchParams();
    render(<VerifyEmailContent />);
    expect(screen.getByText(/No verification token found/)).toBeInTheDocument();
  });

  it('shows loading state "Verifying your email..." when token is present', () => {
    render(<VerifyEmailContent />);
    expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
  });

  it('shows "Email Verified!" on successful verification', async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    });
  });

  it('success has "Continue to Sign In" button', async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    render(<VerifyEmailContent />);

    await waitFor(() => {
      const btn = screen.getByText('Continue to Sign In');
      expect(btn.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  it('shows error state with error message on failed verification', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Link expired'));
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText('Link expired')).toBeInTheDocument();
    });
  });

  it('error state has resend email input', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Bad token'));
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('resend button is disabled when no email is entered', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Bad token'));
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });

    const resendBtn = screen.getByText('Resend Verification Email');
    expect(resendBtn).toBeDisabled();
  });

  it('resend shows cooldown countdown after clicking', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Bad token'));
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });

    // Enter email
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'user@test.com' },
    });

    // Click resend
    await act(async () => {
      fireEvent.click(screen.getByText('Resend Verification Email'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Resend \(\d+s\)/)).toBeInTheDocument();
    });
  });

  it('renders "Back to Login" link', async () => {
    mockVerifyEmail.mockRejectedValue(new Error('Bad token'));
    render(<VerifyEmailContent />);

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    });

    const link = screen.getByText('Back to Login');
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });

  it('auto-verifies on mount by calling verifyEmail with token', () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    render(<VerifyEmailContent />);
    expect(mockVerifyEmail).toHaveBeenCalledWith('valid-verify-token');
  });
});
