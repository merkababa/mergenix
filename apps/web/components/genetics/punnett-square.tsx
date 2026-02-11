"use client";

import { cn } from "@/lib/utils";

interface PunnettSquareProps {
  parentAAlleles: [string, string];
  parentBAlleles: [string, string];
  riskType?: "carrier" | "trait";
  className?: string;
}

type CellType = "normal" | "carrier" | "affected";

function getCellType(
  a1: string,
  a2: string,
  allAlleles: Set<string>,
  riskType: "carrier" | "trait",
): CellType {
  if (a1 === a2 && allAlleles.size === 1) return "normal";
  if (a1 === a2) {
    return riskType === "carrier" ? "affected" : "normal";
  }
  return "carrier";
}

function getCellLabel(type: CellType, riskType: "carrier" | "trait"): string {
  if (type === "normal") return "Unaffected";
  if (type === "affected") return riskType === "carrier" ? "Affected" : "Homozygous";
  return riskType === "carrier" ? "Carrier" : "Heterozygous";
}

const CELL_STYLES: Record<CellType, string> = {
  normal: "bg-[rgba(6,214,160,0.1)] text-[#06d6a0]",
  carrier: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
  affected: "bg-[rgba(244,63,94,0.1)] text-[#f43f5e]",
};

export function PunnettSquare({
  parentAAlleles,
  parentBAlleles,
  riskType = "carrier",
  className,
}: PunnettSquareProps) {
  const [a1, a2] = parentAAlleles;
  const [b1, b2] = parentBAlleles;
  const allAlleles = new Set([...parentAAlleles, ...parentBAlleles]);

  // Build 2x2 grid
  const cells: {
    genotype: string;
    type: CellType;
    label: string;
  }[] = [];

  for (const aAllele of parentAAlleles) {
    for (const bAllele of parentBAlleles) {
      const genotype = [aAllele, bAllele].sort().join("");
      const type = getCellType(aAllele, bAllele, allAlleles, riskType);
      const label = getCellLabel(type, riskType);
      cells.push({ genotype, type, label });
    }
  }

  // Count probabilities
  const counts = new Map<string, number>();
  for (const cell of cells) {
    counts.set(cell.genotype, (counts.get(cell.genotype) || 0) + 1);
  }
  const probabilities = new Map<string, number>();
  for (const [geno, count] of counts) {
    probabilities.set(geno, (count / 4) * 100);
  }

  return (
    <div
      className={cn("mx-auto max-w-[320px]", className)}
      role="table"
      aria-label="Punnett square showing offspring genotype probabilities"
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-0.5 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        {/* Corner */}
        <div className="bg-transparent" role="cell" />

        {/* Column headers */}
        <div
          className="flex items-center justify-center bg-[var(--bg-glass)] px-3 py-2 font-heading text-sm font-bold text-[var(--text-heading)]"
          role="columnheader"
        >
          {b1}
        </div>
        <div
          className="flex items-center justify-center bg-[var(--bg-glass)] px-3 py-2 font-heading text-sm font-bold text-[var(--text-heading)]"
          role="columnheader"
        >
          {b2}
        </div>

        {/* Row 1 */}
        <div
          className="flex items-center justify-center bg-[var(--bg-glass)] px-3 py-2 font-heading text-sm font-bold text-[var(--text-heading)]"
          role="rowheader"
        >
          {a1}
        </div>
        {cells.slice(0, 2).map((cell, i) => (
          <div
            key={`r1-${i}`}
            className={cn(
              "rounded p-2.5 text-center transition-transform hover:scale-[1.04]",
              CELL_STYLES[cell.type],
            )}
            role="cell"
          >
            <div className="font-mono text-base font-bold">{cell.genotype}</div>
            <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {probabilities.get(cell.genotype)}%
            </div>
            <div className="mt-0.5 text-[10px] opacity-80">{cell.label}</div>
          </div>
        ))}

        {/* Row 2 */}
        <div
          className="flex items-center justify-center bg-[var(--bg-glass)] px-3 py-2 font-heading text-sm font-bold text-[var(--text-heading)]"
          role="rowheader"
        >
          {a2}
        </div>
        {cells.slice(2, 4).map((cell, i) => (
          <div
            key={`r2-${i}`}
            className={cn(
              "rounded p-2.5 text-center transition-transform hover:scale-[1.04]",
              CELL_STYLES[cell.type],
            )}
            role="cell"
          >
            <div className="font-mono text-base font-bold">{cell.genotype}</div>
            <div className="mt-0.5 text-[10px] text-[var(--text-muted)]">
              {probabilities.get(cell.genotype)}%
            </div>
            <div className="mt-0.5 text-[10px] opacity-80">{cell.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
