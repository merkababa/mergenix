import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockResetPassword = vi.fn();

const mockStoreState: Record<string, unknown> = {
  resetPassword: mockResetPassword,
  isLoading: false,
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

vi.mock('@/components/auth/password-input', () => ({
  PasswordInput: ({ label, value, onChange, error, disabled, ...props }: any) => (
    <div>
      <label htmlFor={`pw-${label}`}>{label}</label>
      <input
        id={`pw-${label}`}
        type="password"
        value={value}
        onChange={onChange}
        aria-label={label}
        disabled={disabled}
        data-testid={`password-${label?.toLowerCase().replace(/\s/g, '-')}`}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

vi.mock('@/components/auth/password-strength-display', () => ({
  PasswordStrengthDisplay: () => <div data-testid="password-strength" />,
}));

vi.mock('@/lib/password-utils', () => ({
  validatePassword: (pw: string) => ({
    valid: pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw),
    errors: pw.length < 12 ? ['Password must be at least 12 characters'] : [],
  }),
  getPasswordStrength: (pw: string) => ({
    level: pw.length >= 12 ? 'strong' : 'weak',
    widthPercent: pw.length >= 12 ? 100 : 25,
    color: 'var(--accent-teal)',
    label: pw.length >= 12 ? 'Strong' : 'Weak',
  }),
}));

vi.mock('@/lib/animation-variants', () => ({
  fadeUp: { hidden: {}, visible: {} },
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const { variants, initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  MotionConfig: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children }: any) => <div data-testid="glass-card">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, isLoading, disabled, ...props }: any) => (
    <button disabled={disabled || isLoading} {...props}>
      {children}
    </button>
  ),
  buttonVariants: ({ variant, size, className }: any) =>
    [variant, size, className].filter(Boolean).join(' '),
}));

vi.mock('lucide-react', () => ({
  Lock: () => <span data-testid="icon-lock" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
  XCircle: () => <span data-testid="icon-x-circle" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
}));

// ── Import under test ────────────────────────────────────────────────────────

import { ResetPasswordContent } from '../../../app/(auth)/reset-password/_components/reset-password-content';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STRONG_PASSWORD = 'MyStr0ng!Pass1';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ResetPasswordContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('token=valid-token-123');
    mockStoreState.isLoading = false;
    mockResetPassword.mockResolvedValue(undefined);
  });

  it('shows error state when no token is present', () => {
    mockSearchParams = new URLSearchParams();
    render(<ResetPasswordContent />);
    expect(screen.getByText(/No reset token found/)).toBeInTheDocument();
  });

  it('shows "Reset Password" form when token is present', () => {
    render(<ResetPasswordContent />);
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('renders new password and confirm password fields', () => {
    render(<ResetPasswordContent />);
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('renders PasswordStrengthDisplay', () => {
    render(<ResetPasswordContent />);
    expect(screen.getByTestId('password-strength')).toBeInTheDocument();
  });

  it('submit button disabled when passwords do not match', () => {
    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: 'DifferentPass1!' } });

    // The submit button is "Reset Password" with type="submit"
    const submitBtn = screen.getAllByText('Reset Password').find((el) => el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit');
    expect(submitBtn).toBeDisabled();
  });

  it('shows "Passwords do not match" error', () => {
    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: 'DifferentPass1!' } });

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows "Password Reset!" success state on successful reset', async () => {
    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: STRONG_PASSWORD } });

    const form = screen.getByTestId('password-new-password').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Password Reset!')).toBeInTheDocument();
    });
  });

  it('success state has "Sign In" link to /login', async () => {
    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: STRONG_PASSWORD } });

    const form = screen.getByTestId('password-new-password').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      const signInBtn = screen.getByText('Sign In');
      expect(signInBtn.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  it('failed reset shows error state', async () => {
    mockResetPassword.mockRejectedValue(new Error('Token expired'));

    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: STRONG_PASSWORD } });

    const form = screen.getByTestId('password-new-password').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Reset Failed')).toBeInTheDocument();
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });

  it('error state has "Request New Link" button linking to /forgot-password', async () => {
    mockResetPassword.mockRejectedValue(new Error('Token expired'));

    render(<ResetPasswordContent />);

    fireEvent.change(screen.getByTestId('password-new-password'), { target: { value: STRONG_PASSWORD } });
    fireEvent.change(screen.getByTestId('password-confirm-password'), { target: { value: STRONG_PASSWORD } });

    const form = screen.getByTestId('password-new-password').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      const newLinkBtn = screen.getByText('Request New Link');
      expect(newLinkBtn.closest('a')).toHaveAttribute('href', '/forgot-password');
    });
  });
});
