import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ErrorBoundary } from '../../components/error-boundary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProblemChild({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child rendered successfully</div>;
}

function CodedProblemChild(): React.ReactNode {
  throw new Error('[FILE_TOO_LARGE] File exceeds limit');
}

// Suppress React error boundary console output in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  return () => {
    console.error = originalConsoleError;
  };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('catches errors and shows default fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
    expect(screen.getByText('Copy debug info')).toBeInTheDocument();
  });

  it('displays error message in development', () => {
    // NODE_ENV is "test" in vitest, which is treated like development
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    // In non-production, should show the actual error message
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('reset button clears the error and re-renders children', () => {
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error('Conditional error');
      }
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Fix the issue before resetting
    shouldThrow = false;

    fireEvent.click(screen.getByText('Try again'));

    expect(screen.getByText('Recovered successfully')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders custom ReactNode fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback content</div>}>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders custom render-prop fallback with error and reset', () => {
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) {
        throw new Error('Render prop error');
      }
      return <div>Render prop recovered</div>;
    }

    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={reset}>Reset now</button>
          </div>
        )}
      >
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Error: Render prop error')).toBeInTheDocument();
    expect(screen.getByText('Reset now')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText('Reset now'));

    expect(screen.getByText('Render prop recovered')).toBeInTheDocument();
  });

  it('calls onError callback when an error is caught', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ProblemChild />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error message' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('copy debug info button writes to clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Copy debug info'));
    });

    expect(writeText).toHaveBeenCalledTimes(1);
    const clipboardContent = writeText.mock.calls[0][0] as string;
    expect(clipboardContent).toContain('Error: Test error message');
    expect(clipboardContent).toContain('Name: Error');
  });

  it('handles clipboard API failure gracefully', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')),
      },
    });

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByText('Copy debug info'));
    });

    // Still showing fallback UI (no crash from clipboard failure)
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // ─── New Tests: Error Messages Integration ──────────────────────────────

  it('shows aria-invalid on error container', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows user-friendly title from error-messages for unknown errors', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    // Unknown error code maps to "Something Went Wrong"
    expect(screen.getByText('Something Went Wrong')).toBeInTheDocument();
  });

  it('shows actionable suggestion text', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    // UNKNOWN_ERROR action text
    expect(
      screen.getByText(/Try refreshing the page/),
    ).toBeInTheDocument();
  });

  it('shows "Copied!" text after successful copy', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Copy debug info'));
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('includes error code, timestamp, and browser in debug info', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Copy debug info'));
    });

    const clipboardContent = writeText.mock.calls[0][0] as string;
    expect(clipboardContent).toContain('Error Code:');
    expect(clipboardContent).toContain('Timestamp:');
    expect(clipboardContent).toContain('Browser:');
  });

  it('extracts error code from [CODE] pattern in message', () => {
    render(
      <ErrorBoundary>
        <CodedProblemChild />
      </ErrorBoundary>,
    );

    // Should pick up FILE_TOO_LARGE from the message pattern
    expect(screen.getByText('File Too Large')).toBeInTheDocument();
  });
});
