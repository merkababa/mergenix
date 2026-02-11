"use client";

import { motion } from "framer-motion";
import { Check, FileSearch, Microscope, Dna, Pill, BarChart3, Globe, Heart, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisStep } from "@/lib/stores/analysis-store";

const STEPS: {
  key: AnalysisStep;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { key: "parsing", label: "Parse", description: "Validating files...", icon: FileSearch },
  { key: "carrier_analysis", label: "Carrier", description: "Screening carrier risk...", icon: Microscope },
  { key: "trait_prediction", label: "Traits", description: "Predicting traits...", icon: Dna },
  { key: "pharmacogenomics", label: "PGx", description: "Pharmacogenomic analysis...", icon: Pill },
  { key: "polygenic_risk", label: "PRS", description: "Polygenic risk scoring...", icon: BarChart3 },
  { key: "ethnicity_adjustment", label: "Ethnicity", description: "Adjusting for population...", icon: Globe },
  { key: "counseling_triage", label: "Counseling", description: "Triaging counseling needs...", icon: Heart },
  { key: "complete", label: "Complete", description: "Analysis complete!", icon: PartyPopper },
];

const STEP_ORDER: AnalysisStep[] = [
  "idle",
  "parsing",
  "carrier_analysis",
  "trait_prediction",
  "pharmacogenomics",
  "polygenic_risk",
  "ethnicity_adjustment",
  "counseling_triage",
  "complete",
];

interface AnalysisProgressProps {
  currentStep: AnalysisStep;
  className?: string;
}

export function AnalysisProgress({ currentStep, className }: AnalysisProgressProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  const activeStep = STEPS.find((s) => s.key === currentStep);
  const activeDescription = activeStep?.description || "Preparing...";

  return (
    <div
      className={cn(
        "rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-glass)] p-6",
        "[backdrop-filter:blur(12px)] [-webkit-backdrop-filter:blur(12px)]",
        className,
      )}
      role="progressbar"
      aria-label={`Analysis progress: ${activeDescription}`}
      aria-valuenow={currentIndex}
      aria-valuemin={0}
      aria-valuemax={STEPS.length}
    >
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
                <motion.div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300",
                    isCompleted &&
                      "border-[#06d6a0] bg-gradient-to-br from-[#06d6a0] to-[#059669] text-[#050810]",
                    isActive &&
                      "border-[var(--accent-teal)] bg-transparent text-[var(--accent-teal)]",
                    isPending &&
                      "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-dim)]",
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
                    isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
                  }
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </motion.div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-1.5 text-center font-heading text-[10px] font-medium sm:text-xs",
                    isCompleted && "font-semibold text-[var(--accent-teal)]",
                    isActive && "font-bold text-[var(--accent-teal)]",
                    isPending && "text-[var(--text-dim)]",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="mx-1 mb-5 h-0.5 flex-1 rounded-full bg-[var(--border-subtle)]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#06d6a0] to-[#06b6d4]"
                    initial={{ width: "0%" }}
                    animate={{
                      width: isCompleted ? "100%" : isActive ? "50%" : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active step description */}
      <motion.p
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 text-center font-body text-sm text-[var(--text-muted)]"
        aria-live="polite"
      >
        {activeDescription}
      </motion.p>
    </div>
  );
}
