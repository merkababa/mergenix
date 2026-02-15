"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { fadeUp, fadeIn, createStaggerContainer } from "@/lib/animation-variants";
import { SAMPLE_REPORT_DATA, SAMPLE_COUPLE } from "@/lib/data/sample-report-data";
import { RISK_LABELS, RISK_CATEGORY_LABELS } from "@/lib/genetics-constants";
import {
  AlertTriangle,
  Dna,
  FlaskConical,
  Pill,
  Activity,
  Stethoscope,
} from "lucide-react";

const gridStagger = createStaggerContainer(0.1);

// ─── Helpers ────────────────────────────────────────────────────────────────

function riskColor(riskLevel: string): string {
  switch (riskLevel) {
    case "high_risk":
      return "text-[var(--accent-rose)]";
    case "carrier_detected":
      return "text-[var(--accent-amber)]";
    default:
      return "text-[var(--accent-teal)]";
  }
}

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case "high":
      return "text-[var(--accent-rose)]";
    case "moderate":
      return "text-[var(--accent-amber)]";
    default:
      return "text-[var(--accent-teal)]";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Sample report page content — renders a full analysis report using
 * fictional data with no tier gating.
 */
export function SampleReportContent() {
  const data = SAMPLE_REPORT_DATA;

  return (
    <>
      {/* Heading */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl lg:text-5xl">
          Sample Report
        </h1>
        <p className="mx-auto mt-3 max-w-2xl font-body text-base text-[var(--text-muted)] md:text-lg">
          {`Fictional analysis for ${SAMPLE_COUPLE.parentA} & ${SAMPLE_COUPLE.parentB}`}
        </p>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <div
          role="alert"
          className="mb-10 flex items-start gap-3 rounded-xl border border-[rgba(6,182,212,0.2)] bg-[rgba(6,182,212,0.06)] p-4"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-cyan)]"
            aria-hidden="true"
          />
          <p className="text-xs font-medium leading-relaxed text-[var(--text-body)]">
            This is a sample report with fictional data for demonstration purposes
            only. No real genetic information is represented. Do not use this
            for any medical decisions.
          </p>
        </div>
      </motion.div>

      {/* ── Carrier Screening Section ── */}
      <section className="mt-8" aria-labelledby="carrier-heading">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            id="carrier-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[var(--text-heading)]"
          >
            <Dna className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
            Carrier Screening Results
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-3"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.carrier.map((result) => (
            <motion.div key={result.rsid} variants={fadeUp}>
              <GlassCard variant="subtle" hover="none" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                      {result.condition}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {result.gene} &middot; {result.inheritance.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase ${riskColor(result.riskLevel)}`}
                  >
                    {RISK_LABELS[result.riskLevel] ?? result.riskLevel}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Traits Section ── */}
      <section className="mt-16" aria-labelledby="traits-heading">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            id="traits-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[var(--text-heading)]"
          >
            <FlaskConical className="h-5 w-5 text-[var(--accent-violet)]" aria-hidden="true" />
            Trait Predictions
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {data.traits
            .filter((t) => t.status === "success")
            .map((trait) => (
              <motion.div key={trait.rsid} variants={fadeUp}>
                <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                    {trait.trait}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {trait.gene} &middot; {trait.confidence} confidence
                  </p>
                  <div className="mt-3 space-y-1">
                    {Object.entries(trait.offspringProbabilities).map(
                      ([phenotype, probability]) => (
                        <div
                          key={phenotype}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-[var(--text-body)]">{phenotype}</span>
                          <span className="font-mono font-semibold text-[var(--accent-violet)]">
                            {probability}%
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
        </motion.div>
      </section>

      {/* ── PGx Section ── */}
      <section className="mt-16" aria-labelledby="pgx-heading">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            id="pgx-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[var(--text-heading)]"
          >
            <Pill className="h-5 w-5 text-[var(--accent-cyan)]" aria-hidden="true" />
            Pharmacogenomics (PGx)
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {Object.values(data.pgx.results).map((gene) => (
            <motion.div key={gene.gene} variants={fadeUp}>
              <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                  {gene.gene}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Chr {gene.chromosome}
                </p>
                <div className="mt-3 space-y-2">
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">
                      {SAMPLE_COUPLE.parentA}:{" "}
                    </span>
                    <span className="font-mono font-semibold text-[var(--accent-cyan)]">
                      {gene.parentA.diplotype}
                    </span>
                    <span className="ml-1 text-[var(--text-dim)]">
                      ({gene.parentA.metabolizerStatus.status.replace(/_/g, " ")})
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[var(--text-muted)]">
                      {SAMPLE_COUPLE.parentB}:{" "}
                    </span>
                    <span className="font-mono font-semibold text-[var(--accent-cyan)]">
                      {gene.parentB.diplotype}
                    </span>
                    <span className="ml-1 text-[var(--text-dim)]">
                      ({gene.parentB.metabolizerStatus.status.replace(/_/g, " ")})
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── PRS Section ── */}
      <section className="mt-16" aria-labelledby="prs-heading">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            id="prs-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[var(--text-heading)]"
          >
            <Activity className="h-5 w-5 text-[var(--accent-amber)]" aria-hidden="true" />
            Polygenic Risk Scores (PRS)
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={gridStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {Object.values(data.prs.conditions).map((condition) => (
            <motion.div key={condition.name} variants={fadeUp}>
              <GlassCard variant="subtle" hover="glow" className="h-full p-5">
                <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                  {condition.name}
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      Offspring Percentile
                    </span>
                    <span className="font-mono font-semibold text-[var(--accent-amber)]">
                      {condition.offspring.expectedPercentile}th
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Range</span>
                    <span className="font-mono text-[var(--text-body)]">
                      {condition.offspring.rangeLow}th &ndash; {condition.offspring.rangeHigh}th
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      Risk Interpretation
                    </span>
                    <span className="font-semibold text-[var(--text-body)]">
                      {RISK_CATEGORY_LABELS[condition.parentA.riskCategory] ?? condition.parentA.riskCategory} /{" "}
                      {RISK_CATEGORY_LABELS[condition.parentB.riskCategory] ?? condition.parentB.riskCategory}
                    </span>
                  </div>
                  {condition.ancestryNote && (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      {condition.ancestryNote}
                    </p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Counseling Section ── */}
      <section className="mt-16" aria-labelledby="counseling-heading">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2
            id="counseling-heading"
            className="mb-6 flex items-center gap-2 font-heading text-xl font-bold text-[var(--text-heading)]"
          >
            <Stethoscope className="h-5 w-5 text-[var(--accent-rose)]" aria-hidden="true" />
            Genetic Counseling Recommendation
          </h2>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <GlassCard variant="subtle" hover="none" className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--text-heading)]">
                Urgency:
              </span>
              <span
                className={`text-sm font-bold uppercase ${urgencyColor(data.counseling.urgency)}`}
              >
                {data.counseling.urgency}
              </span>
            </div>

            <p className="mb-4 text-sm text-[var(--text-body)]">
              {data.counseling.summaryText}
            </p>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                Key Findings
              </h3>
              {data.counseling.keyFindings?.map((finding) => (
                <div
                  key={finding.condition}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] p-3"
                >
                  <div>
                    <span className="text-sm font-medium text-[var(--text-heading)]">
                      {finding.condition}
                    </span>
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {finding.gene}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase ${riskColor(finding.riskLevel)}`}
                  >
                    {RISK_LABELS[finding.riskLevel] ?? finding.riskLevel}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            If you have concerns about genetic conditions, speak with a certified genetic counselor.{" "}
            <a href="https://www.nsgc.org/findageneticcounselor" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--accent-teal)]">
              Find a counselor (NSGC)
            </a>
          </p>
        </motion.div>
      </section>

      {/* ── Call to Action ──────────────────────────────────────────── */}
      <section className="mt-16 mb-16 text-center">
        <GlassCard variant="medium" hover="glow" className="p-10">
          <h2 className="mb-3 font-heading text-2xl font-bold text-[var(--text-heading)]">
            Ready to Analyze Your Own DNA?
          </h2>
          <p className="mb-6 text-sm text-[var(--text-muted)]">
            Upload your raw DNA files from 23andMe, AncestryDNA, or MyHeritage and get your personalized genetic analysis.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-teal)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start Free Analysis
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-6 py-3 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent-teal)]"
            >
              View Pro Plans
            </a>
          </div>
        </GlassCard>
      </section>
    </>
  );
}
