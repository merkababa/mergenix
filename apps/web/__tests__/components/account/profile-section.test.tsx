import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockInputFactory, mockBadgeFactory } from '../../__helpers__';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('User', 'Mail', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/badge', () => mockBadgeFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/input', () => mockInputFactory());

// Mock account-utils
vi.mock('@/lib/account-utils', () => ({
  getInitials: (name: string) =>
    name
      .split(' ')
      .map((p: string) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U',
  getTierVariant: (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'premium') return 'premium';
    if (t === 'pro') return 'pro';
    return 'free';
  },
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

import { ProfileSection } from '../../../app/(app)/account/_components/profile-section';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.user = { ...mockUser };
    mockStoreState.updateProfile = vi.fn();
    mockStoreState.error = null;
  });

  it('renders the "Profile" heading', () => {
    render(<ProfileSection />);
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('shows user name and email', () => {
    render(<ProfileSection />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows avatar with initials ("TU" for "Test User")', () => {
    render(<ProfileSection />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('shows tier badge displaying "Free"', () => {
    render(<ProfileSection />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('displays name input pre-populated with user name', () => {
    render(<ProfileSection />);
    const nameInput = screen.getByLabelText('Display Name');
    expect(nameInput).toHaveValue('Test User');
  });

  it('save button is disabled when name is unchanged', () => {
    render(<ProfileSection />);
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('save button is enabled when name changes, calls updateProfile on click', async () => {
    mockStoreState.updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<ProfileSection />);

    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(mockStoreState.updateProfile).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('shows "Changes saved!" after successful save', async () => {
    mockStoreState.updateProfile = vi.fn().mockResolvedValue(undefined);
    render(<ProfileSection />);

    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    expect(screen.getByText('Changes saved!')).toBeInTheDocument();
  });

  it('shows error message on failed save', async () => {
    mockStoreState.updateProfile = vi.fn().mockRejectedValue(new Error('Network error'));
    render(<ProfileSection />);

    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('email field is disabled', () => {
    render(<ProfileSection />);
    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toBeDisabled();
  });
});
