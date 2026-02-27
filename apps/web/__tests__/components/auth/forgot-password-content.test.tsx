import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockForgotPassword = vi.fn();
const mockClearError = vi.fn();

const mockStoreState: Record<string, unknown> = {
  forgotPassword: mockForgotPassword,
  isLoading: false,
  error: null,
  clearError: mockClearError,
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

vi.mock('lucide-react', () => ({
  Mail: () => <span data-testid="icon-mail" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  CheckCircle: () => <span data-testid="icon-check-circle" />,
}));

// ── Import under test ────────────────────────────────────────────────────────

import { ForgotPasswordContent } from '../../../app/(auth)/forgot-password/_components/forgot-password-content';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ForgotPasswordContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.isLoading = false;
    mockStoreState.error = null;
    mockForgotPassword.mockResolvedValue(undefined);
  });

  it('renders "Forgot Password" heading', () => {
    render(<ForgotPasswordContent />);
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
  });

  it('renders email input field', () => {
    render(<ForgotPasswordContent />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('submit calls forgotPassword from store', async () => {
    render(<ForgotPasswordContent />);

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });

    const form = screen.getByLabelText('Email Address').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('shows "Check Your Email" heading on success', async () => {
    render(<ForgotPasswordContent />);

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });

    const form = screen.getByLabelText('Email Address').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });
  });

  it('shows the submitted email in success message', async () => {
    render(<ForgotPasswordContent />);

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'user@domain.com' } });

    const form = screen.getByLabelText('Email Address').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('user@domain.com')).toBeInTheDocument();
    });
  });

  it('"Try a different email" button resets to form', async () => {
    render(<ForgotPasswordContent />);

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });

    const form = screen.getByLabelText('Email Address').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Try a different email')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Try a different email'));
    });

    // Should be back on form
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('renders "Back to Login" link', () => {
    render(<ForgotPasswordContent />);
    const link = screen.getByText('Back to Login');
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });

  it('rate-limit error stays visible and does not show success', async () => {
    mockStoreState.error = 'Rate limit exceeded';
    mockForgotPassword.mockRejectedValue(new Error('Rate limit exceeded'));

    render(<ForgotPasswordContent />);

    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });

    const form = screen.getByLabelText('Email Address').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // Error should be shown via role="alert"
    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('Rate limit exceeded'))).toBe(true);

    // Should NOT show success screen
    expect(screen.queryByText('Check Your Email')).not.toBeInTheDocument();
  });
});
