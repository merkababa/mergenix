import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  Lock: (props: any) => <svg data-testid="icon-lock" {...props} />,
  Eye: (props: any) => <svg data-testid="icon-eye" {...props} />,
  EyeOff: (props: any) => <svg data-testid="icon-eye-off" {...props} />,
  Server: (props: any) => <svg data-testid="icon-server" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="icon-chevron-down" {...props} />,
  ChevronRight: (props: any) => <svg data-testid="icon-chevron-right" {...props} />,
  Check: (props: any) => <svg data-testid="icon-check" {...props} />,
  ArrowRight: (props: any) => <svg data-testid="icon-arrow-right" {...props} />,
  FileText: (props: any) => <svg data-testid="icon-file-text" {...props} />,
  Cpu: (props: any) => <svg data-testid="icon-cpu" {...props} />,
  Globe: (props: any) => <svg data-testid="icon-globe" {...props} />,
  KeyRound: (props: any) => <svg data-testid="icon-key-round" {...props} />,
  ShieldCheck: (props: any) => <svg data-testid="icon-shield-check" {...props} />,
  HardDrive: (props: any) => <svg data-testid="icon-hard-drive" {...props} />,
  Workflow: (props: any) => <svg data-testid="icon-workflow" {...props} />,
  XCircle: (props: any) => <svg data-testid="icon-x-circle" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => {
    const { variant, hover, rainbow, ...htmlProps } = props;
    return <div data-testid="glass-card" {...htmlProps}>{children}</div>;
  },
}));

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/layout/page-header', () => ({
  PageHeader: ({ title, subtitle, breadcrumbs }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/marketing/section-heading', () => ({
  SectionHeading: ({ title, subtitle, id }: any) => (
    <div>
      <h2 id={id}>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { SecurityContent } from '../app/(marketing)/security/_components/security-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SecurityPage', () => {
  it('renders security page with hero section', () => {
    render(<SecurityContent />);

    // The hero section should display the main headline
    expect(
      screen.getByText(/Your Genetic Data Never Leaves Your Browser/i),
    ).toBeInTheDocument();
  });

  it('renders zero-knowledge architecture section with explanation', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/Zero-Knowledge Architecture/i)).toBeInTheDocument();
    // Should explain Web Worker client-side processing
    expect(
      screen.getByText(/Web Worker/i),
    ).toBeInTheDocument();
  });

  it('renders data flow section with step-by-step process', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/How Your Data Flows/i)).toBeInTheDocument();
    // Should include the key steps
    expect(screen.getByText(/Upload DNA files/i)).toBeInTheDocument();
    expect(screen.getByText(/Web Worker parses/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis runs client-side/i)).toBeInTheDocument();
  });

  it('renders encryption section mentioning AES-256-GCM', () => {
    render(<SecurityContent />);

    // Multiple elements contain "Encryption" — use getAllByText to avoid ambiguity
    expect(screen.getAllByText(/Encryption/i).length).toBeGreaterThanOrEqual(1);
    // AES-256-GCM is now marked as "Planned" but still present in multiple places
    expect(screen.getAllByText(/AES-256-GCM/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders privacy promises list', () => {
    render(<SecurityContent />);

    expect(screen.getByText(/We never see your DNA data/i)).toBeInTheDocument();
    expect(screen.getByText(/No server-side genetic processing/i)).toBeInTheDocument();
    expect(screen.getByText(/No data selling or sharing/i)).toBeInTheDocument();
    expect(screen.getByText(/You control deletion/i)).toBeInTheDocument();
  });

  it('renders security FAQ with expandable questions', () => {
    render(<SecurityContent />);

    // FAQ questions should be visible
    const faqButton = screen.getByText(/Can you see my DNA data\?/i);
    expect(faqButton).toBeInTheDocument();

    // FAQ answers should be hidden initially
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

  it('heading hierarchy is h1 -> h2 -> h3 with no skipped levels', () => {
    const { container } = render(<SecurityContent />);

    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map((h) =>
      parseInt(h.tagName.replace('H', ''), 10),
    );

    // Should have at least h1 and h2
    expect(levels).toContain(1);
    expect(levels).toContain(2);

    // No skipped levels: for each heading, the next heading level should be
    // at most 1 more than the current (can go back to any level)
    for (let i = 0; i < levels.length - 1; i++) {
      const current = levels[i];
      const next = levels[i + 1];
      // Going deeper: next level should be at most current + 1
      if (next > current) {
        expect(next).toBeLessThanOrEqual(current + 1);
      }
    }
  });

  it("all external links have rel='noopener noreferrer'", () => {
    const { container } = render(<SecurityContent />);

    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });
  });

  // ─── F46: referrerPolicy on external links ─────────────────────────────────

  it("all external links have referrerPolicy set for privacy", () => {
    const { container } = render(<SecurityContent />);

    // Find all anchor elements with an href starting with "http"
    // (i.e., external links, not relative paths like "/subscription")
    const allLinks = Array.from(container.querySelectorAll('a[href]'));
    const externalLinks = allLinks.filter((link) => {
      const href = link.getAttribute('href') ?? '';
      return href.startsWith('http://') || href.startsWith('https://');
    });

    // If external links exist, each must have a referrerPolicy attribute
    // set to a privacy-safe value (no-referrer or strict-origin-when-cross-origin).
    // Currently the security page has no external links, so this test acts
    // as a guard rail: if someone adds an external link without referrerPolicy,
    // this test will catch it immediately.
    externalLinks.forEach((link) => {
      const policy = link.getAttribute('referrerpolicy');
      expect(
        policy === 'no-referrer' || policy === 'strict-origin-when-cross-origin',
        `External link to "${link.getAttribute('href')}" must have referrerPolicy="no-referrer" or "strict-origin-when-cross-origin", got "${policy}"`,
      ).toBe(true);
    });

    // Explicitly document: the security page currently has zero external links.
    // This assertion will fail if external links are added, signaling the
    // developer to add referrerPolicy to each one (the forEach above enforces it).
    // Remove or update this count assertion when external links are intentionally added.
    expect(externalLinks.length).toBe(0);
  });
});
