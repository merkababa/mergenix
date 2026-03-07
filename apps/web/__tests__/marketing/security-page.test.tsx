import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  EyeOff: createIconMock('icon-eye-off'),
  Server: createIconMock('icon-server'),
  ChevronDown: createIconMock('icon-chevron-down'),
  Cpu: createIconMock('icon-cpu'),
  Globe: createIconMock('icon-globe'),
  KeyRound: createIconMock('icon-key-round'),
  ShieldCheck: createIconMock('icon-shield-check'),
  HardDrive: createIconMock('icon-hard-drive'),
  Workflow: createIconMock('icon-workflow'),
  XCircle: createIconMock('icon-x-circle'),
  ChevronRight: createIconMock('icon-chevron-right'),
}));

vi.mock('@/components/ui/glass-card', glassCardModule);
vi.mock('@/components/ui/scroll-reveal', scrollRevealModule);
vi.mock('@/components/marketing/section-heading', sectionHeadingModule);
vi.mock('@/components/layout/page-header', pageHeaderModule);
vi.mock('next/link', nextLinkModule);

// ─── Import component after mocks ─────────────────────────────────────────────

import { SecurityContent } from '../../app/(marketing)/security/_components/security-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SecurityPage', () => {
  it('renders the main page heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Your Genetic Data Never Leaves Your Browser/i })
    ).toBeInTheDocument();
  });

  it('renders Zero-Knowledge Architecture section heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { name: /Zero-Knowledge Architecture/i })
    ).toBeInTheDocument();
  });

  it('renders How Your Data Flows section heading', () => {
    render(<SecurityContent />);

    expect(
      screen.getByRole('heading', { name: /How Your Data Flows/i })
    ).toBeInTheDocument();
  });

  it('renders data flow step content', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/Upload DNA files/i)).toBeInTheDocument();
    expect(screen.getByText(/Web Worker parses/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis runs client-side/i)).toBeInTheDocument();
  });

  it('renders encryption section mentioning AES-256-GCM', () => {
    render(<SecurityContent />);

    expect(screen.getAllByText(/Encryption/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/AES-256-GCM/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders privacy promise cards using GlassCard', () => {
    render(<SecurityContent />);

    const cards = screen.getAllByTestId('glass-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders privacy promise content', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/We never see your DNA data/i)).toBeInTheDocument();
    expect(screen.getByText(/No server-side genetic processing/i)).toBeInTheDocument();
    expect(screen.getByText(/No data selling or sharing/i)).toBeInTheDocument();
    expect(screen.getByText(/You control deletion/i)).toBeInTheDocument();
  });

  it('renders FAQ section heading', () => {
    render(<SecurityContent />);

    expect(screen.getByRole('heading', { name: /Security FAQ/i })).toBeInTheDocument();
  });

  it('renders FAQ items', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/Can you see my DNA data/i)).toBeInTheDocument();
    expect(screen.getByText(/What data do you store on your servers/i)).toBeInTheDocument();
  });

  it('renders Compliance section heading', () => {
    render(<SecurityContent />);

    expect(screen.getByRole('heading', { name: /Compliance/i })).toBeInTheDocument();
  });

  it('renders FAQ section with expandable answer on click', () => {
    render(<SecurityContent />);

    const faqButton = screen.getByText(/Can you see my DNA data\?/i);
    expect(faqButton).toBeInTheDocument();

    // Answer hidden initially
    expect(screen.queryByText(/processing happens in your browser/i)).not.toBeInTheDocument();

    // Expand FAQ item
    fireEvent.click(faqButton);

    expect(screen.getByText(/processing happens in your browser/i)).toBeInTheDocument();
  });

  it("all external links have rel='noopener noreferrer'", () => {
    const { container } = render(<SecurityContent />);

    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });
  });

  it('all external links have referrerPolicy set for privacy', () => {
    const { container } = render(<SecurityContent />);

    const allLinks = Array.from(container.querySelectorAll('a[href]'));
    const externalLinks = allLinks.filter((link) => {
      const href = link.getAttribute('href') ?? '';
      return href.startsWith('http://') || href.startsWith('https://');
    });

    externalLinks.forEach((link) => {
      const policy = link.getAttribute('referrerpolicy');
      expect(
        policy === 'no-referrer' || policy === 'strict-origin-when-cross-origin',
        `External link to "${link.getAttribute('href')}" must have referrerPolicy="no-referrer" or "strict-origin-when-cross-origin", got "${policy}"`,
      ).toBe(true);
    });

    // Guard rail: security page currently has zero external links.
    expect(externalLinks.length).toBe(0);
  });

  describe('design system', () => {
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

  describe('design & layout', () => {
    it('uses SectionHeading for Privacy Promises section', () => {
      render(<SecurityContent />);

      expect(
        screen.getByRole('heading', { level: 2, name: /Privacy Promises/i }),
      ).toBeInTheDocument();
    });

    it('uses ScrollReveal for section entrance animations', () => {
      // ScrollReveal is mocked as pass-through — content inside should render normally
      render(<SecurityContent />);

      expect(screen.getByText(/Zero-Knowledge Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/How Your Data Flows/i)).toBeInTheDocument();
    });
  });

  describe('security attributes', () => {
    it('expands and collapses FAQ answer on click', () => {
      render(<SecurityContent />);

      const faqButton = screen.getByText(/Can you see my DNA data\?/i);
      expect(faqButton).toBeInTheDocument();

      // Answer should not be visible before clicking
      expect(
        screen.queryByText(/processing happens in your browser/i),
      ).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(faqButton);

      // Answer should now be visible
      expect(
        screen.getByText(/processing happens in your browser/i),
      ).toBeInTheDocument();
    });

    it("all external links have rel='noopener noreferrer'", () => {
      const { container } = render(<SecurityContent />);

      const externalLinks = container.querySelectorAll('a[target="_blank"]');
      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
      });
    });

    it('all external links have referrerPolicy set for privacy', () => {
      const { container } = render(<SecurityContent />);

      const allLinks = Array.from(container.querySelectorAll('a[href]'));
      const externalLinks = allLinks.filter((link) => {
        const href = link.getAttribute('href') ?? '';
        return href.startsWith('http://') || href.startsWith('https://');
      });

      // If external links exist, each must have a referrerPolicy set to a
      // privacy-safe value. Currently the security page has no external links,
      // so this acts as a guard rail: any future external link without
      // referrerPolicy will immediately fail this test.
      externalLinks.forEach((link) => {
        const policy = link.getAttribute('referrerpolicy');
        expect(
          policy === 'no-referrer' || policy === 'strict-origin-when-cross-origin',
          `External link to "${link.getAttribute('href')}" must have referrerPolicy="no-referrer" or "strict-origin-when-cross-origin", got "${policy}"`,
        ).toBe(true);
      });

      // Explicitly document: the security page currently has zero external links.
      expect(externalLinks.length).toBe(0);
    });
  });
});
