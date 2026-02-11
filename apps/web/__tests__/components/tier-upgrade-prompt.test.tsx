import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TierUpgradePrompt } from '../../components/genetics/tier-upgrade-prompt';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TierUpgradePrompt', () => {
  it('renders the message text', () => {
    render(<TierUpgradePrompt message="Upgrade to Pro for full screening." />);

    expect(
      screen.getByText('Upgrade to Pro for full screening.'),
    ).toBeInTheDocument();
  });

  it('renders default "Upgrade Plan" button text', () => {
    render(<TierUpgradePrompt message="Some message" />);

    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('renders custom buttonText prop', () => {
    render(
      <TierUpgradePrompt
        message="Some message"
        buttonText="Unlock Full Screening"
      />,
    );

    expect(screen.getByText('Unlock Full Screening')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Plan')).not.toBeInTheDocument();
  });

  it('links to /subscription', () => {
    render(<TierUpgradePrompt message="Some message" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/subscription');
  });

  it('lock icon is present and decorative (aria-hidden)', () => {
    const { container } = render(
      <TierUpgradePrompt message="Some message" />,
    );

    // lucide-react renders Lock as an <svg> with aria-hidden="true"
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).not.toBeNull();
  });
});
