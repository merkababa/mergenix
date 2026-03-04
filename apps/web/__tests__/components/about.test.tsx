import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  mockGlassCardFactory,
  mockSectionHeadingFactory,
  mockPageHeaderFactory,
  mockScrollRevealFactory,
  mockNextLinkFactory,
  mockScrollProgressResult,
  mockLucideIcons,
} from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/scroll-reveal', () => ({
  ...mockScrollRevealFactory(),
  useScrollProgress: () => mockScrollProgressResult(),
}));

vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('@/components/layout/page-header', () => mockPageHeaderFactory());
vi.mock('next/link', () => mockNextLinkFactory());
vi.mock('lucide-react', () => mockLucideIcons('Dna', 'Shield', 'Microscope', 'Brain', 'Heart', 'BookOpen', 'Users', 'Lightbulb', 'ChevronRight'));

vi.mock('@/components/marketing/helix-animation', () => ({
  HelixAnimation: () => <div data-testid="helix-animation" aria-hidden="true" />,
}));

vi.mock('@/components/marketing/step-circle', () => ({
  StepCircle: ({ step }: { step: number; size?: string }) => (
    <div data-testid={`step-circle-${step}`} aria-label={`Step ${step}`}>{step}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'btn',
}));

// Mock useCountUp so count-up tests are deterministic
vi.mock('@/hooks/use-count-up', () => ({
  useCountUp: (target: number) => ({
    count: target,
    ref: { current: null },
  }),
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { AboutContent } from '../../app/(marketing)/about/_components/about-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AboutContent', () => {
  describe('D4.3 — Team section and science cards', () => {
    it('renders the page heading', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { level: 1, name: /About Mergenix/i })).toBeInTheDocument();
    });

    it('renders the Team section heading', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /Meet the Team/i })).toBeInTheDocument();
    });

    it('renders team member cards with initials', () => {
      render(<AboutContent />);
      // Each team member avatar has aria-label containing initials
      const avatars = screen.getAllByRole('img', { name: /initials/i });
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('renders team member role labels', () => {
      render(<AboutContent />);
      expect(screen.getByText(/Founder/i)).toBeInTheDocument();
    });

    it('renders the Our Science section heading', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /Our Science/i })).toBeInTheDocument();
    });

    it('renders all 4 science principle cards', () => {
      render(<AboutContent />);
      expect(screen.getByText(/Mendelian Inheritance/i)).toBeInTheDocument();
      // "Polygenic Risk Scoring" appears in both a science card heading and the How It Works step description
      expect(screen.getAllByText(/Polygenic Risk Scor/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/ClinVar/i)).toBeInTheDocument();
      expect(screen.getByText(/Evidence-Based Confidence/i)).toBeInTheDocument();
    });

    it('renders science cards with inline icon indicators', () => {
      render(<AboutContent />);
      // Science cards should have data-science-card attribute
      const scienceCards = document.querySelectorAll('[data-science-card]');
      expect(scienceCards.length).toBeGreaterThan(0);
    });
  });

  describe('D4.4 — Count-up animation for stats', () => {
    it('renders the Backed by Science stats section', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /Backed by Science/i })).toBeInTheDocument();
    });

    it('renders numerical stat values', () => {
      render(<AboutContent />);
      // Stats section should contain numerical values (diseases, SNPs, traits, PGx)
      expect(screen.getByText('8,200+')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('renders stat labels', () => {
      render(<AboutContent />);
      expect(screen.getByText('Diseases Screened')).toBeInTheDocument();
      expect(screen.getByText('SNPs Analyzed')).toBeInTheDocument();
      expect(screen.getByText('Traits Predicted')).toBeInTheDocument();
      expect(screen.getByText('PGx Genes')).toBeInTheDocument();
    });

    it('renders count-up stat containers with data-stat attribute', () => {
      render(<AboutContent />);
      const statContainers = document.querySelectorAll('[data-stat]');
      expect(statContainers.length).toBeGreaterThan(0);
    });

    it('renders animated count-up spans with ref-ready structure', () => {
      render(<AboutContent />);
      // Count-up spans should be present (rendered by useCountUp)
      const countSpans = document.querySelectorAll('[data-count-up]');
      expect(countSpans.length).toBeGreaterThan(0);
    });
  });

  describe('general structure', () => {
    it('renders the Mission section', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /Our Mission/i })).toBeInTheDocument();
    });

    it('renders the How It Works section', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /How It Works/i })).toBeInTheDocument();
    });

    it('renders What We Believe values section', () => {
      render(<AboutContent />);
      expect(screen.getByRole('heading', { name: /What We Believe/i })).toBeInTheDocument();
    });

    it('renders the CTA link to start free analysis', () => {
      render(<AboutContent />);
      const ctaLink = screen.getByRole('link', { name: /Start Free Analysis/i });
      expect(ctaLink).toBeInTheDocument();
      expect(ctaLink.getAttribute('href')).toBe('/analysis');
    });
  });
});
