"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisProgress } from "@/components/genetics/analysis-progress";
import { ErrorBoundary } from "@/components/error-boundary";
import type { AnalysisStep } from "@/lib/stores/analysis-store";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnalysisProgressSectionProps {
  currentStep: AnalysisStep;
  onCancel: () => void;
}

// ─── Analysis Progress Section ───────────────────────────────────────────────

export function AnalysisProgressSection({
  currentStep,
  onCancel,
}: AnalysisProgressSectionProps) {
  return (
    <div className="mt-8 space-y-4">
      <ErrorBoundary
        fallback={
          <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 text-center text-sm text-[var(--text-muted)]">
            Failed to load analysis progress.
          </div>
        }
      >
        <AnalysisProgress currentStep={currentStep} />
      </ErrorBoundary>
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5">
          <XCircle className="h-4 w-4" />
          Cancel Analysis
        </Button>
      </div>
    </div>
  );
}
