"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, CreditCard, Activity, LogOut, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getInitials, getTierVariant } from "@/lib/account-utils";

const MENU_LINKS = [
  { href: "/account", label: "Account Settings", icon: User },
  { href: "/subscription", label: "My Plan", icon: CreditCard },
  { href: "/analysis", label: "Analysis", icon: Activity },
] as const;

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const initials = getInitials(user?.name ?? "U");

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleLogout = useCallback(async () => {
    setIsOpen(false);
    await logout();
  }, [logout]);

  return (
    <div className="relative">
      {/* Avatar trigger */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-[rgba(6,214,160,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-cyan)]">
          <span className="font-heading text-xs font-bold text-[var(--bg-deep)]">
            {initials}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--text-dim)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-glass)] shadow-[0_12px_40px_var(--shadow-elevated)] before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-[var(--accent-teal)] before:to-[var(--accent-cyan)] before:opacity-60"
            style={{
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
            aria-label="User menu"
          >
            {/* User info header */}
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="font-heading text-sm font-semibold text-[var(--text-heading)]">
                {user?.name ?? "User"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {user?.email ?? ""}
              </p>
              {user?.tier && (
                <Badge
                  variant={getTierVariant(user.tier)}
                  className="mt-2"
                >
                  {user.tier.charAt(0).toUpperCase() + user.tier.slice(1)}
                </Badge>
              )}
            </div>

            {/* Menu links */}
            <div className="py-1.5">
              {MENU_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                >
                  <link.icon className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <div className="border-t border-[var(--border-subtle)] py-1.5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[rgba(244,63,94,0.06)] hover:text-[var(--accent-rose)]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
