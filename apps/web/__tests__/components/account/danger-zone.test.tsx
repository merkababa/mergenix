import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  mockLucideIcons,
  mockGlassCardFactory,
  mockButtonFactory,
  mockNextLinkFactory,
} from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Trash2', 'ChevronDown', 'AlertTriangle', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

vi.mock('@/components/auth/password-input', () => ({
  PasswordInput: ({ label, value, onChange, error, ...rest }: any) => (
    <div>
      <label htmlFor="pw-input">{label}</label>
      <input
        id="pw-input"
        type="password"
        value={value}
        onChange={onChange}
        aria-label={label || 'password'}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

const mockDeleteAccount = vi.fn();
const mockLogout = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => mockNextLinkFactory());

const mockStoreState: Record<string, any> = {
  deleteAccount: mockDeleteAccount,
  logout: mockLogout,
  isLoading: false,
  error: null,
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign((selector: (state: any) => any) => selector(mockStoreState), {
    getState: () => mockStoreState,
    setState: vi.fn(),
  }),
}));

// ─── Import component after mocks ────────────────────────────────────────────

import { DangerZone } from '../../../app/(app)/account/_components/danger-zone';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DangerZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Danger Zone" heading', () => {
    render(<DangerZone />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('initially collapsed — delete form not visible', () => {
    render(<DangerZone />);

    // The expand button should have aria-expanded=false
    const toggleButton = screen.getByRole('button', { name: /danger zone/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // Delete button should not be visible
    expect(screen.queryByText('Delete My Account Permanently')).not.toBeInTheDocument();
  });

  it('expanding reveals password input and checkbox', () => {
    render(<DangerZone />);

    const toggleButton = screen.getByRole('button', { name: /danger zone/i });
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByText(/I understand this action is permanent/)).toBeInTheDocument();
  });

  it('delete button disabled when password empty or checkbox unchecked', () => {
    render(<DangerZone />);

    // Expand the section
    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));

    const deleteButton = screen.getByText('Delete My Account Permanently').closest('button')!;

    // Both empty and unchecked → disabled
    expect(deleteButton).toBeDisabled();
  });

  it('delete button disabled when password entered but checkbox unchecked', () => {
    render(<DangerZone />);

    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));

    // Enter password but don't check the box
    const passwordInput = screen.getByLabelText('Confirm your password');
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

    const deleteButton = screen.getByText('Delete My Account Permanently').closest('button')!;
    expect(deleteButton).toBeDisabled();
  });

  it('delete button enabled when password entered AND checkbox checked', () => {
    render(<DangerZone />);

    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));

    // Enter password
    const passwordInput = screen.getByLabelText('Confirm your password');
    fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

    // Check the confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const deleteButton = screen.getByText('Delete My Account Permanently').closest('button')!;
    expect(deleteButton).not.toBeDisabled();
  });

  it('clicking delete calls deleteAccount with password', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);

    render(<DangerZone />);

    // Expand
    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));

    // Fill password + check box
    fireEvent.change(screen.getByLabelText('Confirm your password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    // Click delete
    const deleteButton = screen.getByText('Delete My Account Permanently').closest('button')!;
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockDeleteAccount).toHaveBeenCalledWith('secret123');
  });

  it('successful deletion calls logout and router.push("/")', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);

    render(<DangerZone />);

    // Expand, fill, check, delete
    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));
    fireEvent.change(screen.getByLabelText('Confirm your password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByText('Delete My Account Permanently').closest('button')!);
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('error displayed on failed deletion', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('Wrong password'));

    render(<DangerZone />);

    // Expand, fill, check, delete
    fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));
    fireEvent.change(screen.getByLabelText('Confirm your password'), {
      target: { value: 'wrongpw' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    await act(async () => {
      fireEvent.click(screen.getByText('Delete My Account Permanently').closest('button')!);
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Wrong password')).toBeInTheDocument();
  });

  it('"Learn more about our data practices" link present', () => {
    render(<DangerZone />);

    const link = screen.getByText('Learn more about our data practices');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/legal#privacy');
  });
});
