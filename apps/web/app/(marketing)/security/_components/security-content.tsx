"use client";

import { useState } from "react";
import {
  Shield,
  Lock,
  EyeOff,
  Server,
  ChevronDown,
  Cpu,
  Globe,
  KeyRound,
  ShieldCheck,
  HardDrive,
  Workflow,
  XCircle,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

// ── Data ────────────────────────────────────────────────────────────────

const DATA_FLOW_STEPS = [
  {
    icon: HardDrive,
    title: "Upload DNA files",
    description:
      "You select your raw DNA files from 23andMe, AncestryDNA, MyHeritage, or VCF format. Files are read directly into browser memory.",
  },
  {
    icon: Workflow,
    title: "Web Worker parses",
    description:
      "A dedicated background thread parses your genetic data entirely within your browser. No data is sent to any server.",
  },
  {
    icon: Cpu,
    title: "Analysis runs client-side",
    description:
      "Carrier screening, trait prediction, and risk scoring all execute in your browser using our genetics engine. Results never leave your device.",
  },
] as const;

const PRIVACY_PROMISES = [
  {
    icon: EyeOff,
    text: "We never see your DNA data",
  },
  {
    icon: Server,
    text: "No server-side genetic processing",
  },
  {
    icon: XCircle,
    text: "No data selling or sharing",
  },
  {
    icon: Lock,
    text: "You control deletion",
  },
  {
    icon: ShieldCheck,
    text: "Open-source genetics engine for full transparency",
  },
  {
    icon: Globe,
    text: "GDPR, GINA, and HIPAA-aware by design",
  },
] as const;

const FAQ_ITEMS = [
  {
    question: "Can you see my DNA data?",
    answer:
      "No. All genetic processing happens in your browser using dedicated background threads. Your raw DNA files are never uploaded to our servers. We architecturally cannot access your genetic data.",
  },
  {
    question: "What data do you store on your servers?",
    answer:
      "We store only your account information (email, tier status) and encrypted analysis result summaries if you choose to save them. Raw genetic data is never stored server-side.",
  },
  {
    question: "How are saved results protected?",
    answer:
      "Client-side AES-256-GCM encryption with Argon2id key derivation is planned for a future release. Until that feature is live, saved analysis results are protected using standard server-side encryption in transit and at rest.",
  },
  {
    question: "Can I delete all my data?",
    answer:
      "Yes. You can delete your account and all associated data at any time from your account settings. Deletion is immediate and irreversible. Since we never store raw DNA files, there is nothing to delete on that front.",
  },
  {
    question: "Is Mergenix HIPAA compliant?",
    answer:
      "Mergenix is HIPAA-aware in its design principles, meaning we follow data minimization and security best practices aligned with HIPAA standards. However, as a consumer genetics tool (not a covered entity), formal HIPAA certification is not applicable.",
  },
] as const;

const COMPLIANCE_BADGES = [
  { label: "GDPR", description: "EU General Data Protection Regulation" },
  { label: "GINA", description: "Genetic Information Nondiscrimination Act" },
  { label: "HIPAA-aware", description: "Health Insurance Portability and Accountability Act aligned" },
] as const;

// ── Component ───────────────────────────────────────────────────────────

export function SecurityContent() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        title="Your Genetic Data Never Leaves Your Browser"
        subtitle="Built on a privacy-first foundation where your DNA stays on your device. Always."
        breadcrumbs={[{ label: "Security", href: "/security" }]}
      />

      {/* ── Zero-Knowledge Architecture ──────────────────────────────── */}
      <section className="mt-16" aria-labelledby="zero-knowledge-heading">
        <ScrollReveal>
          <SectionHeading
            id="zero-knowledge-heading"
            title="Zero-Knowledge Architecture"
            subtitle="Our system is designed so we never have access to your genetic data"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                <Shield className="h-6 w-6 text-[var(--accent-teal)]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="mb-2 font-heading text-lg font-semibold text-[var(--text-heading)]">
                  Client-Side Only Processing
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  Your genetic data is parsed and analyzed entirely within a dedicated
                  background thread in your browser. This means your DNA data never touches
                  our servers, is never transmitted over the network, and is never accessible
                  to our team.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Data Flow ─────────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="data-flow-heading">
        <ScrollReveal>
          <SectionHeading
            id="data-flow-heading"
            title="How Your Data Flows"
            subtitle="A step-by-step look at how your genetic data is processed"
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {DATA_FLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={step.title}>
                <GlassCard variant="medium" hover="glow" className="h-full p-7">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(6,214,160,0.1)] text-sm font-bold text-[var(--accent-teal)]">
                    {index + 1}
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                    <h3 className="font-heading text-base font-semibold text-[var(--text-heading)]">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    {step.description}
                  </p>
                </GlassCard>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* ── Encryption ────────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="encryption-heading">
        <ScrollReveal>
          <SectionHeading
            id="encryption-heading"
            title="Encryption (Coming Soon)"
            subtitle="Planned client-side cryptography for any data you choose to save"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
                  <KeyRound className="h-6 w-6 text-[var(--accent-violet)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                    AES-256-GCM — Planned
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    We plan to protect saved analysis results using AES-256-GCM
                    client-side encryption — the same standard used by governments
                    and financial institutions worldwide. This feature is not yet
                    active and is planned for a future release.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(6,182,212,0.1)]">
                  <Lock className="h-6 w-6 text-[var(--accent-cyan)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                    Argon2id Key Derivation — Planned
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    When client-side encryption launches, cryptographic keys will be
                    derived from your password using Argon2id, a memory-hard key
                    derivation function that resists brute-force and side-channel
                    attacks. Your password will never be stored.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Privacy Promises ──────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="privacy-promises-heading">
        <ScrollReveal>
          <SectionHeading
            id="privacy-promises-heading"
            title="Our Privacy Promises"
            subtitle="Concrete commitments we make to every user"
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRIVACY_PROMISES.map((promise) => {
            const Icon = promise.icon;
            return (
              <ScrollReveal key={promise.text}>
                <GlassCard variant="subtle" hover="glow" className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                      <Icon className="h-4 w-4 text-[var(--accent-teal)]" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium text-[var(--text-heading)]">
                      {promise.text}
                    </p>
                  </div>
                </GlassCard>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="faq-heading">
        <ScrollReveal>
          <SectionHeading
            id="faq-heading"
            title="Security FAQ"
            subtitle="Common questions about how we protect your data"
          />
        </ScrollReveal>

        <div className="mt-8 space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <ScrollReveal key={item.question}>
              <GlassCard variant="subtle" hover="none" className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                  aria-expanded={expandedFaq === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="pr-4 font-heading text-sm font-semibold text-[var(--text-heading)]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {expandedFaq === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="border-t border-[var(--border-subtle)] px-6 py-4"
                  >
                    <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {item.answer}
                    </p>
                  </div>
                )}
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Compliance Badges ─────────────────────────────────────────── */}
      <section className="mt-16 mb-16" aria-labelledby="compliance-heading">
        <ScrollReveal>
          <SectionHeading
            id="compliance-heading"
            title="Compliance"
            subtitle="Standards and regulations we align with"
          />
        </ScrollReveal>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {COMPLIANCE_BADGES.map((badge) => (
            <ScrollReveal key={badge.label}>
              <GlassCard variant="medium" hover="glow" className="px-6 py-4 text-center">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                  <span className="font-heading text-sm font-bold text-[var(--text-heading)]">
                    {badge.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {badge.description}
                </p>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  );
}
