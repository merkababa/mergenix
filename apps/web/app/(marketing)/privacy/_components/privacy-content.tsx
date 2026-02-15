"use client";

import {
  Shield,
  Lock,
  FileText,
  Scale,
  Mail,
  Clock,
  UserCheck,
  Database,
  Check,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

// ── Data ────────────────────────────────────────────────────────────────

const DATA_CATEGORIES = [
  {
    icon: UserCheck,
    category: "Account info",
    description:
      "Email address, display name, and authentication credentials (hashed).",
  },
  {
    icon: Database,
    category: "Payment info",
    description:
      "Payment method details processed by our payment provider. We do not store full card numbers.",
  },
  {
    icon: Lock,
    category: "Encrypted analysis results",
    description:
      "If you choose to save results, they are stored encrypted with AES-256-GCM. Raw genetic files are never stored.",
  },
] as const;

const DATA_SUBJECT_RIGHTS = [
  {
    icon: FileText,
    title: "Right of Access",
    description:
      "You have the right to obtain confirmation of whether your personal data is being processed, and to access that data (GDPR Article 15).",
  },
  {
    icon: Check,
    title: "Right to Rectification",
    description:
      "You can request correction of inaccurate personal data or completion of incomplete data (GDPR Article 16).",
  },
  {
    icon: Clock,
    title: "Right to Erasure",
    description:
      "You can request deletion of your personal data when it is no longer necessary for the purposes for which it was collected (GDPR Article 17).",
  },
  {
    icon: Database,
    title: "Right to Data Portability",
    description:
      "You have the right to receive your personal data in a structured, commonly used, and machine-readable format (GDPR Article 20).",
  },
  {
    icon: Shield,
    title: "Right to Restriction of Processing",
    description:
      "You can request restriction of processing in certain circumstances, such as when you contest the accuracy of the data (GDPR Article 18).",
  },
  {
    icon: Scale,
    title: "Right to Object",
    description:
      "You have the right to object to processing based on legitimate interests or direct marketing (GDPR Article 21).",
  },
] as const;

// ── Component ───────────────────────────────────────────────────────────

export function PrivacyContent() {
  return (
    <>
      <PageHeader
        title="Privacy Notice"
        subtitle="How we process your personal data — in compliance with GDPR Article 13 and Article 14."
        breadcrumbs={[{ label: "Privacy", href: "/privacy" }]}
      />

      {/* ── Data Controller ──────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="data-controller-heading">
        <ScrollReveal>
          <SectionHeading
            id="data-controller-heading"
            title="Data Controller"
            subtitle="Who is responsible for your personal data"
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
                  Mergenix
                </h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                  As the entity responsible for the personal data processed through
                  this platform, we determine the purposes and means of processing your
                  personal data in accordance with applicable data protection laws.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Categories of Personal Data ───────────────────────────────── */}
      <section className="mt-16" aria-labelledby="data-categories-heading">
        <ScrollReveal>
          <SectionHeading
            id="data-categories-heading"
            title="Categories of Personal Data"
            subtitle="What personal data we process and why"
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {DATA_CATEGORIES.map((item) => {
            const Icon = item.icon;
            return (
              <ScrollReveal key={item.category}>
                <GlassCard variant="medium" hover="glow" className="h-full p-7">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                    <Icon className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                    {item.category}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    {item.description}
                  </p>
                </GlassCard>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* ── Legal Basis ──────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="legal-basis-heading">
        <ScrollReveal>
          <SectionHeading
            id="legal-basis-heading"
            title="Legal Basis for Processing"
            subtitle="The lawful grounds on which we process your data"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
                  <Scale className="h-5 w-5 text-[var(--accent-violet)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-base font-semibold text-[var(--text-heading)]">
                    Article 6(1)(a) &mdash; Consent
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    For processing genetic analysis data, we rely on your explicit consent.
                    You may withdraw consent at any time through your account settings without
                    affecting the lawfulness of processing carried out before withdrawal.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(6,182,212,0.1)]">
                  <FileText className="h-5 w-5 text-[var(--accent-cyan)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-base font-semibold text-[var(--text-heading)]">
                    Article 6(1)(b) &mdash; Contract
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    Processing of account and billing data is necessary for the
                    performance of our service agreement with you, including account
                    management and subscription billing.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Your Rights ───────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="your-rights-heading">
        <ScrollReveal>
          <SectionHeading
            id="your-rights-heading"
            title="Your Rights"
            subtitle="Rights you have under the GDPR regarding your personal data"
          />
        </ScrollReveal>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {DATA_SUBJECT_RIGHTS.map((right) => {
            const Icon = right.icon;
            return (
              <ScrollReveal key={right.title}>
                <GlassCard variant="subtle" hover="glow" className="h-full p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                      <Icon className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-heading text-base font-semibold text-[var(--text-heading)]">
                        {right.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                        {right.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* ── Data Retention ─────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="retention-heading">
        <ScrollReveal>
          <SectionHeading
            id="retention-heading"
            title="Data Retention"
            subtitle="How long we keep your data"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.1)]">
                <Clock className="h-6 w-6 text-[var(--accent-amber)]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="mb-2 font-heading text-lg font-semibold text-[var(--text-heading)]">
                  Retention Periods
                </h3>
                <ul className="space-y-2 text-sm leading-relaxed text-[var(--text-muted)]">
                  <li>
                    <strong>Account data:</strong> Retained for the duration of your account.
                    Deleted within 30 days of account closure.
                  </li>
                  <li>
                    <strong>Saved results:</strong> Retained until you delete them
                    or close your account. You can delete individual results at any time.
                  </li>
                  <li>
                    <strong>Raw genetic files:</strong> Never stored on our servers. Processed
                    entirely in your browser and discarded after the session.
                  </li>
                  <li>
                    <strong>Consent records:</strong> Retained for 5 years as required by
                    GDPR accountability obligations.
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Contact & Complaints ──────────────────────────────────────── */}
      <section className="mt-16 mb-16" aria-labelledby="contact-heading">
        <ScrollReveal>
          <SectionHeading
            id="contact-heading"
            title="Contact Us"
            subtitle="How to reach us about data protection matters"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                  <Mail className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-base font-semibold text-[var(--text-heading)]">
                    Data Protection Contact
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    For any questions about this privacy notice or to exercise your data
                    subject rights, contact us at{" "}
                    <a
                      href="mailto:privacy@mergenix.com"
                      className="text-[var(--accent-teal)] hover:underline"
                    >
                      privacy@mergenix.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
                  <Scale className="h-5 w-5 text-[var(--accent-violet)]" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="mb-1 font-heading text-base font-semibold text-[var(--text-heading)]">
                    Right to Lodge a Complaint
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    If you believe your data protection rights have been violated, you
                    have the right to lodge a complaint with a supervisory authority in
                    the EU Member State of your habitual residence, place of work, or
                    the place of the alleged infringement (GDPR Article 77).
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>
    </>
  );
}
