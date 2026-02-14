import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AncestryConfidenceBadge } from '../../../../components/genetics/results/ancestry-confidence-badge';

describe('AncestryConfidenceBadge', () => {
  it('renders "High Confidence" badge for high confidence level', () => {
    render(
      <AncestryConfidenceBadge ancestry="European" confidenceLevel="high" />,
    );
    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('renders "Medium Confidence" badge for medium confidence level', () => {
    render(
      <AncestryConfidenceBadge ancestry="South Asian" confidenceLevel="medium" />,
    );
    expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
  });

  it('renders "Low Confidence" badge for low confidence level', () => {
    render(
      <AncestryConfidenceBadge ancestry="African" confidenceLevel="low" />,
    );
    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
  });

  it('shows explanation text for low confidence', () => {
    render(
      <AncestryConfidenceBadge ancestry="African" confidenceLevel="low" />,
    );
    expect(
      screen.getByText(/Most PRS studies are based on European populations/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/African ancestry/),
    ).toBeInTheDocument();
  });

  it('does not show low-confidence explanation for high confidence', () => {
    render(
      <AncestryConfidenceBadge ancestry="European" confidenceLevel="high" />,
    );
    expect(
      screen.queryByText(/Most PRS studies are based on European populations/),
    ).not.toBeInTheDocument();
  });

  it('shows ancestryNote for non-low confidence levels', () => {
    render(
      <AncestryConfidenceBadge
        ancestry="European"
        confidenceLevel="high"
        ancestryNote="PRS weights derived from European GWAS."
      />,
    );
    expect(
      screen.getByText('PRS weights derived from European GWAS.'),
    ).toBeInTheDocument();
  });

  it('does not show ancestryNote for low confidence (shows generic text instead)', () => {
    render(
      <AncestryConfidenceBadge
        ancestry="African"
        confidenceLevel="low"
        ancestryNote="Some note"
      />,
    );
    // Low confidence shows the generic warning, not the ancestryNote
    expect(screen.queryByText('Some note')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Most PRS studies are based on European populations/),
    ).toBeInTheDocument();
  });

  it('has role="status" with appropriate aria-label', () => {
    render(
      <AncestryConfidenceBadge ancestry="European" confidenceLevel="high" />,
    );
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute(
      'aria-label',
      'High Confidence for European ancestry',
    );
  });

  it('shows "Unknown" ancestry message for low confidence when ancestry is Unknown', () => {
    render(
      <AncestryConfidenceBadge ancestry="Unknown" confidenceLevel="low" />,
    );
    expect(
      screen.getByText(/Ancestry could not be determined/),
    ).toBeInTheDocument();
    // Should NOT show the "reduced for Unknown ancestry" text
    expect(
      screen.queryByText(/reduced for Unknown ancestry/),
    ).not.toBeInTheDocument();
  });

  it('has appropriate aria-label for Unknown ancestry', () => {
    render(
      <AncestryConfidenceBadge ancestry="Unknown" confidenceLevel="low" />,
    );
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute(
      'aria-label',
      'Low Confidence for Unknown ancestry',
    );
  });
});
