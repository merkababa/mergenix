import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  VirtualBabyCard,
  type TraitPrediction,
} from '../../../../components/genetics/results/virtual-baby-card';
import { VIRTUAL_BABY_DISCLAIMER } from '../../../../lib/constants/disclaimers';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockTraits: TraitPrediction[] = [
  { name: 'Eye Color', prediction: 'Brown', probability: 0.78 },
  { name: 'Hair Color', prediction: 'Dark Brown', probability: 0.65 },
  { name: 'Hair Texture', prediction: 'Wavy', probability: 0.52 },
  { name: 'Freckles', prediction: 'Few', probability: 0.71 },
  { name: 'Dimples', prediction: 'Likely', probability: 0.55 },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VirtualBabyCard', () => {
  it('renders all traits with probabilities for pro tier', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    // All five trait names should be visible
    for (const trait of mockTraits) {
      expect(screen.getByText(trait.name)).toBeInTheDocument();
    }

    // Probability text should be present for each trait
    expect(screen.getByText(/~78% likely/)).toBeInTheDocument();
    expect(screen.getByText(/~65% likely/)).toBeInTheDocument();
    expect(screen.getByText(/~52% likely/)).toBeInTheDocument();
    expect(screen.getByText(/~71% likely/)).toBeInTheDocument();
    expect(screen.getByText(/~55% likely/)).toBeInTheDocument();

    // No "Upgrade to Pro" buttons should exist
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });

  it('shows only the first trait for free tier, rest locked', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="free" />);

    // Eye Color (first trait) should be visible with its probability
    expect(screen.getByText('Eye Color')).toBeInTheDocument();
    expect(screen.getByText(/~78% likely/)).toBeInTheDocument();
    expect(screen.getByText(/Likely Brown/)).toBeInTheDocument();

    // Other trait names should still appear (as locked labels)
    expect(screen.getByText('Hair Color')).toBeInTheDocument();
    expect(screen.getByText('Hair Texture')).toBeInTheDocument();
    expect(screen.getByText('Freckles')).toBeInTheDocument();
    expect(screen.getByText('Dimples')).toBeInTheDocument();

    // But the locked traits should NOT show probability text
    expect(screen.queryByText(/~65% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~52% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~71% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~55% likely/)).not.toBeInTheDocument();
  });

  it('shows 1 visible trait and 4 locked traits with upgrade CTA for premium tier', () => {
    const onUpgrade = vi.fn();
    render(<VirtualBabyCard traits={mockTraits} tier="premium" onUpgrade={onUpgrade} />);

    // All trait names should appear
    for (const trait of mockTraits) {
      expect(screen.getByText(trait.name)).toBeInTheDocument();
    }

    // First trait (Eye Color) should be visible with probability
    expect(screen.getByText(/~78% likely/)).toBeInTheDocument();

    // Remaining traits should be locked (no probability text)
    expect(screen.queryByText(/~65% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~52% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~71% likely/)).not.toBeInTheDocument();
    expect(screen.queryByText(/~55% likely/)).not.toBeInTheDocument();

    // Upgrade buttons should be present
    const upgradeButtons = screen.getAllByText('Upgrade to Pro');
    expect(upgradeButtons.length).toBeGreaterThan(0);
  });

  it('always shows the disclaimer text and it cannot be hidden', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    // Disclaimer text must be present
    const disclaimerText = screen.getByText(VIRTUAL_BABY_DISCLAIMER);
    expect(disclaimerText).toBeInTheDocument();
    expect(disclaimerText).toBeVisible();

    // The disclaimer section should have the correct aria-label
    const disclaimerSection = screen.getByRole('region', {
      name: 'Important disclaimer',
    });
    expect(disclaimerSection).toBeInTheDocument();
  });

  it('renders probability bars with correct aria-valuenow', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    const meters = screen.getAllByRole('meter');

    // Should have one meter per visible trait
    expect(meters).toHaveLength(mockTraits.length);

    // Verify aria-valuenow values
    const expectedValues = [78, 65, 52, 71, 55];
    meters.forEach((meter, idx) => {
      expect(meter).toHaveAttribute('aria-valuenow', String(expectedValues[idx]));
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    });
  });

  it("locked traits show 'Upgrade to Pro' button", () => {
    const onUpgrade = vi.fn();
    render(<VirtualBabyCard traits={mockTraits} tier="free" onUpgrade={onUpgrade} />);

    // 4 locked trait cards + 1 bottom CTA = at least 5 "Upgrade to Pro" buttons
    const upgradeButtons = screen.getAllByRole('button', {
      name: /Upgrade to Pro/i,
    });
    expect(upgradeButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('fires onUpgrade callback when upgrade button is clicked', () => {
    const onUpgrade = vi.fn();

    render(<VirtualBabyCard traits={mockTraits} tier="free" onUpgrade={onUpgrade} />);

    // Click the first upgrade button
    const upgradeButtons = screen.getAllByRole('button', {
      name: /Upgrade to Pro/i,
    });
    fireEvent.click(upgradeButtons[0]);

    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("uses neutral language — no 'will have' in rendered text", () => {
    const { container } = render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    const textContent = container.textContent ?? '';

    // Must never contain deterministic phrasing
    expect(textContent).not.toContain('will have');
    expect(textContent).not.toContain('Your baby will');
    expect(textContent).not.toContain('will be');

    // Should contain probabilistic language
    expect(textContent).toContain('Likely');
    expect(textContent).toContain('likely');
  });

  it("has role='meter' on probability bars", () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    const meters = screen.getAllByRole('meter');
    expect(meters.length).toBe(mockTraits.length);

    // Each meter should have proper aria attributes
    for (const meter of meters) {
      expect(meter).toHaveAttribute('aria-valuenow');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    }
  });

  // ─── Additional edge case tests ──────────────────────────────────────────

  it('renders the header with Sparkles icon', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    expect(screen.getByText('Virtual Baby \u2014 Genetic Possibilities')).toBeInTheDocument();
  });

  it('shows trait icon emoji when provided', () => {
    const traitsWithIcon: TraitPrediction[] = [
      { name: 'Eye Color', prediction: 'Brown', probability: 0.78, icon: '\uD83D\uDC41\uFE0F' },
    ];

    render(<VirtualBabyCard traits={traitsWithIcon} tier="pro" />);

    expect(screen.getByText('\uD83D\uDC41\uFE0F')).toBeInTheDocument();
  });

  it('handles empty traits array gracefully', () => {
    const { container } = render(<VirtualBabyCard traits={[]} tier="pro" />);

    // Should still render the card with header and disclaimer
    expect(screen.getByText('Virtual Baby \u2014 Genetic Possibilities')).toBeInTheDocument();
    expect(screen.getByText(VIRTUAL_BABY_DISCLAIMER)).toBeInTheDocument();

    // No trait cards or meters
    expect(screen.queryAllByRole('meter')).toHaveLength(0);
  });

  it('free tier shows correct count in upgrade message', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="free" />);

    expect(screen.getByText(/Showing 1 of 5 trait predictions/)).toBeInTheDocument();
  });

  it('premium tier shows teaser message with 1 of 5 traits visible', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="premium" />);

    expect(screen.getByText(/Showing 1 of 5 trait predictions/)).toBeInTheDocument();
  });

  it('locked traits have correct aria-label for screen readers', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="free" />);

    // The second trait (Hair Color) should be locked with proper label
    const lockedCard = screen.getByLabelText('Hair Color: Locked. Upgrade to Pro to view.');
    expect(lockedCard).toBeInTheDocument();
  });

  it('unlocked trait cards have descriptive aria-label', () => {
    render(<VirtualBabyCard traits={mockTraits} tier="pro" />);

    const eyeColorCard = screen.getByLabelText(
      'Eye Color: Likely Brown, approximately 78 percent probability',
    );
    expect(eyeColorCard).toBeInTheDocument();
  });
});
