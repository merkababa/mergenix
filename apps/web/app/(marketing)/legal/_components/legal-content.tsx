"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, FileText, Cookie, Lock, Scale, Clock } from "lucide-react";
import { m } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { PageHeader } from "@/components/layout/page-header";

/* -- TOC items -- */
const TOC_ITEMS = [
  { id: "terms", label: "Terms of Service", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Shield },
  { id: "cookies", label: "Cookie Policy", icon: Cookie },
  { id: "gina", label: "GINA Notice", icon: Scale },
] as const;

// Update this date whenever legal content changes
const LEGAL_LAST_UPDATED = "February 2026";

export function LegalContent() {
  const [activeSection, setActiveSection] = useState("terms");

  /* -- Scroll spy: IntersectionObserver highlights active TOC item -- */
  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -80% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* -- Page header -- */}
      <PageHeader
        title="Legal"
        subtitle="Our commitment to transparency, privacy, and your rights."
        breadcrumbs={[{ label: "Legal", href: "/legal" }]}
        className="mb-2"
      />

      {/* -- Last Updated -- */}
      <p className="mb-8 text-center text-xs text-[var(--text-dim)]">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>

      {/* -- Privacy highlight (scale-in) -- */}
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <GlassCard variant="medium" hover="none" className="mb-12 flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(6,214,160,0.1)]">
            <Shield className="h-6 w-6 text-[var(--accent-teal)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-[var(--text-heading)]">
              Your DNA Never Leaves Your Device
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              All genetic analysis runs entirely in your browser. We never upload,
              store, or transmit your DNA data. This is our architectural guarantee.
            </p>
          </div>
        </GlassCard>
      </m.div>

      {/* -- Mobile TOC (horizontal pills) -- */}
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="Table of contents">
        {TOC_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={activeSection === item.id ? "true" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === item.id
                ? "bg-[rgba(6,214,160,0.15)] text-[var(--accent-teal)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--accent-teal)]"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </nav>

      {/* -- Desktop layout: TOC sidebar + content -- */}
      <div className="flex gap-8">
        {/* TOC sidebar (desktop only) */}
        <aside className="hidden lg:block lg:w-48 shrink-0">
          <nav className="sticky top-24 space-y-2" aria-label="Table of contents">
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={activeSection === item.id ? "true" : undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  activeSection === item.id
                    ? "bg-[rgba(6,214,160,0.1)] text-[var(--accent-teal)]"
                    : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* -- Terms of Service -- */}
          <ScrollReveal>
            <section className="mb-12" id="terms">
              <GlassCard variant="subtle" hover="none" className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-heading)]">
                    Terms of Service
                  </h2>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      1. Acceptance of Terms
                    </h3>
                    <p>
                      By accessing and using Mergenix (&ldquo;the Service&rdquo;), you agree to be bound
                      by these Terms of Service. If you do not agree, do not use the Service.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      2. Service Description
                    </h3>
                    <p>
                      Mergenix provides genetic offspring analysis tools including carrier
                      screening, trait prediction, pharmacogenomics, and polygenic risk scoring.
                      All analysis runs client-side in your browser.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      3. Not Medical Advice
                    </h3>
                    <p>
                      Mergenix is an educational and informational tool. Results are NOT medical
                      diagnoses and should NOT be used as the sole basis for medical decisions.
                      Always consult a qualified healthcare professional or genetic counselor
                      before making health-related decisions based on genetic information.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      4. User Accounts
                    </h3>
                    <p>
                      You are responsible for maintaining the confidentiality of your account
                      credentials. You agree to notify us immediately of any unauthorized use.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      5. Payment Terms
                    </h3>
                    <p>
                      Premium and Pro tiers are one-time purchases, not subscriptions.
                      All payments are processed securely through Stripe.
                      We offer a 30-day money-back guarantee for technical issues, file format incompatibility, or analysis processing errors. Refunds are not available solely on the basis of dissatisfaction with probabilistic outcomes.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      6. Limitation of Liability
                    </h3>
                    <p>
                      Mergenix is provided &ldquo;as is&rdquo; without warranties of any kind. We are
                      not liable for any damages arising from the use of our service,
                      including but not limited to emotional distress from genetic results.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      7. Changes to Terms
                    </h3>
                    <p>
                      We may update these terms from time to time. We will notify you of
                      material changes via email at least 30 days before they take effect.
                      Continued use of the Service after the notice period constitutes
                      acceptance of the new terms.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      8. Accuracy Limitations
                    </h3>
                    <p>
                      Results accuracy may vary based on ancestral background. Our analysis
                      relies on genome-wide association studies (GWAS) that have
                      disproportionately studied European-ancestry populations. Users from
                      underrepresented populations may receive less accurate risk estimates.
                      We recommend consulting a genetic counselor for personalized
                      interpretation.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      9. Dispute Resolution &amp; Binding Arbitration
                    </h3>
                    <p>
                      Any disputes arising from your use of Mergenix shall be resolved through
                      binding arbitration administered under the rules of the American
                      Arbitration Association. You agree to waive your right to participate
                      in class-action lawsuits. Small claims court actions are exempt from
                      this arbitration requirement.
                    </p>
                    <p className="mt-3">
                      This agreement is governed by the laws of the State of Delaware, United
                      States, without regard to conflict of law principles.
                    </p>
                    <p className="mt-3">
                      This arbitration clause does not apply to consumers located in the
                      European Economic Area, the United Kingdom, or any jurisdiction where
                      mandatory arbitration in consumer contracts is prohibited by law. Such
                      consumers retain the right to bring claims before the courts of their
                      domicile.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      10. Prohibited Uses
                    </h3>
                    <p>
                      You may not use Mergenix for dating compatibility screening, partner
                      selection, embryo selection, or any form of reproductive decision-making
                      beyond educational curiosity. Mergenix results are probabilistic
                      population-level estimates and must not be used to make clinical,
                      reproductive, or discriminatory decisions.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      11. Age Restriction
                    </h3>
                    <p>
                      You must be at least 18 years of age to use Mergenix. We do not permit
                      guardian consent for minors. If we discover a user is under 18, their
                      account will be terminated and all associated data deleted immediately.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      12. Indemnification
                    </h3>
                    <p>
                      You agree to indemnify Mergenix against any claims arising from your
                      upload of another person&apos;s genetic data without their informed consent.
                      You represent that you have obtained verifiable consent from any partner
                      whose DNA data you upload.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      13. Regulatory Classification
                    </h3>
                    <p>
                      Mergenix is a wellness and educational product, not a medical device or
                      clinical diagnostic tool. It is not reviewed, approved, or regulated by
                      the FDA, EMA, or any health authority. Results are for informational
                      purposes only.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </section>
          </ScrollReveal>

          {/* -- Privacy Policy -- */}
          <ScrollReveal delay={0.1}>
            <section className="mb-12" id="privacy">
              <GlassCard variant="subtle" hover="none" className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[var(--accent-teal)]" aria-hidden="true" />
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-heading)]">
                    Privacy Policy
                  </h2>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      1. Genetic Data
                    </h3>

                    {/* -- Privacy guarantee callout -- */}
                    <div className="mb-3 rounded-2xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" aria-hidden="true" />
                        <p className="font-medium text-[var(--text-heading)]">
                          Your DNA data never leaves your device.
                        </p>
                      </div>
                    </div>

                    <p>
                      All genetic file parsing and analysis runs entirely within your web
                      browser using client-side JavaScript/WebAssembly. We do not upload,
                      transmit, store, or have access to your genetic data at any point.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      2. Account Data
                    </h3>
                    <p>
                      If you create an account, we store your email address, hashed
                      password, account tier, and session information (IP address,
                      browser user-agent, session timestamps). This data is stored
                      securely and is never shared with third parties.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      3. Analytics
                    </h3>
                    <p>
                      We collect anonymous usage analytics (page views, feature usage) to
                      improve the service. This data cannot be linked to individual users
                      and contains no genetic information.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      4. Third-Party Sharing
                    </h3>

                    {/* -- No-sharing guarantee callout -- */}
                    <div className="mb-3 rounded-2xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" aria-hidden="true" />
                        <p className="font-medium text-[var(--text-heading)]">
                          We do not sell, share, or provide your personal or genetic data to any third party.
                        </p>
                      </div>
                    </div>

                    <p>
                      This includes advertisers, employers, insurers, or
                      government agencies. Your data stays with you.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      5. Data Deletion
                    </h3>
                    <p>
                      You can delete your account and all associated data at any time
                      from your account settings. Since we never store genetic data,
                      there is nothing to delete on that front.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      6. Security
                    </h3>
                    <p>
                      We use industry-standard security measures including HTTPS, hashed
                      passwords (bcrypt), rate limiting, CSRF protection, and optional
                      two-factor authentication.
                    </p>
                  </div>

                  {/* -- Consent Withdrawal -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      7. Withdrawing Consent
                    </h3>
                    <p>
                      You may withdraw your consent at any time by contacting{" "}
                      <a
                        href="mailto:privacy@mergenix.com"
                        className="font-medium text-[var(--accent-teal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm"
                      >
                        privacy@mergenix.com
                      </a>{" "}
                      or by deleting your account. Withdrawing consent does not affect the
                      lawfulness of processing based on consent before withdrawal. You can
                      also change your cookie preferences at any time using the cookie
                      settings on this page.
                    </p>
                  </div>

                  {/* -- Data Retention Policy (enhanced) -- */}
                  <div>
                    <h3
                      id="data-retention-heading"
                      className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]"
                    >
                      8. Data Retention Policy
                    </h3>
                    <p className="mb-3">
                      We retain your data only as long as necessary to provide the service.
                      Below is our data retention schedule:
                    </p>

                    <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                      <table className="w-full text-sm" aria-labelledby="data-retention-heading">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                            <th scope="col" className="px-4 py-2.5 text-left font-heading font-semibold text-[var(--text-heading)]">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-[var(--accent-teal)]" aria-hidden="true" />
                                Data Type
                              </div>
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-left font-heading font-semibold text-[var(--text-heading)]">
                              Retention Period
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-left font-heading font-semibold text-[var(--text-heading)]">
                              Deletion Method
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Account profile</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Until account deletion</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">User-initiated or auto after 2yr inactivity</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Saved analysis results</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Until deleted by user</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">User-initiated deletion</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Payment records</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">7 years (to satisfy the longest applicable tax/financial record-keeping obligation across jurisdictions in which we operate)</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Automatic purge</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Consent records</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">7 years or until account deletion</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Automatic purge</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Audit logs</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">90 days</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Automatic rotation</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 text-[var(--text-body)]">Genetic data (DNA files)</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">Never stored</td>
                            <td className="px-4 py-2.5 text-[var(--text-muted)]">N/A — processed client-side only</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* -- GDPR Rights (EU Users) -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      9. GDPR Rights (EU Users)
                    </h3>
                    <p className="mb-3">
                      If you are located in the European Economic Area (EEA), you have the
                      following rights under the General Data Protection Regulation (GDPR):
                    </p>
                    <ul className="ml-5 list-disc space-y-1.5 text-[var(--text-muted)]">
                      <li>
                        <strong className="text-[var(--text-body)]">Right of Access</strong> — Request
                        a copy of all personal data we hold about you (use the Data Export feature in account settings).
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Rectification</strong> — Update
                        inaccurate personal data via your account profile.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Erasure</strong> — Delete
                        your account and all associated data from account settings.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Data Portability</strong> — Export
                        your data in machine-readable JSON format.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Restrict Processing</strong> — Contact
                        us to restrict how we process your data.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Object</strong> — Opt
                        out of analytics processing via cookie preferences.
                      </li>
                    </ul>
                    <p className="mt-3">
                      To exercise any of these rights, contact us at{" "}
                      <a
                        href="mailto:privacy@mergenix.com"
                        className="font-medium text-[var(--accent-teal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm"
                      >
                        privacy@mergenix.com
                      </a>
                      . We respond to all requests within 30 days.
                    </p>
                  </div>

                  {/* -- CCPA Rights (California Users) -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      10. CCPA Rights (California Users)
                    </h3>
                    <p className="mb-3">
                      If you are a California resident, the California Consumer Privacy Act
                      (CCPA) provides you with additional rights:
                    </p>
                    <ul className="ml-5 list-disc space-y-1.5 text-[var(--text-muted)]">
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Know</strong> — You
                        can request details about what personal information we collect and how
                        we use it.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Delete</strong> — You
                        can request deletion of your personal information.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Correct</strong> — You
                        can request correction of inaccurate personal information we hold
                        about you.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Opt-Out of Sale</strong> — We
                        do NOT sell your personal information. There is nothing to opt out of.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Right to Non-Discrimination</strong> — We
                        will not discriminate against you for exercising any CCPA rights.
                      </li>
                    </ul>
                  </div>

                  {/* -- EU Representative -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      11. EU Representative (Article 27)
                    </h3>
                    <p>
                      For inquiries from EU data subjects or supervisory authorities, please
                      contact us at privacy@mergenix.com. We are establishing our EU Article
                      27 representation and will publish the details here.
                    </p>
                  </div>

                  {/* -- International Transfers -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      12. International Data Transfers
                    </h3>
                    <p>
                      Your data may be processed in the United States. We rely on Standard
                      Contractual Clauses (SCCs) approved by the European Commission for any
                      transfers of personal data outside the EEA. See our{" "}
                      <Link href="/privacy" className="font-medium text-[var(--accent-teal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm">
                        Privacy Notice
                      </Link>{" "}
                      for full details.
                    </p>
                  </div>

                  {/* -- Law Enforcement -- */}
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      13. Law Enforcement Requests
                    </h3>
                    <p>
                      We may disclose your account data (never raw genetic data, which we do
                      not possess) if required by valid legal process such as a court order
                      or subpoena. We will notify you unless legally prohibited. See our{" "}
                      <Link href="/privacy" className="font-medium text-[var(--accent-teal)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-teal)] focus-visible:ring-offset-1 rounded-sm">
                        Privacy Notice
                      </Link>{" "}
                      for full details.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </section>
          </ScrollReveal>

          {/* -- Cookie Policy (enhanced) -- */}
          <ScrollReveal delay={0.2}>
            <section className="mb-12" id="cookies">
              <GlassCard variant="subtle" hover="none" className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Cookie className="h-5 w-5 text-[var(--accent-amber)]" aria-hidden="true" />
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-heading)]">
                    Cookie Policy
                  </h2>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      Essential Cookies
                    </h3>
                    <p className="mb-3">
                      We use essential cookies for authentication and core functionality.
                      These are required for the service to function and cannot be disabled.
                    </p>
                    <ul className="ml-5 list-disc space-y-1 text-[var(--text-muted)]">
                      <li>
                        <strong className="text-[var(--text-body)]">Authentication cookie</strong> (httpOnly,
                        secure) — Maintains your login session. Cannot be read by JavaScript.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Theme preference</strong> (localStorage) — Stores
                        your dark/light mode selection.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Cookie consent</strong> (localStorage) — Remembers
                        your cookie preferences.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Login indicator</strong> (session
                        cookie) — Non-sensitive flag for UI state. Contains no user data.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      Analytics Cookies
                    </h3>
                    <p className="mb-3">
                      We use privacy-respecting analytics to understand how our service is
                      used. Analytics cookies are <strong>opt-in only</strong> and require
                      your explicit consent.
                    </p>
                    <ul className="ml-5 list-disc space-y-1 text-[var(--text-muted)]">
                      <li>All analytics data is anonymous and aggregated</li>
                      <li>No genetic data is ever included in analytics</li>
                      <li>No cross-site tracking or fingerprinting</li>
                      <li>You can opt out at any time via the cookie preferences banner</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      Marketing Cookies
                    </h3>

                    {/* -- No marketing cookies callout -- */}
                    <div className="rounded-2xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-[var(--text-heading)]">
                            We do NOT use marketing cookies.
                          </p>
                          <p className="mt-1 text-[var(--text-muted)]">
                            We do not serve ads, do not share data with ad networks, and do not
                            use any advertising or tracking cookies. We never will.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </section>
          </ScrollReveal>

          {/* -- GINA Notice -- */}
          <ScrollReveal delay={0.3}>
            <section id="gina">
              <GlassCard variant="subtle" hover="none" className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <Scale className="h-5 w-5 text-[var(--accent-violet)]" aria-hidden="true" />
                  <h2 className="font-heading text-2xl font-bold text-[var(--text-heading)]">
                    Your Rights Under GINA
                  </h2>
                </div>

                <div className="space-y-6 text-sm leading-relaxed text-[var(--text-body)]">
                  <p>
                    The Genetic Information Nondiscrimination Act (GINA) is a U.S. federal
                    law that protects individuals from discrimination based on their genetic
                    information. Here is what you should know:
                  </p>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      What GINA Covers
                    </h3>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                        <h4 className="mb-1.5 font-heading text-sm font-semibold text-[var(--accent-teal)]">
                          Title I — Health Insurance
                        </h4>
                        <p className="text-[var(--text-muted)]">
                          Health insurers cannot use genetic information to make eligibility,
                          coverage, underwriting, or premium-setting decisions. They cannot
                          require or request genetic testing.
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                        <h4 className="mb-1.5 font-heading text-sm font-semibold text-[var(--accent-teal)]">
                          Title II — Employment
                        </h4>
                        <p className="text-[var(--text-muted)]">
                          Employers with 15 or more employees cannot use genetic information
                          in hiring, firing, promotion, or any other employment decisions.
                          They cannot request, require, or purchase genetic information about
                          employees or their family members.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      What GINA Does NOT Cover
                    </h3>

                    {/* -- Limitation callout -- */}
                    <div className="mb-3 rounded-2xl border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <Scale className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-amber)]" aria-hidden="true" />
                        <p className="font-medium text-[var(--text-heading)]">
                          GINA has important limitations. Be aware of what is NOT protected.
                        </p>
                      </div>
                    </div>

                    <ul className="ml-5 list-disc space-y-1.5 text-[var(--text-muted)]">
                      <li>
                        <strong className="text-[var(--text-body)]">Life insurance</strong> — Life
                        insurance companies may use genetic information in underwriting decisions.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Disability insurance</strong> — Not
                        covered by GINA protections.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Long-term care insurance</strong> — Not
                        covered by GINA protections.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Small employers</strong> — Employers
                        with fewer than 15 employees are not covered by Title II.
                      </li>
                      <li>
                        <strong className="text-[var(--text-body)]">Military</strong> — Members of
                        the U.S. military are covered by separate regulations.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      State-Level Protections
                    </h3>
                    <p>
                      Many U.S. states have enacted additional genetic privacy laws that go
                      beyond GINA. Some states extend protections to life insurance, disability
                      insurance, long-term care insurance, and employers of any size. Check your
                      state&apos;s specific laws for additional protections that may apply to you.
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 font-heading text-base font-semibold text-[var(--text-heading)]">
                      Our Recommendation
                    </h3>

                    {/* -- Recommendation callout -- */}
                    <div className="rounded-2xl border border-[rgba(6,214,160,0.2)] bg-[rgba(6,214,160,0.04)] p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-teal)]" aria-hidden="true" />
                        <div>
                          <p className="font-medium text-[var(--text-heading)]">
                            Consult a genetic counselor before making decisions.
                          </p>
                          <p className="mt-1 text-[var(--text-muted)]">
                            We strongly recommend consulting with a certified genetic counselor
                            to understand how genetic information may affect your insurance,
                            employment, and family planning decisions. Mergenix results are
                            probabilistic estimates, not medical diagnoses.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </>
  );
}
