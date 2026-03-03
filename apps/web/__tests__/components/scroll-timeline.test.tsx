import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { variants, initial, whileInView, viewport, animate, exit, transition, style, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  useTransform: () => 0,
}));

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useScrollProgress: () => ({
    scrollYProgress: { get: () => 0 },
    opacity: 1,
    y: 0,
  }),
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/marketing/step-circle', () => ({
  StepCircle: ({ step }: { step: number }) => (
    <div data-testid={`step-circle-${step}`} aria-label={`Step ${step}`}>{step}</div>
  ),
}));

// Mock lucide-react icons used by ScrollTimeline
vi.mock('lucide-react', () => ({
  Upload: (props: Record<string, unknown>) => <svg data-testid="icon-upload" {...props} />,
  Brain: (props: Record<string, unknown>) => <svg data-testid="icon-brain" {...props} />,
  HeartPulse: (props: Record<string, unknown>) => <svg data-testid="icon-heartpulse" {...props} />,
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { ScrollTimeline } from '../../app/_components/scroll-timeline';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScrollTimeline', () => {
  it('renders the section heading', () => {
    render(<ScrollTimeline />);
    expect(screen.getByRole('heading', { name: /How It Works/i })).toBeInTheDocument();
  });

  it('renders all 3 step titles', () => {
    render(<ScrollTimeline />);
    expect(screen.getByText('Upload DNA Files')).toBeInTheDocument();
    expect(screen.getByText('Instant Analysis')).toBeInTheDocument();
    expect(screen.getByText('Clear, Understandable Results')).toBeInTheDocument();
  });

  it('renders 3 step circles (one per step)', () => {
    render(<ScrollTimeline />);
    expect(screen.getByLabelText(/Step 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Step 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Step 3/i)).toBeInTheDocument();
  });

  it('renders the section as a "How it works" landmark region', () => {
    render(<ScrollTimeline />);
    expect(screen.getByRole('region', { name: /How it works/i })).toBeInTheDocument();
  });

  it('renders step descriptions', () => {
    render(<ScrollTimeline />);
    expect(screen.getByText(/Drop your 23andMe/i)).toBeInTheDocument();
    expect(screen.getByText(/seconds/i)).toBeInTheDocument();
    expect(screen.getByText(/visual results/i)).toBeInTheDocument();
  });
});
