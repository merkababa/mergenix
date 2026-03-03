"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Constants (hoisted outside component body — checklist §3) ───────────────

interface SectionLink {
  id: string;
  label: string;
  icon: string;
}

const SECTION_LINKS: SectionLink[] = [
  { id: "carrier-section", label: "Carrier Screening", icon: "🧬" },
  { id: "traits-section", label: "Trait Predictions", icon: "⚗️" },
  { id: "pgx-section", label: "Pharmacogenomics", icon: "💊" },
  { id: "prs-section", label: "Polygenic Risk", icon: "📊" },
  { id: "counseling-section", label: "Counseling", icon: "🏥" },
];

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Sticky sidebar navigation for the sample report page.
 *
 * Desktop: sticky `aside` with section links and scroll-spy active state.
 * Mobile: horizontal scrolling tab bar at the top of the content area.
 */
export function ReportSidebar() {
  const [activeSection, setActiveSection] = useState<string>(SECTION_LINKS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll-spy via Intersection Observer (guarded for SSR/jsdom environments)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      // Find the topmost visible section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) {
        setActiveSection(visible[0].target.id);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    });

    SECTION_LINKS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
        setActiveSection(id);
      }
    },
    [],
  );

  return (
    <>
      {/* Desktop sidebar — sticky aside */}
      <aside
        className="sticky top-24 hidden w-48 shrink-0 lg:block"
        aria-label="Report section navigation"
      >
        <nav>
          <ul className="space-y-1" role="list">
            {SECTION_LINKS.map(({ id, label, icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => handleNavClick(e, id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                    activeSection === id
                      ? "bg-[rgba(6,214,160,0.12)] text-[var(--accent-teal)]"
                      : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--text-body)]",
                  )}
                  aria-current={activeSection === id ? "location" : undefined}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Mobile horizontal tab bar — sticky at top */}
      <nav
        className="sticky top-0 z-30 -mx-4 mb-6 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 pb-2 pt-2 lg:hidden"
        aria-label="Report sections"
      >
        <ul className="flex gap-1 whitespace-nowrap" role="list">
          {SECTION_LINKS.map(({ id, label, icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => handleNavClick(e, id)}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                  activeSection === id
                    ? "bg-[rgba(6,214,160,0.12)] text-[var(--accent-teal)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)]",
                )}
                aria-current={activeSection === id ? "location" : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
