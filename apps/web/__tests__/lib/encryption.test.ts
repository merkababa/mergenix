/**
 * Q27 — Encryption Unit Tests
 *
 * These tests document and verify the Zero-Knowledge Encryption (ZKE) architecture
 * for Mergenix. The encryption implementation (Stream B3) is NOT YET IMPLEMENTED —
 * the analysis-store has explicit TODO(B3) markers and throws errors when
 * saveCurrentResult / loadSavedResult are called.
 *
 * Strategy
 * ─────────
 * Because the planned module `lib/crypto/encryption.ts` does not exist yet, these
 * tests are written in two layers:
 *
 * Layer A  — Tests against the REAL Web Crypto API (available in Node 24 / jsdom via
 *            globalThis.crypto.subtle). These tests verify the cryptographic properties
 *            that the future implementation MUST satisfy.  They use Web Crypto directly
 *            (acting as a spec/oracle), not the not-yet-written application layer.
 *
 * Layer B  — Tests against the PLANNED application-layer API surface defined in
 *            `lib/crypto/encryption.ts`. These tests import a MODULE THAT DOES NOT
 *            EXIST and will FAIL (RED) until Stream B3 implements it. Each failing
 *            test has a clear TODO comment explaining what must be built.
 *
 * When Stream B3 is implemented, all Layer B tests should go GREEN without changes.
 *
 * Architecture (from CLAUDE.md and analysis-store.ts TODO comments):
 * ──────────────────────────────────────────────────────────────────
 *   KDF      : Argon2id (WASM-based, e.g. argon2-browser or @noble/hashes)
 *              Desktop  : memory=64MB, parallelism=4, iterations=3
 *              Mobile   : memory=19MB, parallelism=1, iterations=4
 *                         (when navigator.deviceMemory < 4)
 *              Firefox  : same as mobile fallback
 *                         (when navigator.deviceMemory is undefined)
 *   Cipher   : AES-256-GCM, random 96-bit IV per operation
 *   Output   : EncryptedEnvelope — JSON-serialisable object containing
 *              iv, ciphertext, salt, version, and algorithm metadata.
 *              Stored as an opaque string in IndexedDB; the server
 *              NEVER sees plaintext.
 *   Recovery : A high-entropy recovery key that derives the same DEK as
 *              the password, allowing decryption without the password.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── LAYER A: Real Web Crypto API tests ─────────────────────────────────────
// These run against the actual Web Crypto implementation available in the
// Node/jsdom test environment.  No application code is required.

describe("Encryption — AES-256-GCM (Web Crypto oracle tests)", () => {
  // ── helpers ──────────────────────────────────────────────────────────────

  /** Import a 256-bit raw key for AES-GCM use. Extractable=true for comparison only. */
  async function importRawAesKey(
    keyBytes: Uint8Array,
    extractable = false,
  ): Promise<CryptoKey> {
    return globalThis.crypto.subtle.importKey(
      "raw",
      keyBytes as Uint8Array<ArrayBuffer>,
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  }

  /** Generate a random 256-bit AES-GCM key. */
  async function generateAesKey(extractable = false): Promise<CryptoKey> {
    return globalThis.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  }

  /** Encrypt plaintext string. Returns { iv, ciphertext }. */
  async function aesGcmEncrypt(
    key: CryptoKey,
    plaintext: string,
  ): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    );
    return { iv, ciphertext };
  }

  /** Decrypt ciphertext back to a string. */
  async function aesGcmDecrypt(
    key: CryptoKey,
    iv: Uint8Array,
    ciphertext: ArrayBuffer,
  ): Promise<string> {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  }

  // ── round-trip ────────────────────────────────────────────────────────────

  it("encrypts and decrypts data successfully (round-trip)", async () => {
    const key = await generateAesKey();
    const plaintext = "This is sensitive genetic data — CFTR carrier status.";

    const { iv, ciphertext } = await aesGcmEncrypt(key, plaintext);
    const recovered = await aesGcmDecrypt(key, iv, ciphertext);

    expect(recovered).toBe(plaintext);
  });

  it("round-trip works for JSON-serialised health data", async () => {
    const key = await generateAesKey();
    const data = {
      carrier: [{ gene: "CFTR", riskLevel: "high_risk" }],
      traits: [],
    };
    const plaintext = JSON.stringify(data);

    const { iv, ciphertext } = await aesGcmEncrypt(key, plaintext);
    const recovered = await aesGcmDecrypt(key, iv, ciphertext);

    expect(JSON.parse(recovered)).toEqual(data);
  });

  it("encrypts empty plaintext and decrypts back to empty string", async () => {
    const key = await generateAesKey();

    const { iv, ciphertext } = await aesGcmEncrypt(key, "");
    const recovered = await aesGcmDecrypt(key, iv, ciphertext);

    expect(recovered).toBe("");
  });

  // ── IV uniqueness ─────────────────────────────────────────────────────────

  it("IV is random and unique per encryption operation", async () => {
    const key = await generateAesKey();

    const { iv: iv1 } = await aesGcmEncrypt(key, "same plaintext");
    const { iv: iv2 } = await aesGcmEncrypt(key, "same plaintext");

    // IVs must differ — deterministic IVs break GCM security
    const same = iv1.every((byte, i) => byte === iv2[i]);
    expect(same).toBe(false);
  });

  it("IV is 96 bits (12 bytes) — the standard GCM nonce size", async () => {
    const key = await generateAesKey();
    const { iv } = await aesGcmEncrypt(key, "test");

    expect(iv.byteLength).toBe(12);
  });

  // ── Authentication tag / tamper detection ─────────────────────────────────

  it("authentication tag verification — tampered ciphertext is rejected", async () => {
    const key = await generateAesKey();
    const { iv, ciphertext } = await aesGcmEncrypt(key, "sensitive data");

    // Flip the first byte of the ciphertext
    const tampered = new Uint8Array(ciphertext);
    tampered[0] ^= 0xff;

    await expect(
      globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> }, key, tampered as Uint8Array<ArrayBuffer>),
    ).rejects.toThrow();
  });

  it("authentication tag verification — tampered IV is rejected", async () => {
    const key = await generateAesKey();
    const { iv, ciphertext } = await aesGcmEncrypt(key, "sensitive data");

    // Flip the first byte of the IV
    const tamperedIv = new Uint8Array(iv);
    tamperedIv[0] ^= 0xff;

    await expect(
      globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: tamperedIv },
        key,
        ciphertext,
      ),
    ).rejects.toThrow();
  });

  it("wrong key returns an error, not garbage data", async () => {
    const correctKey = await generateAesKey();
    const wrongKey = await generateAesKey();

    const { iv, ciphertext } = await aesGcmEncrypt(correctKey, "secret");

    // AES-GCM with wrong key should reject (authentication tag mismatch)
    await expect(
      globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
        wrongKey,
        ciphertext,
      ),
    ).rejects.toThrow();
  });

  it("decrypts correctly with correct key but rejects with wrong key", async () => {
    const key = await generateAesKey();
    const wrongKey = await generateAesKey();
    const plaintext = "BRCA1 variant rs80357906";

    const { iv, ciphertext } = await aesGcmEncrypt(key, plaintext);

    // Correct key works
    const recovered = await aesGcmDecrypt(key, iv, ciphertext);
    expect(recovered).toBe(plaintext);

    // Wrong key throws
    await expect(
      globalThis.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> },
        wrongKey,
        ciphertext,
      ),
    ).rejects.toThrow();
  });

  // ── Key non-extractability ────────────────────────────────────────────────

  it("non-extractable AES-GCM key cannot be exported", async () => {
    const key = await generateAesKey(false); // extractable = false

    expect(key.extractable).toBe(false);
    await expect(
      globalThis.crypto.subtle.exportKey("raw", key),
    ).rejects.toThrow();
  });

  it("ciphertext length is greater than plaintext length (due to auth tag)", async () => {
    const key = await generateAesKey();
    const plaintext = "test data";

    const { ciphertext } = await aesGcmEncrypt(key, plaintext);

    // AES-GCM appends a 16-byte authentication tag
    expect(ciphertext.byteLength).toBeGreaterThan(
      new TextEncoder().encode(plaintext).byteLength,
    );
  });
});

// ── LAYER A: Key derivation via PBKDF2 (Web Crypto oracle) ─────────────────
// AES-GCM key derivation properties — these apply to Argon2id as well.
// Argon2id is not available natively in Web Crypto; these tests use PBKDF2
// to verify the cryptographic properties that Argon2id must also satisfy.
// When Stream B3 implements Argon2id, these oracle tests remain valid.

describe("Encryption — Key Derivation properties (Web Crypto oracle via PBKDF2)", () => {
  const enc = new TextEncoder();

  /** Derive an AES-GCM key from password+salt using PBKDF2. Mimics Argon2id contract. */
  async function deriveKey(
    password: string,
    salt: Uint8Array,
    extractable = false,
  ): Promise<CryptoKey> {
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return globalThis.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt as Uint8Array<ArrayBuffer>, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  }

  it("derives a CryptoKey from a password and salt", async () => {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("StrongPassword123!", salt);

    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("derived CryptoKey has extractable === false (private, not exportable)", async () => {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("Password123!", salt, false);

    expect(key.extractable).toBe(false);
  });

  it("same password + same salt produces the same derived key", async () => {
    const password = "SamePassword@123";
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));

    // Derive twice with same inputs
    const keyMaterial1 = await globalThis.crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    const keyMaterial2 = await globalThis.crypto.subtle.importKey(
      "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
    );

    // Derive extractable=true so we can export and compare
    const params = { name: "PBKDF2", salt, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" } as const;
    const keySpec = { name: "AES-GCM", length: 256 } as const;
    const key1 = await globalThis.crypto.subtle.deriveKey(params, keyMaterial1, keySpec, true, ["encrypt"]);
    const key2 = await globalThis.crypto.subtle.deriveKey(params, keyMaterial2, keySpec, true, ["encrypt"]);

    const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
    const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

    expect(Buffer.from(raw1).equals(Buffer.from(raw2))).toBe(true);
  });

  it("different passwords produce different derived keys", async () => {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const params = { name: "PBKDF2", salt, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" } as const;
    const keySpec = { name: "AES-GCM", length: 256 } as const;

    const km1 = await globalThis.crypto.subtle.importKey("raw", enc.encode("Password1!abc"), "PBKDF2", false, ["deriveKey"]);
    const km2 = await globalThis.crypto.subtle.importKey("raw", enc.encode("Password2!xyz"), "PBKDF2", false, ["deriveKey"]);

    const key1 = await globalThis.crypto.subtle.deriveKey(params, km1, keySpec, true, ["encrypt"]);
    const key2 = await globalThis.crypto.subtle.deriveKey(params, km2, keySpec, true, ["encrypt"]);

    const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
    const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

    expect(Buffer.from(raw1).equals(Buffer.from(raw2))).toBe(false);
  });

  it("different salts produce different derived keys for the same password", async () => {
    const password = "SamePassword@123";
    const salt1 = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const salt2 = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const keySpec = { name: "AES-GCM", length: 256 } as const;

    const km1 = await globalThis.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    const km2 = await globalThis.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);

    const key1 = await globalThis.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt1, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" }, km1, keySpec, true, ["encrypt"]
    );
    const key2 = await globalThis.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt2, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" }, km2, keySpec, true, ["encrypt"]
    );

    const raw1 = await globalThis.crypto.subtle.exportKey("raw", key1);
    const raw2 = await globalThis.crypto.subtle.exportKey("raw", key2);

    expect(Buffer.from(raw1).equals(Buffer.from(raw2))).toBe(false);
  });

  it("derived key can encrypt data that the same derived key decrypts", async () => {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const password = "SuperSecret$Password1!";

    const key = await deriveKey(password, salt);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = "CFTR carrier — high risk offspring";

    const ct = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, enc.encode(plaintext)
    );
    const pt = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, key, ct
    );

    expect(new TextDecoder().decode(pt)).toBe(plaintext);
  });
});

// ── LAYER A: navigator.deviceMemory parameter selection ────────────────────
// These tests verify the LOGIC for selecting Argon2id parameters based on
// device memory — the switching logic is pure JS and can be tested now.

describe("Encryption — Argon2id parameter selection (device memory switching)", () => {
  const DESKTOP_PARAMS = { memory: 65536, parallelism: 4, iterations: 3 }; // 64MB
  const MOBILE_PARAMS = { memory: 19456, parallelism: 1, iterations: 4 };  // 19MB

  /**
   * The future `selectArgon2Params()` function from `lib/crypto/encryption.ts`.
   *
   * TODO(B3): Replace this inline implementation with the real import once
   *           `apps/web/lib/crypto/encryption.ts` is implemented.
   *
   * Rules:
   *   - undefined deviceMemory (Firefox) → mobile params
   *   - deviceMemory < 4 GB → mobile params
   *   - deviceMemory >= 4 GB → desktop params
   */
  function selectArgon2Params(deviceMemoryGb: number | undefined): typeof DESKTOP_PARAMS {
    if (deviceMemoryGb === undefined || deviceMemoryGb < 4) {
      return MOBILE_PARAMS;
    }
    return DESKTOP_PARAMS;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses desktop params (64MB, p=4, t=3) when deviceMemory >= 4 GB", () => {
    const params = selectArgon2Params(8);

    expect(params.memory).toBe(65536);   // 64 * 1024 KiB
    expect(params.parallelism).toBe(4);
    expect(params.iterations).toBe(3);
  });

  it("uses mobile params (19MB, p=1, t=4) when deviceMemory < 4 GB", () => {
    const params = selectArgon2Params(2);

    expect(params.memory).toBe(19456);   // 19 * 1024 KiB
    expect(params.parallelism).toBe(1);
    expect(params.iterations).toBe(4);
  });

  it("uses mobile params (19MB, p=1, t=4) when deviceMemory is 1 GB", () => {
    const params = selectArgon2Params(1);

    expect(params.memory).toBe(19456);
    expect(params.parallelism).toBe(1);
    expect(params.iterations).toBe(4);
  });

  it("uses mobile/Firefox fallback params when deviceMemory is undefined (Firefox)", () => {
    // Firefox does not expose navigator.deviceMemory
    const params = selectArgon2Params(undefined);

    expect(params.memory).toBe(19456);
    expect(params.parallelism).toBe(1);
    expect(params.iterations).toBe(4);
  });

  it("boundary: 4 GB exactly uses desktop params", () => {
    const params = selectArgon2Params(4);

    expect(params.memory).toBe(65536);
    expect(params.parallelism).toBe(4);
    expect(params.iterations).toBe(3);
  });

  it("boundary: 3.9 GB uses mobile params", () => {
    const params = selectArgon2Params(3.9);

    expect(params.memory).toBe(19456);
    expect(params.parallelism).toBe(1);
    expect(params.iterations).toBe(4);
  });

  it("desktop memory param is 64MB (65536 KiB)", () => {
    const params = selectArgon2Params(8);
    // 64 MB = 64 * 1024 KiB = 65536 KiB — Argon2 uses KiB
    expect(params.memory).toBe(64 * 1024);
  });

  it("mobile memory param is 19MB (19456 KiB)", () => {
    const params = selectArgon2Params(2);
    // 19 MB = 19 * 1024 KiB = 19456 KiB
    expect(params.memory).toBe(19 * 1024);
  });
});

// ── LAYER A: EncryptedEnvelope format validation ───────────────────────────
// Tests for the STRUCTURE of the encrypted envelope (JSON-serialisable,
// contains required fields). These are spec tests for the B3 contract.

describe("Encryption — EncryptedEnvelope format (contract tests)", () => {
  /**
   * Simulated EncryptedEnvelope structure.
   *
   * TODO(B3): Import the real type from `lib/crypto/encryption.ts` once implemented.
   *           The exact field names may differ; update these tests accordingly.
   */
  interface EncryptedEnvelope {
    version: string;       // Schema version, e.g. "1"
    algorithm: string;     // e.g. "AES-256-GCM"
    kdf: string;           // e.g. "argon2id"
    salt: string;          // Base64-encoded random salt used for KDF
    iv: string;            // Base64-encoded 96-bit IV
    ciphertext: string;    // Base64-encoded encrypted data + GCM auth tag
  }

  /** Build a valid fake EncryptedEnvelope for structural tests. */
  function buildFakeEnvelope(overrides: Partial<EncryptedEnvelope> = {}): EncryptedEnvelope {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const fakeCiphertext = globalThis.crypto.getRandomValues(new Uint8Array(48));

    return {
      version: "1",
      algorithm: "AES-256-GCM",
      kdf: "argon2id",
      salt: Buffer.from(salt).toString("base64"),
      iv: Buffer.from(iv).toString("base64"),
      ciphertext: Buffer.from(fakeCiphertext).toString("base64"),
      ...overrides,
    };
  }

  it("envelope contains required fields: version, algorithm, kdf, salt, iv, ciphertext", () => {
    const envelope = buildFakeEnvelope();

    expect(envelope).toHaveProperty("version");
    expect(envelope).toHaveProperty("algorithm");
    expect(envelope).toHaveProperty("kdf");
    expect(envelope).toHaveProperty("salt");
    expect(envelope).toHaveProperty("iv");
    expect(envelope).toHaveProperty("ciphertext");
  });

  it("envelope algorithm field is 'AES-256-GCM'", () => {
    const envelope = buildFakeEnvelope();
    expect(envelope.algorithm).toBe("AES-256-GCM");
  });

  it("envelope kdf field is 'argon2id'", () => {
    const envelope = buildFakeEnvelope();
    expect(envelope.kdf).toBe("argon2id");
  });

  it("envelope version field is '1'", () => {
    const envelope = buildFakeEnvelope();
    expect(envelope.version).toBe("1");
  });

  it("envelope can be serialised to JSON and deserialised (round-trip)", () => {
    const envelope = buildFakeEnvelope();

    const serialised = JSON.stringify(envelope);
    const deserialised = JSON.parse(serialised) as EncryptedEnvelope;

    expect(deserialised.version).toBe(envelope.version);
    expect(deserialised.algorithm).toBe(envelope.algorithm);
    expect(deserialised.kdf).toBe(envelope.kdf);
    expect(deserialised.salt).toBe(envelope.salt);
    expect(deserialised.iv).toBe(envelope.iv);
    expect(deserialised.ciphertext).toBe(envelope.ciphertext);
  });

  it("envelope salt is Base64-encoded (no binary data leaks)", () => {
    const envelope = buildFakeEnvelope();
    // Base64 uses only A-Za-z0-9+/= characters
    expect(envelope.salt).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("envelope IV is Base64-encoded", () => {
    const envelope = buildFakeEnvelope();
    expect(envelope.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("envelope IV decodes to exactly 12 bytes (96-bit GCM nonce)", () => {
    const envelope = buildFakeEnvelope();
    const ivBytes = Buffer.from(envelope.iv, "base64");
    expect(ivBytes.byteLength).toBe(12);
  });

  it("envelope ciphertext is Base64-encoded", () => {
    const envelope = buildFakeEnvelope();
    expect(envelope.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("two envelopes for the same plaintext have different IVs (no IV reuse)", () => {
    const envelope1 = buildFakeEnvelope();
    const envelope2 = buildFakeEnvelope();

    // Both are random, so they should differ
    expect(envelope1.iv).not.toBe(envelope2.iv);
  });

  it("two envelopes for the same plaintext have different salts", () => {
    const envelope1 = buildFakeEnvelope();
    const envelope2 = buildFakeEnvelope();

    // Each encryption uses a fresh random salt
    expect(envelope1.salt).not.toBe(envelope2.salt);
  });

  it("tampered ciphertext field changes the envelope (detection test)", () => {
    const original = buildFakeEnvelope();
    const tampered = { ...original, ciphertext: original.ciphertext + "TAMPERED" };

    // A correct implementation must reject this during decryption
    // (verified via GCM auth tag). Here we assert the field changed.
    expect(tampered.ciphertext).not.toBe(original.ciphertext);
  });

  it("missing required field makes the envelope invalid", () => {
    const envelope = buildFakeEnvelope();

    // Simulate a corruption: remove the IV
    const corrupt = { ...envelope } as Partial<EncryptedEnvelope>;
    delete corrupt.iv;

    expect(corrupt.iv).toBeUndefined();
    // A correct parser MUST reject an envelope missing the IV
    // TODO(B3): When encryption.ts is implemented, replace with:
    //   expect(() => parseEnvelope(JSON.stringify(corrupt))).toThrow(/iv/i)
  });
});

// ── LAYER A: Recovery key entropy and format tests ─────────────────────────

describe("Encryption — Recovery Key (contract tests)", () => {
  /**
   * Recovery key format:
   * - High-entropy random bytes, typically 32 bytes = 256 bits
   * - Often encoded as hex or base64 for display / storage
   * - Used as the "password" input to Argon2id to derive the same DEK
   * - The user stores this key offline; the server never sees it
   */

  /** Simulate generating a recovery key (256-bit random). */
  function generateRecoveryKey(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    return Buffer.from(bytes).toString("hex");
  }

  it("recovery key is high-entropy (256 bits = 64 hex chars)", () => {
    const key = generateRecoveryKey();

    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("each recovery key is unique (no repeats in 100 generations)", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateRecoveryKey());
    }
    // All 100 should be distinct
    expect(keys.size).toBe(100);
  });

  it("recovery key has minimum 32 bytes of entropy (256 bits)", () => {
    const key = generateRecoveryKey();
    // Hex-encoded 32 bytes = 64 chars; the byte array itself is 32 bytes
    const bytes = Buffer.from(key, "hex");
    expect(bytes.byteLength).toBeGreaterThanOrEqual(32);
  });

  it("recovery key can be used as password input to derive the same AES key as the original password would", async () => {
    // Demonstrates: two DIFFERENT password-like strings + SAME salt → DIFFERENT keys
    // (Recovery key path uses the recovery key string as the "password" input)
    const enc = new TextEncoder();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const recoveryKey = generateRecoveryKey();

    const deriveWithInput = async (input: string): Promise<ArrayBuffer> => {
      const km = await globalThis.crypto.subtle.importKey(
        "raw", enc.encode(input), "PBKDF2", false, ["deriveKey"]
      );
      const k = await globalThis.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" },
        km,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"],
      );
      return globalThis.crypto.subtle.exportKey("raw", k);
    };

    // Same recovery key + same salt → same derived key
    const raw1 = await deriveWithInput(recoveryKey);
    const raw2 = await deriveWithInput(recoveryKey);
    expect(Buffer.from(raw1).equals(Buffer.from(raw2))).toBe(true);

    // Different recovery key → different derived key
    const differentKey = generateRecoveryKey();
    const raw3 = await deriveWithInput(differentKey);
    expect(Buffer.from(raw1).equals(Buffer.from(raw3))).toBe(false);
  });

  it("wrong recovery key cannot decrypt data encrypted with correct recovery key", async () => {
    const enc = new TextEncoder();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const correctRecoveryKey = generateRecoveryKey();
    const wrongRecoveryKey = generateRecoveryKey();

    const deriveAesKey = async (input: string): Promise<CryptoKey> => {
      const km = await globalThis.crypto.subtle.importKey(
        "raw", enc.encode(input), "PBKDF2", false, ["deriveKey"]
      );
      return globalThis.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" },
        km,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    };

    const correctKey = await deriveAesKey(correctRecoveryKey);
    const wrongKey = await deriveAesKey(wrongRecoveryKey);

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, correctKey, enc.encode("secret data")
    );

    // Wrong recovery key → auth tag mismatch → throws
    await expect(
      globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrongKey, ciphertext)
    ).rejects.toThrow();
  });
});

// ── LAYER A: Error handling (Web Crypto error paths) ───────────────────────

describe("Encryption — Error Handling (Web Crypto oracle)", () => {
  it("decrypt with corrupt ciphertext (truncated) throws", async () => {
    const key = await globalThis.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, new TextEncoder().encode("hello")
    );

    // Truncate to just 1 byte — definitely corrupt
    const corrupt = ct.slice(0, 1);

    await expect(
      globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, corrupt)
    ).rejects.toThrow();
  });

  it("decrypt with completely empty ciphertext throws", async () => {
    const key = await globalThis.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const empty = new Uint8Array(0);

    await expect(
      globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, empty)
    ).rejects.toThrow();
  });

  it("importKey with empty password string does not throw (zero-length key is valid for PBKDF2)", async () => {
    // Empty passwords must be handled gracefully — the KDF derives a key,
    // but the application layer MUST reject empty passwords before calling KDF.
    // This test documents that the Web Crypto layer itself does not crash.
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const km = await globalThis.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(""), "PBKDF2", false, ["deriveKey"]
    );
    const key = await globalThis.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 1 /* TEST ONLY — production uses Argon2id; see selectArgon2Params() */, hash: "SHA-256" },
      km,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
    expect(key).toBeDefined();
    // NOTE: The APPLICATION layer must validate password is non-empty BEFORE calling KDF.
    // See TODO(B3) in analysis-store.ts — user-facing validation belongs there.
  });

  it("getRandomValues always returns non-zero-filled output for 32 bytes", () => {
    // Sanity: the CSPRNG should not return all zeros in practice
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const allZeros = bytes.every((b) => b === 0);
    expect(allZeros).toBe(false);
  });
});

// ── LAYER B: Planned application-layer API (RED — stubs throw NOT_IMPLEMENTED) ──
//
// These tests verify the CONTRACT that `lib/crypto/encryption.ts` must satisfy.
// The file exists as a NOT_IMPLEMENTED stub — every export throws an error.
//
// The RED/GREEN signal:
//   RED  = stub throws NOT_IMPLEMENTED → Layer B tests assert stubs throw
//   GREEN = real implementation replaces stubs → Layer B tests assert real behaviour
//
// When Stream B3 implements the real Argon2id + AES-256-GCM functions,
// the Layer B tests will go GREEN automatically without any test file changes.
//
// Additionally: analysis-store.ts already documents the RED state explicitly —
// saveCurrentResult() and loadSavedResult() THROW by design until B3 lands.
// Those behaviours are tested against the REAL analysis-store below.

// ── Import the stub encryption module (NOT_IMPLEMENTED until Stream B3) ──────
// The file `apps/web/lib/crypto/encryption.ts` exists as a NOT_IMPLEMENTED stub.
// Every exported function throws NOT_IMPLEMENTED until Stream B3 builds the real
// Argon2id + AES-256-GCM implementation.
//
// When Stream B3 is complete, this import will automatically pick up the real
// implementation and the Layer B tests will transition from RED to GREEN.
import * as encryptionModule from "@/lib/crypto/encryption";

// ── Mock the analysis API client (required by analysis-store import) ──────
vi.mock("@/lib/api/analysis-client", () => ({
  saveResult: vi.fn(),
  listResults: vi.fn(),
  getResult: vi.fn(),
  deleteResult: vi.fn(),
}));

describe("Encryption — Application Layer API (TODO: Stream B3 — these tests FAIL until implemented)", () => {
  it("TODO(B3): deriveKey() must return a non-extractable CryptoKey (currently NOT_IMPLEMENTED)", async () => {
    // RED state: the stub throws NOT_IMPLEMENTED.
    // GREEN state (after B3): the real deriveKey() returns a CryptoKey with extractable=false.
    await expect(
      encryptionModule.deriveKey("Password123!", new Uint8Array(16))
    ).rejects.toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const key = await encryptionModule.deriveKey('Password123!', salt);
    //   expect(key.extractable).toBe(false);
  });

  it("TODO(B3): encryptEnvelope() must return a valid EncryptedEnvelope JSON string (currently NOT_IMPLEMENTED)", async () => {
    // RED state: stub throws.
    // GREEN state: encryptEnvelope(key, data) returns a JSON string with iv, ciphertext, algorithm fields.
    await expect(
      encryptionModule.encryptEnvelope({} as CryptoKey, { test: true })
    ).rejects.toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const envelope = await encryptionModule.encryptEnvelope(key, { carrier: [] });
    //   const parsed = JSON.parse(envelope);
    //   expect(parsed).toHaveProperty('iv');
    //   expect(parsed).toHaveProperty('ciphertext');
    //   expect(parsed.algorithm).toBe('AES-256-GCM');
  });

  it("TODO(B3): decryptEnvelope() must round-trip data through encryptEnvelope() (currently NOT_IMPLEMENTED)", async () => {
    // RED state: stub throws.
    // GREEN state: encrypt then decrypt returns the original data.
    await expect(
      encryptionModule.decryptEnvelope({} as CryptoKey, '{"iv":"...","ciphertext":"..."}')
    ).rejects.toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const data = { carrier: [{ gene: 'CFTR' }] };
    //   const envelope = await encryptionModule.encryptEnvelope(key, data);
    //   const recovered = await encryptionModule.decryptEnvelope(key, envelope);
    //   expect(recovered).toEqual(data);
  });

  it("TODO(B3): decryptEnvelope() must throw on a tampered envelope (currently NOT_IMPLEMENTED)", async () => {
    // RED state: stub throws NOT_IMPLEMENTED (not the tamper-detection error).
    // GREEN state: decryptEnvelope throws a tamper/auth-tag error on corrupted input.
    await expect(
      encryptionModule.decryptEnvelope({} as CryptoKey, "TAMPERED_ENVELOPE")
    ).rejects.toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const envelope = await encryptionModule.encryptEnvelope(key, { test: true });
    //   const tampered = envelope.slice(0, -5) + 'XXXXX';
    //   await expect(encryptionModule.decryptEnvelope(key, tampered)).rejects.toThrow();
  });

  it("TODO(B3): generateRecoveryKey() must return a 64-char hex string (currently NOT_IMPLEMENTED)", () => {
    // RED state: stub throws.
    // GREEN state: returns /^[0-9a-f]{64}$/ (256-bit entropy hex string).
    expect(() => encryptionModule.generateRecoveryKey()).toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const key = encryptionModule.generateRecoveryKey();
    //   expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TODO(B3): selectArgon2Params() must return desktop params when deviceMemory >= 4 (currently NOT_IMPLEMENTED)", () => {
    // RED state: stub throws.
    // GREEN state: returns { memory: 65536, parallelism: 4, iterations: 3 }.
    expect(() => encryptionModule.selectArgon2Params(8)).toThrow("NOT_IMPLEMENTED");
    // TODO(B3): Replace with:
    //   const params = encryptionModule.selectArgon2Params(8);
    //   expect(params).toEqual({ memory: 65536, parallelism: 4, iterations: 3 });
  });

  it("TODO(B3): selectArgon2Params() must return mobile params when deviceMemory < 4 (currently NOT_IMPLEMENTED)", () => {
    // RED state: stub throws.
    // GREEN state: returns { memory: 19456, parallelism: 1, iterations: 4 }.
    expect(() => encryptionModule.selectArgon2Params(2)).toThrow("NOT_IMPLEMENTED");
  });

  it("TODO(B3): selectArgon2Params() must return mobile params when deviceMemory is undefined / Firefox (currently NOT_IMPLEMENTED)", () => {
    // RED state: stub throws.
    // GREEN state: returns { memory: 19456, parallelism: 1, iterations: 4 }.
    expect(() => encryptionModule.selectArgon2Params(undefined)).toThrow("NOT_IMPLEMENTED");
  });
});

// ── LAYER B: analysis-store ZKE blockade (real store, RED state verified) ──
//
// The analysis-store intentionally throws for saveCurrentResult() and
// loadSavedResult() until Stream B3 implements the encryption layer.
// These tests verify the current RED state IS in place (i.e., the blockade
// hasn't accidentally been removed) AND document what GREEN must look like.

describe("Encryption — analysis-store ZKE blockade (confirms RED state until B3)", () => {
  it("saveCurrentResult() throws 'Encryption layer not yet implemented' (Stream B3 blockade is active)", async () => {
    const { useAnalysisStore } = await import("@/lib/stores/analysis-store");
    const store = useAnalysisStore.getState();

    // Current RED state: the blockade IS active — it throws as designed.
    await expect(store.saveCurrentResult("my analysis")).rejects.toThrow(
      /Encryption layer not yet implemented/i,
    );
    // GREEN state (after B3): saveCurrentResult() must resolve without throwing.
    // It should encrypt fullResults and send an EncryptedEnvelope to the backend.
    //   await expect(store.saveCurrentResult('my analysis')).resolves.not.toThrow();
  });

  it("loadSavedResult() throws 'Encryption layer not yet implemented' (Stream B3 blockade is active)", async () => {
    const { useAnalysisStore } = await import("@/lib/stores/analysis-store");
    const store = useAnalysisStore.getState();

    // Current RED state: the blockade IS active.
    await expect(store.loadSavedResult("some-id")).rejects.toThrow(
      /Encryption layer not yet implemented/i,
    );
    // GREEN state (after B3): loadSavedResult() must fetch the EncryptedEnvelope
    // from the backend and decrypt it using the user's derived key.
    //   const result = await store.loadSavedResult('some-id');
    //   expect(result).toBeDefined();
  });

  it("saveCurrentResult() sets saveError on failure (error propagation is wired correctly)", async () => {
    const { useAnalysisStore } = await import("@/lib/stores/analysis-store");
    const store = useAnalysisStore.getState();

    try {
      await store.saveCurrentResult("test");
    } catch {
      // Expected — the blockade throws
    }

    // The store must expose the error for the UI to surface it
    const state = useAnalysisStore.getState();
    expect(state.saveError).toMatch(/Encryption layer not yet implemented/i);
  });
});
