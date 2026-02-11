import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  AlertTriangle,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import {
  DISEASES,
  getDiseaseBySlug,
  getRelatedDiseases,
  inheritanceVariant,
} from "@/lib/disease-data";

/**
 * Individual disease detail page.
 *
 * Uses generateStaticParams() to pre-render all disease pages from the curated
 * dataset at build time.
 */

interface DiseasePageProps {
  params: Promise<{ slug: string }>;
}

/* ── Static generation ── */
export async function generateStaticParams() {
  return DISEASES.map((d) => ({ slug: d.slug }));
}

/* ── Metadata ── */
export async function generateMetadata({
  params,
}: DiseasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const disease = getDiseaseBySlug(slug);
  if (!disease) {
    return { title: "Disease Not Found" };
  }
  const description = disease.fullDescription || disease.description;
  return {
    title: `${disease.name} | Mergenix Disease Catalog`,
    description,
    openGraph: {
      title: disease.name,
      description,
      type: "article",
      siteName: "Mergenix",
    },
    twitter: {
      card: "summary",
      title: disease.name,
      description,
    },
  };
}

/* ── Page component ── */
export default async function DiseasePage({ params }: DiseasePageProps) {
  const { slug } = await params;
  const disease = getDiseaseBySlug(slug);

  if (!disease) {
    notFound();
  }

  const relatedDiseases = getRelatedDiseases(slug, 3);

  const severityVariant: "high" | "moderate" | "low" =
    disease.severity === "high"
      ? "high"
      : disease.severity === "moderate"
        ? "moderate"
        : "low";

  const confidenceVariant = `confidence-${disease.confidence}` as
    | "confidence-high"
    | "confidence-medium"
    | "confidence-low";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={disease.name}
        subtitle={disease.fullDescription || disease.description}
        breadcrumbs={[
          { label: "Disease Catalog", href: "/diseases" },
          { label: disease.name, href: `/diseases/${disease.slug}` },
        ]}
      />

      {/* ── Key Info Cards ── */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <ScrollReveal delay={0}>
          <GlassCard
            variant="medium"
            hover="none"
            rainbow
            className="relative overflow-hidden p-5 text-center"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent-cyan)]">
              Severity
            </div>
            <div className="mt-2">
              <Badge variant={severityVariant}>
                {disease.severity.toUpperCase()}
              </Badge>
            </div>
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <GlassCard
            variant="medium"
            hover="none"
            rainbow
            className="relative overflow-hidden p-5 text-center"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent-cyan)]">
              Inheritance
            </div>
            <div className="mt-2">
              <Badge variant={inheritanceVariant(disease.inheritance)}>
                {disease.inheritance}
              </Badge>
            </div>
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <GlassCard
            variant="medium"
            hover="none"
            rainbow
            className="relative overflow-hidden p-5 text-center"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--accent-cyan)]">
              Confidence
            </div>
            <div className="mt-2">
              <Badge variant={confidenceVariant}>
                {disease.confidence.toUpperCase()}
              </Badge>
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>

      {/* ── Frequency Cards ── */}
      <ScrollReveal delay={0.1}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <GlassCard variant="subtle" hover="none" className="p-6">
            <h3 className="mb-1 font-heading text-sm font-semibold text-[var(--text-heading)]">
              Carrier Frequency
            </h3>
            <p className="font-heading text-xl font-bold text-[var(--accent-teal)]">
              {disease.carrierFrequency}
            </p>
          </GlassCard>

          <GlassCard variant="subtle" hover="none" className="p-6">
            <h3 className="mb-1 font-heading text-sm font-semibold text-[var(--text-heading)]">
              Affected Frequency
            </h3>
            <p className="font-heading text-xl font-bold text-[var(--accent-rose)]">
              {disease.affectedFrequency}
            </p>
          </GlassCard>
        </div>
      </ScrollReveal>

      {/* ── Related SNPs Table ── */}
      {disease.snps.length > 0 && (
        <ScrollReveal delay={0.15}>
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-[var(--text-heading)]">
              Related SNPs
            </h2>
            <GlassCard variant="medium" hover="none" className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <caption className="sr-only">
                    SNP variants associated with {disease.name}
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th
                        scope="col"
                        className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        rsID
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        Gene
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        Allele Change
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-3 text-left font-heading text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {disease.snps.map((snp) => (
                      <tr
                        key={snp.rsid}
                        className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[rgba(6,214,160,0.02)]"
                      >
                        <td className="px-5 py-3 font-mono text-sm text-[var(--accent-teal)]">
                          {snp.rsid}
                        </td>
                        <td className="px-5 py-3 font-heading text-sm font-medium text-[var(--text-body)]">
                          {snp.gene}
                        </td>
                        <td className="px-5 py-3 font-mono text-sm text-[var(--text-body)]">
                          {snp.allele}
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--text-muted)]">
                          {snp.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </ScrollReveal>
      )}

      {/* ── Clinical Notes ── */}
      {disease.notes && (
        <ScrollReveal delay={0.1}>
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-[var(--text-heading)]">
              Clinical Notes
            </h2>
            <GlassCard variant="subtle" hover="none" className="p-6">
              <p className="text-sm leading-relaxed text-[var(--text-body)]">
                {disease.notes}
              </p>
            </GlassCard>
          </div>
        </ScrollReveal>
      )}

      {/* ── Related Conditions ── */}
      {relatedDiseases.length > 0 && (
        <ScrollReveal delay={0.1}>
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-[var(--text-heading)]">
              Related Conditions
            </h2>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Other {disease.category.toLowerCase()} conditions in our database
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedDiseases.map((related) => (
                <Link
                  key={related.slug}
                  href={`/diseases/${related.slug}`}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)] rounded-[20px]"
                >
                  <GlassCard
                    variant="subtle"
                    hover="glow"
                    className="h-full p-5 transition-all duration-300 group-hover:border-[rgba(6,214,160,0.25)]"
                  >
                    <h3 className="mb-2 font-heading text-sm font-bold text-[var(--text-heading)] transition-colors group-hover:text-[var(--accent-teal)]">
                      {related.name}
                    </h3>
                    <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                      {related.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          related.severity === "high"
                            ? "high"
                            : related.severity === "moderate"
                              ? "moderate"
                              : "low"
                        }
                      >
                        {related.severity.toUpperCase()}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent-teal)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        View
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── Disclaimer ── */}
      <ScrollReveal delay={0.1}>
        <GlassCard
          variant="subtle"
          hover="none"
          className="mt-8 flex items-start gap-3 border-[rgba(245,158,11,0.2)] p-5"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--accent-amber)]"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-[var(--accent-amber)]">
              Medical Disclaimer
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              This information is for educational purposes only and is not medical advice.
              Always consult a healthcare professional or genetic counselor for medical
              decisions. Genetic risk is complex and depends on many factors beyond individual
              variants.
            </p>
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* ── Sources ── */}
      <ScrollReveal delay={0.05}>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[var(--text-dim)]">
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium">Sources:</span>
          {disease.sources.map((source) => (
            <Badge key={source} variant="default">
              {source}
            </Badge>
          ))}
        </div>
      </ScrollReveal>

      {/* ── Back link ── */}
      <div className="mt-8">
        <Link
          href="/diseases"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          Back to Disease Catalog
        </Link>
      </div>
    </div>
  );
}
