/**
 * Analysis API client — wraps all FastAPI /analysis/* endpoints.
 *
 * Each function maps 1:1 to a backend endpoint. The backend uses
 * snake_case in JSON; we convert to camelCase for the frontend.
 *
 * All functions throw ApiError on failure. The caller (analysis store)
 * is responsible for catching and surfacing errors to the UI.
 */

import { get, post, del } from "./client";
import type { Tier } from "@mergenix/shared-types";
import { parseTier } from "@/lib/utils/parse-tier";

// ── API Response Types (snake_case from backend) ────────────────────────

/** Raw save-result response from POST /analysis/results */
interface RawSaveAnalysisResponse {
  id: string;
  label: string;
  created_at: string;
}

/** Raw list item from GET /analysis/results */
interface RawAnalysisListItem {
  id: string;
  label: string;
  parent1_filename: string;
  parent2_filename: string;
  tier_at_time: string;
  summary: Record<string, unknown> | null;
  created_at: string;
}

/** Raw detail response from GET /analysis/results/{id} */
interface RawAnalysisDetailResponse {
  id: string;
  label: string;
  parent1_filename: string;
  parent2_filename: string;
  tier_at_time: string;
  result_data: Record<string, unknown>;
  summary: Record<string, unknown> | null;
  created_at: string;
}

/** Raw message response from DELETE /analysis/results/{id} */
interface RawMessageResponse {
  message: string;
}

// ── Frontend Types (camelCase) ──────────────────────────────────────────

export interface SaveAnalysisResponse {
  id: string;
  label: string;
  createdAt: string;
}

export interface AnalysisListItem {
  id: string;
  label: string;
  parent1Filename: string;
  parent2Filename: string;
  tierAtTime: Tier;
  summary: Record<string, unknown> | null;
  createdAt: string;
}

export interface AnalysisDetailResponse {
  id: string;
  label: string;
  parent1Filename: string;
  parent2Filename: string;
  tierAtTime: Tier;
  resultData: Record<string, unknown>;
  summary: Record<string, unknown> | null;
  createdAt: string;
}

// ── Transformers ────────────────────────────────────────────────────────

function toSaveAnalysisResponse(
  raw: RawSaveAnalysisResponse,
): SaveAnalysisResponse {
  return {
    id: raw.id,
    label: raw.label,
    createdAt: raw.created_at,
  };
}

function toAnalysisListItem(raw: RawAnalysisListItem): AnalysisListItem {
  return {
    id: raw.id,
    label: raw.label,
    parent1Filename: raw.parent1_filename,
    parent2Filename: raw.parent2_filename,
    tierAtTime: parseTier(raw.tier_at_time),
    summary: raw.summary,
    createdAt: raw.created_at,
  };
}

function toAnalysisDetailResponse(
  raw: RawAnalysisDetailResponse,
): AnalysisDetailResponse {
  return {
    id: raw.id,
    label: raw.label,
    parent1Filename: raw.parent1_filename,
    parent2Filename: raw.parent2_filename,
    tierAtTime: parseTier(raw.tier_at_time),
    resultData: raw.result_data,
    summary: raw.summary,
    createdAt: raw.created_at,
  };
}

// ── Analysis API Functions ──────────────────────────────────────────────

/**
 * Save an analysis result to the backend.
 *
 * The full result data is encrypted at rest on the server.
 * Tier limits apply: Free=1, Premium=10, Pro=unlimited.
 *
 * @throws ApiError with code "TIER_LIMIT_REACHED" if the user's save quota is full.
 */
export async function saveResult(
  label: string,
  parent1Filename: string,
  parent2Filename: string,
  resultData: Record<string, unknown>,
  summary: Record<string, unknown>,
  consentGiven: boolean,
): Promise<SaveAnalysisResponse> {
  const raw = await post<RawSaveAnalysisResponse>("/analysis/results", {
    label,
    parent1_filename: parent1Filename,
    parent2_filename: parent2Filename,
    result_data: resultData,
    summary,
    consent_given: consentGiven,
    // Required by the backend: the user has already acknowledged this warning
    // in the consent modal shown before initiating the save flow.
    password_reset_warning_acknowledged: true,
  });
  return toSaveAnalysisResponse(raw);
}

/**
 * List all saved analysis results for the current user.
 *
 * Returns summaries only — no decrypted result data.
 * Ordered by most recently created first.
 */
export async function listResults(): Promise<AnalysisListItem[]> {
  const raw = await get<RawAnalysisListItem[]>("/analysis/results");
  return raw.map(toAnalysisListItem);
}

/**
 * Load a specific analysis result with full decrypted data.
 *
 * @throws ApiError with code "RESULT_NOT_FOUND" if the result doesn't exist
 *         or belongs to another user.
 */
export async function getResult(id: string): Promise<AnalysisDetailResponse> {
  const raw = await get<RawAnalysisDetailResponse>(
    `/analysis/results/${encodeURIComponent(id)}`,
  );
  return toAnalysisDetailResponse(raw);
}

/**
 * Delete a saved analysis result.
 *
 * This frees the tier slot so the user can save a new result.
 *
 * @throws ApiError with code "RESULT_NOT_FOUND" if the result doesn't exist
 *         or belongs to another user.
 */
export async function deleteResult(id: string): Promise<void> {
  await del<RawMessageResponse>(
    `/analysis/results/${encodeURIComponent(id)}`,
  );
}
