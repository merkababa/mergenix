"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { m, AnimatePresence } from "motion/react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="relative h-8 w-14 min-h-[44px] rounded-full border border-(--border-subtle) bg-(--bg-elevated)"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex h-8 w-14 min-h-[44px] items-center rounded-full border border-(--border-subtle) bg-(--bg-elevated) p-1 transition-all hover:border-[rgba(6,214,160,0.3)] hover:shadow-[0_0_12px_var(--glow-teal)]"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      role="switch"
      aria-checked={isDark}
    >
      {/* Track icons */}
      <Moon className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-(--text-dim)" aria-hidden="true" />
      <Sun className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-(--text-dim)" aria-hidden="true" />

      {/* Thumb */}
      <m.div
        layout
        transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
        className="flex h-5 w-5 items-center justify-center rounded-full shadow-lg"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #06d6a0, #059669)"
            : "linear-gradient(135deg, #f59e0b, #d97706)",
          boxShadow: isDark
            ? "0 2px 8px rgba(6, 214, 160, 0.4)"
            : "0 2px 8px rgba(245, 158, 11, 0.4)",
          marginLeft: isDark ? "0px" : "auto",
        }}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <m.div
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="h-2.5 w-2.5 text-bio-deep" />
            </m.div>
          ) : (
            <m.div
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="h-2.5 w-2.5 text-bio-deep" />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </button>
  );
}
