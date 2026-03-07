/**
 * Integration tests for the ComingSoonPage React component.
 *
 * Tests cover:
 *   - Page renders the form with password input and submit button
 *   - Error message displays on failed submission (401 response)
 *   - Loading state shows spinner during submission
 *   - Success state triggers redirect via window.location.href
 *   - Submit button disabled when password is empty
 *   - Submit button disabled during loading
 *
 * The component is a "use client" page that calls fetch() and sets
 * window.location.href on success (after a 500ms setTimeout). Both are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Mock window.location ──────────────────────────────────────────────────────
//
// jsdom's window.location is not always freely writable.  We replace it with a
// simple writable object before every test so the component can set .href.

const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '' },
  });
  vi.clearAllMocks();
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── Import under test ─────────────────────────────────────────────────────────

import ComingSoonPage from '../app/coming-soon/page';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFetchResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/**
 * Fill in the password input and click submit, then await all async state
 * updates to flush (microtasks + React state batch).
 */
async function submitForm(password: string) {
  const input = screen.getByLabelText('Access code for team members');
  const button = screen.getByRole('button', { name: 'Submit access code' });

  await act(async () => {
    fireEvent.change(input, { target: { value: password } });
  });

  await act(async () => {
    fireEvent.click(button);
  });

  return { input, button };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComingSoonPage', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the password input with correct accessible label', () => {
    render(<ComingSoonPage />);
    // type="password" inputs have no ARIA textbox role — query by label
    const input = screen.getByLabelText('Access code for team members');
    expect(input).toBeDefined();
    expect(input.getAttribute('type')).toBe('password');
  });

  it('renders the submit button', () => {
    render(<ComingSoonPage />);
    expect(screen.getByRole('button', { name: 'Submit access code' })).toBeDefined();
  });

  it('renders the "Coming Soon" heading', () => {
    render(<ComingSoonPage />);
    expect(screen.getByRole('heading', { name: 'Coming Soon' })).toBeDefined();
  });

  it('renders the contact link pointing to mailto', () => {
    render(<ComingSoonPage />);
    const link = screen.getByRole('link', { name: 'Contact Us' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('mailto:contact@mergenix.com');
  });

  it('renders the Privacy Policy link', () => {
    render(<ComingSoonPage />);
    const link = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/privacy');
  });

  // ── Submit button disabled states ──────────────────────────────────────────

  it('submit button is disabled when password field is empty', () => {
    render(<ComingSoonPage />);
    expect(screen.getByRole('button', { name: 'Submit access code' })).toBeDisabled();
  });

  it('submit button becomes enabled after typing a password', async () => {
    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');
    const button = screen.getByRole('button', { name: 'Submit access code' });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'mypassword' } });
    });

    expect(button).not.toBeDisabled();
  });

  it('submit button is disabled during an in-flight request', async () => {
    // Fetch that never resolves — keeps loading state active
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<ComingSoonPage />);
    const { button } = await submitForm('testpassword');

    expect(button).toBeDisabled();
  });

  // ── Error state on 401 ────────────────────────────────────────────────────

  it('displays an error message when the API returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      buildFetchResponse(401, { error: 'Invalid access code' }),
    );

    render(<ComingSoonPage />);
    await submitForm('wrongpassword');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText('Invalid access code')).toBeDefined();
  });

  it('shows a fallback error when the 401 body has no error field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(buildFetchResponse(401, {}));

    render(<ComingSoonPage />);
    await submitForm('badcode');

    await waitFor(() => {
      expect(screen.getByText('Invalid access code')).toBeDefined();
    });
  });

  it('sets aria-invalid on the input when there is an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      buildFetchResponse(401, { error: 'Invalid access code' }),
    );

    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');

    await submitForm('wrong');

    await waitFor(() => {
      expect(screen.getByText('Invalid access code')).toBeDefined();
    });

    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('displays a network error message when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

    render(<ComingSoonPage />);
    await submitForm('anypassword');

    await waitFor(() => {
      expect(screen.getByText('Network error — please try again')).toBeDefined();
    });
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it('announces "Verifying access code..." to screen readers while loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));

    render(<ComingSoonPage />);
    await submitForm('testpassword');

    // The polite live region (sr-only) should contain the loading announcement
    expect(screen.getByText('Verifying access code...')).toBeDefined();
  });

  // ── Success state + redirect ───────────────────────────────────────────────

  it('announces "Access granted. Redirecting..." to screen readers on success', async () => {
    // Use fake timers BEFORE rendering to capture the 500ms setTimeout
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(buildFetchResponse(200, { ok: true }));

    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');
    const button = screen.getByRole('button', { name: 'Submit access code' });

    fireEvent.change(input, { target: { value: 'correctpassword' } });

    // Wrap click in act — resolves the fetch promise AND the resulting state updates
    await act(async () => {
      fireEvent.click(button);
      // Let the promise microtasks (fetch.then) flush without advancing timers
      await Promise.resolve();
      await Promise.resolve();
    });

    // isSuccess=true at this point; the 500ms setTimeout has NOT fired yet
    expect(screen.getByText('Access granted. Redirecting...')).toBeDefined();
  });

  it('sets window.location.href to "/" on successful submission', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(buildFetchResponse(200, { ok: true }));

    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');
    const button = screen.getByRole('button', { name: 'Submit access code' });

    fireEvent.change(input, { target: { value: 'correctpassword' } });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance past the 500ms redirect delay
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(window.location.href).toBe('/');
  });

  it('disables the input and button after a successful submission', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(buildFetchResponse(200, { ok: true }));

    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');
    const button = screen.getByRole('button', { name: 'Submit access code' });

    fireEvent.change(input, { target: { value: 'correctpassword' } });

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    // isSuccess=true — both input and button should be disabled
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  // ── Error clears on new input ──────────────────────────────────────────────

  it('clears error message when user starts typing after a failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      buildFetchResponse(401, { error: 'Invalid access code' }),
    );

    render(<ComingSoonPage />);
    const input = screen.getByLabelText('Access code for team members');

    await submitForm('wrong');

    await waitFor(() => {
      expect(screen.getByText('Invalid access code')).toBeDefined();
    });

    // Type again — the onChange handler calls setError("") when error is set
    await act(async () => {
      fireEvent.change(input, { target: { value: 'wrongx' } });
    });

    expect(screen.queryByText('Invalid access code')).toBeNull();
  });
});
