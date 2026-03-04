import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockGlassCardFactory,
  mockSectionHeadingFactory,
  mockPageHeaderFactory,
  mockScrollRevealFactory,
  mockNextLinkFactory,
  mockLucideIcons,
} from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Shield', 'Lock', 'EyeOff', 'Server', 'ChevronDown', 'Cpu', 'Globe', 'KeyRound', 'ShieldCheck', 'HardDrive', 'Workflow', 'XCircle'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/scroll-reveal', () => mockScrollRevealFactory());
vi.mock('@/components/layout/page-header', () => mockPageHeaderFactory());
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('next/link', () => mockNextLinkFactory());

// ─── Import component after mocks ─────────────────────────────────────────────

import { SecurityContent } from '../../app/(marketing)/security/_components/security-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SecurityPage (design system)', () => {
  it('uses SectionHeading for Zero-Knowledge Architecture section', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Zero-Knowledge Architecture/i }),
    ).toBeInTheDocument();
  });

  it('uses SectionHeading for Privacy Promises section', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Privacy Promises/i }),
    ).toBeInTheDocument();
  });

  it('uses GlassCard for content blocks', () => {
    render(<SecurityContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('uses ScrollReveal for section entrance animations', () => {
    // ScrollReveal is mocked as pass-through — content inside should render normally
    render(<SecurityContent />);

    expect(screen.getByText(/Zero-Knowledge Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/How Your Data Flows/i)).toBeInTheDocument();
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<SecurityContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    expect(levels).toContain(1);
    expect(levels).toContain(2);
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });
});
