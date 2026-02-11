import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PopulationSelector } from '../../components/genetics/population-selector';
import { useAnalysisStore } from '../../lib/stores/analysis-store';
import { useAuthStore } from '../../lib/stores/auth-store';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PopulationSelector', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
    useAuthStore.setState({ user: null });
  });

  it('renders select with population options', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Test', email: 'test@test.com', tier: 'pro' } as never,
    });

    render(<PopulationSelector />);

    const select = screen.getByLabelText('Select ancestral population');
    expect(select).toBeInTheDocument();

    // Check some population options exist
    expect(screen.getByText('African/African American')).toBeInTheDocument();
    expect(screen.getByText('European (Non-Finnish)')).toBeInTheDocument();
    expect(screen.getByText('Ashkenazi Jewish')).toBeInTheDocument();
  });

  it('shows disabled state and message for free tier', () => {
    // Free tier: user is null (defaults to free) or explicitly free
    useAuthStore.setState({
      user: { id: '1', name: 'Test', email: 'test@test.com', tier: 'free' } as never,
    });

    render(<PopulationSelector />);

    const select = screen.getByLabelText('Select ancestral population');
    expect(select).toBeDisabled();

    expect(
      screen.getByText('Population-adjusted analysis available on Premium and Pro tiers.'),
    ).toBeInTheDocument();
  });

  it('is enabled for premium tier', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Test', email: 'test@test.com', tier: 'premium' } as never,
    });

    render(<PopulationSelector />);

    const select = screen.getByLabelText('Select ancestral population');
    expect(select).not.toBeDisabled();

    expect(
      screen.queryByText('Population-adjusted analysis available on Premium and Pro tiers.'),
    ).not.toBeInTheDocument();
  });

  it('updates analysis store when population selected', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Test', email: 'test@test.com', tier: 'pro' } as never,
    });

    render(<PopulationSelector />);

    const select = screen.getByLabelText('Select ancestral population');
    fireEvent.change(select, { target: { value: 'East Asian' } });

    expect(useAnalysisStore.getState().selectedPopulation).toBe('East Asian');
  });
});
