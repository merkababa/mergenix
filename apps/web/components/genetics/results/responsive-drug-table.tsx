import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { VariantCard, levelBadgeVariant } from "./variant-card";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DrugEntry {
  name: string;
  recommendation: string;
  level: string;
}

export interface GeneRow {
  gene: string;
  diplotype: string;
  phenotype: string;
  drugs: DrugEntry[];
}

export interface ResponsiveDrugTableProps {
  genes: GeneRow[];
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Responsive drug/gene table.
 *
 * Uses CSS-only responsive switching to avoid hydration mismatches:
 * - Desktop (>=768px): proper `<table>` with headers (hidden md:block).
 * - Mobile  (<768px):  stacked `<VariantCard>` list (block md:hidden).
 *
 * Both views are always in the DOM; Tailwind classes control visibility.
 */
export const ResponsiveDrugTable = memo(function ResponsiveDrugTable({
  genes,
  className,
}: ResponsiveDrugTableProps) {
  if (genes.length === 0) return null;

  return (
    <div className={className}>
      {/* Mobile: stacked cards */}
      <div className="block space-y-4 md:hidden">
        {genes.map((g) => (
          <VariantCard
            key={g.gene}
            geneName={g.gene}
            diplotype={g.diplotype}
            phenotype={g.phenotype}
            drugs={g.drugs}
          />
        ))}
      </div>

      {/* Desktop: table */}
      <div
        className="hidden overflow-x-auto md:block"
        tabIndex={0}
        role="region"
        aria-label="Gene drug interaction table"
      >
        <table className="w-full text-left text-xs">
          <caption className="sr-only">
            Pharmacogenomic gene variants and drug recommendations
          </caption>
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
              <th scope="col" className="pb-2 pr-3 font-medium">Gene</th>
              <th scope="col" className="pb-2 pr-3 font-medium">Diplotype</th>
              <th scope="col" className="pb-2 pr-3 font-medium">Phenotype</th>
              <th scope="col" className="pb-2 pr-3 font-medium">Affected Drugs</th>
              <th scope="col" className="pb-2 font-medium">Recommendation</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text-body)]">
            {genes.map((g) =>
              g.drugs.length > 0 ? (
                g.drugs.map((drug, i) => (
                  <tr
                    key={`${g.gene}-${drug.name}`}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    {/* Only show gene info in first drug row */}
                    {i === 0 ? (
                      <>
                        <td
                          className="py-2 pr-3 font-heading font-bold text-[#06b6d4]"
                          rowSpan={g.drugs.length}
                        >
                          {g.gene}
                        </td>
                        <td className="py-2 pr-3" rowSpan={g.drugs.length}>
                          <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono">
                            {g.diplotype}
                          </code>
                        </td>
                        <td
                          className="py-2 pr-3 text-[var(--text-muted)]"
                          rowSpan={g.drugs.length}
                        >
                          {g.phenotype}
                        </td>
                      </>
                    ) : null}
                    <td className="py-2 pr-3 font-medium">
                      {drug.name}
                      <span className="ml-2">
                        <Badge variant={levelBadgeVariant(drug.level)}>
                          {drug.level}
                        </Badge>
                      </span>
                    </td>
                    <td className="py-2">{drug.recommendation}</td>
                  </tr>
                ))
              ) : (
                <tr
                  key={g.gene}
                  className="border-b border-[var(--border-subtle)] last:border-0"
                >
                  <td className="py-2 pr-3 font-heading font-bold text-[#06b6d4]">
                    {g.gene}
                  </td>
                  <td className="py-2 pr-3">
                    <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono">
                      {g.diplotype}
                    </code>
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-muted)]">
                    {g.phenotype}
                  </td>
                  <td className="py-2 pr-3 text-[var(--text-muted)]" colSpan={2}>
                    No drug interactions found
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
