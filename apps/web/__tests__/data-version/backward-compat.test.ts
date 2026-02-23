/**
 * Q18 — Data Version Backward-Compatibility Tests
 *
 * Tests the storage layer's ability to handle old, future, and corrupted data
 * versions gracefully.  The goals are:
 *
 *  1. Old data (version mismatch)  — does NOT crash; returns null and sets
 *     `storageVersionMismatch: true` so the UI can prompt re-upload.
 *  2. Missing optional fields      — FullAnalysisResult with missing optional
 *     fields does not throw when processed by the store.
 *  3. Extra / unknown fields       — forward-compat: unknown fields are silently
 *     ignored after JSON.parse (they don't break the type system at runtime).
 *  4. Version mismatch warning     — the store exposes a clear flag when stored
 *     data was written by a different schema version.
 *  5. Clean failure path           — attempting to use stale stored data does
 *     NOT expose garbage health data to the UI.
 *
 * Relationship to other test files:
 *   - __tests__/storage/indexed-db-store.test.ts — low-level IndexedDB CRUD
 *     and the raw hasVersionMismatch / loadAnalysisResult logic
 *   - __tests__/save-load-integrity.test.ts — JSON serialisation round-trips,
 *     ZKE stubs, GDPR export format
 *   - THIS FILE — data-version semantics at the store integration level
 *
 * Implementation note:
 *   The actual "upgrade" path (migrating old data) is NOT yet implemented in
 *   the codebase.  The current contract is:
 *     - If the stored dataVersion !== STORAGE_SCHEMA_VERSION → return null.
 *     - The UI is responsible for prompting re-upload (storageVersionMismatch flag).
 *   Tests that cover a hypothetical migration path are marked `it.todo()`.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";

// ── Mock the analysis API client (required by analysis-store at import time) ──
vi.mock("@/lib/api/analysis-client", () => ({
  saveResult: vi.fn(),
  listResults: vi.fn(),
  getResult: vi.fn(),
  deleteResult: vi.fn(),
}));

// Imports after polyfill
import { useAnalysisStore } from "../../lib/stores/analysis-store";
import {
  saveAnalysisResult,
  loadAnalysisResult,
  hasVersionMismatch,
  clearAllResults,
  STORAGE_SCHEMA_VERSION,
} from "../../lib/storage/indexed-db-store";
import type { FullAnalysisResult } from "@mergenix/shared-types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Current-schema (v1) FullAnalysisResult — fully populated, matches the type.
 */
function makeCurrentResult(overrides: Partial<FullAnalysisResult> = {}): FullAnalysisResult {
  return {
    carrier: [
      {
        condition: "Cystic Fibrosis (F508del)",
        gene: "CFTR",
        severity: "high",
        description: "Autosomal recessive",
        parentAStatus: "carrier",
        parentBStatus: "carrier",
        offspringRisk: { affected: 25, carrier: 50, normal: 25 },
        riskLevel: "high_risk",
        rsid: "rs113993960",
        inheritance: "autosomal_recessive",
      },
    ],
    traits: [],
    pgx: {
      genesAnalyzed: 0,
      tier: "free",
      isLimited: true,
      results: {},
      upgradeMessage: null,
      disclaimer: "",
    },
    prs: {
      conditions: {},
      metadata: {
        source: "",
        version: "",
        conditionsCovered: 0,
        lastUpdated: "",
        disclaimer: "",
      },
      tier: "free",
      conditionsAvailable: 0,
      conditionsTotal: 0,
      disclaimer: "",
      isLimited: true,
      upgradeMessage: null,
    },
    counseling: {
      recommend: false,
      urgency: "informational",
      reasons: [],
      nsgcUrl: "",
      summaryText: null,
      keyFindings: null,
      recommendedSpecialties: null,
      referralLetter: null,
      upgradeMessage: null,
    },
    metadata: {
      parent1Format: "23andme",
      parent2Format: "ancestrydna",
      parent1SnpCount: 638529,
      parent2SnpCount: 700000,
      analysisTimestamp: "2025-01-01T00:00:00.000Z",
      engineVersion: "3.1.0",
      tier: "free",
      dataVersion: STORAGE_SCHEMA_VERSION,
    },
    coupleMode: false,
    coverageMetrics: { totalDiseases: 0, diseasesWithCoverage: 0, perDisease: {} },
    chipVersion: null,
    genomeBuild: "GRCh37",
    ...overrides,
  };
}

/**
 * Simulates what a v0 (legacy) stored entry would have looked like.
 * It has an older dataVersion string but otherwise valid content.
 */
function makeV0Result(): FullAnalysisResult {
  return {
    ...makeCurrentResult(),
    metadata: {
      ...makeCurrentResult().metadata,
      dataVersion: "0",   // OLD version — before the current schema
    },
  };
}

/**
 * Simulates a result that was saved by a future schema version (version "99").
 * Forward-compat: the app should not crash when encountering unknown future data.
 */
function makeFutureResult(): FullAnalysisResult {
  return {
    ...makeCurrentResult(),
    metadata: {
      ...makeCurrentResult().metadata,
      dataVersion: "99",  // Future version — beyond current schema
    },
  };
}

/**
 * Simulates a v1 result where optional fields are absent (stripped to simulate
 * an older export format that didn't include those fields yet).
 */
function makeResultWithMissingOptionalFields(): Partial<FullAnalysisResult> {
  const full = makeCurrentResult();
  // Strip optional fields to simulate an older save format
  const stripped: Partial<FullAnalysisResult> = { ...full };
  delete stripped.coupleAnalysis;   // optional field added in a later schema revision
  delete stripped.fileMetadata;     // optional field added later
  return stripped;
}

/**
 * Simulates a result with extra unknown fields injected at the top level
 * (forward-compat: a future version added new fields that this version doesn't know about).
 */
function makeResultWithExtraFields(): Record<string, unknown> {
  return {
    ...makeCurrentResult(),
    unknownFieldFromFutureVersion: "some value",
    anotherNewFeature: { nested: true, data: [1, 2, 3] },
  };
}

// ── Helper: opaque encrypted envelope (valid JSON with all required fields) ──
const fakeEnvelope = (id: string) =>
  JSON.stringify({
    version: "1",
    algorithm: "AES-256-GCM",
    salt: btoa(`salt-${id}`),
    iv: btoa(`iv-for-${id}`),
    ciphertext: btoa(`encrypted-${id}`),
  });

// ─── Section 1: Version mismatch detection ────────────────────────────────────

describe("Q18 — Data Version Backward-Compat: version mismatch detection", () => {
  beforeEach(async () => {
    await clearAllResults();
    useAnalysisStore.getState().reset();
  });

  it("STORAGE_SCHEMA_VERSION is '1' (current contract)", () => {
    // Pinning the current version ensures this test suite is updated
    // when the schema version bumps.
    expect(STORAGE_SCHEMA_VERSION).toBe("1");
    expect(typeof STORAGE_SCHEMA_VERSION).toBe("string");
  });

  it("loading a v0 result returns null (version mismatch)", async () => {
    await saveAnalysisResult("v0-result", fakeEnvelope("v0"), "0");

    const loaded = await loadAnalysisResult("v0-result");
    expect(loaded).toBeNull();
  });

  it("loading a v0 result via the store sets storageVersionMismatch=true", async () => {
    await saveAnalysisResult("v0-store-test", fakeEnvelope("v0-store"), "0");

    const result = await useAnalysisStore
      .getState()
      .loadResultFromStorage("v0-store-test");

    expect(result).toBeNull();
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });

  it("loading a future-version result returns null (schema ahead of current)", async () => {
    await saveAnalysisResult("v99-result", fakeEnvelope("v99"), "99");

    const loaded = await loadAnalysisResult("v99-result");
    expect(loaded).toBeNull();
  });

  it("loading a future-version result via store sets storageVersionMismatch=true", async () => {
    await saveAnalysisResult("v99-store", fakeEnvelope("v99-store"), "99");

    await useAnalysisStore.getState().loadResultFromStorage("v99-store");
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });

  it("loading a current-version result succeeds and storageVersionMismatch=false", async () => {
    await saveAnalysisResult(
      "v1-result",
      fakeEnvelope("v1"),
      STORAGE_SCHEMA_VERSION,
    );

    const loaded = await useAnalysisStore
      .getState()
      .loadResultFromStorage("v1-result");

    expect(loaded).not.toBeNull();
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it("storageVersionMismatch resets to false after a successful current-version load", async () => {
    // First cause a mismatch
    await saveAnalysisResult("old", fakeEnvelope("old"), "0");
    await useAnalysisStore.getState().loadResultFromStorage("old");
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);

    // Then successfully load a current-version entry
    await saveAnalysisResult("new", fakeEnvelope("new"), STORAGE_SCHEMA_VERSION);
    await useAnalysisStore.getState().loadResultFromStorage("new");
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it("hasVersionMismatch returns true for v0 entries", async () => {
    await saveAnalysisResult("hvm-v0", fakeEnvelope("hvm-v0"), "0");
    expect(await hasVersionMismatch("hvm-v0")).toBe(true);
  });

  it("hasVersionMismatch returns true for v99 (future) entries", async () => {
    await saveAnalysisResult("hvm-v99", fakeEnvelope("hvm-v99"), "99");
    expect(await hasVersionMismatch("hvm-v99")).toBe(true);
  });

  it("hasVersionMismatch returns false for current-version entries", async () => {
    await saveAnalysisResult(
      "hvm-current",
      fakeEnvelope("hvm-current"),
      STORAGE_SCHEMA_VERSION,
    );
    expect(await hasVersionMismatch("hvm-current")).toBe(false);
  });

  it("hasVersionMismatch returns false when entry does not exist (no entry = no mismatch)", async () => {
    expect(await hasVersionMismatch("non-existent-q18")).toBe(false);
  });
});

// ─── Section 2: Missing optional fields ──────────────────────────────────────

describe("Q18 — Data Version Backward-Compat: missing optional fields are handled gracefully", () => {
  it("FullAnalysisResult without coupleAnalysis is valid JSON and round-trips cleanly", () => {
    const stripped = makeResultWithMissingOptionalFields();
    expect(stripped.coupleAnalysis).toBeUndefined();

    // Must not throw during serialisation
    expect(() => JSON.stringify(stripped)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(stripped)) as Partial<FullAnalysisResult>;

    // Non-optional fields must survive
    expect(parsed.carrier).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    expect(parsed.genomeBuild).toBeDefined();

    // Optional absent fields remain absent (not null, not empty string)
    expect(parsed.coupleAnalysis).toBeUndefined();
    expect(parsed.fileMetadata).toBeUndefined();
  });

  it("FullAnalysisResult without fileMetadata round-trips cleanly", () => {
    const result = makeCurrentResult();
    // fileMetadata is optional — never set it
    expect(result.fileMetadata).toBeUndefined();

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.fileMetadata).toBeUndefined();
  });

  it("metadata without optional dataVersion field does not break serialisation", () => {
    const result = makeCurrentResult();
    // dataVersion is optional on FullAnalysisResult.metadata
    delete result.metadata.dataVersion;

    expect(() => JSON.stringify(result)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.metadata.dataVersion).toBeUndefined();
    // Required fields are still present
    expect(parsed.metadata.tier).toBeDefined();
    expect(parsed.metadata.engineVersion).toBeDefined();
  });

  it("null optional fields (counseling.referralLetter) round-trip as null, not undefined", () => {
    const result = makeCurrentResult();
    expect(result.counseling.referralLetter).toBeNull();

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    // null must NOT become undefined — that would change type semantics
    expect(parsed.counseling.referralLetter).toBeNull();
  });

  it("null optional fields (counseling.upgradeMessage) survive round-trip as null", () => {
    const result = makeCurrentResult();
    expect(result.counseling.upgradeMessage).toBeNull();

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.counseling.upgradeMessage).toBeNull();
  });

  it("empty carrier array in a v0-like result survives round-trip", () => {
    const result = makeV0Result();
    result.carrier = []; // simulate an old format with no carrier data

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.carrier).toEqual([]);
  });

  it("empty traits array in an old result survives round-trip", () => {
    const result = makeV0Result();
    result.traits = [];

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.traits).toEqual([]);
  });
});

// ─── Section 3: Extra unknown fields (forward compatibility) ──────────────────

describe("Q18 — Data Version Backward-Compat: extra unknown fields are ignored", () => {
  it("JSON.parse of a future result with extra top-level fields does not throw", () => {
    const futureResult = makeResultWithExtraFields();
    const serialized = JSON.stringify(futureResult);

    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it("extra unknown fields in a future result do not corrupt known fields", () => {
    const futureResult = makeResultWithExtraFields();
    const parsed = JSON.parse(JSON.stringify(futureResult)) as FullAnalysisResult & Record<string, unknown>;

    // Known required fields must survive
    expect(parsed.carrier).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    expect(parsed.genomeBuild).toBe("GRCh37");
    expect(parsed.coupleMode).toBe(false);

    // Unknown fields are present but harmless (TypeScript ignores them at runtime)
    expect(parsed["unknownFieldFromFutureVersion"]).toBe("some value");
  });

  it("extra fields inside metadata do not break the metadata object", () => {
    const result = makeCurrentResult();
    // Simulate a future metadata schema with additional fields
    const futureMetadata = {
      ...result.metadata,
      newMetadataField: "future value",
      analysisModel: "v4",
    } as typeof result.metadata & Record<string, unknown>;
    result.metadata = futureMetadata as typeof result.metadata;

    expect(() => JSON.stringify(result)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    // Required fields intact
    expect(parsed.metadata.tier).toBe("free");
    expect(parsed.metadata.engineVersion).toBe("3.1.0");
  });

  it("extra fields inside a carrier result entry do not corrupt known fields", () => {
    const result = makeCurrentResult();
    // Simulate a future carrier entry format with new fields
    const enrichedCarrier = result.carrier.map((c) => ({
      ...c,
      newFutureField: "extra data",
      clinicalGrade: "laboratory",
    }));
    result.carrier = enrichedCarrier as typeof result.carrier;

    const parsed = JSON.parse(JSON.stringify(result)) as FullAnalysisResult;
    expect(parsed.carrier[0].condition).toBe("Cystic Fibrosis (F508del)");
    expect(parsed.carrier[0].riskLevel).toBe("high_risk");
    expect(parsed.carrier[0].gene).toBe("CFTR");
  });
});

// ─── Section 4: Version mismatch produces a clear warning (store flag) ────────

describe("Q18 — Data Version Backward-Compat: version mismatch produces a clear UI signal", () => {
  beforeEach(async () => {
    await clearAllResults();
    useAnalysisStore.getState().reset();
  });

  it("storageVersionMismatch starts as false", () => {
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it("storageVersionMismatch is set to true when a v0 result is found", async () => {
    await saveAnalysisResult("warn-v0", fakeEnvelope("warn-v0"), "0");
    await useAnalysisStore.getState().loadResultFromStorage("warn-v0");

    // The store must expose the flag so the UI can render a warning/re-upload prompt
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });

  it("storageVersionMismatch=true does not expose stale data to the UI", async () => {
    await saveAnalysisResult("stale-data", fakeEnvelope("stale"), "0");

    const result = await useAnalysisStore
      .getState()
      .loadResultFromStorage("stale-data");

    // Must not return the stale data object — returns null instead
    // so the UI cannot render garbage health data to the user.
    expect(result).toBeNull();
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });

  it("storageVersionMismatch=true for a non-existent ID does NOT leave the flag set (flag requires actual mismatch)", async () => {
    // hasVersionMismatch() returns false for non-existent entries.
    // The store must NOT set the flag for a simple "not found" case.
    const result = await useAnalysisStore
      .getState()
      .loadResultFromStorage("does-not-exist-q18");

    expect(result).toBeNull();
    // No mismatch flag for a simple missing entry
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(false);
  });

  it("multiple sequential version-mismatches keep the flag set", async () => {
    await saveAnalysisResult("old-1", fakeEnvelope("old-1"), "0");
    await saveAnalysisResult("old-2", fakeEnvelope("old-2"), "0");

    await useAnalysisStore.getState().loadResultFromStorage("old-1");
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);

    await useAnalysisStore.getState().loadResultFromStorage("old-2");
    expect(useAnalysisStore.getState().storageVersionMismatch).toBe(true);
  });
});

// ─── Section 5: Clean failure path ───────────────────────────────────────────

describe("Q18 — Data Version Backward-Compat: clean failure path (no data corruption)", () => {
  beforeEach(async () => {
    await clearAllResults();
    useAnalysisStore.getState().reset();
  });

  it("fullResults in the store is not affected by a failed stale-data load", async () => {
    // Pre-load valid results into the store
    const validResults = makeCurrentResult();
    useAnalysisStore.getState().setFullResults(validResults);
    expect(useAnalysisStore.getState().fullResults).not.toBeNull();

    // Attempt to load a stale result (this should NOT overwrite fullResults)
    await saveAnalysisResult("stale-replace", fakeEnvelope("stale-replace"), "0");
    await useAnalysisStore.getState().loadResultFromStorage("stale-replace");

    // fullResults must be unchanged — stale load must not corrupt the current session
    expect(useAnalysisStore.getState().fullResults).toBe(validResults);
  });

  it("v0 result serialises without throwing (the JSON is valid, only the version is wrong)", () => {
    // A v0 result is a valid FullAnalysisResult — the problem is the stored
    // dataVersion string, not the data structure itself.  This test confirms
    // the failure is version-only, not structural.
    const v0 = makeV0Result();
    expect(() => JSON.stringify(v0)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(v0)) as FullAnalysisResult;
    // The data is structurally valid but carries dataVersion "0"
    expect(parsed.metadata.dataVersion).toBe("0");
    // All health-data fields are intact
    expect(parsed.carrier).toHaveLength(1);
    expect(parsed.carrier[0].gene).toBe("CFTR");
  });

  it("future result (v99) serialises without throwing (structure is valid, version is unknown)", () => {
    const future = makeFutureResult();
    expect(() => JSON.stringify(future)).not.toThrow();

    const parsed = JSON.parse(JSON.stringify(future)) as FullAnalysisResult;
    expect(parsed.metadata.dataVersion).toBe("99");
    expect(parsed.genomeBuild).toBe("GRCh37");
  });

  // ── Upgrade / migration (not yet implemented) ─────────────────────────────

  it.todo(
    // When a migration path is implemented:
    //   const v0 = JSON.stringify(makeV0Result());
    //   const upgraded = migrateResult(v0, "0", STORAGE_SCHEMA_VERSION);
    //   expect(upgraded.metadata.dataVersion).toBe(STORAGE_SCHEMA_VERSION);
    //   expect(upgraded.carrier.length).toBeGreaterThan(0);
    "upgrade: v0 result can be migrated to current schema version (requires migration implementation)",
  );

  it.todo(
    // When a migration path is implemented:
    //   After migration, the result should be re-saved with the new dataVersion
    //   so subsequent loads succeed without re-upload.
    "upgrade: migrated result is re-saved with current dataVersion (requires migration implementation)",
  );

  it.todo(
    // Future compatibility:
    //   When the app encounters a result from a FUTURE schema (v99), it should
    //   either prompt the user to update their app or fall back gracefully.
    //   The exact behavior depends on the migration strategy chosen in Stream B3.
    "forward-compat: future schema version (v99) produces a clear upgrade-app message (requires strategy decision)",
  );
});
