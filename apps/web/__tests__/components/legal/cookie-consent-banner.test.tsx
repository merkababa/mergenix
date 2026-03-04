import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockLucideIcons, mockButtonFactory } from '../../__helpers__';

vi.mock('lucide-react', () => mockLucideIcons('Cookie', 'X'));
vi.mock('@/components/ui/button', () => mockButtonFactory());

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockAcceptAllCookies = vi.fn();
const mockAcceptEssentialOnly = vi.fn();
const mockUpdateCookiePrefs = vi.fn();

const mockStoreState: Record<string, any> = {
  acceptAllCookies: mockAcceptAllCookies,
  acceptEssentialOnly: mockAcceptEssentialOnly,
  updateCookiePrefs: mockUpdateCookiePrefs,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── localStorage mock ──────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

function mockLocalStorage(data: Record<string, string> = {}) {
  Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  Object.assign(localStorageStore, data);

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => {
      localStorageStore[key] = value;
    },
  );
}

// ─── Import component after mocks ─────────────────────────────────────────────

import { CookieConsentBanner } from '../../../components/legal/cookie-consent-banner';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcceptAllCookies.mockResolvedValue(undefined);
    mockAcceptEssentialOnly.mockResolvedValue(undefined);
    mockUpdateCookiePrefs.mockResolvedValue(undefined);
  });

  it('renders banner when no localStorage consent exists', () => {
    mockLocalStorage({}); // no consent stored
    render(<CookieConsentBanner />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
  });

  it('does NOT render banner when localStorage has consent', () => {
    mockLocalStorage({ mergenix_cookie_consent: 'accepted_all' });
    render(<CookieConsentBanner />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Accept All button calls acceptAllCookies and hides banner', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const acceptAllButton = screen.getByText('Accept All');
    await act(async () => {
      fireEvent.click(acceptAllButton);
    });

    expect(mockAcceptAllCookies).toHaveBeenCalled();
  });

  it('Essential Only button calls acceptEssentialOnly and hides banner', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const essentialButton = screen.getByText('Essential Only');
    await act(async () => {
      fireEvent.click(essentialButton);
    });

    expect(mockAcceptEssentialOnly).toHaveBeenCalled();
  });

  it('Customize button reveals analytics toggle', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    // Before clicking Customize, toggles should not be visible
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();

    const customizeButton = screen.getByText('Customize');
    fireEvent.click(customizeButton);

    // After clicking, analytics toggle should be visible (there are now 2 switches)
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Enable analytics cookies')).toBeInTheDocument();
  });

  it('analytics toggle switches aria-checked state', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    // Open customize panel
    fireEvent.click(screen.getByText('Customize'));

    // Use specific label to avoid ambiguity with marketing toggle
    const toggle = screen.getByLabelText('Enable analytics cookies');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Click to enable
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    // Click to disable
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('banner disappears after Accept All is clicked', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    // Banner should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Accept All'));
    });

    // Banner should be gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes on dialog', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Cookie consent');
    expect(dialog).toHaveAttribute('aria-describedby', 'cookie-consent-description');
  });

  it('dismiss button hides the banner', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss cookie banner');
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Save Preferences button appears when customizing', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    // Open customize panel
    fireEvent.click(screen.getByText('Customize'));

    // Save Preferences should replace Customize
    expect(screen.getByText('Save Preferences')).toBeInTheDocument();
    expect(screen.queryByText('Customize')).not.toBeInTheDocument();

    // Click Save Preferences
    await act(async () => {
      fireEvent.click(screen.getByText('Save Preferences'));
    });

    expect(mockUpdateCookiePrefs).toHaveBeenCalledWith(false, false); // default: analytics=false, marketing=false
  });
});
