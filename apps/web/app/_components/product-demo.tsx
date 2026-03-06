"use client";

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { ScrollReveal, useScrollProgress } from "@/components/ui/scroll-reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

// ---------------------------------------------------------------------------
// Constants (hoisted — §3 of executor checklist)
// ---------------------------------------------------------------------------

/** Shared inline style for the three mock dashboard panels (§8 — no repeated literals). */
const PANEL_STYLE = {
  // --bg-surface (#0c1220) at 60% opacity
  background: "rgba(12,18,32,0.6)",
  border: "1px solid var(--border-subtle)",
} as const;

/** Mock carrier risk bar data — fictional sample values, not real patient data. */
const MOCK_CARRIER_RISKS = [
  { label: "Cystic Fibrosis", pct: 4, color: "var(--accent-teal)" },
  { label: "Sickle Cell", pct: 8, color: "var(--accent-violet)" },
  { label: "Fragile X", pct: 2, color: "var(--accent-cyan)" },
] as const;

/** Mock trait prediction data — fictional sample values, not real patient data. */
const MOCK_TRAIT_PREDICTIONS = [
  { label: "Eye Color", value: "Blue / Green", color: "var(--accent-cyan)" },
  { label: "Hair Type", value: "Wavy (likely)", color: "var(--accent-violet)" },
  { label: "Blood Type", value: "A or O", color: "var(--accent-rose)" },
] as const;

// ---------------------------------------------------------------------------
// ProductDemo
// ---------------------------------------------------------------------------

export function ProductDemo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScrollProgress(sectionRef);

  // Floating overlay card slides in from right as section scrolls
  const overlayX = useTransform(scrollYProgress, [0.2, 0.55], [60, 0]);
  const overlayOpacity = useTransform(scrollYProgress, [0.2, 0.55], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-16 md:px-6 md:py-24"
      aria-label="Product demonstration"
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/3 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: "var(--zone-pricing-color)" }}
        />
        <div
          className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full blur-[100px]"
          style={{ background: "var(--zone-hero-color)" }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <SectionHeading
          title="See Your Results Come to Life"
          subtitle="A clear, visual analysis dashboard built for families — not just scientists."
          className="mb-12"
        />

        {/* Browser mockup wrapper */}
        <ScrollReveal type="scale" duration={0.7}>
          <div
            className="relative mx-auto max-w-3xl"
            style={{
              filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.5))",
            }}
          >
            {/* Perspective wrapper — desktop only; flat on mobile */}
            <div
              className="rounded-2xl md:perspective-distant"
            >
              <div
                className="overflow-hidden rounded-2xl md:transform-[rotateY(-5deg)] md:transform-3d"
                style={{
                  border: "1px solid var(--glass-border)",
                  background: "var(--bg-glass)",
                  backdropFilter: "blur(var(--glass-blur))",
                }}
              >
                {/* Browser chrome bar */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ background: "rgba(12,18,32,0.9)", borderBottom: "1px solid var(--border-subtle)" }} /* --bg-surface (#0c1220) at 90% opacity */
                  aria-hidden="true"
                >
                  {/* Window control dots */}
                  <span className="h-3 w-3 rounded-full bg-(--accent-rose) opacity-70" />
                  <span className="h-3 w-3 rounded-full bg-(--accent-amber) opacity-70" />
                  <span className="h-3 w-3 rounded-full bg-(--accent-teal) opacity-70" />
                  {/* URL bar */}
                  <div
                    className="mx-auto flex h-6 w-48 items-center justify-center rounded-full px-3"
                    style={{ background: "rgba(148,163,184,0.06)", border: "1px solid var(--border-subtle)" }}
                  >
                    {/* text-xs = 12px minimum (§4 — no text smaller than 12px) */}
                    <span className="text-xs text-(--text-dim)">mergenix.app/analysis</span>
                  </div>
                </div>

                {/* Mock dashboard content */}
                <div className="relative p-5 md:p-7" role="region" aria-label="Sample analysis dashboard">
                  <span className="sr-only">Illustrative example of analysis results. Values shown are fictional sample data.</span>
                  {/* "Sample Data" badge — makes clear these are fictional values (§3 of fix list) */}
                  <span
                    className="absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(148,163,184,0.12)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      color: "var(--text-dim)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    Sample Data
                  </span>

                  {/* Dashboard header row */}
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="h-4 w-36 rounded-full bg-(--bg-elevated)" aria-hidden="true" />
                      <div className="mt-2 h-3 w-24 rounded-full bg-(--border-subtle)" aria-hidden="true" />
                    </div>
                    <div
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-(--accent-teal)"
                      style={{ background: "rgba(6,214,160,0.12)", border: "1px solid rgba(6,214,160,0.2)" }}
                    >
                      Analysis Complete
                    </div>
                  </div>

                  {/* Two-column mock layout */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Carrier risk panel */}
                    <div className="rounded-xl p-4" style={PANEL_STYLE}>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-(--text-dim)">
                        Est. Carrier Risk
                      </p>
                      {/* Mock bars — values are sample data only, not real patient results */}
                      {MOCK_CARRIER_RISKS.map((item) => (
                        <div key={item.label} className="mb-2">
                          <div className="mb-1 flex justify-between">
                            {/* text-xs = 12px minimum (§4 — no sub-12px text) */}
                            <span className="text-xs text-(--text-muted)">{item.label}</span>
                            <span className="text-xs font-medium" style={{ color: item.color }}>
                              {item.pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--border-subtle)">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${item.pct}%`, background: item.color }}
                              role="progressbar"
                              aria-valuenow={item.pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${item.label}: ${item.pct}%`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Traits panel */}
                    <div className="rounded-xl p-4" style={PANEL_STYLE}>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-(--text-dim)">
                        Trait Predictions
                      </p>
                      {/* Mock trait items — values are sample data only, not real patient results */}
                      {MOCK_TRAIT_PREDICTIONS.map((trait) => (
                        <div
                          key={trait.label}
                          className="mb-2 flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: "rgba(148,163,184,0.04)" }}
                        >
                          {/* text-xs = 12px minimum (§4 — no sub-12px text) */}
                          <span className="text-xs text-(--text-muted)">{trait.label}</span>
                          <span className="text-xs font-semibold" style={{ color: trait.color }}>
                            {trait.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating status overlay card — slides in from right on scroll */}
            <m.div
              style={{ x: overlayX, opacity: overlayOpacity }}
              className="absolute -right-4 bottom-12 hidden sm:block"
              aria-hidden="true"
            >
              <div
                className="rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: "rgba(6,214,160,0.15)",
                  border: "1px solid rgba(6,214,160,0.3)",
                  backdropFilter: "blur(12px)",
                  color: "var(--accent-teal)",
                  boxShadow: "0 8px 32px rgba(6,214,160,0.15)",
                }}
              >
                <span className="mr-1.5">✓</span>
                Carrier Status: Likely Clear
              </div>
            </m.div>

            {/* Subtle reflection beneath mockup */}
            <div
              className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: "rgba(6,214,160,0.08)" }}
              aria-hidden="true"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
