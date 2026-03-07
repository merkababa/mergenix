import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  mockLucideIcons,
  mockGlassCardFactory,
  mockButtonFactory,
  mockNextLinkFactory,
  mockInputFactory,
} from '../../__helpers__';

// ── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockPush,
  mockReplace,
  mockBack,
  mockLogin,
  mockLogin2FA,
  mockGetGoogleOAuthUrl,
  mockClearError,
  mockSetState,
  mockStoreState,
} = vi.hoisted(() => {
  const mockLogin = vi.fn();
  const mockLogin2FA = vi.fn();
  const mockGetGoogleOAuthUrl = vi.fn();
  const mockClearError = vi.fn();
  const mockSetState = vi.fn();
  const mockStoreState: Record<string, unknown> = {
    login: mockLogin,
    login2FA: mockLogin2FA,
    getGoogleOAuthUrl: mockGetGoogleOAuthUrl,
    isLoading: false,
    requires2FA: false,
    error: null,
    clearError: mockClearError,
  };
  return {
    mockPush: vi.fn(),
    mockReplace: vi.fn(),
    mockBack: vi.fn(),
    mockLogin,
    mockLogin2FA,
    mockGetGoogleOAuthUrl,
    mockClearError,
    mockSetState,
    mockStoreState,
  };
});

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => mockNextLinkFactory());

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign((selector: (state: any) => any) => selector(mockStoreState), {
    getState: () => mockStoreState,
    setState: mockSetState,
  }),
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

vi.mock('@/lib/animation-variants', () => ({
  fadeUp: { hidden: {}, visible: {} },
}));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

vi.mock('@/components/ui/input', () => mockInputFactory());

vi.mock('lucide-react', () => mockLucideIcons('Mail', 'AlertCircle'));

// ── Import under test ────────────────────────────────────────────────────────

import { LoginContent } from '../../../app/(auth)/login/_components/login-content';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockStoreState.isLoading = false;
    mockStoreState.requires2FA = false;
    mockStoreState.error = null;
    mockLogin.mockResolvedValue({ success: true });
    mockLogin2FA.mockResolvedValue(undefined);
    mockGetGoogleOAuthUrl.mockResolvedValue({
      authorizationUrl: 'https://accounts.google.com/o/oauth2',
      state: 'rand-state',
    });
  });

  it('renders "Welcome Back" heading', () => {
    render(<LoginContent />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('renders email input, password input, and remember me checkbox', () => {
    render(<LoginContent />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
  });

  it('renders Google OAuth button with "Sign in with Google"', () => {
    render(<LoginContent />);
    const oauthBtn = screen.getByTestId('oauth-button');
    expect(oauthBtn).toHaveTextContent('Sign in with Google');
  });

  it('renders "Create one free" register link', () => {
    render(<LoginContent />);
    const link = screen.getByText('Create one free');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/register');
  });

  it('renders "Forgot password?" link', () => {
    render(<LoginContent />);
    const link = screen.getByText('Forgot password?');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('calls store.login with email, password, and rememberMe', async () => {
    render(<LoginContent />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123!' } });
    fireEvent.click(screen.getByLabelText('Remember me'));

    const form = screen.getByLabelText('Email').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'Secret123!', true);
  });

  it('redirects to /analysis on successful login (default returnUrl)', async () => {
    render(<LoginContent />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secret123!' } });

    const form = screen.getByLabelText('Email').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockPush).toHaveBeenCalledWith('/analysis');
  });

  it('uses custom returnUrl from searchParams', async () => {
    mockSearchParams = new URLSearchParams('returnUrl=/dashboard');
    render(<LoginContent />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });

    const form = screen.getByLabelText('Email').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('sanitizes malicious returnUrl starting with "//"', async () => {
    mockSearchParams = new URLSearchParams('returnUrl=//evil.com');
    render(<LoginContent />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } });

    const form = screen.getByLabelText('Email').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockPush).toHaveBeenCalledWith('/analysis');
  });

  it('displays error banner with role="alert" on login error', () => {
    mockStoreState.error = 'Invalid credentials';
    render(<LoginContent />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid credentials');
  });

  it('shows verification code input when requires2FA is true', () => {
    mockStoreState.requires2FA = true;
    render(<LoginContent />);

    expect(screen.getByLabelText('Enter 6-digit verification code')).toBeInTheDocument();
    expect(
      screen.getByText(/Enter the 6-digit code from your authenticator app/),
    ).toBeInTheDocument();
  });

  it('auto-submits 2FA when 6 digits are entered', async () => {
    mockStoreState.requires2FA = true;
    render(<LoginContent />);

    const codeInput = screen.getByLabelText('Enter 6-digit verification code');

    // Mock requestSubmit on the parent form
    const form = codeInput.closest('form')!;
    form.requestSubmit = vi.fn();

    await act(async () => {
      fireEvent.change(codeInput, { target: { value: '123456' } });
    });

    // requestSubmit is called via setTimeout(0), so wait a tick
    await waitFor(() => {
      expect(form.requestSubmit).toHaveBeenCalled();
    });
  });

  it('"Use a different account" resets 2FA state', async () => {
    mockStoreState.requires2FA = true;
    render(<LoginContent />);

    const resetButton = screen.getByText('Use a different account');
    await act(async () => {
      fireEvent.click(resetButton);
    });

    expect(mockSetState).toHaveBeenCalledWith({
      requires2FA: false,
      challengeToken: null,
      error: null,
    });
  });

  it('shows "Signing in..." when loading', () => {
    mockStoreState.isLoading = true;
    render(<LoginContent />);

    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('OAuth button click calls getGoogleOAuthUrl', async () => {
    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<LoginContent />);

    const oauthBtn = screen.getByTestId('oauth-button');
    await act(async () => {
      fireEvent.click(oauthBtn);
    });

    expect(mockGetGoogleOAuthUrl).toHaveBeenCalled();

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });
});
