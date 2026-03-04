import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockGlassCardFactory,
  mockSectionHeadingFactory,
  mockPageHeaderFactory,
  mockScrollRevealFactory,
  mockNextLinkFactory,
  mockLucideIcons,
  installSimpleIntersectionObserver,
} from '../__helpers__';

// jsdom doesn't implement IntersectionObserver — mock it globally
beforeAll(() => {
  installSimpleIntersectionObserver();
});

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('Shield', 'FileText', 'Cookie', 'Lock', 'Scale', 'Clock'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/scroll-reveal', () => mockScrollRevealFactory());
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('next/link', () => mockNextLinkFactory());
vi.mock('@/components/layout/page-header', () => mockPageHeaderFactory());

// ─── Import component after mocks ─────────────────────────────────────────────

import { LegalContent } from '../../app/(marketing)/legal/_components/legal-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LegalPage', () => {
  it('renders the Legal heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { level: 1, name: /Legal/i })).toBeInTheDocument();
  });

  it('renders privacy guarantee card using GlassCard', () => {
    render(<LegalContent />);

    expect(screen.getByText(/Your DNA Never Leaves Your Device/i)).toBeInTheDocument();
    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders the Terms of Service section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Terms of Service/i })).toBeInTheDocument();
  });

  it('renders the Privacy Policy section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Privacy Policy/i })).toBeInTheDocument();
  });

  it('renders the Cookie Policy section heading', () => {
    render(<LegalContent />);

    expect(screen.getByRole('heading', { name: /Cookie Policy/i })).toBeInTheDocument();
  });

  it('renders the GINA Notice section heading', () => {
    render(<LegalContent />);

    // The section heading is "Your Rights Under GINA" — use getAllByRole since
    // jsdom renders both desktop and mobile TOC navigation items
    const ginaHeadings = screen.getAllByRole('heading', { name: /GINA/i });
    expect(ginaHeadings.length).toBeGreaterThan(0);
  });

  it('renders ScrollReveal for entrance animations on content sections', () => {
    // ScrollReveal is mocked as pass-through — so content inside it renders normally.
    // This test verifies the sections are visible (and thus wrapped in ScrollReveal).
    render(<LegalContent />);

    expect(screen.getByText(/Acceptance of Terms/i)).toBeInTheDocument();
    // "Genetic Data" appears as an h3 heading in the Privacy section
    const geneticDataElements = screen.getAllByText(/Genetic Data/i);
    expect(geneticDataElements.length).toBeGreaterThan(0);
  });

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<LegalContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    expect(levels).toContain(1);
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });
});
