"use client";

// PRIVACY: This file MUST remain client-side. DNA data must NEVER reach the server.

import { useEffect, useRef } from "react";
import { m } from "motion/react";
import { Check, CheckCircle, FileSearch, Microscope, Dna, Pill, BarChart3, Globe, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_ORDER, type AnalysisStep } from "@/lib/stores/analysis-store";
import { useAnnouncerStore } from "@/lib/stores/announcer-store";

const STEPS: {
  key: AnalysisStep;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "parsing", label: "Parse", description: "Validating files...", icon: FileSearch },
  { key: "carrier_analysis", label: "Carrier", description: "Screening carrier risk...", icon: Microscope },
  { key: "trait_prediction", label: "Traits", description: "Predicting traits...", icon: Dna },
  { key: "pharmacogenomics", label: "PGx", description: "Pharmacogenomic analysis...", icon: Pill },
  { key: "polygenic_risk", label: "PRS", description: "Polygenic risk scoring...", icon: BarChart3 },
  { key: "ethnicity_adjustment", label: "Ethnicity", description: "Adjusting for population...", icon: Globe },
  { key: "counseling_triage", label: "Counseling", description: "Triaging counseling needs...", icon: Heart },
  { key: "complete", label: "Complete", description: "Analysis complete!", icon: CheckCircle },
];

/** Human-readable stage descriptions for screen readers. */
const STAGE_ANNOUNCEMENTS: Partial<Record<AnalysisStep, string>> = {
  idle: "",
  initializing: "Initializing analysis engine",
  decompressing: "Decompressing genetic files",
  parsing: "Step 1 of 8: Parsing genetic files",
  strand_harmonization: "Harmonizing DNA strands",
  build_detection: "Detecting genome build",
  liftover: "Performing liftover conversion",
  carrier_analysis: "Step 2 of 8: Analyzing carrier status",
  trait_prediction: "Step 3 of 8: Predicting traits",
  pharmacogenomics: "Step 4 of 8: Analyzing drug interactions",
  polygenic_risk: "Step 5 of 8: Calculating risk scores",
  ethnicity_adjustment: "Step 6 of 8: Adjusting for population",
  counseling_triage: "Step 7 of 8: Generating recommendations",
  complete: "Analysis complete",
};

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  className?: string;
}

export function AnalysisProgress({ currentStep, className }: AnalysisProgressProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const previousStepRef = useRef<AnalysisStep>(currentStep);
  const announce = useAnnouncerStore((s) => s.announce);

  const activeStep = STEPS.find((s) => s.key === currentStep);
  const activeDescription = activeStep?.description || "Preparing...";

  // Track the aria-live announcement text — only updated on stage transitions
  const stageAnnouncement = STAGE_ANNOUNCEMENTS[currentStep] ?? "";

  // Announce stage transitions to screen readers via the global announcer
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      previousStepRef.current = currentStep;

      if (currentStep === "complete") {
        announce("Analysis complete. Results are ready.", "polite");
      }
    }
  }, [currentStep, announce]);

  return (
    <div
      className={cn(
        "rounded-glass border border-(--border-subtle) bg-(--bg-glass) p-6",
        "[backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]",
        className,
      )}
      role="progressbar"
      aria-label={`Analysis progress: ${activeDescription}`}
      aria-valuenow={currentIndex}
      aria-valuemin={0}
      aria-valuemax={STEPS.length}
    >
      {/* Visually hidden aria-live region for stage transition announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
        }}
        data-testid="analysis-progress-live"
      >
        {stageAnnouncement}
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const stepIndex = STEP_ORDER.indexOf(step.key);
          const isCompleted = currentIndex > stepIndex;
          const isActive = step.key === currentStep;
          const isPending = currentIndex < stepIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <m.div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isCompleted &&
                      "border-accent-teal bg-linear-to-br from-accent-teal to-day-accent-teal text-bio-deep",
                    isActive &&
                      "border-(--accent-teal) bg-transparent text-(--accent-teal)",
                    isPending &&
                      "border-(--border-subtle) bg-(--bg-elevated) text-(--text-dim)",
                  )}
                  animate={
                    isActive
                      ? {
                          boxShadow: [
                            "0 0 10px rgba(6, 214, 160, 0.2)",
                            "0 0 25px rgba(6, 214, 160, 0.4)",
                            "0 0 10px rgba(6, 214, 160, 0.2)",
                          ],
                        }
                      : {}
                  }
                  transition={
                    isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" as const } : {}
                  }
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </m.div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1.5 text-center font-heading text-xs font-medium",
                    isCompleted && "font-semibold text-(--accent-teal)",
                    isActive && "font-bold text-(--accent-teal)",
                    isPending && "text-(--text-dim)",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="mx-1 mb-5 h-0.5 flex-1 rounded-full bg-(--border-subtle)">
                  <m.div
                    className="h-full rounded-full bg-linear-to-r from-accent-teal to-accent-cyan"
                    initial={{ width: "0%" }}
                    animate={{
                      width: isCompleted ? "100%" : isActive ? "50%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" as const }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active step description */}
      <m.p
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center font-body text-sm text-(--text-muted)"
      >
        {activeDescription}
      </m.p>
    </div>
  );
}
