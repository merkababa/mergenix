import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CYP2D6Warning } from '../../../../components/genetics/results/cyp2d6-warning';

describe('CYP2D6Warning', () => {
  it('renders nothing when hasWarning is false', () => {
    const { container } = render(<CYP2D6Warning gene="CYP2D6" hasWarning={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders warning when hasWarning is true', () => {
    render(<CYP2D6Warning gene="CYP2D6" hasWarning={true} />);
    expect(
      screen.getByText(/Array-based testing cannot detect CYP2D6 gene duplications/),
    ).toBeInTheDocument();
  });

  it('shows gene name in bold', () => {
    render(<CYP2D6Warning gene="CYP2D6" hasWarning={true} />);
    expect(screen.getByText('CYP2D6:')).toBeInTheDocument();
  });

  it('uses custom warningMessage when provided', () => {
    render(
      <CYP2D6Warning gene="CYP2D6" hasWarning={true} warningMessage="Custom warning text here." />,
    );
    expect(screen.getByText(/Custom warning text here/)).toBeInTheDocument();
    expect(screen.queryByText(/Array-based testing cannot detect/)).not.toBeInTheDocument();
  });

  it('has role="note" with aria-label', () => {
    render(<CYP2D6Warning gene="CYP2D6" hasWarning={true} />);
    const warning = screen.getByRole('note');
    expect(warning).toHaveAttribute('aria-label', 'CYP2D6 testing limitation');
  });

  it('renders with a different gene name', () => {
    render(<CYP2D6Warning gene="CYP2C19" hasWarning={true} />);
    expect(screen.getByText('CYP2C19:')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveAttribute('aria-label', 'CYP2C19 testing limitation');
  });
});
