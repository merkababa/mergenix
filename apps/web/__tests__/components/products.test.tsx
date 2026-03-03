import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { variants, initial, whileInView, viewport, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      void variants; void initial; void whileInView; void viewport; void animate; void exit; void transition; void whileHover; void whileTap;
      return <div {...rest}>{children}</div>;
    },
    section: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { variants, initial, whileInView, viewport, animate, exit, transition, ...rest } = props;
      void variants; void initial; void whileInView; void viewport; void animate; void exit; void transition;
      return <section {...rest}>{children}</section>;
    },
    ul: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { variants, initial, whileInView, viewport, animate, ...rest } = props;
      void variants; void initial; void whileInView; void viewport; void animate;
      return <ul {...rest}>{children}</ul>;
    },
    li: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const { variants, initial, whileInView, viewport, animate, ...rest } = props;
      void variants; void initial; void whileInView; void viewport; void animate;
      return <li {...rest}>{children}</li>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
}));

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useScrollProgress: () => ({ scrollYProgress: { get: () => 0 }, opacity: 1, y: 0 }),
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  ),
}));

vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ items }: { items: Array<{ question: string; answer: string }> }) => (
    <div data-testid="accordion">
      {items.map((item) => (
        <div key={item.question}>
          <span>{item.question}</span>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'btn',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('lucide-react', () => ({
  Check: (props: Record<string, unknown>) => <svg aria-label="Included" {...props} />,
  X: (props: Record<string, unknown>) => <svg aria-label="Not included" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg {...props} />,
  Zap: (props: Record<string, unknown>) => <svg {...props} />,
  Users: (props: Record<string, unknown>) => <svg {...props} />,
  Sparkles: (props: Record<string, unknown>) => <svg {...props} />,
  ShieldCheck: (props: Record<string, unknown>) => <svg {...props} />,
  Dna: (props: Record<string, unknown>) => <svg {...props} />,
  FileType: (props: Record<string, unknown>) => <svg {...props} />,
  Pill: (props: Record<string, unknown>) => <svg {...props} />,
  TrendingUp: (props: Record<string, unknown>) => <svg {...props} />,
  Mail: (props: Record<string, unknown>) => <svg {...props} />,
  MessageCircle: (props: Record<string, unknown>) => <svg {...props} />,
  Database: (props: Record<string, unknown>) => <svg {...props} />,
  FileText: (props: Record<string, unknown>) => <svg {...props} />,
  Star: (props: Record<string, unknown>) => <svg {...props} />,
  BarChart2: (props: Record<string, unknown>) => <svg {...props} />,
  HeartPulse: (props: Record<string, unknown>) => <svg {...props} />,
  FlaskConical: (props: Record<string, unknown>) => <svg {...props} />,
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { ProductsContent } from '../../app/(marketing)/products/_components/products-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProductsContent', () => {
  describe('D4.1 — Most Popular pricing card prominent styling', () => {
    it('renders the page heading', () => {
      render(<ProductsContent />);
      expect(screen.getByRole('heading', { level: 1, name: /Simple, One-Time Pricing/i })).toBeInTheDocument();
    });

    it('renders all three pricing tier names', () => {
      render(<ProductsContent />);
      expect(screen.getByRole('heading', { name: /^Free$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Premium$/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Pro$/i })).toBeInTheDocument();
    });

    it('renders the "Most Popular" badge on the Premium card', () => {
      render(<ProductsContent />);
      expect(screen.getByText(/Most Popular/i)).toBeInTheDocument();
    });

    it('applies featured/popular styling to the Premium card container', () => {
      render(<ProductsContent />);
      // The popular card wrapper should have the data-popular attribute
      const popularCard = document.querySelector('[data-popular="true"]');
      expect(popularCard).toBeInTheDocument();
    });
  });

  describe('D4.2 — Comparison table visual enhancement', () => {
    it('renders the Feature Comparison section heading', () => {
      render(<ProductsContent />);
      expect(screen.getByRole('heading', { name: /Feature Comparison/i })).toBeInTheDocument();
    });

    it('renders the comparison table', () => {
      render(<ProductsContent />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders tier column headers: Free, Premium, Pro', () => {
      render(<ProductsContent />);
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);
      expect(headerTexts).toContain('Free');
      expect(headerTexts).toContain('Premium');
      expect(headerTexts).toContain('Pro');
    });

    it('renders feature rows with check/cross indicators', () => {
      render(<ProductsContent />);
      // "Disease screening" row exists
      expect(screen.getByText('Disease screening')).toBeInTheDocument();
      // Multiple "Included" check icons should be present
      const checkIcons = screen.getAllByLabelText('Included');
      expect(checkIcons.length).toBeGreaterThan(0);
      // Multiple "Not included" cross icons should also be present
      const crossIcons = screen.getAllByLabelText('Not included');
      expect(crossIcons.length).toBeGreaterThan(0);
    });

    it('renders the "Most Popular" highlighted column header', () => {
      render(<ProductsContent />);
      // Premium column header should be visually distinct (has data-highlighted or specific class)
      const premiumHeader = document.querySelector('[data-highlighted="true"]');
      expect(premiumHeader).toBeInTheDocument();
    });

    it('renders key feature rows', () => {
      render(<ProductsContent />);
      expect(screen.getByText('Trait predictions')).toBeInTheDocument();
      expect(screen.getByText('Pharmacogenomics')).toBeInTheDocument();
      expect(screen.getByText('ClinVar integration')).toBeInTheDocument();
    });
  });
});
