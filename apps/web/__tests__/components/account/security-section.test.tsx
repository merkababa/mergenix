import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory } from '../../__helpers__';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Shield', 'Key', 'Smartphone', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/input', () => ({
  Input: ({ label, error, icon, ...props }: any) => (
    <div><label htmlFor={label?.toLowerCase().replace(/\s+/g, '-')}>{label}</label><input id={label?.toLowerCase().replace(/\s+/g, '-')} {...props} />{error && <p role="alert">{error}</p>}</div>
  ),
}));

// Mock child modals — import paths resolve via @/ alias
vi.mock('@/app/(app)/account/_components/two-factor-setup-modal', () => ({
  TwoFactorSetupModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="2fa-setup-modal">
        <button onClick={onClose}>Close 2FA</button>
      </div>
    ) : null,
}));

vi.mock('@/app/(app)/account/_components/change-password-modal', () => ({
  ChangePasswordModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="change-password-modal">
        <button onClick={onClose}>Close Password</button>
      </div>
    ) : null,
}));

// Mock auth store
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free',
  emailVerified: true,
  totpEnabled: false,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockStoreState: Record<string, any> = {
  user: { ...mockUser },
  isLoading: false,
  error: null,
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  disable2FA: vi.fn(),
  setup2FA: vi.fn(),
  verify2FA: vi.fn(),
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

import { SecuritySection } from '../../../app/(app)/account/_components/security-section';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SecuritySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.user = { ...mockUser, totpEnabled: false };
    mockStoreState.disable2FA = vi.fn();
    mockStoreState.error = null;
  });

  it('renders the "Security" heading', () => {
    render(<SecuritySection />);
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument();
  });

  it('shows Password section with "Change" button', () => {
    render(<SecuritySection />);
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('shows 2FA section with "Enable" button when disabled', () => {
    render(<SecuritySection />);
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable' })).toBeInTheDocument();
    expect(screen.getByText('Add an extra layer of security to your account')).toBeInTheDocument();
  });

  it('clicking "Change" opens ChangePasswordModal', () => {
    render(<SecuritySection />);
    expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
  });

  it('shows "Disable" button when 2FA is enabled', () => {
    mockStoreState.user = { ...mockUser, totpEnabled: true };
    render(<SecuritySection />);
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    expect(screen.getByText(/2FA is enabled/)).toBeInTheDocument();
  });

  it('clicking "Enable" opens TwoFactorSetupModal', () => {
    render(<SecuritySection />);
    expect(screen.queryByTestId('2fa-setup-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));

    expect(screen.getByTestId('2fa-setup-modal')).toBeInTheDocument();
  });

  it('clicking "Disable" shows inline form with code input', () => {
    mockStoreState.user = { ...mockUser, totpEnabled: true };
    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));

    expect(screen.getByText('Enter your authenticator code to disable 2FA:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('inline form: entering 6 digits + clicking "Confirm" calls disable2FA', async () => {
    mockStoreState.user = { ...mockUser, totpEnabled: true };
    mockStoreState.disable2FA = vi.fn().mockResolvedValue(undefined);
    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));

    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    });

    expect(mockStoreState.disable2FA).toHaveBeenCalledWith('123456');
  });

  it('disable 2FA error shows error message', async () => {
    mockStoreState.user = { ...mockUser, totpEnabled: true };
    mockStoreState.disable2FA = vi.fn().mockRejectedValue(new Error('Invalid code'));
    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));

    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '999999' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    });

    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });

  it('after successful disable, inline form hides', async () => {
    mockStoreState.user = { ...mockUser, totpEnabled: true };
    mockStoreState.disable2FA = vi.fn().mockResolvedValue(undefined);
    render(<SecuritySection />);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(screen.getByText('Enter your authenticator code to disable 2FA:')).toBeInTheDocument();

    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    });

    expect(screen.queryByText('Enter your authenticator code to disable 2FA:')).not.toBeInTheDocument();
  });
});
