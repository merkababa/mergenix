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

vi.mock('lucide-react', () => mockLucideIcons('Shield', 'Lock', 'FileText', 'Scale', 'Mail', 'Clock', 'UserCheck', 'Database', 'Check', 'FileSearch', 'ChevronRight'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/scroll-reveal', () => mockScrollRevealFactory());
vi.mock('@/components/marketing/section-heading', () => mockSectionHeadingFactory());
vi.mock('@/components/layout/page-header', () => mockPageHeaderFactory());
vi.mock('next/link', () => mockNextLinkFactory());

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

  it('heading hierarchy has no skipped levels', () => {
    const { container } = render(<PrivacyContent />);

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
