/**
 * Stream B3 — Client-side Zero-Knowledge Encryption (ZKE) layer.
 *
 * STATUS: NOT YET IMPLEMENTED — see TODO(B3) in analysis-store.ts.
 *
 * This stub exists to satisfy Vite module resolution for the encryption
 * unit tests (Q27). Every exported function throws until Stream B3
 * implements the real Argon2id + AES-256-GCM encryption layer.
 *
 * Architecture (to be implemented):
 * ───────────────────────────────────
 *   KDF     : Argon2id via WASM (argon2-browser or @noble/hashes)
 *             Desktop  : memory=64MB (65536 KiB), parallelism=4, iterations=3
 *             Mobile   : memory=19MB (19456 KiB), parallelism=1, iterations=4
 *                        (when navigator.deviceMemory < 4 GB)
 *             Firefox  : same as mobile (navigator.deviceMemory is undefined)
 *
 *   Cipher  : AES-256-GCM via Web Crypto API (window.crypto.subtle)
 *             Random 96-bit IV per encryption operation
 *             Non-extractable CryptoKey (extractable=false, always)
 *
 *   Output  : EncryptedEnvelope — JSON-serialisable object containing:
 *               version    : "1"
 *               algorithm  : "AES-256-GCM"
 *               kdf        : "argon2id"
 *               salt       : base64-encoded random salt (for KDF)
 *               iv         : base64-encoded 96-bit IV (for AES-GCM)
 *               ciphertext : base64-encoded encrypted payload + GCM auth tag
 *
 *   Recovery: generateRecoveryKey() produces a 256-bit hex string that
 *             can be used as an alternative password input to deriveKey().
 *             The recovery key derives the same DEK as the password (same salt).
 *
 * When implementing:
 *   1. Replace each TODO(B3) function with the real implementation.
 *   2. Remove the NOT_IMPLEMENTED errors.
 *   3. The Q27 encryption unit tests will go GREEN automatically.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** Argon2id parameter set. memory is in KiB. */
export interface Argon2Params {
  memory: number; // KiB; 65536 = 64 MB (desktop), 19456 = 19 MB (mobile)
  parallelism: number; // p; 4 (desktop), 1 (mobile)
  iterations: number; // t; 3 (desktop), 4 (mobile)
}

/**
 * Encrypted envelope — the opaque output of encryptEnvelope().
 * Stored as a JSON string in IndexedDB; the server never sees plaintext.
 */
export interface EncryptedEnvelope {
  version: string; // "1"
  algorithm: string; // "AES-256-GCM"
  kdf: string; // "argon2id"
  salt: string; // base64-encoded random KDF salt
  iv: string; // base64-encoded 96-bit IV
  ciphertext: string; // base64-encoded ciphertext + 16-byte GCM auth tag
}

// ── Stubs (NOT_IMPLEMENTED — to be replaced by Stream B3) ─────────────────

const NOT_IMPLEMENTED = (_name: string): never => {
  throw new Error('NOT_IMPLEMENTED: Encryption not available.');
};

/**
 * TODO(B3): Select Argon2id parameters based on device memory.
 *
 * @param deviceMemoryGb - navigator.deviceMemory (undefined on Firefox)
 * @returns Argon2id parameter set (desktop or mobile)
 */
export function selectArgon2Params(deviceMemoryGb: number | undefined): Argon2Params {
  void deviceMemoryGb;
  return NOT_IMPLEMENTED('selectArgon2Params');
}

/**
 * TODO(B3): Derive a non-extractable AES-256-GCM CryptoKey from a password
 * (or recovery key) using Argon2id.
 *
 * @param password - User password or recovery key hex string
 * @param salt     - Random 16-byte salt (generated per user/save, stored in envelope)
 * @returns Non-extractable CryptoKey suitable for AES-256-GCM encrypt/decrypt
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  void password;
  void salt;
  return NOT_IMPLEMENTED('deriveKey');
}

/**
 * TODO(B3): Encrypt a plaintext data object and return a serialised EncryptedEnvelope.
 *
 * @param key  - Non-extractable AES-256-GCM CryptoKey (from deriveKey)
 * @param data - Any JSON-serialisable data (FullAnalysisResult)
 * @returns JSON string of an EncryptedEnvelope (safe to store in IndexedDB)
 */
export async function encryptEnvelope(key: CryptoKey, data: unknown): Promise<string> {
  void key;
  void data;
  return NOT_IMPLEMENTED('encryptEnvelope');
}

/**
 * TODO(B3): Decrypt a serialised EncryptedEnvelope and return the original data.
 *
 * Throws if the envelope is tampered (GCM auth tag verification fails).
 * Throws if the envelope JSON is malformed.
 * Throws if the key is wrong (auth tag mismatch).
 *
 * @param key          - Non-extractable AES-256-GCM CryptoKey (from deriveKey)
 * @param envelopeJson - JSON string of an EncryptedEnvelope
 * @returns Decrypted data object
 */
export async function decryptEnvelope(key: CryptoKey, envelopeJson: string): Promise<unknown> {
  void key;
  void envelopeJson;
  return NOT_IMPLEMENTED('decryptEnvelope');
}

/**
 * TODO(B3): Generate a cryptographically secure 256-bit recovery key.
 *
 * @returns 64-character hex string (256 bits of entropy)
 */
export function generateRecoveryKey(): string {
  return NOT_IMPLEMENTED('generateRecoveryKey');
}
