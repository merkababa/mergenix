'use client';

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
  FileSearch,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { PageHeader } from '@/components/layout/page-header';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

// ── Data ────────────────────────────────────────────────────────────────

const DATA_CATEGORIES = [
  {
    icon: UserCheck,
    category: 'Account info',
    description: 'Email address, display name, and authentication credentials (hashed).',
  },
  {
    icon: Database,
    category: 'Payment info',
    description:
      'Payment method details processed by our payment provider. We do not store full card numbers.',
  },
  {
    icon: Lock,
    category: 'Analysis results (if saved)',
    description:
      'If you choose to save results, they are stored server-side. Client-side AES-256-GCM encryption is planned for a future release. Raw genetic files are never stored.',
  },
] as const;

const DATA_SUBJECT_RIGHTS = [
  {
    icon: FileText,
    title: 'Right of Access',
    description:
      'You have the right to obtain confirmation of whether your personal data is being processed, and to access that data (GDPR Article 15).',
  },
  {
    icon: Check,
    title: 'Right to Rectification',
    description:
      'You can request correction of inaccurate personal data or completion of incomplete data (GDPR Article 16).',
  },
  {
    icon: Clock,
    title: 'Right to Erasure',
    description:
      'You can request deletion of your personal data when it is no longer necessary for the purposes for which it was collected (GDPR Article 17).',
  },
  {
    icon: Database,
    title: 'Right to Data Portability',
    description:
      'You have the right to receive your personal data in a structured, commonly used, and machine-readable format (GDPR Article 20).',
  },
  {
    icon: Shield,
    title: 'Right to Restriction of Processing',
    description:
      'You can request restriction of processing in certain circumstances, such as when you contest the accuracy of the data (GDPR Article 18).',
  },
  {
    icon: Scale,
    title: 'Right to Object',
    description:
      'You have the right to object to processing based on legitimate interests or direct marketing (GDPR Article 21).',
  },
] as const;

// ── Component ───────────────────────────────────────────────────────────

export function PrivacyContent() {
  return (
    <>
      <PageHeader
        title="Privacy Notice"
        subtitle="How we process your personal data — in compliance with GDPR Article 13 and Article 14."
        breadcrumbs={[{ label: 'Privacy', href: '/privacy' }]}
      />

      {/* ── Effective Date ────────────────────────────────────────────── */}
      <div className="text-(--text-muted) mt-6 flex flex-wrap gap-4 text-sm">
        <span>
          <strong>Last updated:</strong> February 2026
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong>Effective date:</strong> February 2026
        </span>
      </div>

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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                <Shield className="text-(--accent-teal) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Mergenix
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  As the entity responsible for the personal data processed through this platform,
                  we determine the purposes and means of processing your personal data in accordance
                  with applicable data protection laws.
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
                    <Icon className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-(--text-heading) mb-2 text-base font-semibold">
                    {item.category}
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">{item.description}</p>
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
                  <Scale className="text-(--accent-violet) h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                    Article 6(1)(a) &mdash; Consent
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">
                    For processing genetic analysis data, we rely on your explicit consent. You may
                    withdraw consent at any time through your account settings without affecting the
                    lawfulness of processing carried out before withdrawal.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(6,182,212,0.1)]">
                  <FileText className="text-(--accent-cyan) h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                    Article 6(1)(b) &mdash; Contract
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">
                    Processing of account and billing data is necessary for the performance of our
                    service agreement with you, including account management and payment processing.
                    Payment processing is handled by Stripe, Inc. We share your billing details and
                    IP address with Stripe for the purpose of processing your payment. Stripe&apos;s
                    privacy policy is available at{' '}
                    <a
                      href="https://stripe.com/privacy"
                      className="text-(--accent-teal) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      stripe.com/privacy
                    </a>
                    .
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.1)]">
                  <Shield className="text-(--accent-amber) h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                    Article 9(2)(a) &mdash; Explicit Consent (Special Category Data)
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">
                    Processing of your genetic data requires explicit consent under GDPR Article
                    9(2)(a) because genetic data is a special category of personal data. This
                    consent is obtained via our dedicated consent modal before any analysis begins.
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                      <Icon className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                        {right.title}
                      </h3>
                      <p className="text-(--text-muted) text-sm leading-relaxed">
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.1)]">
                <Clock className="text-(--accent-amber) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Retention Periods
                </h3>
                <ul className="text-(--text-muted) space-y-2 text-sm leading-relaxed">
                  <li>
                    <strong>Account data:</strong> Retained for the duration of your account.
                    Deleted within 30 days of account closure. Accounts inactive for more than 2
                    years are automatically scheduled for deletion.
                  </li>
                  <li>
                    <strong>Saved results:</strong> Retained until you delete them or close your
                    account. You can delete individual results at any time.
                  </li>
                  <li>
                    <strong>Raw genetic files:</strong> Never stored on our servers. Processed
                    entirely in your browser and discarded after the session.
                  </li>
                  <li>
                    <strong>Consent records:</strong> Retained for 7 years as required by GDPR
                    accountability obligations and applicable tax/compliance requirements.
                  </li>
                </ul>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── ZKE Architecture ─────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="zke-heading">
        <ScrollReveal>
          <SectionHeading
            id="zke-heading"
            title="Zero-Knowledge Encryption (Coming Soon)"
            subtitle="Planned client-side encryption for saved results"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,182,212,0.1)]">
                <Lock className="text-(--accent-cyan) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Client-Side Encryption — Planned for a Future Release
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  We plan to implement client-side AES-256-GCM encryption using Argon2id-derived
                  keys, so that saved analysis results are encrypted in your browser before being
                  transmitted to our servers. This feature is not yet active. Until it is released,
                  saved results are stored server-side with standard transport and at-rest
                  encryption.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Data Protection Officer ───────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="dpo-heading">
        <ScrollReveal>
          <SectionHeading
            id="dpo-heading"
            title="Data Protection Officer"
            subtitle="Our DPO contact and appointment status"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
                <UserCheck className="text-(--accent-violet) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  DPO Contact
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  Data Protection Officer:{' '}
                  <a
                    href="mailto:privacy@mergenix.com"
                    className="text-(--accent-teal) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
                  >
                    privacy@mergenix.com
                  </a>
                  . A Data Protection Officer will be formally designated prior to public launch.
                  This designation will be completed before Mergenix becomes accessible to the
                  general public. In the interim, all data protection inquiries are handled directly
                  by the Mergenix privacy team via the address above.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── EU Representative ─────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="eu-rep-heading">
        <ScrollReveal>
          <SectionHeading
            id="eu-rep-heading"
            title="EU Representative (Article 27)"
            subtitle="Our designated representative in the European Union"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
                <Scale className="text-(--accent-teal) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Article 27 Designation
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  An EU Representative under GDPR Article 27 will be formally designated prior to
                  public launch. This designation will be completed before Mergenix becomes
                  accessible to the general public, and the representative&apos;s contact details
                  will be published in this notice at that time. Until formal designation, EU data
                  subjects may direct inquiries to our Data Protection Officer at{' '}
                  <a
                    href="mailto:privacy@mergenix.com"
                    className="text-(--accent-teal) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
                  >
                    privacy@mergenix.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── International Transfers ───────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="transfers-heading">
        <ScrollReveal>
          <SectionHeading
            id="transfers-heading"
            title="International Data Transfers"
            subtitle="How we safeguard cross-border data transfers"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(6,182,212,0.1)]">
                <Shield className="text-(--accent-cyan) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Standard Contractual Clauses
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  Your data may be processed in the United States. We rely on Standard Contractual
                  Clauses (SCCs) approved by the European Commission for any transfers of personal
                  data outside the EEA, ensuring an equivalent level of protection for your data.
                  Our primary sub-processor, Stripe, Inc. (payment processor), is certified under
                  the EU-U.S. Data Privacy Framework. We have conducted a Transfer Impact Assessment
                  (TIA) to evaluate the legal framework of the destination country and have
                  implemented supplementary measures, including encryption in transit and at rest,
                  to ensure an equivalent level of protection.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Law Enforcement Requests ──────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="law-enforcement-heading">
        <ScrollReveal>
          <SectionHeading
            id="law-enforcement-heading"
            title="Law Enforcement Requests"
            subtitle="When we may be required to disclose data"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.1)]">
                <FileText className="text-(--accent-amber) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  Legal Process Disclosure
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  We may disclose your account data (never raw genetic data, which we do not
                  possess) if required by valid legal process such as a court order or subpoena. We
                  will notify you of any such request unless we are legally prohibited from doing
                  so.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── DPIA ──────────────────────────────────────────────────────── */}
      <section className="mt-16" aria-labelledby="dpia-heading">
        <ScrollReveal>
          <SectionHeading
            id="dpia-heading"
            title="Data Protection Impact Assessment"
            subtitle="Our assessment of risks to your genetic data"
          />
        </ScrollReveal>

        <ScrollReveal>
          <GlassCard variant="medium" hover="none" className="mt-8 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(139,92,246,0.1)]">
                <FileSearch className="text-(--accent-violet) h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-heading text-(--text-heading) mb-2 text-lg font-semibold">
                  DPIA Status
                </h3>
                <p className="text-(--text-muted) text-sm leading-relaxed">
                  We have conducted a Data Protection Impact Assessment (DPIA) as required by GDPR
                  Article 35 for large-scale processing of special category data, including genetic
                  data. Our DPIA evaluates the necessity and proportionality of processing, assesses
                  risks to data subjects&apos; rights and freedoms, and documents the technical and
                  organisational measures we implement to mitigate those risks. A summary of our
                  DPIA is available upon request by contacting our Data Protection Officer.
                </p>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>
      </section>

      {/* ── Contact & Complaints ──────────────────────────────────────── */}
      <section className="mb-16 mt-16" aria-labelledby="contact-heading">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(6,214,160,0.1)]">
                  <Mail className="text-(--accent-teal) h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                    Data Protection Contact
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">
                    For any questions about this privacy notice or to exercise your data subject
                    rights, contact us at{' '}
                    <a
                      href="mailto:privacy@mergenix.com"
                      className="text-(--accent-teal) focus-visible:outline-hidden focus-visible:ring-(--accent-teal) rounded-xs hover:underline focus-visible:ring-2 focus-visible:ring-offset-1"
                    >
                      privacy@mergenix.com
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
                  <Scale className="text-(--accent-violet) h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-heading text-(--text-heading) mb-1 text-base font-semibold">
                    Right to Lodge a Complaint
                  </h3>
                  <p className="text-(--text-muted) text-sm leading-relaxed">
                    If you believe your data protection rights have been violated, you have the
                    right to lodge a complaint with a supervisory authority in the EU Member State
                    of your habitual residence, place of work, or the place of the alleged
                    infringement (GDPR Article 77).
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
