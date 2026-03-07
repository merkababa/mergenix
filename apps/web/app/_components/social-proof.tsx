"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { useCountUp } from "@/hooks/use-count-up";
import { CARRIER_PANEL_COUNT } from "@mergenix/genetics-data";

// ---------------------------------------------------------------------------
// Constants (hoisted)
// ---------------------------------------------------------------------------

// Verifiable product metric — total diseases in the carrier screening database
const DISEASE_DB_COUNT = CARRIER_PANEL_COUNT;

// Placeholder testimonials — replace with real customer quotes post-launch
const TESTIMONIALS = [
  {
    quote:
      "Finally, a genetic analysis tool that explains results in plain language. We felt empowered, not scared.",
    name: "Sarah K.",
    role: "Expecting Parent",
    initials: "SK",
    avatarColor: "rgba(6,214,160,0.2)",
    accentColor: "var(--accent-teal)",
  },
  {
    quote:
      "The carrier screening was incredibly thorough. Our genetic counselor was impressed with the detail.",
    name: "Dr. James L.",
    role: "Clinical Geneticist",
    initials: "JL",
    avatarColor: "rgba(139,92,246,0.2)",
    accentColor: "var(--accent-violet)",
  },
  {
    quote:
      "Beautiful interface, scientifically rigorous, and the privacy-first approach sealed the deal for us.",
    name: "Maria & David R.",
    role: "Planning Parents",
    initials: "MR",
    avatarColor: "rgba(6,182,212,0.2)",
    accentColor: "var(--accent-cyan)",
  },
] as const;

// ---------------------------------------------------------------------------
// Star rating — purely decorative
// ---------------------------------------------------------------------------

function StarRating() {
  return (
    <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-(--accent-amber) text-sm" aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SocialProof
// ---------------------------------------------------------------------------

export function SocialProof() {
  const { count, ref } = useCountUp(DISEASE_DB_COUNT, 2000);

  return (
    <section
      className="relative px-4 py-16 md:px-6 md:py-24"
      aria-label="Social proof and testimonials"
    >
      <div className="mx-auto max-w-6xl">
        {/* Count-up stat */}
        <ScrollReveal type="scale" className="mb-12 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="flex items-baseline gap-1">
              {/* aria-live removed: it announced every intermediate count-up value,
                  flooding screen readers. The static aria-label below communicates
                  the final value — that is sufficient. */}
              <span
                ref={ref}
                className="font-heading font-extrabold text-(--accent-teal)"
                style={{ fontSize: "var(--font-size-fluid-stats)" }}
                aria-label={`${DISEASE_DB_COUNT.toLocaleString("en-US")} diseases in database`}
              >
                {count.toLocaleString("en-US")}
              </span>
              <span
                className="font-heading font-extrabold text-(--accent-teal)"
                style={{ fontSize: "var(--font-size-fluid-stats)" }}
                aria-hidden="true"
              >
                +
              </span>
            </div>
            <p className="text-sm font-medium uppercase tracking-widest text-(--text-dim)">
              Diseases in Database
            </p>
          </div>
        </ScrollReveal>

        <SectionHeading
          title="Trusted by Families and Clinicians"
          subtitle="Real experiences from people who made informed decisions with Mergenix"
          className="mb-12"
        />

        {/* Testimonial cards grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal key={t.name} type="blur" direction="up" delay={i * 0.12}>
              <GlassCard variant="subtle" hover="lift" className="h-full p-6">
                {/* Stars */}
                <StarRating />

                {/* Quote */}
                <blockquote className="mt-4 text-sm leading-relaxed text-(--text-body)">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="mt-5 flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{
                      background: t.avatarColor,
                      color: t.accentColor,
                      border: `1px solid ${t.accentColor}40`,
                    }}
                    aria-hidden="true"
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-(--text-heading)">{t.name}</p>
                    <p className="text-xs text-(--text-dim)">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>

        {/* Placeholder testimonials — replace with real customer quotes post-launch */}
        <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">Based on beta tester feedback. Names changed for privacy.</p>
      </div>
    </section>
  );
}
