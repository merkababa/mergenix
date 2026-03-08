'use client';

import { AlertTriangle, Save, Microscope, Dna, Pill, BarChart3, Heart } from 'lucide-react';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/error-boundary';
import { PdfExportButton } from '@/components/genetics/results/pdf-export-button';
import { StaleResultsBanner } from '@/components/genetics/results/stale-results-banner';
import type { FullAnalysisResult } from '@mergenix/shared-types';
import type { ResultTab } from '@/lib/stores/analysis-store';

// ─── Lazy Tab Components (M5: code-split with next/dynamic) ─────────────────

const OverviewTab = dynamic(() =>
  import('@/components/genetics/results/overview-tab').then((m) => ({ default: m.OverviewTab })),
);
const CarrierTab = dynamic(() =>
  import('@/components/genetics/results/carrier-tab').then((m) => ({ default: m.CarrierTab })),
);
const TraitsTab = dynamic(() =>
  import('@/components/genetics/results/traits-tab').then((m) => ({ default: m.TraitsTab })),
);
const PgxTab = dynamic(() =>
  import('@/components/genetics/results/pgx-tab').then((m) => ({ default: m.PgxTab })),
);
const PrsTab = dynamic(() =>
  import('@/components/genetics/results/prs-tab').then((m) => ({ default: m.PrsTab })),
);
const CounselingTab = dynamic(() =>
  import('@/components/genetics/results/counseling-tab').then((m) => ({
    default: m.CounselingTab,
  })),
);

// ─── Tab Configuration ──────────────────────────────────────────────────────

export const RESULT_TABS: {
  key: ResultTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'carrier', label: 'Carrier Risk', icon: Microscope },
  { key: 'traits', label: 'Traits', icon: Dna },
  { key: 'pgx', label: 'PGx', icon: Pill },
  { key: 'prs', label: 'PRS', icon: BarChart3 },
  { key: 'counseling', label: 'Counseling', icon: Heart },
];

// ─── Tab Error Fallback ──────────────────────────────────────────────────────

function TabErrorFallback({ label }: { label: string }) {
  return (
    <div className="rounded-glass border border-(--border-subtle) bg-(--bg-elevated) p-6 text-center">
      <p className="text-sm text-(--text-muted)">Failed to load {label}.</p>
    </div>
  );
}

// ─── Tab Content Renderer ────────────────────────────────────────────────────

function TabContent({ tab }: { tab: ResultTab }) {
  switch (tab) {
    case 'overview':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="overview results" />}>
          <OverviewTab />
        </ErrorBoundary>
      );
    case 'carrier':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="carrier results" />}>
          <CarrierTab />
        </ErrorBoundary>
      );
    case 'traits':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="trait predictions" />}>
          <TraitsTab />
        </ErrorBoundary>
      );
    case 'pgx':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="pharmacogenomic results" />}>
          <PgxTab />
        </ErrorBoundary>
      );
    case 'prs':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="polygenic risk scores" />}>
          <PrsTab />
        </ErrorBoundary>
      );
    case 'counseling':
      return (
        <ErrorBoundary fallback={<TabErrorFallback label="counseling recommendations" />}>
          <CounselingTab />
        </ErrorBoundary>
      );
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisResultsSectionProps {
  activeTab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  fullResults: FullAnalysisResult | null;
  isDemo: boolean;
  onReset: () => void;
  onSave: () => void;
  onTabKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

// ─── Analysis Results Section ────────────────────────────────────────────────

export function AnalysisResultsSection({
  activeTab,
  onTabChange,
  fullResults,
  isDemo,
  onReset,
  onSave,
  onTabKeyDown,
}: AnalysisResultsSectionProps) {
  return (
    <div className="mt-8 space-y-6">
      {/* Demo banner + upgrade CTA (Business #5) */}
      {isDemo && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="flex items-center gap-3 border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)] p-4"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-(--accent-amber)" />
          <div className="flex-1">
            <p className="text-sm text-(--text-body)">
              You&apos;re viewing demo results with synthetic data.
            </p>
            <p className="mt-1 text-sm font-medium text-(--accent-teal)">
              Ready to analyze your own DNA?
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            Upload Your Files
          </Button>
        </GlassCard>
      )}

      {/* Stale results warning (shown when data version mismatch) */}
      <StaleResultsBanner dataVersion={fullResults?.metadata?.dataVersion} />

      {/* Action bar: Save Options + PDF Export + New Analysis */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onSave} className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Results
          </Button>
          {fullResults && <PdfExportButton result={fullResults} />}
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          New Analysis
        </Button>
      </div>

      {/* Result tabs */}
      <GlassCard variant="subtle" hover="none" className="p-1.5">
        {/* H3: single onKeyDown on tablist container for event delegation */}
        <div className="relative">
          <div
            className="scrollbar-none flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Analysis results"
            onKeyDown={onTabKeyDown}
          >
            {RESULT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`tab-${tab.key}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.key}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onTabChange(tab.key)}
                  className={`font-heading flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'from-accent-teal to-day-accent-teal text-bio-deep bg-linear-to-r font-bold shadow-[0_2px_12px_rgba(6,214,160,0.3)]'
                      : 'text-(--text-muted) hover:bg-[rgba(6,214,160,0.06)] hover:text-(--accent-teal)'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-linear-to-l from-(--bg-glass) to-transparent"
            aria-hidden="true"
          />
        </div>
      </GlassCard>

      {/* M7: visually hidden heading for accessibility hierarchy */}
      <h2 className="sr-only">Analysis Results</h2>

      {/* Tab content */}
      <div id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
