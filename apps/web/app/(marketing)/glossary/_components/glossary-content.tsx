"use client";

import { useState, useMemo, useCallback, useRef, useEffect, type ReactNode } from "react";
import { Search, BookOpen } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { GLOSSARY_TERMS, RELATED_TERMS } from "@/lib/glossary-data";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* -- Search-match highlighter -- */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRegex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(splitRegex);
  const queryLower = query.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase().includes(queryLower) ? (
      <mark
        key={i}
        className="bg-[rgba(6,214,160,0.2)] text-[var(--accent-teal)] rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function GlossaryContent() {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [flashTerm, setFlashTerm] = useState<string | null>(null);
  const termRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const filtered = useMemo(() => {
    return GLOSSARY_TERMS.filter((t) => {
      const matchesSearch =
        !search ||
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase());
      const matchesLetter =
        !activeLetter || t.term[0].toUpperCase() === activeLetter;
      return matchesSearch && matchesLetter;
    });
  }, [search, activeLetter]);

  /* Which letters actually have terms */
  const activeLetters = useMemo(() => {
    return new Set(GLOSSARY_TERMS.map((t) => t.term[0].toUpperCase()));
  }, []);

  /* Clean up any pending rAF / timeout on unmount */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  /* Navigate to a related term */
  const scrollToTerm = useCallback((termName: string) => {
    /* Clear filters so the card is visible */
    setSearch("");
    setActiveLetter(null);

    /* Cancel any in-flight rAF / timeout from a previous call */
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

    /* Wait for React to re-render with cleared filters before scrolling */
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = termRefs.current[termName];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashTerm(termName);
        flashTimeoutRef.current = setTimeout(() => {
          setFlashTerm(null);
          flashTimeoutRef.current = null;
        }, 1200);
      }
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* -- Header -- */}
      <PageHeader
        title="Genetic Glossary"
        subtitle="Understand the genetic terms used throughout Mergenix"
        breadcrumbs={[{ label: "Glossary", href: "/glossary" }]}
        className="mb-8"
      />

      <ScrollReveal>
      {/* -- Search -- */}
      <div className="mb-6">
        <Input
          placeholder="Search terms or definitions..."
          icon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveLetter(null);
          }}
          aria-label="Search glossary terms"
        />
      </div>

      {/* -- Results count -- */}
      <p className="mb-4 text-center text-xs text-[var(--text-dim)]" role="status" aria-live="polite">
        Showing {filtered.length} of {GLOSSARY_TERMS.length} terms
      </p>

      {/* -- Alphabet navigation -- */}
      <div className="mb-8 flex flex-wrap justify-center gap-1" role="navigation" aria-label="Browse by letter">
        <button
          onClick={() => setActiveLetter(null)}
          aria-label="Show all terms"
          aria-pressed={!activeLetter}
          className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2.5 font-heading text-xs font-medium transition-all ${
            !activeLetter
              ? "bg-[rgba(6,214,160,0.15)] text-[var(--accent-teal)]"
              : "text-[var(--text-dim)] hover:text-[var(--accent-teal)]"
          }`}
        >
          All
        </button>
        {ALPHABET.map((letter) => {
          const hasTerms = activeLetters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => hasTerms && setActiveLetter(letter === activeLetter ? null : letter)}
              disabled={!hasTerms}
              aria-label={`Filter by letter ${letter}`}
              aria-pressed={activeLetter === letter}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-2 font-heading text-xs font-medium transition-all ${
                activeLetter === letter
                  ? "bg-[rgba(6,214,160,0.15)] text-[var(--accent-teal)]"
                  : hasTerms
                    ? "text-[var(--text-muted)] hover:text-[var(--accent-teal)]"
                    : "cursor-not-allowed text-[var(--text-dim)] opacity-30"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* -- Section heading for a11y: bridges h1 → h3 in term cards -- */}
      <SectionHeading
        title="Glossary Terms"
        className="sr-only"
        id="glossary-terms-heading"
      />

      {/* -- Terms -- */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <m.div
              key="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 text-center"
            >
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-[var(--text-dim)] opacity-50" aria-hidden="true" />
              <h3 className="font-heading text-lg font-semibold text-[var(--text-heading)]">
                No terms found
              </h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Try a different search term or browse by letter
              </p>
            </m.div>
          ) : (
            filtered.map((term, index) => {
              const related = RELATED_TERMS[term.term];
              /* Only show related terms that actually exist in the glossary */
              const validRelated = related?.filter((r) =>
                GLOSSARY_TERMS.some((t) => t.term === r),
              );

              return (
                <m.div
                  key={term.term}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  ref={(el) => {
                    termRefs.current[term.term] = el;
                  }}
                >
                  <GlassCard
                    variant="subtle"
                    hover="glow"
                    className={`p-5 transition-all duration-500 ${
                      flashTerm === term.term
                        ? "ring-2 ring-[var(--accent-teal)] ring-offset-2 ring-offset-transparent"
                        : ""
                    }`}
                  >
                    <h3 className="mb-1.5 font-heading text-base font-semibold text-[var(--text-heading)]">
                      {highlightMatch(term.term, search)}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {highlightMatch(term.definition, search)}
                    </p>

                    {/* -- See also (related terms) -- */}
                    {validRelated && validRelated.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-[var(--text-dim)]">
                          See also:
                        </span>
                        {validRelated.map((related) => (
                          <button
                            key={related}
                            onClick={() => scrollToTerm(related)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[rgba(6,214,160,0.06)] px-3 py-2.5 text-xs text-[var(--accent-teal)] transition-colors hover:bg-[rgba(6,214,160,0.15)]"
                          >
                            {related}
                          </button>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </m.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--text-dim)]">
        {GLOSSARY_TERMS.length} terms available. Sourced from glossary.json.
      </p>
      </ScrollReveal>
    </div>
  );
}
