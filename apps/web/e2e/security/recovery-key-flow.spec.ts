/**
 * Q27a — Recovery Key E2E Flow
 *
 * STATUS: CONTRACT SPEC — All tests are test.fixme() because the ZKE
 * encryption layer (Stream B3) is NOT YET IMPLEMENTED. These tests document
 * the full recovery key user flow that WILL be validated once Stream B3 ships.
 *
 * What this file documents:
 * ─────────────────────────
 *   1. The happy-path recovery flow: create account → run analysis →
 *      save encrypted result → generate recovery key → "forget" password →
 *      reset password using recovery key → decrypt and recover analysis data.
 *
 *   2. The error path: wrong recovery key must return a clear error, not
 *      silently serve garbage/decryption artifacts.
 *
 *   3. The PDF export: recovery key PDF download must contain the actual key
 *      (not a placeholder) so the user can store it offline.
 *
 * Architecture context (from apps/web/lib/crypto/encryption.ts):
 * ───────────────────────────────────────────────────────────────
 *   KDF     : Argon2id (WASM) — desktop: memory=64MB, p=4, t=3
 *                              mobile:  memory=19MB, p=1, t=4
 *   Cipher  : AES-256-GCM via Web Crypto API (extractable=false keys)
 *   Output  : EncryptedEnvelope { version, algorithm, kdf, salt, iv, ciphertext }
 *   Recovery: generateRecoveryKey() → 64-char hex string (256-bit entropy)
 *             The recovery key is used as the "password" input to deriveKey(),
 *             producing the SAME AES key as the user's original password (same salt).
 *
 * ZKE guarantee: the backend NEVER sees plaintext. EncryptedEnvelope is what
 * the server stores. Decryption happens client-side only.
 *
 * What activates these tests:
 * ────────────────────────────
 *   Remove test.fixme() and replace the stub bodies with real interactions
 *   after Stream B3 implements:
 *     - apps/web/lib/crypto/encryption.ts (deriveKey, encryptEnvelope, decryptEnvelope,
 *       generateRecoveryKey)
 *     - apps/web/lib/stores/analysis-store.ts saveCurrentResult() and loadSavedResult()
 *     - The account/security settings UI (recovery key generation + PDF export button)
 *     - The password-reset flow that accepts a recovery key instead of email link
 *
 * Related test files:
 * ───────────────────
 *   - apps/web/__tests__/lib/encryption.test.ts — ZKE unit tests (Layer A + B)
 *   - apps/web/__tests__/save-load-integrity.test.ts — Save/load data integrity (Q12)
 *   - apps/web/e2e/security/auth-security.spec.ts — Auth security (CSRF, XSS, etc.)
 *   - apps/web/e2e/auth/password-reset.spec.ts — Standard password reset flow
 */

import { test, expect } from '@playwright/test';
import { API_BASE } from '../utils/mock-api.utils';

// ── Type Helpers ─────────────────────────────────────────────────────────────

/**
 * Shape of a mock EncryptedEnvelope — mirrors apps/web/lib/crypto/encryption.ts.
 * Used in test stubs to describe what the backend will store.
 */
interface MockEncryptedEnvelope {
  version: string;
  algorithm: string;
  kdf: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

/**
 * Builds a structurally valid fake EncryptedEnvelope for mock API responses.
 * This does NOT perform real encryption — it is a test fixture only.
 */
function buildMockEnvelope(): MockEncryptedEnvelope {
  // In real tests, this would be produced by: encryptEnvelope(derivedKey, analysisResult)
  return {
    version: '1',
    algorithm: 'AES-256-GCM',
    kdf: 'argon2id',
    salt: Buffer.from('mock-random-salt-16b').toString('base64'),
    iv: Buffer.from('mock-96bit-iv').toString('base64'),
    ciphertext: Buffer.from('mock-ciphertext-plus-auth-tag').toString('base64'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Happy Path — Full Recovery Key Flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Recovery Key — Full E2E Flow', () => {

  /**
   * THE CANONICAL RECOVERY KEY USER FLOW
   *
   * Step-by-step (to be implemented when Stream B3 ships):
   *
   * 1. Register or log in as a test user with a known password.
   *
   * 2. Upload two parent genetic files and run analysis.
   *    Wait for analysis to reach the "complete" step.
   *
   * 3. Save the analysis via the "Save Results" button.
   *    Under the hood, this calls:
   *      - deriveKey(password, randomSalt)         — Argon2id KDF
   *      - encryptEnvelope(derivedKey, fullResults) — AES-256-GCM
   *      - POST /api/analyses { envelope: encryptedEnvelopeJson }
   *    The server receives ONLY the EncryptedEnvelope — never plaintext.
   *
   * 4. Navigate to Account → Security → Recovery Key.
   *    Click "Generate Recovery Key".
   *    The application calls generateRecoveryKey() — returns a 64-char hex string.
   *    Display the key on screen (masked, with a copy button).
   *
   * 5. Download the Recovery Key PDF.
   *    The PDF must contain the full recovery key and user instructions.
   *
   * 6. Simulate "forgotten password":
   *    Log out → navigate to /forgot-password → enter email.
   *    (In the test, we mock the password-reset email.)
   *
   * 7. Password Reset with Recovery Key:
   *    Navigate to /reset-password?token=<mock-token>
   *    Enter new password + the recovery key from Step 4.
   *    The application:
   *      - Derives the OLD AES key using the recovery key + SAME salt
   *      - Decrypts the saved EncryptedEnvelope
   *      - Re-encrypts with the NEW password's derived key
   *      - Updates the stored envelope on the backend
   *
   * 8. Log in with the NEW password.
   *    Navigate to Saved Results.
   *    Load the saved analysis.
   *    Assert: the loaded FullAnalysisResult matches the one saved in Step 3.
   *    Specifically:
   *      - carrier[0].condition === original condition
   *      - carrier[0].riskLevel === original riskLevel
   *      - prs.conditions key count matches original
   *      - metadata.analysisTimestamp matches original
   *
   * Assertions (when enabled):
   *   - The saved analysis is recoverable after password reset with recovery key
   *   - No plaintext health data is ever transmitted to the backend
   *   - The UI shows the recovered analysis, not a decryption error
   *   - The recovery key is a 64-character hex string (256-bit entropy)
   *
   * Mock API routes needed (when enabling):
   *   - POST   /auth/register          → 201
   *   - POST   /auth/login             → 200 { access_token, ... }
   *   - GET    /auth/me                → 200 { id, email, tier }
   *   - POST   /api/analyses           → 201 { id: 'analysis-001' }
   *   - GET    /api/analyses           → 200 [{ id, label, createdAt }]
   *   - GET    /api/analyses/analysis-001 → 200 { encryptedEnvelope: '...' }
   *   - POST   /auth/forgot-password   → 200
   *   - POST   /auth/reset-password    → 200
   *   - PUT    /api/analyses/analysis-001 → 200 (re-encrypted envelope)
   */
  test.fixme(
    'TODO(stream-ops): create account → save encrypted analysis → generate recovery key → password reset → recover with key → verify data',
    async ({ page }) => {
      // ── Step 1: Register ────────────────────────────────────────────────
      // TODO(B3): Mock POST /auth/register + GET /auth/me
      // await page.goto('/register');
      // await page.getByLabel('Email').fill('recovery-test@example.com');
      // await page.getByLabel('Password').fill('OriginalPassword123!');
      // await page.getByRole('button', { name: /create account/i }).click();
      // await expect(page).toHaveURL(/\/analysis/);

      // ── Step 2: Run analysis (or load demo) ────────────────────────────
      // TODO(B3): Navigate to /analysis and load demo data, or mock the worker
      // await page.goto('/analysis');
      // await page.getByRole('button', { name: /try demo/i }).click();
      // await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();

      // ── Step 3: Save the analysis ──────────────────────────────────────
      // TODO(B3): Mock POST /api/analyses to return a result ID
      // Mock POST /api/analyses
      // await page.route(`${API_BASE}/api/analyses`, async (route) => {
      //   await route.fulfill({
      //     status: 201,
      //     contentType: 'application/json',
      //     body: JSON.stringify({ id: 'analysis-001', label: 'Test Analysis', createdAt: new Date().toISOString() }),
      //   });
      // });
      // await page.getByRole('button', { name: /save results/i }).click();
      // await page.getByLabel(/label/i).fill('Test Analysis');
      // await page.getByRole('button', { name: /save/i }).click();
      // await expect(page.getByText(/saved/i)).toBeVisible();

      // ── Step 4: Generate recovery key ──────────────────────────────────
      // TODO(B3): Navigate to security settings and generate a recovery key
      // await page.goto('/account');
      // await page.getByRole('tab', { name: /security/i }).click();
      // await page.getByRole('button', { name: /generate recovery key/i }).click();
      // const recoveryKeyDisplay = await page.getByTestId('recovery-key-display');
      // await expect(recoveryKeyDisplay).toBeVisible();
      // const recoveryKey = await recoveryKeyDisplay.textContent();
      // expect(recoveryKey).toMatch(/^[0-9a-f]{64}$/);

      // ── Step 5: Download PDF ───────────────────────────────────────────
      // TODO(B3): Covered by separate test below

      // ── Step 6: Log out and simulate forgotten password ────────────────
      // await page.getByRole('button', { name: /log out/i }).click();
      // await expect(page).toHaveURL(/\/login/);

      // ── Step 7: Password reset with recovery key ───────────────────────
      // TODO(B3): Mock POST /auth/forgot-password + POST /auth/reset-password
      // await page.goto('/forgot-password');
      // await page.getByLabel('Email').fill('recovery-test@example.com');
      // await page.getByRole('button', { name: /send reset/i }).click();
      // await page.goto('/reset-password?token=mock-reset-token-123');
      // await page.getByLabel(/new password/i).fill('NewPassword456!');
      // await page.getByLabel(/recovery key/i).fill(recoveryKey);
      // await page.getByRole('button', { name: /reset password/i }).click();
      // await expect(page).toHaveURL(/\/login/);

      // ── Step 8: Log in with new password and verify data ──────────────
      // TODO(B3): Mock GET /api/analyses + GET /api/analyses/analysis-001
      // await page.getByLabel('Email').fill('recovery-test@example.com');
      // await page.getByLabel('Password').fill('NewPassword456!');
      // await page.getByRole('button', { name: /sign in/i }).click();
      // await page.goto('/analysis/saved');
      // await page.getByText('Test Analysis').click();
      // await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
      // Verify the carrier tab shows the expected data
      // await page.getByRole('tab', { name: /carrier/i }).click();
      // await expect(page.getByText(/Cystic Fibrosis/i)).toBeVisible();

      // This stub must be removed when B3 is implemented.
      // Placeholder removed — test.fixme() already prevents execution.
    },
  );

  /**
   * WRONG RECOVERY KEY ERROR PATH
   *
   * The ZKE contract requires that a wrong recovery key produces a clear,
   * user-facing error — NOT garbage data displayed as if it were valid results.
   *
   * Specifically:
   *   - decryptEnvelope(wrongKey, envelope) throws an error (GCM auth tag mismatch)
   *   - The UI catches the decryption error and shows an error state
   *   - The user is NOT shown partially decrypted / corrupted data
   *   - The error message does NOT reveal the correct key
   *
   * Flow to implement (when B3 ships):
   *   1. Set up a saved encrypted analysis (as in the happy path)
   *   2. Navigate to password reset
   *   3. Enter a WRONG recovery key (different 64-char hex string)
   *   4. Submit the reset form
   *   5. Assert: an error is displayed
   *   6. Assert: the user is still on the reset page (no navigation to analysis)
   *   7. Assert: no analysis data is shown (no carrier results, etc.)
   *
   * Assertions (when enabled):
   *   - page contains text matching /invalid recovery key/i or /incorrect key/i
   *   - page.getByRole('alert') is visible with error text
   *   - page does NOT contain any carrier condition names from the saved analysis
   *   - page URL still matches /reset-password/ (no redirect to analysis)
   *
   * Mock API routes needed:
   *   - GET /api/analyses/analysis-001 → 200 { encryptedEnvelope: buildMockEnvelope() }
   *   - The decryption failure happens client-side (no additional mock needed)
   */
  test.fixme(
    'TODO(stream-ops): wrong recovery key returns appropriate error, not garbage data',
    async ({ page }) => {
      // ── Mock: analysis endpoint returns a valid encrypted envelope ──────
      // await page.route(`${API_BASE}/api/analyses/analysis-001`, async (route) => {
      //   await route.fulfill({
      //     status: 200,
      //     contentType: 'application/json',
      //     body: JSON.stringify({
      //       id: 'analysis-001',
      //       encryptedEnvelope: JSON.stringify(buildMockEnvelope()),
      //     }),
      //   });
      // });

      // ── Navigate to reset password page ─────────────────────────────────
      // await page.goto('/reset-password?token=mock-token');
      // await page.getByLabel(/new password/i).fill('NewPassword456!');

      // ── Enter the WRONG recovery key ─────────────────────────────────────
      // const wrongKey = 'a'.repeat(64); // A different valid-looking 64-char hex key
      // await page.getByLabel(/recovery key/i).fill(wrongKey);
      // await page.getByRole('button', { name: /reset password/i }).click();

      // ── Assert: error is shown, NOT garbage health data ──────────────────
      // const errorAlert = page.getByRole('alert');
      // await expect(errorAlert).toBeVisible({ timeout: 5_000 });
      // await expect(errorAlert).toContainText(/invalid recovery key|incorrect key|decryption failed/i);

      // Assert we are still on the reset page
      // await expect(page).toHaveURL(/\/reset-password/);

      // Assert no carrier data was displayed (which would indicate garbage decryption)
      // const carrierTable = page.getByRole('table', { name: /carrier/i });
      // await expect(carrierTable).not.toBeVisible();

      // ── ZKE guarantee verification ──────────────────────────────────────
      // The error message must NOT hint at what the correct key is.
      // const errorText = await errorAlert.textContent();
      // expect(errorText).not.toMatch(/correct key is/i);
      // expect(errorText).not.toMatch(/[0-9a-f]{64}/); // Must not show the real key

      // Placeholder removed — test.fixme() already prevents execution.
    },
  );

  /**
   * RECOVERY KEY PDF DOWNLOAD
   *
   * The recovery key PDF is the user's offline backup mechanism.
   * If the PDF contains a placeholder instead of the real key, the user
   * CANNOT recover their data after a password reset — which is a critical
   * data loss scenario.
   *
   * What to verify (when B3 ships):
   *   1. Navigate to Account → Security → Recovery Key
   *   2. Generate a recovery key (generateRecoveryKey() → 64-char hex string)
   *   3. Click "Download PDF"
   *   4. Wait for the download to complete
   *   5. Parse the downloaded PDF (or intercept the PDF generation call)
   *   6. Assert: the PDF contains the full 64-char hex recovery key
   *   7. Assert: the PDF does NOT contain the user's password
   *   8. Assert: the PDF contains user-readable instructions for how to use
   *      the recovery key during password reset
   *
   * Implementation note:
   *   Playwright can intercept downloads via page.waitForEvent('download').
   *   PDF content can be verified by intercepting the PDF generation API call
   *   (if server-side) or by checking the PDF blob URL parameters (if client-side).
   *   Alternatively, the test can assert that the recovery key is injected into
   *   the PDF generation template correctly.
   *
   * Assertions (when enabled):
   *   - The download event fires within 5 seconds of clicking the button
   *   - download.suggestedFilename() matches /recovery-key.*\.pdf/i
   *   - The PDF-rendering component receives the correct key prop (unit-testable
   *     independently at the component level)
   *   - The key displayed in the UI before download matches what the PDF receives
   *
   * Related tests:
   *   - apps/web/__tests__/pdf-document-builder.test.ts — PDF content unit tests
   */
  test.fixme(
    'TODO(stream-ops): recovery key PDF download contains the actual recovery key',
    async ({ page }) => {
      // ── Navigate to security settings ────────────────────────────────────
      // await page.goto('/account');
      // await page.getByRole('tab', { name: /security/i }).click();

      // ── Generate a recovery key ──────────────────────────────────────────
      // await page.getByRole('button', { name: /generate recovery key/i }).click();

      // Capture the key displayed on screen before download
      // const keyDisplay = page.getByTestId('recovery-key-value');
      // await expect(keyDisplay).toBeVisible();
      // const displayedKey = (await keyDisplay.textContent())?.replace(/\s/g, '');
      // expect(displayedKey).toMatch(/^[0-9a-f]{64}$/);

      // ── Click download and intercept the file ────────────────────────────
      // const [download] = await Promise.all([
      //   page.waitForEvent('download'),
      //   page.getByRole('button', { name: /download pdf/i }).click(),
      // ]);

      // ── Assert: download metadata ────────────────────────────────────────
      // expect(download.suggestedFilename()).toMatch(/recovery-key.*\.pdf$/i);

      // ── Assert: PDF contains the recovery key ────────────────────────────
      // The exact verification method depends on the PDF implementation:
      //
      // Option A (server-side PDF): Intercept the PDF generation API call and
      //   assert the request body contains the key.
      //
      // Option B (client-side react-pdf): Check that the PDF component was
      //   rendered with the correct key prop.
      //   await page.route('/api/pdf/recovery-key', async (route) => {
      //     const body = JSON.parse(route.request().postData() ?? '{}');
      //     expect(body.recoveryKey).toBe(displayedKey);
      //     await route.continue();
      //   });
      //
      // Option C (inspect PDF blob): Parse the downloaded PDF using a PDF
      //   parsing library and check that the key text is present.

      // ── Assert: PDF does NOT contain the user's password ─────────────────
      // The PDF is a user-readable document — it must contain the recovery key
      // but NEVER the user's password or any derived cryptographic material.
      //
      // (Tested at unit level in pdf-document-builder.test.ts when implemented)

      // Placeholder removed — test.fixme() already prevents execution.
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases and Security Properties
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Recovery Key — Security Properties', () => {

  /**
   * RECOVERY KEY UNIQUENESS
   *
   * Each time the user generates a new recovery key, it must be different from
   * any previously generated key. This prevents an attacker who has seen an old
   * key from using it after the user regenerates.
   *
   * Flow (when B3 ships):
   *   1. Navigate to security settings
   *   2. Generate key #1, note the value
   *   3. Click "Regenerate" (or equivalent)
   *   4. Assert: key #2 is NOT equal to key #1
   *
   * Underlying mechanism:
   *   generateRecoveryKey() calls crypto.getRandomValues(new Uint8Array(32))
   *   which provides cryptographically secure randomness — guaranteed unique per call.
   */
  test.fixme(
    'TODO(stream-ops): newly generated recovery key is different from the previous key',
    async ({ page }) => {
      // await page.goto('/account');
      // await page.getByRole('tab', { name: /security/i }).click();

      // const keyDisplay = page.getByTestId('recovery-key-value');

      // await page.getByRole('button', { name: /generate recovery key/i }).click();
      // await expect(keyDisplay).toBeVisible();
      // const key1 = (await keyDisplay.textContent())?.replace(/\s/g, '');

      // await page.getByRole('button', { name: /regenerate/i }).click();
      // const key2 = (await keyDisplay.textContent())?.replace(/\s/g, '');

      // expect(key1).toMatch(/^[0-9a-f]{64}$/);
      // expect(key2).toMatch(/^[0-9a-f]{64}$/);
      // expect(key1).not.toBe(key2);

      // Placeholder removed — test.fixme() already prevents execution.
    },
  );

  /**
   * RECOVERY KEY IS NOT STORED ON SERVER
   *
   * ZKE guarantee: the recovery key is generated client-side and NEVER
   * transmitted to the server. The server only stores EncryptedEnvelopes.
   * If the recovery key were server-stored, a server breach would compromise
   * all user data.
   *
   * Flow (when B3 ships):
   *   1. Intercept all outgoing API requests
   *   2. Generate a recovery key
   *   3. Assert: no outgoing request body contains the 64-char hex recovery key
   *
   * Note: The recovery key MAY appear in the URL bar if the PDF is downloaded via
   * a GET request — the implementation must use POST or blob URLs to avoid this.
   */
  test.fixme(
    'TODO(stream-ops): recovery key is never transmitted to the backend server',
    async ({ page }) => {
      // const outgoingBodies: string[] = [];

      // page.on('request', (request) => {
      //   const body = request.postData() ?? '';
      //   outgoingBodies.push(body);
      // });

      // await page.goto('/account');
      // await page.getByRole('tab', { name: /security/i }).click();
      // await page.getByRole('button', { name: /generate recovery key/i }).click();

      // const keyDisplay = page.getByTestId('recovery-key-value');
      // await expect(keyDisplay).toBeVisible();
      // const recoveryKey = (await keyDisplay.textContent())?.replace(/\s/g, '');
      // expect(recoveryKey).toMatch(/^[0-9a-f]{64}$/);

      // // Wait a moment for any async sends to fire
      // await page.waitForTimeout(1_000);

      // // Assert: the recovery key was NEVER sent in any request body
      // for (const body of outgoingBodies) {
      //   expect(body).not.toContain(recoveryKey!);
      // }

      // Placeholder removed — test.fixme() already prevents execution.
    },
  );

  /**
   * RECOVERY KEY DISPLAY IS MASKED BY DEFAULT
   *
   * The recovery key must not be visible in plaintext when the security
   * settings page loads. The user must take an explicit action (click "reveal")
   * to see it, preventing shoulder-surfing attacks.
   *
   * Flow (when B3 ships):
   *   1. Navigate to security settings
   *   2. Assert: recovery key display is masked (input type="password" or hidden)
   *   3. Click "Reveal"
   *   4. Assert: recovery key is now visible and matches expected format
   */
  test.fixme(
    'TODO(stream-ops): recovery key is masked by default and requires explicit reveal action',
    async ({ page }) => {
      // await page.goto('/account');
      // await page.getByRole('tab', { name: /security/i }).click();
      // await page.getByRole('button', { name: /generate recovery key/i }).click();

      // // Key should be masked initially
      // const maskedDisplay = page.getByTestId('recovery-key-masked');
      // await expect(maskedDisplay).toBeVisible();

      // // The actual key should not be readable
      // const visibleText = await maskedDisplay.textContent();
      // expect(visibleText).not.toMatch(/^[0-9a-f]{64}$/);

      // // Click reveal
      // await page.getByRole('button', { name: /reveal|show/i }).click();

      // // Now the key is readable
      // const revealedDisplay = page.getByTestId('recovery-key-value');
      // await expect(revealedDisplay).toBeVisible();
      // const key = (await revealedDisplay.textContent())?.replace(/\s/g, '');
      // expect(key).toMatch(/^[0-9a-f]{64}$/);

      // Placeholder removed — test.fixme() already prevents execution.
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Structural Assertion (runs TODAY — no encryption required)
//
// Validates the shape of the mock data helpers used in this test file.
// This ensures the test stubs are correctly structured before B3 ships.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Recovery Key — Structural Validation (runs today)', () => {
  test('buildMockEnvelope returns a structurally valid EncryptedEnvelope shape', () => {
    // This test runs WITHOUT fixme — it validates the test fixture itself.
    // When B3 is implemented, real envelopes must match this schema.
    const envelope = buildMockEnvelope();

    expect(envelope).toHaveProperty('version');
    expect(envelope).toHaveProperty('algorithm');
    expect(envelope).toHaveProperty('kdf');
    expect(envelope).toHaveProperty('salt');
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ciphertext');

    expect(envelope.version).toBe('1');
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.kdf).toBe('argon2id');

    // All binary fields must be Base64-encoded strings (JSON-safe)
    expect(envelope.salt).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(envelope.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(envelope.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  test('buildMockEnvelope is JSON-serialisable (safe to store in IndexedDB)', () => {
    const envelope = buildMockEnvelope();
    let serialized: string;

    expect(() => {
      serialized = JSON.stringify(envelope);
    }).not.toThrow();

    const deserialized = JSON.parse(serialized!);

    expect(deserialized.version).toBe(envelope.version);
    expect(deserialized.algorithm).toBe(envelope.algorithm);
    expect(deserialized.kdf).toBe(envelope.kdf);
    expect(deserialized.salt).toBe(envelope.salt);
    expect(deserialized.iv).toBe(envelope.iv);
    expect(deserialized.ciphertext).toBe(envelope.ciphertext);
  });

  test('two buildMockEnvelope calls produce structurally identical envelopes', () => {
    // The mock is deterministic (no crypto.getRandomValues called here).
    // Real envelopes will have random salt/iv — tested in encryption.test.ts.
    const e1 = buildMockEnvelope();
    const e2 = buildMockEnvelope();

    expect(e1.version).toBe(e2.version);
    expect(e1.algorithm).toBe(e2.algorithm);
    expect(e1.kdf).toBe(e2.kdf);
  });

  test('API_BASE is defined (required for mock route setup when tests are enabled)', () => {
    // Validates that the shared mock API constant is accessible from this file.
    expect(typeof API_BASE).toBe('string');
    expect(API_BASE.length).toBeGreaterThan(0);
  });
});
