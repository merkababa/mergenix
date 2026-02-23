import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAuthStore } from '../../lib/stores/auth-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, variants,
        whileHover, whileTap, layoutId, ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Menu: (props: any) => <svg data-testid="icon-menu" {...props} />,
  X: (props: any) => <svg data-testid="icon-x" {...props} />,
  Dna: (props: any) => <svg data-testid="icon-dna" {...props} />,
  // Icons potentially used transitively
  User: (props: any) => <svg data-testid="icon-user" {...props} />,
  CreditCard: (props: any) => <svg data-testid="icon-credit-card" {...props} />,
  Activity: (props: any) => <svg data-testid="icon-activity" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="icon-chevron-down" {...props} />,
  Sun: (props: any) => <svg data-testid="icon-sun" {...props} />,
  Moon: (props: any) => <svg data-testid="icon-moon" {...props} />,
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: any }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock usePathname — default to '/'
const mockUsePathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock ThemeToggle to keep navbar tests focused
vi.mock('../../components/layout/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">ThemeToggle</button>,
}));

// Mock UserMenu to avoid deep auth-store interaction in navbar tests
vi.mock('@/components/auth/user-menu', () => ({
  UserMenu: () => <div data-testid="user-menu">UserMenu</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { Navbar } from '../../components/layout/navbar';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    // jsdom does not implement window.scrollTo — suppress the error
    window.scrollTo = vi.fn();
    // Default: unauthenticated
    useAuthStore.setState({ isAuthenticated: false, user: null } as any);
  });

  // ── Logo ──────────────────────────────────────────────────────────────

  it('renders the Mergenix logo linking to /', () => {
    render(<Navbar />);

    const logo = screen.getByRole('link', { name: /Mergenix home/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('href', '/');
  });

  it('renders the Mergenix wordmark', () => {
    render(<Navbar />);

    expect(screen.getByText('Mergenix')).toBeInTheDocument();
  });

  // ── Desktop nav links ─────────────────────────────────────────────────

  it('renders the main navigation landmark', () => {
    render(<Navbar />);

    expect(screen.getByRole('navigation', { name: /Main navigation/i })).toBeInTheDocument();
  });

  it('renders Home nav link with href "/"', () => {
    render(<Navbar />);

    // getAllByRole because desktop + mobile can both render the same links
    const homeLinks = screen.getAllByRole('link', { name: 'Home' });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks[0]).toHaveAttribute('href', '/');
  });

  it('renders Analysis nav link with href "/analysis"', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link', { name: 'Analysis' });
    expect(links[0]).toHaveAttribute('href', '/analysis');
  });

  it('renders Disease Catalog nav link with href "/diseases"', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link', { name: /Disease Catalog/i });
    expect(links[0]).toHaveAttribute('href', '/diseases');
  });

  it('renders Pricing nav link with href "/products"', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link', { name: 'Pricing' });
    expect(links[0]).toHaveAttribute('href', '/products');
  });

  it('renders About nav link with href "/about"', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link', { name: 'About' });
    expect(links[0]).toHaveAttribute('href', '/about');
  });

  // ── Unauthenticated state ──────────────────────────────────────────────

  it('shows Sign In link when unauthenticated', () => {
    render(<Navbar />);

    const signInLinks = screen.getAllByRole('link', { name: /Sign In/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');
  });

  it('shows Get Started link when unauthenticated', () => {
    render(<Navbar />);

    const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
    expect(getStartedLinks.length).toBeGreaterThanOrEqual(1);
    expect(getStartedLinks[0]).toHaveAttribute('href', '/register');
  });

  it('does not show UserMenu when unauthenticated', () => {
    render(<Navbar />);

    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });

  // ── Authenticated state ────────────────────────────────────────────────

  it('shows UserMenu when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true } as any);

    render(<Navbar />);

    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  // ── Mobile menu toggle ────────────────────────────────────────────────

  it('renders the hamburger button with aria-expanded=false initially', () => {
    render(<Navbar />);

    const hamburger = screen.getByRole('button', { name: /Open menu/i });
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking hamburger opens mobile menu dialog', () => {
    render(<Navbar />);

    const hamburger = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(hamburger);

    // Mobile menu dialog should be present
    expect(screen.getByRole('dialog', { name: /Mobile navigation menu/i })).toBeInTheDocument();

    // Button label changes to "Close menu" and aria-expanded becomes true
    expect(
      screen.getByRole('button', { name: /Close menu/i }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('mobile menu contains Analysis and About nav links when open', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    expect(screen.getByRole('dialog', { name: /Mobile navigation menu/i })).toBeInTheDocument();
    // Multiple Analysis links exist (desktop + mobile) — verify at least one
    expect(screen.getAllByRole('link', { name: 'Analysis' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'About' }).length).toBeGreaterThan(0);
  });

  it('clicking the Close button inside the mobile menu closes it', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click the "Close navigation menu" button inside the mobile menu
    fireEvent.click(screen.getByRole('button', { name: /Close navigation menu/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pressing Escape closes the mobile menu', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mobile menu shows Sign In / Get Started links when unauthenticated and open', () => {
    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    const signInLinks = screen.getAllByRole('link', { name: /Sign In/i });
    const allHrefs = signInLinks.map((l) => l.getAttribute('href'));
    expect(allHrefs).toContain('/login');
  });

  it('mobile menu shows Account Settings and Subscription links when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true } as any);

    render(<Navbar />);

    fireEvent.click(screen.getByRole('button', { name: /Open menu/i }));

    expect(screen.getByRole('link', { name: /Account Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /My Plan/i })).toBeInTheDocument();
  });

  // ── Active route ──────────────────────────────────────────────────────

  it('marks the current route link with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/analysis');

    render(<Navbar />);

    const analysisLinks = screen.getAllByRole('link', { name: 'Analysis' });
    // At least one of the Analysis links should have aria-current="page"
    const hasCurrent = analysisLinks.some(
      (link) => link.getAttribute('aria-current') === 'page',
    );
    expect(hasCurrent).toBe(true);
  });

  it('Home link has aria-current="page" when pathname is "/"', () => {
    mockUsePathname.mockReturnValue('/');

    render(<Navbar />);

    const homeLinks = screen.getAllByRole('link', { name: 'Home' });
    const hasCurrent = homeLinks.some(
      (link) => link.getAttribute('aria-current') === 'page',
    );
    expect(hasCurrent).toBe(true);
  });

  // ── Scroll behavior ───────────────────────────────────────────────────

  it('adds scrolled styling to the header when window.scrollY > 20', () => {
    render(<Navbar />);

    // Initially, header should not have scrolled classes
    const header = document.querySelector('header');
    expect(header).not.toBeNull();
    expect(header!.className).not.toMatch(/shadow-/);

    // Simulate a scroll event with scrollY > 20
    Object.defineProperty(window, 'scrollY', { value: 30, writable: true, configurable: true });
    fireEvent.scroll(window);

    // After scroll, header should gain the scrolled background class
    expect(header!.className).toMatch(/bg-\[var\(--navbar-bg\)\]/);
  });
});
