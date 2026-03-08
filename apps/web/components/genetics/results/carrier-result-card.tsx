'use client';

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { memo } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { PunnettSquare } from '@/components/genetics/punnett-square';
import { CoverageMeter } from '@/components/genetics/results/coverage-meter';
import { ResidualRiskBadge } from '@/components/genetics/results/residual-risk-badge';
import { INHERITANCE_BADGE_MAP, RISK_LABELS } from '@/lib/genetics-constants';
import type { CarrierResult, CarrierStatus, XLinkedOffspringRisk } from '@mergenix/shared-types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isXLinkedRisk(risk: CarrierResult['offspringRisk']): risk is XLinkedOffspringRisk {
  return 'sons' in risk && 'daughters' in risk;
}

function bothParentsCarriers(result: CarrierResult): boolean {
  return (
    (result.parentAStatus === 'carrier' || result.parentAStatus === 'affected') &&
    (result.parentBStatus === 'carrier' || result.parentBStatus === 'affected')
  );
}

function statusToAlleles(status: CarrierStatus): [string, string] {
  switch (status) {
    case 'affected':
      return ['p', 'p'];
    case 'carrier':
      return ['N', 'p'];
    default:
      return ['N', 'N'];
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CarrierResultCardProps {
  result: CarrierResult;
  index: number;
  totalItems: number;
  isExpanded: boolean;
  onToggleExpand: (rsid: string) => void;
  canShowOffspring: boolean;
  coveragePct: number;
  confidenceLevel: string;
  hasCoverage: boolean;
  coverageVariantsTested: number;
  coverageVariantsTotal: number;
  isResearchMode: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const CarrierResultCard = memo(function CarrierResultCard({
  result,
  index,
  totalItems,
  isExpanded,
  onToggleExpand,
  canShowOffspring,
  coveragePct,
  confidenceLevel,
  hasCoverage,
  coverageVariantsTested,
  coverageVariantsTotal,
  isResearchMode,
}: CarrierResultCardProps) {
  const xLinked = isXLinkedRisk(result.offspringRisk);
  const isNotDetected =
    result.riskLevel === 'low_risk' &&
    result.parentAStatus === 'normal' &&
    result.parentBStatus === 'normal';

  return (
    <div key={result.rsid} aria-setsize={totalItems} aria-posinset={index + 1} className="pb-3">
      <GlassCard variant="medium" hover="none" className="p-5">
        {/* Top row: condition + badges + offspring risk */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h4 className="font-heading text-base font-bold text-(--text-heading)">
              {result.condition}
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.severity}>{result.severity}</Badge>
              {!isResearchMode && (
                <>
                  <Badge
                    variant={
                      INHERITANCE_BADGE_MAP[result.inheritance] as
                        | 'autosomal-recessive'
                        | 'autosomal-dominant'
                        | 'x-linked'
                    }
                  >
                    {result.inheritance.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="default">
                    {RISK_LABELS[result.riskLevel] ?? result.riskLevel}
                  </Badge>
                  <ResidualRiskBadge
                    coveragePct={coveragePct}
                    diseaseName={result.condition}
                    isNotDetected={isNotDetected}
                  />
                </>
              )}
              {isResearchMode && (
                <Badge variant="outline" className="font-mono text-xs">
                  rsID: {result.rsid}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            {!isResearchMode ? (
              canShowOffspring ? (
                xLinked ? (
                  <div>
                    <p className="text-xs font-medium text-(--text-muted)">
                      <span className="text-accent-rose font-mono font-semibold">
                        {(result.offspringRisk as XLinkedOffspringRisk).sons.affected}%
                      </span>{' '}
                      sons
                    </p>
                    <p className="text-xs font-medium text-(--text-muted)">
                      <span className="text-accent-teal font-mono font-semibold">
                        {(result.offspringRisk as XLinkedOffspringRisk).daughters.affected}%
                      </span>{' '}
                      daughters
                    </p>
                    <p className="text-xs font-medium tracking-widest text-(--text-muted) uppercase">
                      Affected Risk
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className={`font-heading text-2xl font-extrabold ${
                        result.offspringRisk.affected >= 25
                          ? 'text-accent-rose'
                          : result.offspringRisk.affected > 0
                            ? 'text-accent-amber'
                            : 'text-accent-teal'
                      }`}
                    >
                      {result.offspringRisk.affected}%
                    </p>
                    <p className="text-xs font-medium tracking-widest text-(--text-muted) uppercase">
                      Offspring Risk
                    </p>
                  </>
                )
              ) : (
                <div
                  className="flex flex-col items-end gap-1"
                  title="Upgrade to Pro for offspring risk predictions"
                >
                  <Lock className="text-accent-violet h-4 w-4" aria-hidden="true" />
                  <span className="text-accent-violet text-xs font-medium">Pro</span>
                  <p className="text-xs font-medium tracking-widest text-(--text-muted) uppercase">
                    Offspring Risk
                  </p>
                </div>
              )
            ) : (
              <div className="text-right">
                <span className="font-mono text-sm text-(--text-muted)">{result.gene}</span>
                <p className="text-xs font-medium tracking-widest text-(--text-muted) uppercase">
                  Gene
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coverage meter */}
        {hasCoverage && (
          <div className="mt-3">
            <CoverageMeter
              variantsTested={coverageVariantsTested}
              variantsTotal={coverageVariantsTotal}
              coveragePct={coveragePct}
              confidenceLevel={confidenceLevel}
              diseaseName={result.condition}
            />
          </div>
        )}

        {/* Parent statuses */}
        <div className="mt-3 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-(--text-body)">
            <span className="font-medium">Parent A:</span>
            {isResearchMode ? (
              <code className="rounded-sm bg-(--bg-elevated) px-1.5 py-0.5 font-mono text-xs">
                {result.parentAGenotype?.split('').join('/') ?? '--'}
              </code>
            ) : (
              <Badge variant={result.parentAStatus as 'carrier' | 'affected' | 'normal'}>
                {result.parentAStatus}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-(--text-body)">
            <span className="font-medium">Parent B:</span>
            {isResearchMode ? (
              <code className="rounded-sm bg-(--bg-elevated) px-1.5 py-0.5 font-mono text-xs">
                {result.parentBGenotype?.split('').join('/') ?? '--'}
              </code>
            ) : (
              <Badge variant={result.parentBStatus as 'carrier' | 'affected' | 'normal'}>
                {result.parentBStatus}
              </Badge>
            )}
          </div>
        </div>

        {/* Punnett square when both parents are carriers (Pro only) */}
        {bothParentsCarriers(result) && canShowOffspring && (
          <div className="mt-4">
            <PunnettSquare
              parentAAlleles={statusToAlleles(result.parentAStatus)}
              parentBAlleles={statusToAlleles(result.parentBStatus)}
              riskType="carrier"
            />
          </div>
        )}

        {/* Expandable detail section */}
        <button
          type="button"
          onClick={() => onToggleExpand(result.rsid)}
          className="mt-3 flex min-h-[44px] items-center gap-1 py-2 text-xs font-medium text-(--accent-teal) transition-colors hover:text-(--text-primary)"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${result.condition}`}
          aria-controls={`carrier-details-${result.rsid}`}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show Details
            </>
          )}
        </button>

        {isExpanded && (
          <div
            id={`carrier-details-${result.rsid}`}
            className="mt-3 space-y-3 border-t border-(--border-subtle) pt-3"
          >
            <div className="grid gap-2 text-sm text-(--text-body) sm:grid-cols-2">
              <div>
                <span className="font-semibold text-(--text-heading)">Gene: </span>
                {result.gene}
              </div>
              <div>
                <span className="font-semibold text-(--text-heading)">rsID: </span>
                <code className="rounded-sm bg-(--bg-elevated) px-1.5 py-0.5 font-mono text-xs">
                  {result.rsid}
                </code>
              </div>
            </div>

            {result.description && (
              <p className="text-sm leading-relaxed text-(--text-muted)">{result.description}</p>
            )}

            {/* Full risk breakdown (Pro only — offspring predictions are gated) */}
            {canShowOffspring ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wider text-(--text-heading) uppercase">
                  Offspring Risk Breakdown
                </p>

                {/* Mendelian context note */}
                <p className="text-xs leading-relaxed text-(--text-muted)">
                  Theoretical Mendelian probabilities. Actual outcomes may differ due to penetrance,
                  expressivity, and environmental factors.
                </p>

                {xLinked ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Sons */}
                    <GlassCard variant="subtle" hover="none" className="p-3">
                      <p className="mb-2 text-xs font-semibold text-(--text-heading)">Sons</p>
                      <div className="space-y-1 text-xs text-(--text-body)">
                        <div className="flex justify-between">
                          <span>Affected</span>
                          <span className="text-accent-rose font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).sons.affected}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carrier</span>
                          <span className="text-accent-amber font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).sons.carrier}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unaffected</span>
                          <span className="text-accent-teal font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).sons.normal}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Daughters */}
                    <GlassCard variant="subtle" hover="none" className="p-3">
                      <p className="mb-2 text-xs font-semibold text-(--text-heading)">Daughters</p>
                      <div className="space-y-1 text-xs text-(--text-body)">
                        <div className="flex justify-between">
                          <span>Affected</span>
                          <span className="text-accent-rose font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).daughters.affected}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Carrier</span>
                          <span className="text-accent-amber font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).daughters.carrier}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unaffected</span>
                          <span className="text-accent-teal font-mono font-semibold">
                            {(result.offspringRisk as XLinkedOffspringRisk).daughters.normal}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ) : (
                  <GlassCard variant="subtle" hover="none" className="p-3">
                    <div className="space-y-1 text-xs text-(--text-body)">
                      <div className="flex justify-between">
                        <span>Affected</span>
                        <span className="text-accent-rose font-mono font-semibold">
                          {result.offspringRisk.affected}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carrier</span>
                        <span className="text-accent-amber font-mono font-semibold">
                          {result.offspringRisk.carrier}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unaffected</span>
                        <span className="text-accent-teal font-mono font-semibold">
                          {result.offspringRisk.normal}%
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            ) : (
              <GlassCard
                variant="subtle"
                hover="none"
                className="flex items-center gap-3 border-[rgba(139,92,246,0.15)] bg-[rgba(139,92,246,0.04)] p-3"
              >
                <Lock className="text-accent-violet h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="text-xs text-(--text-muted)">
                  Offspring risk breakdown is available on the{' '}
                  <span className="text-accent-violet font-semibold">Pro</span> plan.
                </p>
              </GlassCard>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
});
