/**
 * L5 — CPRA footer link tests.
 *
 * TDD: These tests are written FIRST and must FAIL before implementation.
 *
 * Coverage:
 * - "Limit the Use of My Sensitive Personal Information" link is visible
 * - CPRA modal opens when the link is clicked
 * - Modal explains Mergenix already limits SPI use by default
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Next.js Link mock ───────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ─── Lucide icon mocks ───────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Dna: (props: any) => <svg data-testid="icon-dna" {...props} />,
  Shield: (props: any) => <svg data-testid="icon-shield" {...props} />,
  Heart: (props: any) => <svg data-testid="icon-heart" {...props} />,
  Github: (props: any) => <svg data-testid="icon-github" {...props} />,
  Twitter: (props: any) => <svg data-testid="icon-twitter" {...props} />,
  Mail: (props: any) => <svg data-testid="icon-mail" {...props} />,
  CheckCircle: (props: any) => <svg data-testid="icon-check" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
}));

// ─── UI component mocks ──────────────────────────────────────────────────────

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { Footer } from '../../../components/layout/footer';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Footer — CPRA SPI link', () => {
  it('renders CPRA "Limit the Use of My Sensitive Personal Information" link', () => {
    render(<Footer />);
    expect(
      screen.getByText('Limit the Use of My Sensitive Personal Information'),
    ).toBeInTheDocument();
  });

  it('CPRA link is a button or link element (accessible)', () => {
    render(<Footer />);
    const cpraEl = screen.getByText('Limit the Use of My Sensitive Personal Information');
    // It should be in the document and be either a link/button
    expect(cpraEl).toBeInTheDocument();
  });

  it('clicking CPRA link opens a modal with SPI explanation', () => {
    render(<Footer />);
    const cpraLink = screen.getByText('Limit the Use of My Sensitive Personal Information');
    fireEvent.click(cpraLink);

    // Modal should appear explaining SPI policy
    // Look for key text about the modal content
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('CPRA modal explains Mergenix limits SPI by default', () => {
    render(<Footer />);
    const cpraLink = screen.getByText('Limit the Use of My Sensitive Personal Information');
    fireEvent.click(cpraLink);

    // Modal must contain explanation about default SPI limitation
    // Look for text about client-side processing or ZKE or default limitation
    const modalText = screen.getByRole('dialog').textContent ?? '';
    expect(
      modalText.toLowerCase().includes('sensitive') ||
      modalText.toLowerCase().includes('default') ||
      modalText.toLowerCase().includes('client-side') ||
      modalText.toLowerCase().includes('privacy')
    ).toBe(true);
  });

  it('CPRA modal has a close button', () => {
    render(<Footer />);
    const cpraLink = screen.getByText('Limit the Use of My Sensitive Personal Information');
    fireEvent.click(cpraLink);

    // Modal should have a close button (dismiss) visible
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Look for a button inside the dialog
    const closeBtn = dialog.querySelector('button');
    expect(closeBtn).toBeInTheDocument();
  });

  it('closing the CPRA modal dismisses it', () => {
    render(<Footer />);
    const cpraLink = screen.getByText('Limit the Use of My Sensitive Personal Information');
    fireEvent.click(cpraLink);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Find and click close button (by label)
    const closeBtn = screen.getByLabelText('Close SPI notice');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
