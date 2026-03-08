'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { cn } from '@/lib/utils';

interface PunnettSquareProps {
  parentAAlleles: [string, string];
  parentBAlleles: [string, string];
  riskType?: 'carrier' | 'trait';
  className?: string;
}

type CellType = 'normal' | 'carrier' | 'affected';

function getCellType(
  a1: string,
  a2: string,
  allAlleles: Set<string>,
  riskType: 'carrier' | 'trait',
): CellType {
  if (a1 === a2 && allAlleles.size === 1) return 'normal';
  if (a1 === a2) {
    return riskType === 'carrier' ? 'affected' : 'normal';
  }
  return 'carrier';
}

function getCellLabel(type: CellType, riskType: 'carrier' | 'trait'): string {
  if (type === 'normal') return 'Unaffected';
  if (type === 'affected') return riskType === 'carrier' ? 'Affected' : 'Homozygous';
  return riskType === 'carrier' ? 'Carrier' : 'Heterozygous';
}

const CELL_STYLES: Record<CellType, string> = {
  normal: 'bg-[rgba(6,214,160,0.1)] text-accent-teal',
  carrier: 'bg-[rgba(245,158,11,0.1)] text-accent-amber',
  affected: 'bg-[rgba(244,63,94,0.1)] text-accent-rose',
};

export function PunnettSquare({
  parentAAlleles,
  parentBAlleles,
  riskType = 'carrier',
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
      const genotype = [aAllele, bAllele].sort().join('');
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
      className={cn('mx-auto max-w-[320px]', className)}
      role="table"
      aria-label="Punnett square showing offspring genotype probabilities"
    >
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-xl border border-(--border-subtle) bg-(--bg-elevated)">
        {/* Header row: corner + column headers */}
        <div role="row" className="flex gap-0.5">
          <div className="w-1/3 bg-transparent" role="cell" />
          <div
            className="font-heading flex w-1/3 items-center justify-center bg-(--bg-glass) px-3 py-2 text-sm font-bold text-(--text-heading)"
            role="columnheader"
          >
            {b1}
          </div>
          <div
            className="font-heading flex w-1/3 items-center justify-center bg-(--bg-glass) px-3 py-2 text-sm font-bold text-(--text-heading)"
            role="columnheader"
          >
            {b2}
          </div>
        </div>

        {/* Data rows — one per parent-A allele */}
        {[
          { header: a1, rowCells: cells.slice(0, 2), key: 'r1' },
          { header: a2, rowCells: cells.slice(2, 4), key: 'r2' },
        ].map(({ header, rowCells, key }) => (
          <div key={key} role="row" className="flex gap-0.5">
            <div
              className="font-heading flex w-1/3 items-center justify-center bg-(--bg-glass) px-3 py-2 text-sm font-bold text-(--text-heading)"
              role="rowheader"
            >
              {header}
            </div>
            {rowCells.map((cell, i) => (
              <div
                key={`${key}-${i}`}
                className={cn(
                  'w-1/3 rounded-sm p-2.5 text-center transition-transform hover:scale-[1.04]',
                  CELL_STYLES[cell.type],
                )}
                role="cell"
              >
                <div className="font-mono text-base font-bold">{cell.genotype}</div>
                <div className="mt-0.5 text-xs text-(--text-muted)">
                  {probabilities.get(cell.genotype)}%
                </div>
                <div className="mt-0.5 text-xs opacity-80">{cell.label}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
