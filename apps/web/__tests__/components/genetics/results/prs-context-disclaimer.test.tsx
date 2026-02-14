import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrsContextDisclaimer } from '../../../../components/genetics/results/prs-context-disclaimer';

describe('PrsContextDisclaimer', () => {
  it('renders the PRS context disclaimer text', () => {
    render(<PrsContextDisclaimer conditionName="Breast Cancer" />);
    expect(
      screen.getByText(/Polygenic risk scores reflect statistical probabilities/),
    ).toBeInTheDocument();
  });

  it('shows genes AND environment mention', () => {
    render(<PrsContextDisclaimer conditionName="Breast Cancer" />);
    expect(
      screen.getByText(/genes AND environment/),
    ).toBeInTheDocument();
  });

  it('does not show offspring disclaimer when isOffspring is false/undefined', () => {
    render(<PrsContextDisclaimer conditionName="Breast Cancer" />);
    expect(
      screen.queryByText(/Offspring scores are averaged estimates/),
    ).not.toBeInTheDocument();
  });

  it('shows offspring disclaimer when isOffspring is true', () => {
    render(
      <PrsContextDisclaimer conditionName="Breast Cancer" isOffspring />,
    );
    expect(
      screen.getByText(/Offspring scores are averaged estimates/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/any combination of parental risk variants/),
    ).toBeInTheDocument();
  });

  it('has role="note" with aria-label containing condition name', () => {
    render(<PrsContextDisclaimer conditionName="Coronary Artery Disease" />);
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute(
      'aria-label',
      'Context disclaimer for Coronary Artery Disease',
    );
  });

  it('renders both disclaimers together when isOffspring is true', () => {
    render(
      <PrsContextDisclaimer conditionName="Type 2 Diabetes" isOffspring />,
    );
    // Main disclaimer
    expect(
      screen.getByText(/Actual risk depends on genes AND environment/),
    ).toBeInTheDocument();
    // Offspring disclaimer
    expect(
      screen.getByText(/Offspring scores are averaged estimates/),
    ).toBeInTheDocument();
  });
});
