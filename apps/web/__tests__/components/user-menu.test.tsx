import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAuthStore } from '../../lib/stores/auth-store';
import { mockLucideIcons, mockNextLinkFactory, mockBadgeFactory } from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => mockLucideIcons('User', 'CreditCard', 'Activity', 'LogOut', 'ChevronDown'));

vi.mock('next/link', () => mockNextLinkFactory());

vi.mock('@/components/ui/badge', () => mockBadgeFactory({ includeVariant: true }));

// ─── Import component after mocks ─────────────────────────────────────────────

import { UserMenu } from '../../components/auth/user-menu';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  tier: 'premium' as const,
  is_verified: true,
  has_2fa: false,
  created_at: '2025-01-01T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserMenu', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: mockUser,
      logout: mockLogout,
      isAuthenticated: true,
    } as any);
  });

  it('renders the user avatar button with initials derived from the user name', () => {
    render(<UserMenu />);

    // Initials for "Jane Doe" are "JD"
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders the user menu trigger button with aria-label "User menu"', () => {
    render(<UserMenu />);

    expect(screen.getByRole('button', { name: /User menu/i })).toBeInTheDocument();
  });

  it('dropdown is not visible initially', () => {
    render(<UserMenu />);

    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('clicking avatar button opens the dropdown menu', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('dropdown shows the user tier badge', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    // Badge rendered for "premium" tier
    expect(screen.getByTestId('badge-premium')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('dropdown shows Account Settings link with correct href', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    const accountLink = screen.getByRole('menuitem', { name: /Account Settings/i });
    expect(accountLink).toHaveAttribute('href', '/account');
  });

  it('dropdown shows Subscription link with correct href', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    const subscriptionLink = screen.getByRole('menuitem', { name: /My Plan/i });
    expect(subscriptionLink).toHaveAttribute('href', '/subscription');
  });

  it('dropdown shows Analysis link with correct href', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    const analysisLink = screen.getByRole('menuitem', { name: /Analysis/i });
    expect(analysisLink).toHaveAttribute('href', '/analysis');
  });

  it('dropdown shows a Sign Out button', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));

    // Sign Out has menuitem role
    expect(screen.getByRole('menuitem', { name: /Sign Out/i })).toBeInTheDocument();
  });

  it('clicking Sign Out calls logout', async () => {
    mockLogout.mockResolvedValue(undefined);

    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Sign Out/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape closes the dropdown', () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: /User menu/i });
    fireEvent.click(trigger);

    // Verify menu is open
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    // Menu content should now be gone
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('avatar button aria-expanded is false when closed and true when open', () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: /User menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders initials for single-word name', () => {
    useAuthStore.setState({
      user: { ...mockUser, name: 'Alice' },
    } as any);

    render(<UserMenu />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside the menu', () => {
    render(<UserMenu />);

    // Open the menu
    fireEvent.click(screen.getByRole('button', { name: /User menu/i }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();

    // Fire a mousedown event on the document body (outside the menu)
    fireEvent.mouseDown(document.body);

    // Menu should be closed
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });
});
