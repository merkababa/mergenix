'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'motion/react';
import { Menu, X, Dna } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/analysis', label: 'Analysis' },
  { href: '/diseases', label: 'Disease Catalog' },
  { href: '/products', label: 'Pricing' },
  { href: '/about', label: 'About' },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Navbar({ isBypassed = false }: { isBypassed?: boolean }) {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobileOpen]);

  // Focus trap + Escape key for mobile menu
  useEffect(() => {
    if (!isMobileOpen) return;

    // Focus the first focusable element in the menu after animation settles
    const focusTimer = setTimeout(() => {
      const menu = mobileMenuRef.current;
      if (!menu) return;
      const focusable = menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key !== 'Tab') return;

      const menu = mobileMenuRef.current;
      if (!menu) return;

      const focusable = menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          isScrolled
            ? 'border-(--border-subtle) bg-(--navbar-bg) border-b shadow-[0_4px_30px_var(--shadow-ambient)]'
            : 'bg-transparent',
        )}
        style={{
          backdropFilter: isScrolled ? 'blur(20px)' : 'blur(0px)',
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : 'blur(0px)',
        }}
      >
        <nav
          className={cn(
            'mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6',
            !isBypassed && 'pointer-events-none select-none blur-[6px]',
          )}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
            aria-label="Mergenix home"
          >
            <Dna className="text-(--accent-teal) h-7 w-7" aria-hidden="true" />
            <span className="font-heading text-(--text-heading) text-xl font-extrabold tracking-[-0.03em] md:text-2xl">
              Mergenix
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'font-heading relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-(--accent-teal) bg-[rgba(6,214,160,0.1)] ring-1 ring-[rgba(6,214,160,0.2)]'
                      : 'text-(--text-muted) hover:text-(--accent-teal) hover:bg-[rgba(6,214,160,0.06)]',
                  )}
                >
                  {link.label}
                  {isActive && (
                    <m.div
                      layoutId="nav-indicator"
                      className="bg-linear-to-r from-accent-teal to-accent-cyan absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                      transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Auth buttons (desktop) */}
            <div className="hidden items-center gap-2 md:flex">
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="font-heading text-(--accent-teal) rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] px-4 py-2 text-sm font-semibold transition-all hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)] hover:shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-linear-to-r from-accent-teal to-day-accent-teal font-heading text-bio-deep rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              ref={hamburgerRef}
              className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--accent-teal) flex h-9 min-h-[44px] w-9 min-w-[44px] items-center justify-center rounded-xl border transition-colors md:hidden"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav-menu"
            >
              {isMobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu — full-screen overlay (outside <header> for proper stacking) */}
      <AnimatePresence>
        {isMobileOpen && (
          <m.div
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="z-60 bg-(--bg-deep) fixed inset-0 flex flex-col md:hidden"
          >
            {/* Overlay header row: brand + close button */}
            <div className="border-(--border-subtle) flex items-center justify-between border-b px-4 py-3">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="flex items-center gap-2 no-underline"
                aria-label="Mergenix home"
              >
                <Dna className="text-(--accent-teal) h-6 w-6" aria-hidden="true" />
                <span className="font-heading text-(--text-heading) text-xl font-extrabold tracking-[-0.03em]">
                  Mergenix
                </span>
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="border-(--border-subtle) bg-(--bg-elevated) text-(--text-muted) hover:text-(--accent-teal) focus-visible:outline-(--accent-teal) flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Nav links — centered, large touch targets */}
            <nav
              className="flex flex-1 flex-col items-center justify-center gap-2 px-6"
              aria-label="Mobile navigation links"
            >
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'font-heading block w-full max-w-xs rounded-2xl px-6 py-3 text-center text-lg font-semibold transition-all',
                      isActive
                        ? 'text-(--accent-teal) bg-[rgba(6,214,160,0.1)] ring-1 ring-[rgba(6,214,160,0.2)]'
                        : 'text-(--text-muted) hover:text-(--accent-teal) hover:bg-[rgba(6,214,160,0.06)]',
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <hr className="border-(--border-subtle) my-3 w-full max-w-xs" />

              {isAuthenticated ? (
                <div className="flex w-full max-w-xs flex-col gap-2">
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="font-heading text-(--text-muted) hover:text-(--accent-teal) block w-full rounded-2xl px-6 py-3 text-center text-lg font-semibold transition-all hover:bg-[rgba(6,214,160,0.06)]"
                  >
                    Account Settings
                  </Link>
                  <Link
                    href="/subscription"
                    onClick={closeMobileMenu}
                    className="font-heading text-(--text-muted) hover:text-(--accent-teal) block w-full rounded-2xl px-6 py-3 text-center text-lg font-semibold transition-all hover:bg-[rgba(6,214,160,0.06)]"
                  >
                    My Plan
                  </Link>
                </div>
              ) : (
                <div className="flex w-full max-w-xs flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="font-heading text-(--accent-teal) w-full rounded-2xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] py-3 text-center text-base font-semibold transition-all hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)] hover:shadow-sm"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className="bg-linear-to-r from-accent-teal to-day-accent-teal font-heading text-bio-deep w-full rounded-2xl py-3 text-center text-base font-semibold shadow-sm transition-all hover:shadow-md"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
