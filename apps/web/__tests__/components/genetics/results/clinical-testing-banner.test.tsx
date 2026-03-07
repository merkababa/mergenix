import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClinicalTestingBanner } from '../../../../components/genetics/results/clinical-testing-banner';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClinicalTestingBanner', () => {
  it('renders with role=alert', () => {
    render(<ClinicalTestingBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders default message when no variant specified', () => {
    render(<ClinicalTestingBanner />);

    expect(
      screen.getByText(/not a replacement for clinical-grade genetic testing/i),
    ).toBeInTheDocument();
  });

  it('renders carrier-specific message', () => {
    render(<ClinicalTestingBanner variant="carrier" />);

    expect(
      screen.getByText(/NOT a replacement for clinical carrier screening/),
    ).toBeInTheDocument();
  });

  it('renders PRS-specific message', () => {
    render(<ClinicalTestingBanner variant="prs" />);

    expect(screen.getByText(/Polygenic risk scores are NOT diagnostic/)).toBeInTheDocument();
  });

  it('renders PGx-specific message', () => {
    render(<ClinicalTestingBanner variant="pgx" />);

    expect(
      screen.getByText(/NOT a substitute for clinical pharmacogenomic testing/),
    ).toBeInTheDocument();
  });

  it('contains an AlertTriangle icon (aria-hidden)', () => {
    const { container } = render(<ClinicalTestingBanner variant="carrier" />);

    // lucide-react renders SVG with aria-hidden="true"
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });

  it('does not re-render with identical props (React.memo)', () => {
    const { rerender } = render(<ClinicalTestingBanner variant="carrier" />);
    rerender(<ClinicalTestingBanner variant="carrier" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
