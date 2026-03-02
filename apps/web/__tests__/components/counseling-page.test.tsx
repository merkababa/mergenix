import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Heart: (props: Record<string, unknown>) => <svg data-testid="icon-heart" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="icon-shield" {...props} />,
  ExternalLink: (props: Record<string, unknown>) => <svg data-testid="icon-external-link" {...props} />,
  ChevronRight: (props: Record<string, unknown>) => <svg data-testid="icon-chevron-right" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glass-card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  buttonVariants: () => 'mock-button-class',
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { CounselingContent } from '../../app/(app)/counseling/_components/counseling-content';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CounselingContent (counseling page)', () => {
  it('renders without errors', () => {
    const { container } = render(<CounselingContent />);
    expect(container).toBeTruthy();
  });

  it('renders the page heading', () => {
    render(<CounselingContent />);
    expect(screen.getByText('Find a Genetic Counselor')).toBeInTheDocument();
  });

  it('does NOT contain any @example.com email address', () => {
    const { container } = render(<CounselingContent />);
    expect(container.innerHTML).not.toContain('@example.com');
  });

  it('does NOT render fake counselor name "Dr. Sarah Chen"', () => {
    render(<CounselingContent />);
    expect(screen.queryByText(/Dr\. Sarah Chen/)).not.toBeInTheDocument();
  });

  it('does NOT render fake counselor name "Dr. Michael Torres"', () => {
    render(<CounselingContent />);
    expect(screen.queryByText(/Dr\. Michael Torres/)).not.toBeInTheDocument();
  });

  it('does NOT render fake counselor name "Dr. Emily Goldstein"', () => {
    render(<CounselingContent />);
    expect(screen.queryByText(/Dr\. Emily Goldstein/)).not.toBeInTheDocument();
  });

  it('contains a link to the NSGC counselor directory', () => {
    render(<CounselingContent />);
    const link = screen.getByRole('link', { name: /NSGC genetic counselor directory/i });
    expect(link).toHaveAttribute('href', 'https://findageneticcounselor.nsgc.org');
  });

  it('NSGC link opens in a new tab with noopener noreferrer', () => {
    render(<CounselingContent />);
    const link = screen.getByRole('link', { name: /NSGC genetic counselor directory/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders the "Find a Certified Genetic Counselor Near You" CTA heading', () => {
    render(<CounselingContent />);
    expect(screen.getByText('Find a Certified Genetic Counselor Near You')).toBeInTheDocument();
  });

  it('shows the info banner about genetic counselors', () => {
    render(<CounselingContent />);
    expect(
      screen.getByText(/Genetic counselors are healthcare professionals/),
    ).toBeInTheDocument();
  });

  it('shows the "Why See a Genetic Counselor?" section', () => {
    render(<CounselingContent />);
    expect(screen.getByText('Why See a Genetic Counselor?')).toBeInTheDocument();
  });

  it('does NOT contain a search input (search UI removed)', () => {
    render(<CounselingContent />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/search by name/i),
    ).not.toBeInTheDocument();
  });

  it('shows the NSGC domain in a disclosure note', () => {
    const { container } = render(<CounselingContent />);
    expect(container.innerHTML).toContain('findageneticcounselor.nsgc.org');
  });
});
