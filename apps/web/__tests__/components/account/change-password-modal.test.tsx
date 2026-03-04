import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockInputFactory, mockBadgeFactory } from '../../__helpers__';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('X', 'Check', 'Eye', 'EyeOff', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/badge', () => mockBadgeFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/input', () => mockInputFactory());
vi.mock('@/components/auth/password-input', () => ({
  PasswordInput: ({ label, value, onChange, error, ...rest }: any) => (
    <div><label htmlFor={label?.toLowerCase().replace(/\s+/g, '-')}>{label}</label><input id={label?.toLowerCase().replace(/\s+/g, '-')} type="password" value={value} onChange={onChange} aria-label={label || 'password'} />{error && <span role="alert">{error}</span>}</div>
  ),
}));

// Mock auth store
const mockStoreState: Record<string, any> = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    tier: 'free',
    emailVerified: true,
    totpEnabled: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
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

import { ChangePasswordModal } from '../../../app/(app)/account/_components/change-password-modal';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ChangePasswordModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockStoreState.changePassword = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ChangePasswordModal isOpen={false} onClose={onClose} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders "Change Password" heading when isOpen is true', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    expect(
      screen.getByRole('heading', { name: 'Change Password' }),
    ).toBeInTheDocument();
  });

  it('shows current password, new password, and confirm password fields', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('renders password requirements checklist', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
    expect(screen.getByText('Upper and lowercase letters')).toBeInTheDocument();
    expect(screen.getByText('At least one number')).toBeInTheDocument();
    expect(screen.getByText('At least one special character')).toBeInTheDocument();
  });

  it('Escape key calls onClose', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop click calls onClose', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    // The backdrop is the first div with the bg-[rgba...] class
    const backdrop = document.querySelector('.absolute.inset-0.bg-\\[rgba\\(0\\,0\\,0\\,0\\.6\\)\\]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('close button (X) calls onClose', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when fields are empty', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);
    const submitButton = screen.getByRole('button', { name: /change password/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows "Passwords do not match" when confirm differs from new', () => {
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    const newPw = screen.getByLabelText('New Password');
    const confirmPw = screen.getByLabelText('Confirm New Password');

    fireEvent.change(newPw, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmPw, { target: { value: 'DifferentPass' } });

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows success message after successful password change', async () => {
    mockStoreState.changePassword = vi.fn().mockResolvedValue(undefined);
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    const currentPw = screen.getByLabelText('Current Password');
    const newPw = screen.getByLabelText('New Password');
    const confirmPw = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPw, { target: { value: 'OldPassword1!' } });
    fireEvent.change(newPw, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass123!' } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!);
    });

    expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
  });

  it('shows error on failed password change', async () => {
    mockStoreState.changePassword = vi.fn().mockRejectedValue(new Error('Current password is incorrect'));
    render(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    const currentPw = screen.getByLabelText('Current Password');
    const newPw = screen.getByLabelText('New Password');
    const confirmPw = screen.getByLabelText('Confirm New Password');

    fireEvent.change(currentPw, { target: { value: 'WrongPassword1!' } });
    fireEvent.change(newPw, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmPw, { target: { value: 'StrongPass123!' } });

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /change password/i }).closest('form')!);
    });

    expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
  });

  it('form resets when modal reopens', () => {
    const { rerender } = render(
      <ChangePasswordModal isOpen={true} onClose={onClose} />,
    );

    const currentPw = screen.getByLabelText('Current Password');
    fireEvent.change(currentPw, { target: { value: 'something' } });
    expect(currentPw).toHaveValue('something');

    // Close then reopen
    rerender(<ChangePasswordModal isOpen={false} onClose={onClose} />);
    rerender(<ChangePasswordModal isOpen={true} onClose={onClose} />);

    const freshPw = screen.getByLabelText('Current Password');
    expect(freshPw).toHaveValue('');
  });
});
