import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      // Filter out motion-specific props
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
    section: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const {
        variants, initial, whileInView, viewport, animate, exit, transition,
        whileHover, whileTap, ...rest
      } = props;
      return <section {...rest}>{children}</section>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { SampleReportContent } from '../../app/(marketing)/sample-report/_components/sample-report-content';

// ─── Tests ───────────────────────────────────────────────────────────────────

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

    // These conditions appear in both carrier and counseling sections
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

    // PRS heading should be present
    expect(screen.getByRole('heading', { name: /Polygenic Risk Scores/i })).toBeInTheDocument();

    // PRS conditions from sample data
    expect(screen.getByText(/Coronary Artery Disease/i)).toBeInTheDocument();
    expect(screen.getByText(/Type 2 Diabetes/i)).toBeInTheDocument();
    expect(screen.getByText(/Breast Cancer/i)).toBeInTheDocument();
  });

  it('renders counseling section with urgency and key findings', () => {
    render(<SampleReportContent />);

    // Counseling heading
    expect(
      screen.getByRole('heading', { name: /Genetic Counseling Recommendation/i }),
    ).toBeInTheDocument();

    // Urgency label
    expect(screen.getByText(/Urgency:/i)).toBeInTheDocument();
    expect(screen.getByText('moderate')).toBeInTheDocument();

    // Key findings heading
    expect(screen.getByText(/Key Findings/i)).toBeInTheDocument();

    // Key finding conditions (from counseling.keyFindings in sample data)
    expect(screen.getAllByText(/Tay-Sachs/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cystic Fibrosis/i).length).toBeGreaterThanOrEqual(1);
  });

  it('all content is visible (no tier gating on sample)', () => {
    render(<SampleReportContent />);

    // Verify all major sections render (carrier, traits, PGx, PRS, counseling)
    // which means no sections are gated behind upgrade prompts
    expect(screen.getByRole('heading', { name: /Carrier Screening Results/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trait Predictions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Pharmacogenomics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Polygenic Risk Scores/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Genetic Counseling Recommendation/i })).toBeInTheDocument();

    // No upgrade or locked messages present
    expect(screen.queryByText(/upgrade to unlock/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/locked/i)).not.toBeInTheDocument();
  });

  it('includes disclaimer that this is sample data', () => {
    render(<SampleReportContent />);

    expect(
      screen.getByText(/sample report with fictional data/i),
    ).toBeInTheDocument();
  });
});
