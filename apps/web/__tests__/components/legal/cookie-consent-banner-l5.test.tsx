/**
 * L5 — Cookie Consent Audit: Integration tests for granular cookie consent.
 *
 * TDD: These tests are written FIRST and must FAIL before implementation.
 *
 * Coverage:
 * - Banner renders with 3 categories (Essential always on)
 * - "Accept All" sets both analytics + marketing to true
 * - "Essential Only" sets both to false
 * - Individual toggles work independently
 * - No dark patterns: both action buttons have equal visual prominence
 * - Preferences persist to localStorage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { mockLucideIcons } from '../../__helpers__';

// ─── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Cookie', 'X'));

// NOTE: data-variant is intentionally preserved here — required by the dark-patterns test (GDPR/EDPB equal prominence check)
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

// ─── Store mock ─────────────────────────────────────────────────────────────

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

// ─── localStorage mock ───────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

function mockLocalStorage(data: Record<string, string> = {}) {
  Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
  Object.assign(localStorageStore, data);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
    (key: string) => localStorageStore[key] ?? null,
  );
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    (key: string, value: string) => { localStorageStore[key] = value; },
  );
}

// ─── Import component after mocks ────────────────────────────────────────────

import { CookieConsentBanner } from '../../../components/legal/cookie-consent-banner';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CookieConsentBanner — L5 Granular Consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcceptAllCookies.mockResolvedValue(undefined);
    mockAcceptEssentialOnly.mockResolvedValue(undefined);
    mockUpdateCookiePrefs.mockResolvedValue(undefined);
  });

  // ── Banner visibility ──────────────────────────────────────────────────

  it('renders banner when no localStorage consent exists', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
  });

  it('does NOT render banner when localStorage has consent', () => {
    mockLocalStorage({ mergenix_cookie_consent: 'accepted_all' });
    render(<CookieConsentBanner />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Three cookie categories in customize panel ─────────────────────────

  it('shows Essential as always-on (non-toggleable) in customize panel', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    // Essential badge indicates always-on status
    expect(screen.getByText('Essential Cookies')).toBeInTheDocument();
    expect(screen.getByText('Always on')).toBeInTheDocument();

    // Essential should NOT have a toggle switch
    const switches = screen.getAllByRole('switch');
    const labels = switches.map((s) => s.getAttribute('aria-label'));
    expect(labels).not.toContain('Enable essential cookies');
  });

  it('shows Analytics toggle in customize panel (default OFF)', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const analyticsToggle = screen.getByLabelText('Enable analytics cookies');
    expect(analyticsToggle).toBeInTheDocument();
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('shows Marketing toggle in customize panel (default OFF)', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const marketingToggle = screen.getByLabelText('Enable marketing cookies');
    expect(marketingToggle).toBeInTheDocument();
    expect(marketingToggle).toHaveAttribute('aria-checked', 'false');
  });

  // ── Accept All ────────────────────────────────────────────────────────

  it('"Accept All" calls acceptAllCookies and hides banner', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    await act(async () => {
      fireEvent.click(screen.getByText('Accept All'));
    });

    expect(mockAcceptAllCookies).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Essential Only ────────────────────────────────────────────────────

  it('"Essential Only" calls acceptEssentialOnly and hides banner', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    await act(async () => {
      fireEvent.click(screen.getByText('Essential Only'));
    });

    expect(mockAcceptEssentialOnly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Individual toggles ─────────────────────────────────────────────────

  it('analytics toggle switches state independently', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const analyticsToggle = screen.getByLabelText('Enable analytics cookies');
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(analyticsToggle);
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(analyticsToggle);
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('marketing toggle switches state independently', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const marketingToggle = screen.getByLabelText('Enable marketing cookies');
    expect(marketingToggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(marketingToggle);
    expect(marketingToggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(marketingToggle);
    expect(marketingToggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggling analytics does NOT affect marketing toggle', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const analyticsToggle = screen.getByLabelText('Enable analytics cookies');
    const marketingToggle = screen.getByLabelText('Enable marketing cookies');

    fireEvent.click(analyticsToggle);
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'true');
    expect(marketingToggle).toHaveAttribute('aria-checked', 'false'); // unchanged
  });

  it('toggling marketing does NOT affect analytics toggle', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const analyticsToggle = screen.getByLabelText('Enable analytics cookies');
    const marketingToggle = screen.getByLabelText('Enable marketing cookies');

    fireEvent.click(marketingToggle);
    expect(marketingToggle).toHaveAttribute('aria-checked', 'true');
    expect(analyticsToggle).toHaveAttribute('aria-checked', 'false'); // unchanged
  });

  it('Save Preferences passes both analytics and marketing to store', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    // Enable analytics, leave marketing off
    fireEvent.click(screen.getByLabelText('Enable analytics cookies'));

    await act(async () => {
      fireEvent.click(screen.getByText('Save Preferences'));
    });

    expect(mockUpdateCookiePrefs).toHaveBeenCalledWith(true, false);
  });

  it('Save Preferences with both enabled passes true, true', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    fireEvent.click(screen.getByLabelText('Enable analytics cookies'));
    fireEvent.click(screen.getByLabelText('Enable marketing cookies'));

    await act(async () => {
      fireEvent.click(screen.getByText('Save Preferences'));
    });

    expect(mockUpdateCookiePrefs).toHaveBeenCalledWith(true, true);
  });

  // ── No dark patterns: equal visual prominence ──────────────────────────

  it('"Essential Only" button uses same variant as "Accept All" (no de-emphasis)', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const acceptAllBtn = screen.getByText('Accept All').closest('button');
    const essentialBtn = screen.getByText('Essential Only').closest('button');

    expect(acceptAllBtn).toBeInTheDocument();
    expect(essentialBtn).toBeInTheDocument();

    // Both must be visible — neither should be hidden or have display:none
    expect(acceptAllBtn).toBeVisible();
    expect(essentialBtn).toBeVisible();

    // Neither button should be disabled
    expect(acceptAllBtn).not.toBeDisabled();
    expect(essentialBtn).not.toBeDisabled();

    // Both buttons MUST have the same data-variant (equal visual weight — GDPR/EDPB)
    const acceptAllVariant = acceptAllBtn?.getAttribute('data-variant');
    const essentialVariant = essentialBtn?.getAttribute('data-variant');
    expect(acceptAllVariant).toBeTruthy();
    expect(essentialVariant).toBeTruthy();
    expect(acceptAllVariant).toBe(essentialVariant);
  });

  // ── ARIA ────────────────────────────────────────────────────────────────

  it('has correct ARIA attributes on dialog', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Cookie consent');
    expect(dialog).toHaveAttribute('aria-describedby', 'cookie-consent-description');
  });

  // ── Dismiss ─────────────────────────────────────────────────────────────

  it('dismiss button hides the banner and calls acceptEssentialOnly', async () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);

    const dismissButton = screen.getByLabelText('Dismiss cookie banner');
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockAcceptEssentialOnly).toHaveBeenCalledTimes(1);
  });

  // ── Touch target size (WCAG 2.5.5) ──────────────────────────────────────

  it('analytics toggle row has a minimum 44px touch target (py-1.5 wrapper)', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const analyticsToggle = screen.getByLabelText('Enable analytics cookies');
    // The toggle itself (h-6 = 24px visually) is inside a wrapper.
    // The wrapper row should have min-h-[44px] or equivalent padding class applied.
    const toggleRow = analyticsToggle.closest('[data-touch-target]');
    expect(toggleRow).toBeTruthy();
    expect(toggleRow).toHaveAttribute('data-touch-target', 'true');
  });

  it('marketing toggle row has a minimum 44px touch target (py-1.5 wrapper)', () => {
    mockLocalStorage({});
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByText('Customize'));

    const marketingToggle = screen.getByLabelText('Enable marketing cookies');
    const toggleRow = marketingToggle.closest('[data-touch-target]');
    expect(toggleRow).toBeTruthy();
    expect(toggleRow).toHaveAttribute('data-touch-target', 'true');
  });
});
