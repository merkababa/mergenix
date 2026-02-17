import { create } from "zustand";
import type {
  FullAnalysisResult,
  ParseResultSummary,
  CarrierResult,
  AnalysisStage,
  Population,
  FileFormat,
} from "@mergenix/shared-types";
import * as analysisClient from "@/lib/api/analysis-client";
import type { AnalysisListItem } from "@/lib/api/analysis-client";

// ─── Exported Types ─────────────────────────────────────────────────────────

/** Genetic file format alias — re-exported from shared-types. */
export type GeneticFileFormat = FileFormat;

/**
 * Analysis progress steps.
 *
 * Extends the engine's `AnalysisStage` with an extra "idle" value
 * representing the pre-analysis state.
 */
export type AnalysisStep = "idle" | AnalysisStage;

/** Tabs available on the results page. */
export type ResultTab =
  | "overview"
  | "carrier"
  | "traits"
  | "pgx"
  | "prs"
  | "counseling";

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Internal Types ─────────────────────────────────────────────────────────

/** Individual parent file metadata. */
interface ParentFile {
  name: string;
  format: GeneticFileFormat;
  size: number;
  snpCount: number | null;
}

/** Parse progress tracking. */
interface ParseProgress {
  fileIndex: number;
  progress: number;
}

/** Analysis stage progress tracking. */
interface AnalysisProgress {
  stage: AnalysisStage;
  progress: number;
}

// ─── Store Shape ────────────────────────────────────────────────────────────

interface AnalysisState {
  /* -- File selection -- */
  parentA: ParentFile | null;
  parentB: ParentFile | null;
  parentAFile: File | null;
  parentBFile: File | null;

  /* -- Progress -- */
  currentStep: AnalysisStep;
  stepIndex: number;
  errorMessage: string | null;

  /* -- Results -- */
  fullResults: FullAnalysisResult | null;
  parseResults: ParseResultSummary[] | null;
  parseProgress: ParseProgress | null;
  analysisProgress: AnalysisProgress | null;

  /* -- Flags -- */
  isDemo: boolean;

  /* -- UI -- */
  activeTab: ResultTab;

  /* -- Population / ethnicity -- */
  selectedPopulation: Population | null;

  /* -- Derived -- */
  highRiskCount: number;

  /* -- Persistence -- */
  savedResults: AnalysisListItem[];
  isSaving: boolean;
  isLoadingResult: boolean;
  saveError: string | null;

  /* -- Actions -- */
  setParentA: (file: ParentFile) => void;
  setParentB: (file: ParentFile) => void;
  setParentAFile: (file: File | null) => void;
  setParentBFile: (file: File | null) => void;
  clearFiles: () => void;
  setStep: (step: AnalysisStep) => void;
  setError: (msg: string | null) => void;
  setFullResults: (results: FullAnalysisResult) => void;
  setParseResults: (results: ParseResultSummary[]) => void;
  setParseProgress: (fileIndex: number, progress: number) => void;
  setAnalysisProgress: (stage: AnalysisStage, progress: number) => void;
  setDemoResults: (results: FullAnalysisResult) => void;
  setPopulation: (pop: Population | null) => void;
  setActiveTab: (tab: ResultTab) => void;
  reset: () => void;

  /* -- Persistence actions -- */
  saveCurrentResult: (label: string) => Promise<void>;
  loadSavedResults: () => Promise<void>;
  loadSavedResult: (id: string) => Promise<void>;
  deleteSavedResult: (id: string) => Promise<void>;
  clearSaveError: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Count carrier results whose riskLevel is "high_risk". */
function countHighRisk(carrier: CarrierResult[]): number {
  return carrier.filter((r) => r.riskLevel === "high_risk").length;
}

/** Build a summary object from the full analysis result. */
function buildSummary(results: FullAnalysisResult): Record<string, unknown> {
  return {
    trait_count: results.traits.length,
    carrier_count: results.carrier.length,
    has_results: true,
    total_variants_analyzed: results.metadata.parent1SnpCount + results.metadata.parent2SnpCount,
  };
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState = {
  parentA: null as ParentFile | null,
  parentB: null as ParentFile | null,
  parentAFile: null as File | null,
  parentBFile: null as File | null,
  currentStep: "idle" as AnalysisStep,
  stepIndex: 0,
  errorMessage: null as string | null,
  fullResults: null as FullAnalysisResult | null,
  parseResults: null as ParseResultSummary[] | null,
  parseProgress: null as ParseProgress | null,
  analysisProgress: null as AnalysisProgress | null,
  isDemo: false,
  activeTab: "overview" as ResultTab,
  selectedPopulation: null as Population | null,
  highRiskCount: 0,
  savedResults: [] as AnalysisListItem[],
  isSaving: false,
  isLoadingResult: false,
  saveError: null as string | null,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  ...initialState,

  setParentA: (file) => set({ parentA: file }),
  setParentB: (file) => set({ parentB: file }),
  setParentAFile: (file) => set({ parentAFile: file }),
  setParentBFile: (file) => set({ parentBFile: file }),

  clearFiles: () =>
    set({
      parentA: null,
      parentB: null,
      parentAFile: null,
      parentBFile: null,
    }),

  setStep: (step) =>
    set({
      currentStep: step,
      stepIndex: STEP_ORDER.indexOf(step),
    }),

  setError: (msg) => set({ errorMessage: msg }),

  setFullResults: (results) =>
    set({
      fullResults: results,
      highRiskCount: countHighRisk(results.carrier),
    }),

  setParseResults: (results) => set({ parseResults: results }),

  setParseProgress: (fileIndex, progress) =>
    set({ parseProgress: { fileIndex, progress } }),

  setAnalysisProgress: (stage, progress) =>
    set({ analysisProgress: { stage, progress } }),

  setDemoResults: (results) =>
    set({
      fullResults: results,
      isDemo: true,
      currentStep: "complete",
      stepIndex: STEP_ORDER.indexOf("complete"),
      highRiskCount: countHighRisk(results.carrier),
    }),

  setPopulation: (pop) => set({ selectedPopulation: pop }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  reset: () => set(initialState),

  // ── Persistence Actions ─────────────────────────────────────────────────

  saveCurrentResult: async (label) => {
    const { fullResults, parentA, parentB } = get();
    if (!fullResults) {
      set({ saveError: "No analysis results to save" });
      return;
    }

    set({ isSaving: true, saveError: null });
    try {
      const parent1Filename = parentA?.name ?? "unknown";
      const parent2Filename = parentB?.name ?? "unknown";
      const summary = buildSummary(fullResults);

      await analysisClient.saveResult(
        label,
        parent1Filename,
        parent2Filename,
        fullResults as unknown as Record<string, unknown>,
        summary,
        true, // consent_given — user explicitly triggered save action
      );

      // Refresh the saved results list after successful save
      const updated = await analysisClient.listResults();
      set({ savedResults: updated, isSaving: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save analysis";
      set({ isSaving: false, saveError: message });
      throw error;
    }
  },

  loadSavedResults: async () => {
    try {
      const results = await analysisClient.listResults();
      set({ savedResults: results });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load saved analyses";
      set({ saveError: message });
      throw error;
    }
  },

  loadSavedResult: async (id) => {
    set({ isLoadingResult: true, saveError: null });
    try {
      const detail = await analysisClient.getResult(id);
      const resultData = detail.resultData as unknown as FullAnalysisResult;
      set({
        fullResults: resultData,
        currentStep: "complete",
        stepIndex: STEP_ORDER.indexOf("complete"),
        highRiskCount: countHighRisk(resultData.carrier),
        isDemo: false,
        isLoadingResult: false,
        activeTab: "overview",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load analysis";
      set({ isLoadingResult: false, saveError: message });
      throw error;
    }
  },

  deleteSavedResult: async (id) => {
    try {
      await analysisClient.deleteResult(id);
      // Remove from local list immediately
      const { savedResults } = get();
      set({ savedResults: savedResults.filter((r) => r.id !== id) });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete analysis";
      set({ saveError: message });
      throw error;
    }
  },

  clearSaveError: () => set({ saveError: null }),
}));
