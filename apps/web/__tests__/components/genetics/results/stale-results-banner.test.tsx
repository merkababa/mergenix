import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaleResultsBanner } from '../../../../components/genetics/results/stale-results-banner';

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Mock CURRENT_DATA_VERSION from genetics-engine
vi.mock('@mergenix/genetics-engine', () => ({
  CURRENT_DATA_VERSION: '2.0.0',
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StaleResultsBanner', () => {
  it('shows warning banner when saved result has older dataVersion than current', () => {
    render(<StaleResultsBanner dataVersion="1.0.0" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Results may not reflect the latest genetic data');
  });

  it('banner displays which version was used and current version', () => {
    render(<StaleResultsBanner dataVersion="1.5.0" />);

    expect(screen.getByText(/1\.5\.0/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0\.0/)).toBeInTheDocument();
  });

  it('dismiss button hides banner for the session', () => {
    render(<StaleResultsBanner dataVersion="1.0.0" />);

    // Banner should be visible initially
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Click dismiss button
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // Banner should be hidden
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('no banner when dataVersion matches current version', () => {
    render(<StaleResultsBanner dataVersion="2.0.0" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows banner when dataVersion is undefined (legacy results treated as stale)', () => {
    render(<StaleResultsBanner dataVersion={undefined} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('data version could not be determined');
    expect(alert.textContent).toContain('2.0.0');
  });

  it('banner has appropriate ARIA role="alert"', () => {
    render(<StaleResultsBanner dataVersion="1.0.0" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('accessible dismiss button with aria-label', () => {
    render(<StaleResultsBanner dataVersion="1.0.0" />);

    const dismissButton = screen.getByRole('button', { name: /dismiss stale results warning/i });
    expect(dismissButton).toBeInTheDocument();
  });
});
