import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MedicalDisclaimer } from '../../components/genetics/medical-disclaimer';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MedicalDisclaimer', () => {
  it('renders compact variant with default text', () => {
    render(<MedicalDisclaimer />);

    expect(
      screen.getByText(/educational purposes only and are not medical diagnoses/),
    ).toBeInTheDocument();
  });

  it('renders compact variant with custom text prop', () => {
    render(<MedicalDisclaimer variant="compact" text="Trait predictions use simplified models." />);

    expect(screen.getByText('Trait predictions use simplified models.')).toBeInTheDocument();

    // Default text should NOT appear
    expect(
      screen.queryByText(/educational purposes only and are not medical diagnoses/),
    ).not.toBeInTheDocument();
  });

  it('renders full variant with heading', () => {
    render(<MedicalDisclaimer variant="full" />);

    expect(screen.getByText('Important Medical Disclaimer')).toBeInTheDocument();
  });

  it('full variant contains DTC limitations text', () => {
    render(<MedicalDisclaimer variant="full" />);

    expect(
      screen.getByText(/Direct-to-consumer \(DTC\) genotyping arrays have inherent limitations/),
    ).toBeInTheDocument();

    expect(screen.getByText(/do not detect structural variants/)).toBeInTheDocument();
  });

  it('full variant contains ancestry bias text', () => {
    render(<MedicalDisclaimer variant="full" />);

    expect(
      screen.getByText(/Accuracy of risk estimates may vary across ancestral populations/),
    ).toBeInTheDocument();
  });

  it('has role="note" and aria-label for accessibility', () => {
    render(<MedicalDisclaimer />);

    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('aria-label', 'Medical disclaimer');
  });
});
