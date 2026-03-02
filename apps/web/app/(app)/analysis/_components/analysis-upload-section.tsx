"use client";

import { Dna, ChevronRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoupleUploadCard } from "@/components/genetics/couple-upload-card";
import { PopulationSelector } from "@/components/genetics/population-selector";
import { ErrorBoundary } from "@/components/error-boundary";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisUploadSectionProps {
  hasParentA: boolean;
  hasParentB: boolean;
  parentAFile: File | null;
  parentBFile: File | null;
  onFileSelectA: (file: File | null) => void;
  onFileSelectB: (file: File | null) => void;
  onStartAnalysis: () => void;
  onViewDemo: () => void;
  bothFilesSelected: boolean;
  canStartAnalysis: boolean;
  disabled?: boolean;
}

// ─── Analysis Upload Section ─────────────────────────────────────────────────

export function AnalysisUploadSection({
  hasParentA,
  hasParentB,
  parentAFile,
  parentBFile,
  onFileSelectA,
  onFileSelectB,
  onStartAnalysis,
  onViewDemo,
  bothFilesSelected,
  canStartAnalysis,
  disabled = false,
}: AnalysisUploadSectionProps) {
  return (
    <>
      {/* ── File Upload Card ── */}
      <ErrorBoundary
        fallback={
          <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--text-muted)]">
            Failed to load file upload. Please refresh.
          </div>
        }
      >
        <CoupleUploadCard
          parentAFile={parentAFile}
          parentBFile={parentBFile}
          onFileSelectA={onFileSelectA}
          onFileSelectB={onFileSelectB}
          disabled={disabled}
        />
      </ErrorBoundary>

      {/* ── Population Selector ── */}
      {bothFilesSelected && (
        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
            Ancestral Population (optional)
          </label>
          <PopulationSelector />
        </div>
      )}

      {/* ── Start Analysis ── */}
      {bothFilesSelected && (
        <div className="mt-8 text-center">
          <Button
            size="xl"
            variant="primary"
            onClick={onStartAnalysis}
            disabled={!canStartAnalysis}
          >
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
      {!hasParentA && !hasParentB && (
        <div className="mt-8 text-center">
          <Button variant="outline" size="md" onClick={onViewDemo}>
            <Dna className="h-4 w-4" />
            Try Demo Analysis
          </Button>
          <p className="mt-2 text-xs text-[var(--text-dim)]">
            See sample results with synthetic DNA data
          </p>
        </div>
      )}
    </>
  );
}
