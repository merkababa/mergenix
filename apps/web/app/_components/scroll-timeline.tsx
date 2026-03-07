"use client";

import { useRef } from "react";
import { m, useTransform } from "motion/react";
import { Upload, Brain, HeartPulse } from "lucide-react";
import { ScrollReveal, useScrollProgress } from "@/components/ui/scroll-reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { StepCircle } from "@/components/marketing/step-circle";
import { CARRIER_PANEL_COUNT_DISPLAY, TRAIT_COUNT_DISPLAY } from "@mergenix/genetics-data";

// ---------------------------------------------------------------------------
// Mini SVG illustrations (defined before STEPS_CONFIG that references them)
// ---------------------------------------------------------------------------

function UploadIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      {/* File body */}
      <rect x="18" y="12" width="44" height="56" rx="6" fill="rgba(6,214,160,0.08)" stroke="rgba(6,214,160,0.25)" strokeWidth="1.5" />
      {/* File fold corner */}
      <path d="M50 12 L62 24" stroke="rgba(6,214,160,0.25)" strokeWidth="1.5" />
      <rect x="50" y="12" width="12" height="12" rx="2" fill="rgba(6,214,160,0.05)" />
      {/* Arrow up */}
      <path
        d="M40 54 L40 32 M32 40 L40 32 L48 40"
        stroke="var(--accent-teal)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DnaIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      {/* Double helix strands */}
      <path
        d="M24 14 C 24 22, 56 30, 56 40 C 56 50, 24 58, 24 66"
        stroke="var(--accent-violet)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M56 14 C 56 22, 24 30, 24 40 C 24 50, 56 58, 56 66"
        stroke="var(--accent-teal)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Rungs */}
      <line x1="30" y1="24" x2="50" y2="28" stroke="rgba(139,92,246,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="36" x2="54" y2="36" stroke="rgba(6,214,160,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="30" y1="48" x2="50" y2="52" stroke="rgba(139,92,246,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ReportIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      {/* Document */}
      <rect x="14" y="10" width="52" height="60" rx="6" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.25)" strokeWidth="1.5" />
      {/* Text lines */}
      <line x1="24" y1="28" x2="56" y2="28" stroke="rgba(6,182,212,0.35)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="36" x2="48" y2="36" stroke="rgba(6,182,212,0.25)" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="44" x2="52" y2="44" stroke="rgba(6,182,212,0.25)" strokeWidth="2" strokeLinecap="round" />
      {/* Checkmark circle */}
      <circle cx="52" cy="56" r="10" fill="rgba(6,214,160,0.15)" stroke="rgba(6,214,160,0.5)" strokeWidth="1.5" />
      <path
        d="M47 56 L51 60 L57 53"
        stroke="var(--accent-teal)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step data — references component functions (hoisted after definitions)
// ---------------------------------------------------------------------------

type StepIllustration = typeof UploadIllustration;

interface StepConfig {
  readonly number: number;
  readonly icon: typeof Upload;
  readonly title: string;
  readonly description: string;
  readonly Illustration: StepIllustration;
}

const STEPS_CONFIG: readonly StepConfig[] = [
  {
    number: 1,
    icon: Upload,
    title: "Upload DNA Files",
    description:
      "Drop your 23andMe, AncestryDNA, MyHeritage, or VCF files. We support all major formats.",
    Illustration: UploadIllustration,
  },
  {
    number: 2,
    icon: Brain,
    title: "Instant Analysis",
    description:
      `Our engine screens ${CARRIER_PANEL_COUNT_DISPLAY} diseases, predicts ${TRAIT_COUNT_DISPLAY} traits, and runs pharmacogenomic analysis in seconds.`,
    Illustration: DnaIllustration,
  },
  {
    number: 3,
    icon: HeartPulse,
    title: "Clear, Understandable Results",
    description:
      "Get clear, visual results with risk scores, Punnett squares, and genetic counselor referrals.",
    Illustration: ReportIllustration,
  },
];

// ---------------------------------------------------------------------------
// ScrollTimeline
// ---------------------------------------------------------------------------

export function ScrollTimeline() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScrollProgress(sectionRef);
  // useTransform called at top level — stable motion value, not recreated on render (idiomatic Motion)
  const lineScaleY = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);

  return (
    <section
      className="relative px-4 py-16 md:px-6 md:py-24"
      aria-label="How it works"
    >
      <div ref={sectionRef} className="relative mx-auto max-w-5xl">
        <SectionHeading
          title="How It Works"
          subtitle="Three simple steps to understand your family's genetic health"
          className="mb-16"
        />

        {/* Timeline container */}
        <div className="relative">
          {/* Vertical connecting line — desktop only */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 md:block"
            aria-hidden="true"
          >
            {/* Track line (faded) */}
            <div className="absolute inset-0 bg-(--border-subtle)" />
            {/* Animated fill line */}
            <m.div
              className="absolute inset-x-0 top-0 origin-top bg-(--accent-teal)"
              style={{ scaleY: lineScaleY, height: "100%" }}
            />
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-16 md:gap-20" role="list">
            {STEPS_CONFIG.map((step, i) => {
              const isEven = i % 2 === 0;
              const { Illustration } = step;
              return (
                <div
                  key={step.number}
                  role="listitem"
                  className="relative md:flex md:items-center md:gap-8"
                >
                  {/* Text area — alternates sides on desktop */}
                  <div
                    className={`md:w-1/2 ${isEven ? "md:pr-16 md:text-right" : "md:order-3 md:pl-16"}`}
                  >
                    <ScrollReveal
                      type="clip"
                      direction={isEven ? "right" : "left"}
                      delay={0.1}
                    >
                      <div className={`${isEven ? "md:ml-auto" : ""} max-w-xs`}>
                        <h3
                          className="mb-3 font-heading font-bold text-(--text-heading)"
                          style={{ fontSize: "var(--font-size-fluid-body)" }}
                        >
                          <span className="sr-only">Step {step.number}: </span>
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-(--text-muted)">
                          {step.description}
                        </p>
                      </div>
                    </ScrollReveal>
                  </div>

                  {/* Center node — timeline anchor */}
                  <div className="my-6 flex justify-center md:order-2 md:my-0 md:shrink-0">
                    <StepCircle step={step.number} size="lg" />
                  </div>

                  {/* Illustration — alternates sides on desktop */}
                  <ScrollReveal
                    type="clip"
                    direction={isEven ? "left" : "right"}
                    delay={0.2}
                    className={`md:w-1/2 ${isEven ? "md:order-3 md:pl-16" : "md:pr-16"}`}
                  >
                    <div
                      className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl"
                      style={{
                        background: "rgba(12,18,32,0.5)", /* --bg-surface (#0c1220) at 50% opacity */
                        border: "1px solid var(--border-subtle)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <Illustration />
                    </div>
                  </ScrollReveal>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
