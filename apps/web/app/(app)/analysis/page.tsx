"use client";

import { useCallback } from "react";
import {
  Microscope,
  Dna,
  Pill,
  BarChart3,
  Heart,
  ChevronRight,
  AlertTriangle,
  Lock,
  XCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/genetics/file-dropzone";
import { AnalysisProgress } from "@/components/genetics/analysis-progress";
import { PopulationSelector } from "@/components/genetics/population-selector";
import { useAnalysisStore } from "@/lib/stores/analysis-store";
import type { GeneticFileFormat, ResultTab } from "@/lib/stores/analysis-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useGeneticsWorker } from "@/hooks/use-genetics-worker";
import { SaveResultDialog } from "@/components/analysis/save-result-dialog";
import { SavedResultsList } from "@/components/analysis/saved-results-list";

// ─── Lazy Tab Components (M5: code-split with next/dynamic) ─────────────────

const OverviewTab = dynamic(
  () => import("@/components/genetics/results/overview-tab").then((m) => ({ default: m.OverviewTab })),
);
const CarrierTab = dynamic(
  () => import("@/components/genetics/results/carrier-tab").then((m) => ({ default: m.CarrierTab })),
);
const TraitsTab = dynamic(
  () => import("@/components/genetics/results/traits-tab").then((m) => ({ default: m.TraitsTab })),
);
const PgxTab = dynamic(
  () => import("@/components/genetics/results/pgx-tab").then((m) => ({ default: m.PgxTab })),
);
const PrsTab = dynamic(
  () => import("@/components/genetics/results/prs-tab").then((m) => ({ default: m.PrsTab })),
);
const CounselingTab = dynamic(
  () => import("@/components/genetics/results/counseling-tab").then((m) => ({ default: m.CounselingTab })),
);

// ─── Tab Configuration ──────────────────────────────────────────────────────

const RESULT_TABS: { key: ResultTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "carrier", label: "Carrier Risk", icon: Microscope },
  { key: "traits", label: "Traits", icon: Dna },
  { key: "pgx", label: "PGx", icon: Pill },
  { key: "prs", label: "PRS", icon: BarChart3 },
  { key: "counseling", label: "Counseling", icon: Heart },
];

// ─── Tab Content Renderer ───────────────────────────────────────────────────

function TabContent({ tab }: { tab: ResultTab }) {
  switch (tab) {
    case "overview":
      return <OverviewTab />;
    case "carrier":
      return <CarrierTab />;
    case "traits":
      return <TraitsTab />;
    case "pgx":
      return <PgxTab />;
    case "prs":
      return <PrsTab />;
    case "counseling":
      return <CounselingTab />;
  }
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AnalysisPage() {
  // ── Store selectors ────────────────────────────────────────────────────
  const parentA = useAnalysisStore((s) => s.parentA);
  const parentB = useAnalysisStore((s) => s.parentB);
  const currentStep = useAnalysisStore((s) => s.currentStep);
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const isDemo = useAnalysisStore((s) => s.isDemo);
  const errorMessage = useAnalysisStore((s) => s.errorMessage);

  const setParentA = useAnalysisStore((s) => s.setParentA);
  const setParentB = useAnalysisStore((s) => s.setParentB);
  const setParentAFile = useAnalysisStore((s) => s.setParentAFile);
  const setParentBFile = useAnalysisStore((s) => s.setParentBFile);
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);
  const setDemoResults = useAnalysisStore((s) => s.setDemoResults);
  const reset = useAnalysisStore((s) => s.reset);

  const user = useAuthStore((s) => s.user);
  const userTier = user?.tier ?? "free";

  // ── Worker hook ────────────────────────────────────────────────────────
  const { startAnalysis, cancel } = useGeneticsWorker();

  // ── Handlers (H2: stable useCallback references) ─────────────────────

  const handleFileSelectA = useCallback(
    (file: File, format: GeneticFileFormat) => {
      setParentA({ name: file.name, format, size: file.size, snpCount: null });
      setParentAFile(file);
    },
    [setParentA, setParentAFile],
  );

  const handleFileSelectB = useCallback(
    (file: File, format: GeneticFileFormat) => {
      setParentB({ name: file.name, format, size: file.size, snpCount: null });
      setParentBFile(file);
    },
    [setParentB, setParentBFile],
  );

  const handleStartAnalysis = useCallback(() => {
    const fileA = useAnalysisStore.getState().parentAFile;
    const fileB = useAnalysisStore.getState().parentBFile;
    if (fileA && fileB) startAnalysis(fileA, fileB);
  }, [startAnalysis]);

  const handleViewDemo = useCallback(async () => {
    try {
      const { DEMO_RESULTS } = await import("@/lib/data/demo-results");
      setDemoResults(DEMO_RESULTS);
    } catch {
      useAnalysisStore.getState().setError("Failed to load demo data. Please refresh and try again.");
    }
  }, [setDemoResults]);

  const handleReset = useCallback(() => reset(), [reset]);

  // H3: single delegated keyboard handler for the tablist
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabs = RESULT_TABS;
      const currentIndex = tabs.findIndex((t) => t.key === activeTab);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        setActiveTab(tabs[nextIndex].key);
        document.getElementById(`tab-${tabs[nextIndex].key}`)?.focus();
      }
    },
    [activeTab, setActiveTab],
  );

  // ── Derived state ──────────────────────────────────────────────────────
  const isIdle = currentStep === "idle";
  const isComplete = currentStep === "complete";
  const isRunning = !isIdle && !isComplete;
  const bothFilesSelected = parentA !== null && parentB !== null;

  return (
    <section aria-label="Genetic Analysis">
      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <h1 className="gradient-text font-heading text-3xl font-extrabold md:text-4xl">
          Genetic Analysis
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-[var(--text-muted)]">
          Upload both parents&apos; DNA files to predict offspring disease risk, traits, and more
        </p>
      </div>

      {/* ── Dynamic tier notice (Business #4) ── */}
      {!isDemo && userTier !== "pro" && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="mb-8 flex items-center gap-3 border-[rgba(245,158,11,0.15)] p-4"
        >
          <Lock className="h-5 w-5 flex-shrink-0 text-[var(--accent-amber)]" />
          <div className="flex-1">
            <p className="text-sm text-[var(--text-body)]">
              {userTier === "premium" ? (
                <>
                  <span className="font-semibold">Premium tier</span> &mdash;{" "}
                  <span className="text-[var(--accent-teal)]">
                    Upgrade to Pro for genetic counseling referrals.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold">Free tier:</span> Top 25 diseases + 10 traits.{" "}
                  <span className="text-[var(--accent-teal)]">
                    Upgrade for full 2,715 disease screening.
                  </span>
                </>
              )}
            </p>
          </div>
          <Link href="/subscription">
            <Button variant="outline" size="sm">
              Upgrade
            </Button>
          </Link>
        </GlassCard>
      )}

      {/* ── File Upload Section ── */}
      {isIdle && (
        <div className="grid gap-6 md:grid-cols-2">
          <FileDropzone
            label="Parent A (Mother)"
            onFileSelect={handleFileSelectA}
            selectedFile={parentA}
          />
          <FileDropzone
            label="Parent B (Father)"
            onFileSelect={handleFileSelectB}
            selectedFile={parentB}
          />
        </div>
      )}

      {/* ── Population Selector ── */}
      {isIdle && bothFilesSelected && (
        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
            Ancestral Population (optional)
          </label>
          <PopulationSelector />
        </div>
      )}

      {/* ── Start Analysis ── */}
      {isIdle && bothFilesSelected && (
        <div className="mt-8 text-center">
          <Button size="xl" variant="primary" onClick={handleStartAnalysis}>
            Start Analysis
            <ChevronRight className="h-5 w-5" />
          </Button>
          {/* Privacy trust badge (Business #7) */}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[var(--text-dim)]">
            <Shield className="h-3.5 w-3.5 text-[var(--accent-teal)]" />
            Analysis runs entirely in your browser. No data is sent to our servers.
          </p>
        </div>
      )}

      {/* ── Demo button (Business #6: prominent) ── */}
      {isIdle && !parentA && !parentB && (
        <div className="mt-8 text-center">
          <Button variant="outline" size="md" onClick={handleViewDemo}>
            <Dna className="h-4 w-4" />
            Try Demo Analysis
          </Button>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            See sample results with synthetic DNA data
          </p>
        </div>
      )}

      {/* ── Progress + Cancel ── */}
      {isRunning && (
        <div className="mt-8 space-y-4">
          <AnalysisProgress currentStep={currentStep} />
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={cancel} className="gap-1.5">
              <XCircle className="h-4 w-4" />
              Cancel Analysis
            </Button>
          </div>
        </div>
      )}

      {/* ── Error Display ── */}
      {errorMessage && (
        <GlassCard
          variant="subtle"
          hover="none"
          className="mt-8 flex items-center gap-3 border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.04)] p-4"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--accent-rose)]" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-body)]">Analysis Error</p>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">{errorMessage}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Try Again
          </Button>
        </GlassCard>
      )}

      {/* ── Saved Analyses (shown when idle and authenticated) ── */}
      {isIdle && (
        <div className="mt-8">
          <SavedResultsList />
        </div>
      )}

      {/* ── Results Dashboard ── */}
      {isComplete && (
        <div className="mt-8 space-y-6">
          {/* Demo banner + upgrade CTA (Business #5) */}
          {isDemo && (
            <GlassCard
              variant="subtle"
              hover="none"
              className="flex items-center gap-3 border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)] p-4"
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-[var(--accent-amber)]" />
              <div className="flex-1">
                <p className="text-sm text-[var(--text-body)]">
                  You&apos;re viewing demo results with synthetic data.
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--accent-teal)]">
                  Ready to analyze your own DNA?
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Upload Your Files
              </Button>
            </GlassCard>
          )}

          {/* Action bar: Save + New Analysis */}
          <div className="flex items-center justify-between">
            <SaveResultDialog />
            <Button variant="outline" size="sm" onClick={handleReset}>
              New Analysis
            </Button>
          </div>

          {/* Result tabs */}
          <GlassCard variant="subtle" hover="none" className="p-1.5">
            {/* H3: single onKeyDown on tablist container for event delegation */}
            <div
              className="flex gap-1 overflow-x-auto"
              role="tablist"
              aria-label="Analysis results"
              onKeyDown={handleTabKeyDown}
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
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 font-heading text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#06d6a0] to-[#059669] font-bold text-[#050810] shadow-[0_2px_12px_rgba(6,214,160,0.3)]"
                        : "text-[var(--text-muted)] hover:bg-[rgba(6,214,160,0.06)] hover:text-[var(--accent-teal)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* M7: visually hidden heading for accessibility hierarchy */}
          <h2 className="sr-only">Analysis Results</h2>

          {/* Tab content */}
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            <TabContent tab={activeTab} />
          </div>
        </div>
      )}
    </section>
  );
}
