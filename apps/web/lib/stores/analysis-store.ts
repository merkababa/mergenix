"use client";

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
import * as indexedDbStore from "@/lib/storage/indexed-db-store";
import type { StoredResult } from "@/lib/storage/indexed-db-store";
import { extractErrorMessage } from "@/lib/utils/extract-error";

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

export const STEP_ORDER: AnalysisStep[] = [
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

  /* -- Client-side storage (IndexedDB) -- */
  storageVersionMismatch: boolean;

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

  /* -- Client-side storage actions (IndexedDB) -- */
  saveResultToStorage: (resultId: string, encryptedEnvelope: string) => Promise<void>;
  loadResultFromStorage: (resultId: string) => Promise<StoredResult | null>;
  deleteResultFromStorage: (resultId: string) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Count carrier results whose riskLevel is "high_risk". */
function countHighRisk(carrier: CarrierResult[]): number {
  return carrier.filter((r) => r.riskLevel === "high_risk").length;
}

// TODO(B3): buildSummary() was removed because saveCurrentResult is blocked
// until the Web Crypto encryption layer is implemented. Re-add when B3 lands.

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
  storageVersionMismatch: false,
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

  saveCurrentResult: async (_label) => {
    // TODO(B3): This action requires the Web Crypto encryption layer
    // (Argon2id + AES-256-GCM) before it can safely send results to the
    // backend API. The server expects an EncryptedEnvelope, not plaintext.
    // Until Stream B3 implements client-side encryption, this action is
    // blocked to prevent ZKE (Zero-Knowledge Encryption) violations.
    void _label;
    const error = new Error(
      "Encryption layer not yet implemented — see Stream B3. " +
        "Use saveResultToStorage() for client-side IndexedDB persistence.",
    );
    set({ saveError: error.message, isSaving: false });
    throw error;
  },

  loadSavedResults: async () => {
    try {
      const results = await analysisClient.listResults();
      set({ savedResults: results });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to load saved analyses");
      set({ saveError: message });
      throw error;
    }
  },

  loadSavedResult: async (_id) => {
    // TODO(B3): This action requires the Web Crypto decryption layer
    // (Argon2id + AES-256-GCM) before it can decrypt the EncryptedEnvelope
    // returned by the backend API. Without decryption, casting the opaque
    // envelope directly to FullAnalysisResult produces garbage data.
    // Until Stream B3 implements client-side decryption, this action is
    // blocked to prevent ZKE (Zero-Knowledge Encryption) violations.
    void _id;
    const error = new Error(
      "Encryption layer not yet implemented — see Stream B3. " +
        "Use loadResultFromStorage() for client-side IndexedDB persistence.",
    );
    set({ saveError: error.message, isLoadingResult: false });
    throw error;
  },

  deleteSavedResult: async (id) => {
    try {
      await analysisClient.deleteResult(id);
      // Remove from local list immediately
      const { savedResults } = get();
      set({ savedResults: savedResults.filter((r) => r.id !== id) });
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to delete analysis");
      set({ saveError: message });
      throw error;
    }
  },

  clearSaveError: () => set({ saveError: null }),

  // ── Client-Side Storage Actions (IndexedDB) ────────────────────────────

  saveResultToStorage: async (resultId, encryptedEnvelope) => {
    await indexedDbStore.saveAnalysisResult(
      resultId,
      encryptedEnvelope,
      indexedDbStore.STORAGE_SCHEMA_VERSION,
    );
  },

  loadResultFromStorage: async (resultId) => {
    const result = await indexedDbStore.loadAnalysisResult(resultId);

    if (result === null) {
      // Check if the entry exists but has a version mismatch
      const mismatch = await indexedDbStore.hasVersionMismatch(resultId);
      set({ storageVersionMismatch: mismatch });
      return null;
    }

    set({ storageVersionMismatch: false });
    return result;
  },

  deleteResultFromStorage: async (resultId) => {
    await indexedDbStore.deleteAnalysisResult(resultId);
  },
}));
