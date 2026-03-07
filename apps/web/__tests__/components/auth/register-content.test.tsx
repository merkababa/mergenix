import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockNextLinkFactory, mockInputFactory, mockNextNavigationFactory } from '../../__helpers__';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => mockNextLinkFactory());

vi.mock('next/navigation', () => mockNextNavigationFactory({ pathname: '/register' }));

const mockRegister = vi.fn();
const mockResendVerification = vi.fn();
const mockGetGoogleOAuthUrl = vi.fn();
const mockClearError = vi.fn();

const mockStoreState: Record<string, unknown> = {
  register: mockRegister,
  resendVerification: mockResendVerification,
  getGoogleOAuthUrl: mockGetGoogleOAuthUrl,
  isLoading: false,
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
  TrustSignals: ({ lines }: any) => <div data-testid="trust-signals">{lines?.join(', ')}</div>,
}));

vi.mock('@/components/auth/oauth-button', () => ({
  OAuthButton: ({ text, onClick, isLoading }: any) => (
    <button onClick={onClick} disabled={isLoading} data-testid="oauth-button">
      {text}
    </button>
  ),
}));

vi.mock('@/components/auth/password-input', () => ({
  PasswordInput: ({ label, value, onChange, error, disabled, onBlur, ...props }: any) => (
    <div>
      <label htmlFor={`pw-${label}`}>{label}</label>
      <input
        id={`pw-${label}`}
        type="password"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
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
}));

vi.mock('@/lib/animation-variants', () => ({
  fadeUp: { hidden: {}, visible: {} },
}));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

vi.mock('@/components/ui/input', () => mockInputFactory());

vi.mock('lucide-react', () => mockLucideIcons('Mail', 'User', 'CheckCircle2', 'ShieldCheck'));

vi.mock('@/components/legal/age-verification-modal', () => ({
  AgeVerificationModal: () => <div data-testid="age-verification-modal" />,
}));

// ── Import under test ────────────────────────────────────────────────────────

import { RegisterContent } from '../../../app/(auth)/register/_components/register-content';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STRONG_PASSWORD = 'MyStr0ng!Pass1';

function fillForm(overrides: { name?: string; email?: string; password?: string; terms?: boolean } = {}) {
  const { name = 'John Doe', email = 'john@example.com', password = STRONG_PASSWORD, terms = true } = overrides;

  fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByTestId('password-password'), { target: { value: password } });

  if (terms) {
    const checkbox = screen.getByRole('checkbox');
    if (!(checkbox as HTMLInputElement).checked) {
      fireEvent.click(checkbox);
    }
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.isLoading = false;
    mockRegister.mockResolvedValue(undefined);
    mockResendVerification.mockResolvedValue(undefined);
    mockGetGoogleOAuthUrl.mockResolvedValue({ authorizationUrl: 'https://accounts.google.com/o/oauth2', state: 'rand-state' });
  });

  it('renders "Create Account" heading', () => {
    render(<RegisterContent />);
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('renders name, email, password fields and terms checkbox', () => {
    render(<RegisterContent />);
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('submit button is disabled when terms are not accepted', () => {
    render(<RegisterContent />);
    // The submit button renders "Create Account" text
    const submitButtons = screen.getAllByText('Create Account');
    const submitBtn = submitButtons.find((el) => el.tagName === 'BUTTON')!;
    expect(submitBtn).toBeDisabled();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(<RegisterContent />);

    // Accept terms to enable button
    fireEvent.click(screen.getByRole('checkbox'));

    const submitButtons = screen.getAllByText('Create Account');
    const submitBtn = submitButtons.find((el) => el.tagName === 'BUTTON')!;

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows success screen with "Check your email" after successful registration', async () => {
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });

  it('success screen shows registered email address', async () => {
    render(<RegisterContent />);

    fillForm({ email: 'test@domain.com' });

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('test@domain.com')).toBeInTheDocument();
    });
  });

  it('success screen has resend button', async () => {
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Resend Email')).toBeInTheDocument();
    });
  });

  it('resend cooldown shows countdown text', async () => {
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Resend Email')).toBeInTheDocument();
    });

    // Click resend
    await act(async () => {
      fireEvent.click(screen.getByText('Resend Email'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Resend Email \(\d+s\)/)).toBeInTheDocument();
    });
  });

  it('"try again with a different email" returns to form', async () => {
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('try again with a different email')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('try again with a different email'));
    });

    // Should be back on the form
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
  });

  it('success screen has "Back to Sign In" link', async () => {
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    });
  });

  it('renders OAuth button with "Sign up with Google"', () => {
    render(<RegisterContent />);
    const oauthBtn = screen.getByTestId('oauth-button');
    expect(oauthBtn).toHaveTextContent('Sign up with Google');
  });

  it('shows error banner on registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('Email already exists'));
    render(<RegisterContent />);

    fillForm();

    const form = screen.getByLabelText('Full Name').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find((a) => a.textContent?.includes('Email already exists'));
      expect(errorAlert).toBeTruthy();
    });
  });

  it('name validation: too short shows error', async () => {
    render(<RegisterContent />);

    const nameInput = screen.getByLabelText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'J' } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('email validation: invalid format shows error', async () => {
    render(<RegisterContent />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('renders "Already have an account?" with login link', () => {
    render(<RegisterContent />);
    expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
    const loginLink = screen.getByText('Sign in');
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });
});
