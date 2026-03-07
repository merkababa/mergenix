import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import { mockLucideIcons, mockGlassCardFactory, mockButtonFactory } from '../../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () => mockLucideIcons('FileDown', 'Lock', 'Shield', 'X'));
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: vi.fn(),
}));

vi.mock('@/hooks/use-modal-manager', () => ({
  useModalManager: Object.assign(() => ({}), {
    getState: () => ({
      openModal: vi.fn(),
      closeModal: vi.fn(),
    }),
    setState: vi.fn(),
  }),
}));

vi.mock('@/lib/animations/modal-variants', () => ({
  overlayVariants: {},
  modalVariants: {},
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { SaveOptionsModal } from '../../../components/save/save-options-modal';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SaveOptionsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onDownloadPDF: vi.fn(),
    tier: 'free' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('renders two option cards when open', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    expect(screen.getByText('Download PDF Report')).toBeInTheDocument();
    expect(screen.getByText('Save to Secure Cloud')).toBeInTheDocument();
  });

  it('Download PDF button fires onDownloadPDF for Pro tier', () => {
    const onDownloadPDF = vi.fn();
    render(<SaveOptionsModal {...defaultProps} tier="pro" onDownloadPDF={onDownloadPDF} />);

    const downloadButton = screen.getByRole('button', {
      name: /download pdf/i,
    });
    fireEvent.click(downloadButton);

    expect(onDownloadPDF).toHaveBeenCalledTimes(1);
  });

  it("shows 'Pro Only' button for free tier instead of Download PDF", () => {
    render(<SaveOptionsModal {...defaultProps} tier="free" />);

    expect(screen.getByRole('button', { name: /pro only/i })).toBeDisabled();
    expect(screen.getByText('Upgrade to Pro to export PDF reports')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it("shows 'Pro Only' button for premium tier instead of Download PDF", () => {
    render(<SaveOptionsModal {...defaultProps} tier="premium" />);

    expect(screen.getByRole('button', { name: /pro only/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /download pdf/i })).not.toBeInTheDocument();
  });

  it('Save Encrypted button is disabled', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    const comingSoonButton = screen.getByRole('button', {
      name: /coming soon/i,
    });
    expect(comingSoonButton).toBeDisabled();
  });

  it('"Coming Soon" text is visible', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    expect(
      screen.getByText('Encrypted cloud storage is being built. Check back soon!'),
    ).toBeInTheDocument();
  });

  it('Escape key closes modal', () => {
    const onClose = vi.fn();
    render(<SaveOptionsModal {...defaultProps} onClose={onClose} />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has role="dialog" present', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('focus trap is initialized (useFocusTrap called)', async () => {
    const { useFocusTrap } = await import('@/hooks/use-focus-trap');
    render(<SaveOptionsModal {...defaultProps} />);

    expect(useFocusTrap).toHaveBeenCalled();
  });

  it('does NOT render modal when isOpen is false', () => {
    render(<SaveOptionsModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has aria-labelledby and aria-describedby on dialog', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    const descId = dialog.getAttribute('aria-describedby');

    expect(labelId).toBeTruthy();
    expect(descId).toBeTruthy();

    // Verify the referenced elements exist and have correct text
    const heading = document.getElementById(labelId!);
    const description = document.getElementById(descId!);
    expect(heading).toHaveTextContent('Save Your Results');
    expect(description).toHaveTextContent('Choose how you want to save your analysis results.');
  });

  it('Save Encrypted button has aria-disabled attribute', () => {
    render(<SaveOptionsModal {...defaultProps} />);

    const comingSoonButton = screen.getByRole('button', {
      name: /coming soon/i,
    });
    expect(comingSoonButton).toHaveAttribute('aria-disabled', 'true');
  });
});
