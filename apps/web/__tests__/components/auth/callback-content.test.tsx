import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockGoogleCallback = vi.fn();

const mockStoreState: Record<string, unknown> = {
  googleCallback: mockGoogleCallback,
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
  XCircle: () => <span data-testid="icon-x-circle" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
}));

// ── Import under test ────────────────────────────────────────────────────────

import { CallbackContent } from '../../../app/(auth)/callback/_components/callback-content';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CallbackContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('code=auth-code-123&state=state-token-456');
    mockGoogleCallback.mockReturnValue(new Promise(() => {}));
    // Set up OAuth state in sessionStorage to pass CSRF validation
    sessionStorage.setItem('oauth_state', 'state-token-456');
  });

  it('calls googleCallback after OAuth state validation passes', () => {
    mockGoogleCallback.mockResolvedValue(undefined);
    render(<CallbackContent />);
    expect(mockGoogleCallback).toHaveBeenCalledWith('auth-code-123', 'state-token-456');
  });

  it('shows error when OAuth state does not match sessionStorage', () => {
    sessionStorage.setItem('oauth_state', 'wrong-state');
    render(<CallbackContent />);
    expect(screen.getByText(/OAuth state mismatch/)).toBeInTheDocument();
    expect(mockGoogleCallback).not.toHaveBeenCalled();
  });

  it('shows error when OAuth state is missing from sessionStorage', () => {
    sessionStorage.removeItem('oauth_state');
    render(<CallbackContent />);
    expect(screen.getByText(/OAuth state mismatch/)).toBeInTheDocument();
    expect(mockGoogleCallback).not.toHaveBeenCalled();
  });

  it('shows error when code is missing', () => {
    mockSearchParams = new URLSearchParams('state=state-token-456');
    render(<CallbackContent />);
    expect(screen.getByText(/Missing authorization parameters/)).toBeInTheDocument();
  });

  it('shows error when state is missing', () => {
    mockSearchParams = new URLSearchParams('code=auth-code-123');
    render(<CallbackContent />);
    expect(screen.getByText(/Missing authorization parameters/)).toBeInTheDocument();
  });

  it('shows loading state "Completing sign in..." with both code and state', () => {
    render(<CallbackContent />);
    expect(screen.getByText('Completing sign in...')).toBeInTheDocument();
  });

  it('calls router.replace("/account") on successful callback', async () => {
    mockGoogleCallback.mockResolvedValue(undefined);
    render(<CallbackContent />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/account');
    });
  });

  it('shows error state with message on failed callback', async () => {
    mockGoogleCallback.mockRejectedValue(new Error('OAuth failed'));
    render(<CallbackContent />);

    await waitFor(() => {
      expect(screen.getByText('Sign In Failed')).toBeInTheDocument();
      expect(screen.getByText('OAuth failed')).toBeInTheDocument();
    });
  });

  it('error state has "Try Again" link to /login', async () => {
    mockGoogleCallback.mockRejectedValue(new Error('OAuth failed'));
    render(<CallbackContent />);

    await waitFor(() => {
      const tryAgainBtn = screen.getByText('Try Again');
      expect(tryAgainBtn.closest('a')).toHaveAttribute('href', '/login');
    });
  });

  it('renders "Back to Home" link', async () => {
    mockGoogleCallback.mockRejectedValue(new Error('OAuth failed'));
    render(<CallbackContent />);

    await waitFor(() => {
      const link = screen.getByText('Back to Home');
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });
  });
});
