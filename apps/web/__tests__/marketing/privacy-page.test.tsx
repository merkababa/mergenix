import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ─── Hoisted shared mock factories ────────────────────────────────────────────
const {
  createIconMock,
  glassCardModule,
  scrollRevealModule,
  sectionHeadingModule,
  pageHeaderModule,
  nextLinkModule,
} = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMarketingMocks } = require('../__helpers__/mock-marketing.ts');
  return createMarketingMocks();
});

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Shield: createIconMock('icon-shield'),
  Lock: createIconMock('icon-lock'),
  FileText: createIconMock('icon-file-text'),
  Scale: createIconMock('icon-scale'),
  Mail: createIconMock('icon-mail'),
  Clock: createIconMock('icon-clock'),
  UserCheck: createIconMock('icon-user-check'),
  Database: createIconMock('icon-database'),
  Check: createIconMock('icon-check'),
  FileSearch: createIconMock('icon-file-search'),
  ChevronRight: createIconMock('icon-chevron-right'),
}));

vi.mock('@/components/ui/glass-card', glassCardModule);
vi.mock('@/components/ui/scroll-reveal', scrollRevealModule);
vi.mock('@/components/marketing/section-heading', sectionHeadingModule);
vi.mock('@/components/layout/page-header', pageHeaderModule);
vi.mock('next/link', nextLinkModule);

// ─── Import component after mocks ─────────────────────────────────────────────

import { PrivacyContent } from '../../app/(marketing)/privacy/_components/privacy-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PrivacyPage', () => {
  it('renders the Privacy Notice heading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Notice/i })).toBeInTheDocument();
  });

  it('renders section headings via SectionHeading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { name: /Data Controller/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Categories of Personal Data/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your Rights/i })).toBeInTheDocument();
  });

  it('renders data category cards using GlassCard', () => {
    render(<PrivacyContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders data subject rights content', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Right of Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Erasure/i)).toBeInTheDocument();
  });

  it('renders contact information', () => {
    render(<PrivacyContent />);

    const emailLinks = screen.getAllByRole('link', { name: /privacy@mergenix\.com/i });
    expect(emailLinks.length).toBeGreaterThan(0);
  });

  it('renders retention heading', () => {
    render(<PrivacyContent />);

    expect(screen.getByRole('heading', { name: /Data Retention/i })).toBeInTheDocument();
  });

  it('renders GDPR Article 13/14 reference', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Article 13/i)).toBeInTheDocument();
    expect(screen.getByText(/Article 14/i)).toBeInTheDocument();
  });

  it('displays data controller company name', () => {
    render(<PrivacyContent />);

    expect(screen.getAllByText(/Mergenix/).length).toBeGreaterThan(0);
  });

  it('lists categories of personal data processed', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/account info/i)).toBeInTheDocument();
    expect(screen.getByText(/payment info/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis results \(if saved\)/i)).toBeInTheDocument();
  });

  it('explains legal basis for processing (Art 6(1)(a) and Art 6(1)(b))', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Legal Basis/i)).toBeInTheDocument();
    expect(screen.getByText(/Art(?:icle)?\s*6\(1\)\(a\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Art(?:icle)?\s*6\(1\)\(b\)/i)).toBeInTheDocument();
  });

  it('lists right to rectification and right to data portability', () => {
    render(<PrivacyContent />);

    expect(screen.getByText(/Right to Rectification/i)).toBeInTheDocument();
    expect(screen.getByText(/Right to Data Portability/i)).toBeInTheDocument();
  });

  describe('design system', () => {
    it('uses SectionHeading for Data Controller section', () => {
      render(<PrivacyContent />);

      // SectionHeading renders an h2 — verify section headings are present
      expect(screen.getByRole('heading', { level: 2, name: /Data Controller/i })).toBeInTheDocument();
    });

    it('uses SectionHeading for Your Rights section', () => {
      render(<PrivacyContent />);

      expect(screen.getByRole('heading', { level: 2, name: /Your Rights/i })).toBeInTheDocument();
    });

    it('uses GlassCard for content blocks', () => {
      render(<PrivacyContent />);

      const cards = screen.getAllByTestId('glass-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('uses ScrollReveal for section entrance animations', () => {
      // ScrollReveal is mocked as pass-through — content inside should render normally
      render(<PrivacyContent />);

      // These texts appear inside ScrollReveal-wrapped sections
      const dataControllerMatches = screen.getAllByText(/Data Controller/i);
      expect(dataControllerMatches.length).toBeGreaterThan(0);
      const dpoMatches = screen.getAllByText(/Data Protection Officer/i);
      expect(dpoMatches.length).toBeGreaterThan(0);
    });

    it('heading hierarchy has no skipped levels', () => {
      const { container } = render(<PrivacyContent />);

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

  describe('design & layout', () => {
    it('uses ScrollReveal for section entrance animations', () => {
      render(<PrivacyContent />);

      // These texts appear inside ScrollReveal-wrapped sections
      const dataControllerMatches = screen.getAllByText(/Data Controller/i);
      expect(dataControllerMatches.length).toBeGreaterThan(0);
      const dpoMatches = screen.getAllByText(/Data Protection Officer/i);
      expect(dpoMatches.length).toBeGreaterThan(0);
    });
  });

  describe('GDPR compliance', () => {
    it('references GDPR Article 13 and Article 14', () => {
      render(<PrivacyContent />);

      expect(screen.getByText(/Article 13/i)).toBeInTheDocument();
      expect(screen.getByText(/Article 14/i)).toBeInTheDocument();
    });

    it('states legal basis for processing including Art 6(1)(a) and Art 6(1)(b)', () => {
      render(<PrivacyContent />);

      expect(screen.getByRole('heading', { name: /Legal Basis/i })).toBeInTheDocument();
      expect(screen.getByText(/Article 6\(1\)\(a\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Article 6\(1\)\(b\)/i)).toBeInTheDocument();
    });

    it('lists data categories: account info, payment info, and analysis results', () => {
      render(<PrivacyContent />);

      expect(screen.getByText(/Account info/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment info/i)).toBeInTheDocument();
      expect(screen.getByText(/Analysis results \(if saved\)/i)).toBeInTheDocument();
    });

    it('enumerates Right to Rectification and Right to Data Portability', () => {
      render(<PrivacyContent />);

      expect(screen.getByText(/Right to Rectification/i)).toBeInTheDocument();
      expect(screen.getByText(/Right to Data Portability/i)).toBeInTheDocument();
    });
  });
});
