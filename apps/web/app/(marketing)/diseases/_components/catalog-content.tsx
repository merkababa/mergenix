"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Microscope,
  Dna,
  Activity,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { m, useInView } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectFilter } from "@/components/ui/select-filter";
import {
  DISEASES,
  getAllCategories,
  getAllInheritanceModels,
  getDiseaseStats,
  inheritanceVariant,
  type DiseaseEntry,
} from "@/lib/disease-data";
import { createStaggerContainer } from "@/lib/animation-variants";

/* -- Constants -- */
const ITEMS_PER_PAGE = 12;

/* -- Animation variants -- */
// Container uses the shared stagger factory with catalog-specific 0.06 s delay
const containerVariants = createStaggerContainer(0.06);

// Card variant kept local: includes a subtle scale(0.97) entrance that the
// shared staggerItem / cardVariants (y-only, no scale) does not provide.
const catalogCardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Filter panel variant kept local: uses scale(0.96) with 0.5 s duration,
// distinct from the shared scaleIn (0.92 / 0.7 s).
const filterPanelVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* -- Animated counter component -- */
function AnimatedCounter({
  value,
  suffix = "",
}: {
  value: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number>(0);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    // Parse the numeric part from the value string (e.g. "1,234" -> 1234)
    const numericString = value.replace(/[^0-9]/g, "");
    const target = parseInt(numericString, 10);

    if (isNaN(target) || target === 0) {
      setDisplayValue(value);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setDisplayValue(current.toLocaleString());

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        // Ensure we show the original formatted value at the end
        setDisplayValue(value);
      }
    }

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [isInView, value]);

  return (
    <div ref={ref} className="font-heading text-2xl font-extrabold text-[var(--accent-teal)]">
      {displayValue}
      {suffix}
    </div>
  );
}

/* -- Helper functions -- */
function severityVariant(s: string): "high" | "moderate" | "low" {
  if (s === "high") return "high";
  if (s === "moderate") return "moderate";
  return "low";
}

/* -- Build filter options -- */
const categoryOptions = [
  { value: "All", label: "All Categories" },
  ...getAllCategories().map((c) => ({ value: c, label: c })),
];

const inheritanceOptions = [
  { value: "All", label: "All Inheritance" },
  ...getAllInheritanceModels().map((m) => ({ value: m, label: m })),
];

const severityOptions = [
  { value: "All", label: "All Severity" },
  { value: "high", label: "High" },
  { value: "moderate", label: "Moderate" },
  { value: "low", label: "Low" },
];

/* -- Inner component (needs Suspense boundary for useSearchParams) -- */
function DiseaseCatalogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* -- State from URL params -- */
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "All");
  const [inheritance, setInheritance] = useState(
    searchParams.get("inheritance") ?? "All",
  );
  const [severity, setSeverity] = useState(searchParams.get("severity") ?? "All");
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });

  /* -- Sync state -> URL -- */
  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (
          val === "" ||
          val === "All" ||
          (key === "page" && val === "1")
        ) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/diseases", { scroll: false });
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      updateUrl({ q: value, page: "1" });
    },
    [updateUrl],
  );

  const handleCategory = useCallback(
    (value: string) => {
      setCategory(value);
      setPage(1);
      updateUrl({ category: value, page: "1" });
    },
    [updateUrl],
  );

  const handleInheritance = useCallback(
    (value: string) => {
      setInheritance(value);
      setPage(1);
      updateUrl({ inheritance: value, page: "1" });
    },
    [updateUrl],
  );

  const handleSeverity = useCallback(
    (value: string) => {
      setSeverity(value);
      setPage(1);
      updateUrl({ severity: value, page: "1" });
    },
    [updateUrl],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      updateUrl({ page: String(newPage) });
    },
    [updateUrl],
  );

  const hasActiveFilters =
    search !== "" ||
    category !== "All" ||
    inheritance !== "All" ||
    severity !== "All";

  const resetFilters = useCallback(() => {
    setSearch("");
    setCategory("All");
    setInheritance("All");
    setSeverity("All");
    setPage(1);
    router.replace("/diseases", { scroll: false });
  }, [router]);

  /* -- Filtering & pagination -- */
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return DISEASES.filter((d) => {
      const matchesSearch =
        !search ||
        d.name.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower) ||
        d.category.toLowerCase().includes(searchLower);
      const matchesCategory = category === "All" || d.category === category;
      const matchesInheritance =
        inheritance === "All" || d.inheritance === inheritance;
      const matchesSeverity = severity === "All" || d.severity === severity;
      return matchesSearch && matchesCategory && matchesInheritance && matchesSeverity;
    });
  }, [search, category, inheritance, severity]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  /* -- Stats -- */
  const stats = getDiseaseStats();
  const statItems = [
    { icon: Microscope, value: stats.totalDiseases.toLocaleString(), label: "Diseases" },
    { icon: Dna, value: stats.totalSnps.toLocaleString() + "+", label: "SNPs Tracked" },
    { icon: Activity, value: String(stats.inheritanceModels), label: "Inheritance Models" },
    { icon: Filter, value: String(stats.categoryCount), label: "Categories" },
  ];

  return (
    <>
      {/* -- Header -- */}
      <PageHeader
        title="Disease Catalog"
        subtitle={`Browse our comprehensive database of ${stats.totalDiseases.toLocaleString()} genetic conditions across ${stats.categoryCount} clinical categories`}
        breadcrumbs={[{ label: "Disease Catalog", href: "/diseases" }]}
        className="mb-8"
      />


      {/* -- Stats -- */}
      <m.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
        variants={containerVariants}
        className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {statItems.map(({ icon: Icon, value, label }) => (
          <m.div key={label} variants={catalogCardVariants}>
            <GlassCard
              variant="medium"
              hover="glow"
              rainbow
              className="relative overflow-hidden p-5 text-center"
            >
              <Icon className="mx-auto mb-2 h-5 w-5 text-[var(--accent-cyan)]" aria-hidden="true" />
              <AnimatedCounter value={value} />
              <div className="font-heading text-xs font-medium uppercase tracking-widest text-[var(--accent-cyan)]">
                {label}
              </div>
            </GlassCard>
          </m.div>
        ))}
      </m.div>

      {/* -- Search & Filters -- */}
      <m.div
        initial="hidden"
        animate="visible"
        variants={filterPanelVariants}
      >
        <GlassCard variant="subtle" hover="none" className="mb-8 p-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Search diseases, categories..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                aria-label="Search diseases"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SelectFilter
                options={categoryOptions}
                value={category}
                onChange={handleCategory}
                ariaLabel="Filter by category"
                className="w-full sm:w-auto sm:min-w-[160px]"
              />

              <SelectFilter
                options={inheritanceOptions}
                value={inheritance}
                onChange={handleInheritance}
                ariaLabel="Filter by inheritance model"
                className="w-full sm:w-auto sm:min-w-[180px]"
              />

              <SelectFilter
                options={severityOptions}
                value={severity}
                onChange={handleSeverity}
                ariaLabel="Filter by severity"
                className="w-full sm:w-auto sm:min-w-[140px]"
              />

              {hasActiveFilters && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    aria-label="Reset all filters"
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset
                  </Button>
                </m.div>
              )}
            </div>
          </div>
        </GlassCard>
      </m.div>

      <ScrollReveal>
      {/* -- Section heading for a11y: bridges h1 → h3 in disease cards -- */}
      <SectionHeading
        title="Browse Conditions"
        className="sr-only"
        id="disease-results-heading"
      />

      {/* -- Results count -- */}
      <p className="mb-4 text-center text-sm text-[var(--text-muted)]" role="status" aria-live="polite">
        Showing {paginated.length} of {filtered.length} diseases
        {search && (
          <>
            {" "}
            matching &ldquo;{search}&rdquo;
          </>
        )}
      </p>

      {/* -- Disease Grid or Empty State -- */}
      {paginated.length > 0 ? (
        <m.div
          key={`${category}-${inheritance}-${severity}-${search}-${safePage}`}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={containerVariants}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {paginated.map((disease: DiseaseEntry) => (
            <m.div key={disease.slug} variants={catalogCardVariants}>
              <Link
                href={`/diseases/${disease.slug}`}
                className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-teal)] rounded-[20px]"
              >
                <GlassCard
                  variant="medium"
                  hover="glow"
                  className="relative h-full overflow-hidden p-6 transition-all duration-300 group-hover:border-[rgba(6,214,160,0.25)]"
                >
                  {/* Severity side bar */}
                  {/* Gradient hex values are design-system severity colors:
                      high     → --accent-rose  (#f43f5e → #e11d48)
                      moderate → --accent-amber (#f59e0b → #d97706)
                      low      → --accent-teal  (#06d6a0 → #059669)
                      CSS variables cannot be interpolated inside a gradient string
                      because each gradient stop needs a resolved color, not a
                      theme-dependent variable that may differ between the two stops. */}
                  <div
                    className="absolute bottom-0 right-0 top-0 w-[3px] rounded-r-[20px]"
                    aria-hidden="true"
                    style={{
                      background:
                        disease.severity === "high"
                          ? "linear-gradient(180deg, #f43f5e, #e11d48)"
                          : disease.severity === "moderate"
                            ? "linear-gradient(180deg, #f59e0b, #d97706)"
                            : "linear-gradient(180deg, #06d6a0, #059669)",
                    }}
                  />

                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-heading text-base font-bold text-[var(--text-heading)] transition-colors group-hover:text-[var(--accent-teal)]">
                      {disease.name}
                    </h3>
                    <Badge variant={severityVariant(disease.severity)}>
                      {disease.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
                    {disease.description}
                  </p>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge variant={inheritanceVariant(disease.inheritance)}>
                      {disease.inheritance}
                    </Badge>
                    <Badge variant="default">{disease.category}</Badge>
                    <Badge
                      variant={
                        `confidence-${disease.confidence}` as
                          | "confidence-high"
                          | "confidence-medium"
                          | "confidence-low"
                      }
                    >
                      {disease.confidence} confidence
                    </Badge>
                  </div>

                  {/* SNP count + view link */}
                  <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3">
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {disease.snpCount} SNP{disease.snpCount !== 1 ? "s" : ""} tracked
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent-teal)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                      View details
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                </GlassCard>
              </Link>
            </m.div>
          ))}
        </m.div>
      ) : (
        /* -- Empty State -- */
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="py-16 text-center"
        >
          <Dna className="mx-auto mb-4 h-12 w-12 text-[var(--text-muted)] opacity-50" aria-hidden="true" />
          <h3 className="font-heading text-lg font-semibold text-[var(--text-heading)]">
            No diseases found
          </h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Try adjusting your search or filters to find what you&apos;re looking for
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="mt-4"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset All Filters
          </Button>
        </m.div>
      )}

      {/* -- Pagination -- */}
      {totalPages > 1 && (
        <nav aria-label="Disease catalog pagination" className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>

          {/* Page number pills */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and adjacent pages
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - safePage) <= 1) return true;
                return false;
              })
              .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                if (idx > 0) {
                  const prev = arr[idx - 1];
                  if (typeof prev === "number" && p - prev > 1) {
                    acc.push("ellipsis");
                  }
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-sm text-[var(--text-muted)]"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePageChange(item)}
                    aria-label={`Go to page ${item}`}
                    aria-current={item === safePage ? "page" : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                      item === safePage
                        ? "bg-[rgba(6,214,160,0.15)] text-[var(--accent-teal)] border border-[rgba(6,214,160,0.3)]"
                        : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}

      {/* -- Footer Note -- */}
      <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
        Showing a curated selection of {DISEASES.length} representative conditions from
        our full database of {stats.totalDiseases.toLocaleString()} genetic diseases.
        Each condition is sourced from ClinVar, OMIM, and peer-reviewed literature.
      </p>
      </ScrollReveal>
    </>
  );
}

/* -- Exported component (with Suspense for useSearchParams) -- */
export function CatalogContent() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center">
          <Dna className="mx-auto mb-4 h-8 w-8 animate-pulse text-[var(--accent-teal)]" />
          <p className="text-sm text-[var(--text-muted)]">Loading disease catalog...</p>
        </div>
      }
    >
      <DiseaseCatalogInner />
    </Suspense>
  );
}
