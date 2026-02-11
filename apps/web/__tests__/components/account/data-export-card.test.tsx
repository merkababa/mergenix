import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Download: (props: any) => <svg data-testid="icon-download" {...props} />,
  Loader2: (props: any) => <svg data-testid="icon-loader" {...props} />,
  CheckCircle2: (props: any) => <svg data-testid="icon-check-circle" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="icon-alert-triangle" {...props} />,
}));

vi.mock('@/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => (
    <div data-testid="glass-card" {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, isLoading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} {...props}>
      {isLoading && <span data-testid="loading-spinner" />}
      {children}
    </button>
  ),
}));

// ─── Mock legal client ──────────────────────────────────────────────────────

const mockExportData = vi.fn();

vi.mock('@/lib/api/legal-client', () => ({
  exportData: (...args: unknown[]) => mockExportData(...args),
}));

// ─── Mock URL.createObjectURL / revokeObjectURL ─────────────────────────────

const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/mock-blob-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global, 'URL', {
  value: {
    ...URL,
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

// ─── Import component after mocks ─────────────────────────────────────────────

import { DataExportCard } from '../../../components/account/data-export-card';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DataExportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export button in idle state', () => {
    render(<DataExportCard />);

    expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
  });

  it('shows loading state during export', async () => {
    // Make exportData hang
    let resolveExport: (value: Blob) => void;
    mockExportData.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveExport = resolve;
      }),
    );

    render(<DataExportCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Export as JSON'));
    });

    // Should show loading message
    expect(screen.getByText('Preparing your data export...')).toBeInTheDocument();

    // Clean up: resolve the promise
    await act(async () => {
      resolveExport!(new Blob(['{}'], { type: 'application/json' }));
    });
  });

  it('shows download link on success', async () => {
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    mockExportData.mockResolvedValue(mockBlob);

    render(<DataExportCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Export as JSON'));
    });

    await waitFor(() => {
      expect(screen.getByText('Export ready!')).toBeInTheDocument();
    });

    const downloadLink = screen.getByText('Download mergenix-data-export.json');
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink.closest('a')).toHaveAttribute('download', 'mergenix-data-export.json');
  });

  it('shows error message on failure', async () => {
    mockExportData.mockRejectedValue(new Error('Rate limit exceeded'));

    render(<DataExportCard />);

    await act(async () => {
      fireEvent.click(screen.getByText('Export as JSON'));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('retry button appears on error and resets to idle state', async () => {
    mockExportData.mockRejectedValue(new Error('Server error'));

    render(<DataExportCard />);

    // Trigger export failure
    await act(async () => {
      fireEvent.click(screen.getByText('Export as JSON'));
    });

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText('Try Again'));

    // Should be back to idle state with export button
    expect(screen.getByText('Export as JSON')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has accessible heading and description', () => {
    render(<DataExportCard />);

    expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    expect(
      screen.getByText(/Download a copy of all your personal data in JSON format/),
    ).toBeInTheDocument();
  });

  it('revokes blob URL on unmount to prevent memory leaks', async () => {
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    mockExportData.mockResolvedValue(mockBlob);

    const { unmount } = render(<DataExportCard />);

    // Trigger export
    await act(async () => {
      fireEvent.click(screen.getByText('Export as JSON'));
    });

    await waitFor(() => {
      expect(screen.getByText('Export ready!')).toBeInTheDocument();
    });

    // A blob URL should have been created
    expect(mockCreateObjectURL).toHaveBeenCalled();
    const blobUrl = mockCreateObjectURL.mock.results[0]?.value;

    // Unmount the component
    unmount();

    // revokeObjectURL should have been called to clean up the blob
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(blobUrl);
  });
});
