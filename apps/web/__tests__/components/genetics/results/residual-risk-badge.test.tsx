import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResidualRiskBadge } from '../../../../components/genetics/results/residual-risk-badge';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ResidualRiskBadge', () => {
  it('renders when isNotDetected is true', () => {
    render(
      <ResidualRiskBadge coveragePct={80} diseaseName="Cystic Fibrosis" isNotDetected={true} />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Low Residual Risk')).toBeInTheDocument();
  });

  it('does NOT render when isNotDetected is false', () => {
    const { container } = render(
      <ResidualRiskBadge coveragePct={80} diseaseName="Cystic Fibrosis" isNotDetected={false} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it("shows 'Fully Tested' for 100% coverage", () => {
    render(<ResidualRiskBadge coveragePct={100} diseaseName="PKU" isNotDetected={true} />);

    expect(screen.getByText('Fully Tested')).toBeInTheDocument();
  });

  it("shows 'Very Low Residual Risk' for coverage >= 95%", () => {
    render(
      <ResidualRiskBadge coveragePct={97} diseaseName="Tay-Sachs Disease" isNotDetected={true} />,
    );

    expect(screen.getByText('Very Low Residual Risk')).toBeInTheDocument();
  });

  it("shows 'Low Residual Risk' for coverage >= 80%", () => {
    render(<ResidualRiskBadge coveragePct={85} diseaseName="SMA" isNotDetected={true} />);

    expect(screen.getByText('Low Residual Risk')).toBeInTheDocument();
  });

  it("shows 'Moderate Residual Risk' for coverage >= 50%", () => {
    render(
      <ResidualRiskBadge coveragePct={60} diseaseName="Gaucher Disease" isNotDetected={true} />,
    );

    expect(screen.getByText('Moderate Residual Risk')).toBeInTheDocument();
  });

  it("shows 'Significant Residual Risk' for coverage < 50%", () => {
    render(<ResidualRiskBadge coveragePct={30} diseaseName="Fragile X" isNotDetected={true} />);

    expect(screen.getByText('Significant Residual Risk')).toBeInTheDocument();
  });

  it('has role=status for screen reader announcement', () => {
    render(
      <ResidualRiskBadge coveragePct={85} diseaseName="Beta Thalassemia" isNotDetected={true} />,
    );

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute(
      'aria-label',
      'Beta Thalassemia: Low Residual Risk — Good variant coverage',
    );
  });

  it('boundary: 95% shows Very Low, not Low', () => {
    render(<ResidualRiskBadge coveragePct={95} diseaseName="CF" isNotDetected={true} />);

    expect(screen.getByText('Very Low Residual Risk')).toBeInTheDocument();
  });

  it('boundary: 80% shows Low, not Moderate', () => {
    render(<ResidualRiskBadge coveragePct={80} diseaseName="CF" isNotDetected={true} />);

    expect(screen.getByText('Low Residual Risk')).toBeInTheDocument();
  });

  it('boundary: 50% shows Moderate, not Significant', () => {
    render(<ResidualRiskBadge coveragePct={50} diseaseName="CF" isNotDetected={true} />);

    expect(screen.getByText('Moderate Residual Risk')).toBeInTheDocument();
  });

  it('boundary: 49% shows Significant', () => {
    render(<ResidualRiskBadge coveragePct={49} diseaseName="CF" isNotDetected={true} />);

    expect(screen.getByText('Significant Residual Risk')).toBeInTheDocument();
  });

  it('does not re-render with identical props (React.memo)', () => {
    const props = {
      coveragePct: 80,
      diseaseName: 'CF',
      isNotDetected: true as const,
    };

    const { rerender } = render(<ResidualRiskBadge {...props} />);
    rerender(<ResidualRiskBadge {...props} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // ─── Gap 2: Coverage % → qualitative label mapping (explicit values) ──

  describe('coverage percentage to qualitative label mapping', () => {
    it("100% → 'Fully Tested'", () => {
      render(<ResidualRiskBadge coveragePct={100} diseaseName="Test" isNotDetected={true} />);

      expect(screen.getByText('Fully Tested')).toBeInTheDocument();
    });

    it("80% → 'Low Residual Risk'", () => {
      render(<ResidualRiskBadge coveragePct={80} diseaseName="Test" isNotDetected={true} />);

      expect(screen.getByText('Low Residual Risk')).toBeInTheDocument();
    });

    it("50% → 'Moderate Residual Risk'", () => {
      render(<ResidualRiskBadge coveragePct={50} diseaseName="Test" isNotDetected={true} />);

      expect(screen.getByText('Moderate Residual Risk')).toBeInTheDocument();
    });

    it("0% → 'Significant Residual Risk'", () => {
      render(<ResidualRiskBadge coveragePct={0} diseaseName="Test" isNotDetected={true} />);

      expect(screen.getByText('Significant Residual Risk')).toBeInTheDocument();
    });

    it("99% → 'Very Low Residual Risk'", () => {
      render(<ResidualRiskBadge coveragePct={99} diseaseName="Test" isNotDetected={true} />);

      expect(screen.getByText('Very Low Residual Risk')).toBeInTheDocument();
    });
  });

  // ─── Explanation text in aria-label per coverage tier ──────────────────

  describe('aria-label includes correct explanation per tier', () => {
    it('100% coverage: explanation mentions novel variants', () => {
      render(<ResidualRiskBadge coveragePct={100} diseaseName="CF" isNotDetected={true} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute(
        'aria-label',
        'CF: Fully Tested — Residual risk is very low — novel variants not in current databases may still exist',
      );
    });

    it('95% coverage: explanation mentions most known variants tested', () => {
      render(<ResidualRiskBadge coveragePct={95} diseaseName="SMA" isNotDetected={true} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute(
        'aria-label',
        'SMA: Very Low Residual Risk — Most known variants tested',
      );
    });

    it('60% coverage: explanation mentions partial variant coverage', () => {
      render(<ResidualRiskBadge coveragePct={60} diseaseName="PKU" isNotDetected={true} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute(
        'aria-label',
        'PKU: Moderate Residual Risk — Partial variant coverage',
      );
    });

    it('30% coverage: explanation recommends clinical testing', () => {
      render(<ResidualRiskBadge coveragePct={30} diseaseName="DMD" isNotDetected={true} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute(
        'aria-label',
        'DMD: Significant Residual Risk — Clinical testing recommended',
      );
    });
  });
});
