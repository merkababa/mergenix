import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  LimitationsSection,
  DEFAULT_GENETIC_LIMITATIONS,
} from '../../../../components/genetics/results/limitations-section';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LimitationsSection', () => {
  it('renders with context-aware heading', () => {
    render(<LimitationsSection limitations={[]} context="carrier" />);

    expect(screen.getByText('What Carrier Analysis Cannot Tell You')).toBeInTheDocument();
  });

  it('renders with generic heading when no context', () => {
    render(<LimitationsSection limitations={[]} />);

    expect(screen.getByText('What This Analysis Cannot Tell You')).toBeInTheDocument();
  });

  it('uses default limitations when empty array passed', () => {
    render(<LimitationsSection limitations={[]} />);

    // Open the details to see the content
    const summary = screen.getByText('What This Analysis Cannot Tell You');
    fireEvent.click(summary);

    // Check first default limitation is present
    expect(screen.getByText(DEFAULT_GENETIC_LIMITATIONS[0])).toBeInTheDocument();
  });

  it('uses custom limitations when provided', () => {
    const custom = ['Custom limitation 1', 'Custom limitation 2'];
    render(<LimitationsSection limitations={custom} />);

    const summary = screen.getByText('What This Analysis Cannot Tell You');
    fireEvent.click(summary);

    expect(screen.getByText('Custom limitation 1')).toBeInTheDocument();
    expect(screen.getByText('Custom limitation 2')).toBeInTheDocument();
  });

  it('renders as a collapsible details element', () => {
    const { container } = render(<LimitationsSection limitations={[]} />);

    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();

    const summary = container.querySelector('summary');
    expect(summary).toBeInTheDocument();
  });

  it('is collapsed by default', () => {
    const { container } = render(<LimitationsSection limitations={[]} />);

    const details = container.querySelector('details');
    // Details element should NOT have the "open" attribute by default
    expect(details).not.toHaveAttribute('open');
  });

  it('renders all default limitations', () => {
    render(<LimitationsSection limitations={[]} />);

    // Open the section
    fireEvent.click(screen.getByText('What This Analysis Cannot Tell You'));

    for (const limitation of DEFAULT_GENETIC_LIMITATIONS) {
      expect(screen.getByText(limitation)).toBeInTheDocument();
    }
  });

  it('does not re-render with identical props (React.memo)', () => {
    const props = {
      limitations: ['Test limitation'],
      context: 'carrier' as const,
    };

    const { rerender } = render(<LimitationsSection {...props} />);
    rerender(<LimitationsSection {...props} />);

    expect(screen.getByText('What Carrier Analysis Cannot Tell You')).toBeInTheDocument();
  });
});
