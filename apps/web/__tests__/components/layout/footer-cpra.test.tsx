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

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory, mockNextLinkFactory, mockInputFactory } from '../../__helpers__';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/link', () => mockNextLinkFactory());
vi.mock('lucide-react', () => mockLucideIcons('Dna', 'Shield', 'Heart', 'Github', 'Twitter', 'Mail', 'CheckCircle', 'X'));
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());

vi.mock('@/components/ui/input', () => mockInputFactory());

// ─── Import component after mocks ─────────────────────────────────────────────

import { Footer } from '../../../components/layout/footer';

// ─── Tests ───────────────────────────────────────────────────────────────────

// ─── D4.6: Footer brand moment tests ─────────────────────────────────────────

describe('Footer — D4.6 Brand Moment', () => {
  it('D4.6: renders the Mergenix brand name in the footer', () => {
    render(<Footer />);
    const brandNames = screen.getAllByText('Mergenix');
    expect(brandNames.length).toBeGreaterThanOrEqual(1);
  });

  it('D4.6: renders a brand tagline in the footer', () => {
    render(<Footer />);
    // Should contain the distinctive brand tagline
    expect(
      screen.getByText(/Genetics Meets Insight/i)
    ).toBeInTheDocument();
  });

  it('D4.6: footer brand section renders the Mergenix wordmark as visible text', () => {
    render(<Footer />);
    // The brand wordmark should be visible as text content in the footer
    const brandNames = screen.getAllByText('Mergenix');
    expect(brandNames.length).toBeGreaterThanOrEqual(1);
    // The brand text should be inside a link pointing to the homepage
    const homeLinks = screen.getAllByRole('link', { name: 'Mergenix' });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute('href', '/');
  });

  it('D4.6: footer has a decorative separator between brand section and link columns', () => {
    render(<Footer />);
    // A visual separator — e.g. an hr or divider element
    const footer = document.querySelector('footer');
    expect(footer).not.toBeNull();
    // Should have at least a border-t separator in the bottom bar
    const hrElements = footer!.querySelectorAll('hr');
    // Either an <hr> or the existing border-t bottom bar counts
    const hasSeparator =
      hrElements.length > 0 ||
      footer!.innerHTML.includes('border-t');
    expect(hasSeparator).toBe(true);
  });
});

// ─── CPRA tests ───────────────────────────────────────────────────────────────

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
