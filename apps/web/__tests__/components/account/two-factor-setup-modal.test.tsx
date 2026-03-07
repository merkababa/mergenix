import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import {
  mockLucideIcons,
  mockGlassCardFactory,
  mockButtonFactory,
  mockInputFactory,
  mockBadgeFactory,
} from '../../__helpers__';

// ── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('lucide-react', () =>
  mockLucideIcons('X', 'QrCode', 'KeyRound', 'ShieldCheck', 'Copy', 'Download', 'Check', 'Loader2'),
);
vi.mock('@/components/ui/glass-card', () => mockGlassCardFactory());
vi.mock('@/components/ui/badge', () => mockBadgeFactory());
vi.mock('@/components/ui/button', () => mockButtonFactory());
vi.mock('@/components/ui/input', () => mockInputFactory());

// Mock qrcode library
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQR') },
}));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// Mock auth store
const mockSetup2FA = vi.fn().mockResolvedValue({
  qrUri: 'otpauth://totp/Mergenix:test@example.com?secret=JBSWY3DPEHPK3PXP',
  secret: 'JBSWY3DPEHPK3PXP',
});

const mockVerify2FA = vi.fn().mockResolvedValue({
  backupCodes: ['CODE-001', 'CODE-002', 'CODE-003', 'CODE-004', 'CODE-005', 'CODE-006'],
});

const mockStoreState: Record<string, any> = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    tier: 'free',
    emailVerified: true,
    totpEnabled: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  isLoading: false,
  error: null,
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  disable2FA: vi.fn(),
  setup2FA: mockSetup2FA,
  verify2FA: mockVerify2FA,
};

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: Object.assign((selector: (state: any) => any) => selector(mockStoreState), {
    getState: () => mockStoreState,
    setState: vi.fn(),
  }),
}));

import { TwoFactorSetupModal } from '../../../app/(app)/account/_components/two-factor-setup-modal';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('TwoFactorSetupModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.setup2FA = mockSetup2FA.mockResolvedValue({
      qrUri: 'otpauth://totp/Mergenix:test@example.com?secret=JBSWY3DPEHPK3PXP',
      secret: 'JBSWY3DPEHPK3PXP',
    });
    mockStoreState.verify2FA = mockVerify2FA.mockResolvedValue({
      backupCodes: ['CODE-001', 'CODE-002', 'CODE-003', 'CODE-004', 'CODE-005', 'CODE-006'],
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<TwoFactorSetupModal isOpen={false} onClose={onClose} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls setup2FA and shows loading state when opened', async () => {
    // Make setup2FA pending to see loading state
    let resolveSetup!: (val: any) => void;
    mockStoreState.setup2FA = vi.fn(
      () =>
        new Promise((r) => {
          resolveSetup = r;
        }),
    );

    render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);

    expect(mockStoreState.setup2FA).toHaveBeenCalled();

    // Resolve to avoid act warnings
    await act(async () => {
      resolveSetup({ qrUri: 'otpauth://totp/test', secret: 'ABC' });
    });
  });

  it('step 0: shows "Scan QR Code" heading and secret key', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    expect(screen.getByRole('heading', { name: 'Scan QR Code' })).toBeInTheDocument();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
  });

  it('step 0: copy secret key button copies to clipboard', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    const copyButton = screen.getByLabelText('Copy secret key');
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(mockWriteText).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  });

  it('"Continue" button advances to step 1', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Enter Verification Code' })).toBeInTheDocument();
  });

  it('step 1: shows heading and verification code input', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByLabelText('Verification Code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
  });

  it('step 1: "Verify" button disabled when code < 6 digits', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    const verifyBtn = screen.getByRole('button', { name: 'Verify' });
    expect(verifyBtn).toBeDisabled();

    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123' } });
    expect(verifyBtn).toBeDisabled();
  });

  it('step 1: "Back" button returns to step 0', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Enter Verification Code' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Scan QR Code' })).toBeInTheDocument();
  });

  it('successful verify advances to step 2 with backup codes', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    // Go to step 1
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Enter code
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // Click verify
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    });

    expect(mockVerify2FA).toHaveBeenCalledWith('123456');
    expect(screen.getByRole('heading', { name: 'Save Backup Codes' })).toBeInTheDocument();
  });

  it('step 2: backup codes are displayed', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    // Navigate to step 2
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const codeInput = screen.getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    });

    expect(screen.getByText('CODE-001')).toBeInTheDocument();
    expect(screen.getByText('CODE-006')).toBeInTheDocument();
  });

  it('step 2: "Copy All" copies backup codes to clipboard', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    // Navigate to step 2
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Copy All'));
    });

    expect(mockWriteText).toHaveBeenCalledWith(
      'CODE-001\nCODE-002\nCODE-003\nCODE-004\nCODE-005\nCODE-006',
    );
  });

  it('step 2: "I\'ve Saved My Codes" calls onClose', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    // Navigate to step 2
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    });

    fireEvent.click(screen.getByRole('button', { name: /saved my codes/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape key closes the modal', async () => {
    await act(async () => {
      render(<TwoFactorSetupModal isOpen={true} onClose={onClose} />);
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
