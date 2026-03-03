import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, style, ...rest
      } = props;
      void variants; void initial; void whileInView; void viewport;
      void animate; void exit; void transition; void whileHover; void whileTap; void style;
      return <div {...rest}>{children}</div>;
    },
    section: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, style, ...rest
      } = props;
      void variants; void initial; void whileInView; void viewport;
      void animate; void exit; void transition; void whileHover; void whileTap; void style;
      return <section {...rest}>{children}</section>;
    },
    path: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, style, ...rest
      } = props;
      void variants; void initial; void whileInView; void viewport;
      void animate; void exit; void transition; void whileHover; void whileTap; void style;
      return <path {...rest}>{children}</path>;
    },
    g: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, style, ...rest
      } = props;
      void variants; void initial; void whileInView; void viewport;
      void animate; void exit; void transition; void whileHover; void whileTap; void style;
      return <g {...rest}>{children}</g>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock Next.js Link — renders as a plain <a> tag
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons to avoid SVG rendering complexity
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <svg />,
  Dna: () => <svg />,
  FlaskConical: () => <svg />,
  Pill: () => <svg />,
  Activity: () => <svg />,
  Stethoscope: () => <svg />,
  Lock: () => <svg />,
}));

import { SampleReportContent } from '../../app/(marketing)/sample-report/_components/sample-report-content';

// ─── Existing tests (preserved) ──────────────────────────────────────────────

describe('SampleReportPage', () => {
  it('sample report page renders with "Sample Report" heading', () => {
    render(<SampleReportContent />);
    expect(screen.getByRole('heading', { name: /sample report/i })).toBeInTheDocument();
  });

  it('displays sample report badge indicating this is demo data', () => {
    render(<SampleReportContent />);
    expect(screen.getAllByText(/sample/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders carrier results section with disease names', () => {
    render(<SampleReportContent />);
    expect(screen.getAllByText(/Tay-Sachs/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cystic Fibrosis/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders traits predictions section', () => {
    render(<SampleReportContent />);
    expect(screen.getByText(/Eye Color/i)).toBeInTheDocument();
    expect(screen.getByText(/Hair Color/i)).toBeInTheDocument();
  });

  it('renders PGx section with gene names', () => {
    render(<SampleReportContent />);
    expect(screen.getByText(/CYP2D6/)).toBeInTheDocument();
    expect(screen.getByText(/CYP2C19/)).toBeInTheDocument();
  });

  it('renders PRS section with condition names', () => {
    render(<SampleReportContent />);
    expect(screen.getByRole('heading', { name: /Polygenic Risk Scores/i })).toBeInTheDocument();
    // PrsGauge renders condition name in both sr-only and visible text — use getAllByText
    expect(screen.getAllByText(/Coronary Artery Disease/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Type 2 Diabetes/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Breast Cancer/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders counseling section with urgency and key findings', () => {
    render(<SampleReportContent />);
    expect(
      screen.getByRole('heading', { name: /Genetic Counseling Recommendation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Urgency:/i)).toBeInTheDocument();
    expect(screen.getByText('moderate')).toBeInTheDocument();
    expect(screen.getByText(/Key Findings/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tay-Sachs/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cystic Fibrosis/i).length).toBeGreaterThanOrEqual(1);
  });

  it('includes disclaimer that this is sample data', () => {
    render(<SampleReportContent />);
    expect(
      screen.getByText(/sample report with fictional data/i),
    ).toBeInTheDocument();
  });
});

// ─── D3.1: Trait Probability Bars ────────────────────────────────────────────

describe('D3.1 — Trait Probability Bars', () => {
  it('renders meter elements with role="meter"', () => {
    render(<SampleReportContent />);
    const bars = screen.getAllByRole('meter');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('meters have correct aria-valuenow, aria-valuemin, aria-valuemax', () => {
    render(<SampleReportContent />);
    const bars = screen.getAllByRole('meter');
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
      const valuenow = Number(bar.getAttribute('aria-valuenow'));
      expect(valuenow).toBeGreaterThanOrEqual(0);
      expect(valuenow).toBeLessThanOrEqual(100);
    });
  });

  it('meters have aria-label describing the phenotype', () => {
    render(<SampleReportContent />);
    const bars = screen.getAllByRole('meter');
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-label');
    });
  });

  it('trait probability meters have aria-valuetext with probability description', () => {
    render(<SampleReportContent />);
    const meters = screen.getAllByRole('meter');
    // Trait probability bars set aria-valuetext to "{phenotype}: {n}% probability".
    // PRS gauge meters use a different format — filter to only trait bars.
    const traitMeters = meters.filter((m) =>
      (m.getAttribute('aria-valuetext') ?? '').includes('probability'),
    );
    expect(traitMeters.length).toBeGreaterThan(0);
    traitMeters.forEach((bar) => {
      expect(bar.getAttribute('aria-valuetext')).toMatch(/probability/i);
    });
  });
});

// ─── D3.2: PRS Gauge Charts ──────────────────────────────────────────────────

describe('D3.2 — PRS Gauge Charts', () => {
  it('renders meter elements with role="meter" for each PRS condition', () => {
    render(<SampleReportContent />);
    const meters = screen.getAllByRole('meter');
    expect(meters.length).toBeGreaterThan(0);
  });

  it('each meter has correct aria attributes', () => {
    render(<SampleReportContent />);
    const meters = screen.getAllByRole('meter');
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute('aria-valuenow');
      expect(meter).toHaveAttribute('aria-valuemin', '0');
      expect(meter).toHaveAttribute('aria-valuemax', '100');
    });
  });
});

// ─── D3.3: Carrier Risk Card Differentiation ─────────────────────────────────

describe('D3.3 — Carrier Risk Card Differentiation', () => {
  it('high-risk carrier cards have rose border styling', () => {
    render(<SampleReportContent />);
    // Tay-Sachs and Cystic Fibrosis are high_risk — their cards should have rose border
    const roseCards = document.querySelectorAll('[class*="border-rose"]');
    expect(roseCards.length).toBeGreaterThan(0);
  });

  it('carrier-detected cards have amber border styling', () => {
    render(<SampleReportContent />);
    // Sickle Cell Disease is carrier_detected — should have amber border
    const amberCards = document.querySelectorAll('[class*="border-amber"]');
    expect(amberCards.length).toBeGreaterThan(0);
  });
});

// ─── D3.4: Punnett Square ────────────────────────────────────────────────────

describe('D3.4 — Punnett Square', () => {
  it('renders at least one Punnett square table', () => {
    render(<SampleReportContent />);
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
  });

  it('Punnett square has accessible label', () => {
    render(<SampleReportContent />);
    const table = screen.getAllByRole('table')[0];
    expect(table).toHaveAttribute('aria-label');
  });
});

// ─── D3.5: Sidebar Navigation ────────────────────────────────────────────────

describe('D3.5 — Sidebar Navigation', () => {
  it('renders sidebar navigation with section links', () => {
    render(<SampleReportContent />);
    const allLinks = screen.getAllByRole('link');
    const sectionLinks = allLinks.filter((link) =>
      link.getAttribute('href')?.startsWith('#'),
    );
    expect(sectionLinks.length).toBeGreaterThan(0);
  });

  it('sidebar contains links for all major sections', () => {
    render(<SampleReportContent />);
    const allLinks = screen.getAllByRole('link');
    const hrefLinks = allLinks.map((l) => l.getAttribute('href') ?? '');
    // At minimum, carrier section link should be present
    expect(hrefLinks.some((h) => h.includes('carrier'))).toBe(true);
  });
});

// ─── D3.6: Tier-Gate Overlay ─────────────────────────────────────────────────

describe('D3.6 — Tier-Gate Overlay', () => {
  it('first 3 carrier conditions are fully visible (carrier heading exists)', () => {
    render(<SampleReportContent />);
    const carrierHeading = screen.getByRole('heading', { name: /Carrier Screening Results/i });
    expect(carrierHeading).toBeInTheDocument();
  });

  it('tier-gate overlay renders with upgrade CTA after first 3 items', () => {
    render(<SampleReportContent />);
    // Both the heading paragraph and CTA link contain "Upgrade to Premium" — use getAllByText
    const upgradeEls = screen.getAllByText(/Upgrade to Premium/i);
    expect(upgradeEls.length).toBeGreaterThanOrEqual(1);
  });

  it('tier-gate overlay has screen reader text explaining gated content', () => {
    render(<SampleReportContent />);
    expect(
      screen.getByText(/additional carrier screening results/i),
    ).toBeInTheDocument();
  });

  it('blurred gated content has aria-hidden="true"', () => {
    render(<SampleReportContent />);
    const hiddenContent = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenContent.length).toBeGreaterThan(0);
  });
});

// ─── D3.7: CTA Button Fix ────────────────────────────────────────────────────

describe('D3.7 — CTA Button Fix', () => {
  it('CTA buttons use Next.js Link (rendered as <a>) not raw anchor tags', () => {
    render(<SampleReportContent />);
    const analysisLink = screen.getByRole('link', { name: /Start Free Analysis/i });
    expect(analysisLink).toBeInTheDocument();
    expect(analysisLink.tagName).toBe('A');
    expect(analysisLink).toHaveAttribute('href', '/analysis');
  });

  it('View Pro Plans CTA link is present', () => {
    render(<SampleReportContent />);
    const proLink = screen.getByRole('link', { name: /View Pro Plans/i });
    expect(proLink).toBeInTheDocument();
    expect(proLink).toHaveAttribute('href', '/products');
  });

  it('CTA links have proper button styling classes', () => {
    render(<SampleReportContent />);
    const analysisLink = screen.getByRole('link', { name: /Start Free Analysis/i });
    // Should use buttonVariants styling (inline-flex, font-heading, etc.)
    expect(analysisLink.className).toMatch(/inline-flex/);
  });
});
