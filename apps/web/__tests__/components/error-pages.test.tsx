import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockNextLinkFactory } from '../__helpers__';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => mockNextLinkFactory());

// ─── Imports ──────────────────────────────────────────────────────────────────

import NotFound from '../../app/not-found';
import ErrorPage from '../../app/error';

// ─── not-found.tsx tests ──────────────────────────────────────────────────────

describe('NotFound (404 page)', () => {
  it('renders without errors', () => {
    const { container } = render(<NotFound />);
    expect(container).toBeTruthy();
  });

  it('shows "404" heading', () => {
    render(<NotFound />);
    const heading = screen.getByText('404');
    expect(heading).toBeInTheDocument();
  });

  it('shows "Page not found" subheading', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('shows descriptive message about the page', () => {
    render(<NotFound />);
    expect(
      screen.getByText(/doesn't exist or has been moved/i),
    ).toBeInTheDocument();
  });

  it('has a link back to home page', () => {
    render(<NotFound />);
    const homeLink = screen.getByRole('link', { name: /back to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});

// ─── error.tsx tests ──────────────────────────────────────────────────────────

describe('ErrorPage (error.tsx)', () => {
  const mockError = new Error('Test error');
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders without errors', () => {
    const { container } = render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(container).toBeTruthy();
  });

  it('shows "Something went wrong" heading', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByRole('heading', { name: /something went wrong/i }),
    ).toBeInTheDocument();
  });

  it('shows a descriptive message', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(
      screen.getByText(/unexpected error occurred/i),
    ).toBeInTheDocument();
  });

  it('has a "Try again" button that calls reset', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();
    fireEvent.click(tryAgainButton);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('has a link back to home page', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const homeLink = screen.getByRole('link', { name: /back to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('logs the error to console.error via useEffect', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorPage] Unhandled error:',
      mockError,
    );
  });
});
