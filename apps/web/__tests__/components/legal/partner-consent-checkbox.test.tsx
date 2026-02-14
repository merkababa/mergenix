import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Info: (props: any) => <svg data-testid="icon-info" {...props} />,
}));

// ─── Store mock ────────────────────────────────────────────────────────────────

const mockSetPartnerConsent = vi.fn();
const mockResetPartnerConsent = vi.fn();

const mockStoreState: Record<string, any> = {
  partnerConsentGiven: false,
  setPartnerConsent: mockSetPartnerConsent,
  resetPartnerConsent: mockResetPartnerConsent,
};

vi.mock('@/lib/stores/legal-store', () => ({
  useLegalStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreState),
    { getState: () => mockStoreState, setState: vi.fn() },
  ),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { PartnerConsentCheckbox } from '../../../components/legal/partner-consent-checkbox';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PartnerConsentCheckbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.partnerConsentGiven = false;
  });

  it('renders with the partner consent label', () => {
    render(<PartnerConsentCheckbox />);

    expect(screen.getByText(/I confirm that I have obtained explicit, informed consent/)).toBeInTheDocument();
  });

  it('checkbox starts unchecked', () => {
    render(<PartnerConsentCheckbox />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('calls setPartnerConsent when checkbox is clicked', () => {
    render(<PartnerConsentCheckbox />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockSetPartnerConsent).toHaveBeenCalledWith(true);
  });

  it('calls setPartnerConsent(false) when already checked and clicked again', () => {
    mockStoreState.partnerConsentGiven = true;
    render(<PartnerConsentCheckbox />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockSetPartnerConsent).toHaveBeenCalledWith(false);
  });

  it('shows "Why is this required?" info button', () => {
    render(<PartnerConsentCheckbox />);

    expect(screen.getByLabelText('Why is partner consent required?')).toBeInTheDocument();
  });

  it('shows tooltip with GINA/GDPR explanation on info button hover', async () => {
    render(<PartnerConsentCheckbox />);

    const infoButton = screen.getByLabelText('Why is partner consent required?');
    fireEvent.mouseEnter(infoButton);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(/Genetic data is sensitive personal information/)).toBeInTheDocument();
    expect(screen.getByText(/GINA and GDPR/)).toBeInTheDocument();
  });

  it('has prominent styling with border and background', () => {
    const { container } = render(<PartnerConsentCheckbox />);

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('border-2');
    expect(wrapper).toHaveClass('rounded-xl');
  });

  it('has aria-describedby pointing to explanation text', () => {
    render(<PartnerConsentCheckbox />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-describedby', 'partner-consent-explanation');
  });

  it('resets consent on unmount', () => {
    const { unmount } = render(<PartnerConsentCheckbox />);

    unmount();
    expect(mockResetPartnerConsent).toHaveBeenCalled();
  });

  it('resets consent when filesChanged prop changes', () => {
    const { rerender } = render(<PartnerConsentCheckbox filesChanged={1} />);

    mockResetPartnerConsent.mockClear();
    rerender(<PartnerConsentCheckbox filesChanged={2} />);

    expect(mockResetPartnerConsent).toHaveBeenCalled();
  });
});
