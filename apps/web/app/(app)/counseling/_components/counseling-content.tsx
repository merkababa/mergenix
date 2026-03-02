"use client";

import { Heart, Shield, ExternalLink, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NSGC_DIRECTORY_URL = "https://findageneticcounselor.nsgc.org";

export function CounselingContent() {
  return (
    <>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(6,214,160,0.1)]">
          <Heart aria-hidden="true" className="h-7 w-7 text-[var(--accent-teal)]" />
        </div>
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Find a Genetic Counselor
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[var(--text-muted)]">
          Connect with board-certified genetic counselors who can help you understand your results
        </p>
      </div>

      {/* ── Info banner ── */}
      <GlassCard
        variant="medium"
        hover="none"
        className="mb-8 flex items-start gap-4 border-[rgba(6,214,160,0.15)] p-6"
      >
        <Shield aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-teal)]" />
        <div>
          <p className="text-sm leading-relaxed text-[var(--text-body)]">
            Genetic counselors are healthcare professionals trained to help individuals and
            families understand and adapt to the medical, psychological, and familial implications
            of genetic contributions to disease. Meeting with one is a routine part of family planning.
          </p>
        </div>
      </GlassCard>

      {/* ── NSGC CTA Card ── */}
      <GlassCard
        variant="medium"
        hover="glow"
        className="mb-8 bg-[var(--bg-elevated)] border-[var(--border-subtle)] rounded-[20px] p-8"
      >
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#06d6a0] to-[#06b6d4] shadow-[0_4px_16px_rgba(6,214,160,0.3)]">
            <ExternalLink aria-hidden="true" className="h-8 w-8 text-[#050810]" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-[var(--text-heading)]">
              Find a Certified Genetic Counselor Near You
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              The National Society of Genetic Counselors (NSGC) maintains the largest directory of
              board-certified genetic counselors in the United States. Search by location, specialty,
              insurance, and telehealth availability to find a counselor that fits your needs.
            </p>
            <ul className="mt-3 space-y-1 text-left text-xs text-[var(--text-dim)]">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent-teal)]" />
                Search by prenatal, pediatric, cancer, cardiovascular, and more specialties
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent-teal)]" />
                Filter for telehealth / virtual appointments
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent-teal)]" />
                All counselors are NSGC board-certified professionals
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
          <a
            href={NSGC_DIRECTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open NSGC genetic counselor directory in a new tab"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            Search the NSGC Directory
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-dim)]">
          You will be redirected to{" "}
          <span className="font-mono">findageneticcounselor.nsgc.org</span>
          {" "}— an official NSGC resource operated independently of Mergenix.
        </p>
      </GlassCard>

      {/* ── Why genetic counseling matters ── */}
      <GlassCard variant="subtle" hover="none" className="p-6">
        <h2 className="font-heading text-base font-bold text-[var(--text-heading)]">
          Why See a Genetic Counselor?
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Understand Your Results</p>
            <p className="text-xs text-[var(--text-muted)]">
              A counselor helps you interpret probabilistic genetic findings in the context of your
              family history and personal health goals.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Family Planning</p>
            <p className="text-xs text-[var(--text-muted)]">
              Carrier screening results are most meaningful when discussed with a professional who
              can explain reproductive options and risk estimates.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Emotional Support</p>
            <p className="text-xs text-[var(--text-muted)]">
              Genetic counselors are trained to address the psychological impact of genetic information
              and provide coping strategies.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Clinical Follow-Up</p>
            <p className="text-xs text-[var(--text-muted)]">
              They can coordinate referrals to specialists and help you navigate insurance coverage
              for confirmatory genetic testing.
            </p>
          </div>
        </div>
      </GlassCard>
    </>
  );
}
