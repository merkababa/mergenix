"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Dna } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/analysis", label: "Analysis" },
  { href: "/diseases", label: "Disease Catalog" },
  { href: "/products", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Navbar() {
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
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
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
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key !== "Tab") return;

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

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-[var(--border-subtle)] bg-[var(--navbar-bg)] shadow-[0_4px_30px_var(--shadow-ambient)]"
          : "bg-transparent",
      )}
      style={{
        backdropFilter: isScrolled ? "blur(20px)" : "blur(0px)",
        WebkitBackdropFilter: isScrolled ? "blur(20px)" : "blur(0px)",
      }}
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 no-underline"
          aria-label="Mergenix home"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[var(--accent-teal)] opacity-20 blur-md" />
            <Dna className="relative h-7 w-7 text-[var(--accent-teal)]" aria-hidden="true" />
          </div>
          <span className="gradient-text-teal font-heading text-xl font-extrabold tracking-tight">
            Mergenix
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-xl px-4 py-2 font-heading text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[rgba(6,214,160,0.1)] text-[var(--accent-teal)] ring-1 ring-[rgba(6,214,160,0.2)]"
                    : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]",
                )}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-[#06d6a0] to-[#06b6d4]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
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
                  className="rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] px-4 py-2 font-heading text-sm font-semibold text-[var(--accent-teal)] transition-all hover:border-[rgba(6,214,160,0.4)] hover:bg-[rgba(6,214,160,0.15)] hover:shadow-[0_0_15px_rgba(6,214,160,0.1)]"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-gradient-to-r from-[#06d6a0] to-[#059669] px-4 py-2 font-heading text-sm font-semibold text-[#050810] shadow-[0_2px_16px_rgba(6,214,160,0.3)] transition-all hover:shadow-[0_4px_24px_rgba(6,214,160,0.5)] hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)] md:hidden"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--navbar-bg)] md:hidden"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div className="space-y-1 px-4 py-4">
              {/* Close button (first focusable element for accessibility) */}
              <button
                type="button"
                onClick={closeMobileMenu}
                className="mb-2 flex w-full items-center justify-end gap-1.5 rounded-xl px-4 py-2 font-heading text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent-teal)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent-teal)]"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Close</span>
              </button>
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "block rounded-xl px-4 py-3 font-heading text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[rgba(6,214,160,0.1)] text-[var(--accent-teal)] ring-1 ring-[rgba(6,214,160,0.2)]"
                        : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <hr className="my-3 border-[var(--border-subtle)]" />

              {isAuthenticated ? (
                <div className="space-y-1">
                  <Link
                    href="/account"
                    className="block rounded-xl px-4 py-3 font-heading text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                  >
                    Account Settings
                  </Link>
                  <Link
                    href="/subscription"
                    className="block rounded-xl px-4 py-3 font-heading text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                  >
                    My Plan
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="flex-1 rounded-xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.08)] py-2.5 text-center font-heading text-sm font-semibold text-[var(--accent-teal)]"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#06d6a0] to-[#059669] py-2.5 text-center font-heading text-sm font-semibold text-[#050810]"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
