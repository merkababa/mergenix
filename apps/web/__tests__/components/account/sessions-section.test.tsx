import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockBadgeFactory } from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Monitor', 'Smartphone', 'Globe', 'Clock', 'Trash2', 'Loader2'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/badge', () => mockBadgeFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

const mockGetSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeAllSessions = vi.fn();

const mockStoreState: Record<string, any> = {
  getSessions: mockGetSessions,
  revokeSession: mockRevokeSession,
  revokeAllSessions: mockRevokeAllSessions,
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSessions = [
  {
    id: 's1',
    device: 'Chrome on Windows',
    ip: '192.168.1.1',
    location: 'New York, US',
    lastActive: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: 's2',
    device: 'Safari on iPhone',
    ip: '10.0.0.1',
    location: 'London, UK',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
    isCurrent: false,
  },
];

// ─── Import component after mocks ────────────────────────────────────────────

import { SessionsSection } from '../../../app/(app)/account/_components/sessions-section';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SessionsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessions.mockResolvedValue(mockSessions);
  });

  it('renders "Active Sessions" heading', async () => {
    render(<SessionsSection />);
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });

  it('shows loading skeleton initially before getSessions resolves', () => {
    // Keep getSessions pending to observe loading state
    mockGetSessions.mockReturnValue(new Promise(() => {}));
    render(<SessionsSection />);

    // Loading skeleton renders 3 pulse divs
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('displays sessions after loading', async () => {
    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    });

    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument();
    expect(screen.getByText(/10\.0\.0\.1/)).toBeInTheDocument();
  });

  it('current session shows "Current" badge', async () => {
    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Current')).toBeInTheDocument();
    });
  });

  it('non-current session shows "Revoke" button', async () => {
    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });

    // The Revoke button with aria-label for the non-current session
    const revokeButton = screen.getByLabelText('Revoke session on Safari on iPhone');
    expect(revokeButton).toBeInTheDocument();
  });

  it('clicking Revoke calls revokeSession with session ID', async () => {
    mockRevokeSession.mockResolvedValue(undefined);
    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });

    const revokeButton = screen.getByLabelText('Revoke session on Safari on iPhone');
    await act(async () => {
      fireEvent.click(revokeButton);
    });

    expect(mockRevokeSession).toHaveBeenCalledWith('s2');
  });

  it('"Revoke All Other Sessions" button calls revokeAllSessions', async () => {
    mockRevokeAllSessions.mockResolvedValue(undefined);
    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Revoke All Other Sessions')).toBeInTheDocument();
    });

    const revokeAllButton = screen.getByText('Revoke All Other Sessions').closest('button')!;
    await act(async () => {
      fireEvent.click(revokeAllButton);
    });

    expect(mockRevokeAllSessions).toHaveBeenCalled();
  });

  it('hides "Revoke All" when only current session exists', async () => {
    const currentOnly = [mockSessions[0]]; // Only the current session
    mockGetSessions.mockResolvedValue(currentOnly);

    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    });

    expect(screen.queryByText('Revoke All Other Sessions')).not.toBeInTheDocument();
  });

  it('shows error state when getSessions fails', async () => {
    mockGetSessions.mockRejectedValue(new Error('Network error'));

    render(<SessionsSection />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
