# Phase: Stream B — Backend Refactor (apps/api/)

This phase refactors the FastAPI backend to support the V3 architecture, focusing on Zero-Knowledge Encryption (ZKE), GDPR compliance, and strict typing.

## Goal

Establish a secure, compliant, and type-safe backend foundation where the server _never_ sees plaintext genetic data.

## Plan Overview

The work is divided into 3 logical sprints to manage dependencies (Encryption → GDPR → Business Logic).

### Sprint 1: Zero-Knowledge Foundation & Schemas (Critical Path)

**Goal:** Transition from server-side encryption to client-side ZKE and enforce strict data contracts.

- **B3**: Define `EncryptedEnvelope` schema (Client-side ZKE contract).
- **B13**: Remove server-side encryption & update `AnalysisResult` model.
- **B1**: Implement strict Pydantic schemas for Analysis Results.
- **B2**: Add data version tracking.

### Sprint 2: Auth, GDPR & Compliance

**Goal:** harden authentication and implement legally required data rights.

- **B11**: Refine Auth Middleware (CSRF, Session mgmt).
- **B7**: Nuclear Delete (Crypto-shredding).
- **B8**: JSON Export (Data Portability).
- **B12**: Data Rectification.

### Sprint 3: Business Logic, Tiers & Analytics

**Goal:** Implement the business model and operational features.

- **B5**: Tier Gating & Upgrades (Premium/Pro).
- **B9**: Transactional Email Receipts.
- **B10**: Partner Notification.
- **B6**: Anonymous Conversion Analytics.

---

## Detailed Implementation Plan

### Sprint 1: Zero-Knowledge Foundation & Schemas

#### B3: Zero-Knowledge Encryption Support

- **File:** `apps/api/app/schemas/encryption.py` (New)
- **Task:** Define the `EncryptedEnvelope` Pydantic model. This is the contract for data blob storage.
  - Fields: `iv` (bytes/hex), `ciphertext` (bytes/hex), `salt` (bytes/hex), `kdf_params` (JSON), `version` (string, e.g., "v1:argon2id:aes-gcm").
- **File:** `apps/api/app/models/analysis.py`
- **Task:** Update `AnalysisResult` model.
  - Remove: `result_nonce` (no longer separate, part of envelope).
  - Update: `result_data` to store the JSON-serialized `EncryptedEnvelope` (or keep as binary if using MessagePack, but JSON is safer for schema evolution).
  - **Migration:** Create an Alembic migration to alter the table. _Note: This is a breaking change for existing data. Strategy: Truncate local dev data or write a script to "fake" migrate if needed, but since it's dev, truncation is acceptable._

#### B13: Remove Server-Side Encryption

- **File:** `apps/api/app/encryption.py`
- **Task:** **DELETE** this file. The server must not possess encryption keys.
- **File:** `apps/api/app/routers/analysis.py`
- **Task:** Refactor `save_result` and `get_result`.
  - `save_result`: Accept `EncryptedEnvelope` directly. **Do not validate contents.** Store as-is.
  - `get_result`: Return `EncryptedEnvelope`. Server does strictly I/O, no crypto.
  - **Verify:** Ensure no server-side decryption attempts occur.

#### B1: Strict Pydantic Schema for Results

- **File:** `apps/api/app/schemas/analysis.py`
- **Task:** Define `AnalysisResult` schema matching `packages/shared-types/src/genetics.ts`.
  - Use `pydantic.BaseModel`.
  - Define nested models: `CarrierResult`, `TraitResult`, `PgxResult`, `PrsResult`, etc.
  - **Usage:** This schema is for _type generation_ (creating TS types) and for the _client_ to validate against. The _server_ uses `EncryptedEnvelope` for storage, but having this schema ensures we can generate the TS types using `datamodel-code-generator` or similar if we were generating clients.
- **File:** `packages/shared-types/src/genetics.ts`
- **Task:** Ensure the Pydantic schema mirrors these types exactly.

#### B2: Data Version Tracking

- **File:** `apps/api/app/models/analysis.py`
- **Task:** Add `data_version` column (String).
- **File:** `apps/api/app/schemas/analysis.py`
- **Task:** Add `dataVersion` field to the schema.
- **Purpose:** Allows the frontend to detect if a saved result was generated with an old engine version and prompt for re-analysis.

---

### Sprint 2: Auth, GDPR & Compliance

#### B11: Auth Middleware Refinement

- **File:** `apps/api/app/middleware/auth.py`
- **Task:** Verify current implementation.
  - Ensure `get_current_user` checks `locked_until`.
  - Ensure `Session` invalidation works on password change (already in `auth.py`, verify coverage).
- **File:** `apps/api/app/main.py`
- **Task:** CSRF Hardening.
  - Verify `CORSMiddleware` config.
  - Add a dependency or middleware to enforce `X-Requested-With: XMLHttpRequest` (or similar custom header) on state-changing methods (POST, PUT, DELETE) to prevent simple CSRF, working in tandem with `SameSite=Lax` cookies.

#### B7: Nuclear Delete (Crypto-shredding)

- **File:** `apps/api/app/routers/gdpr.py` (New)
- **Task:** Create `DELETE /gdpr/account` endpoint.
  - **Logic:**
    1.  Require Re-authentication (Password or fresh token).
    2.  Delete `User` record (Cascade deletes `AnalysisResults`, `Sessions`, `Payments`).
    3.  **Crypto-shredding:** Since the DEK is client-side and never stored, deleting the account (and thus the salt/user record) makes any potential backups effectively unrecoverable (though backups should also be purged per policy).
    4.  Log audit event `account_deleted`.

#### B8: JSON Export (GDPR Art. 20)

- **File:** `apps/api/app/routers/gdpr.py`
- **Task:** Create `GET /gdpr/export` endpoint.
  - **Logic:**
    1.  Fetch User profile.
    2.  Fetch all `AnalysisResult` entries (Metadata + Encrypted Envelopes).
    3.  Fetch `AuditLog` entries for user.
    4.  Fetch `Payment` history.
    5.  Return as a single JSON structure.
  - _Note: The analysis data is exported in its ENCRYPTED form. The user must use their client (and password) to decrypt it. The server cannot export plaintext._

#### B12: Data Rectification (GDPR Art. 16)

- **File:** `apps/api/app/routers/gdpr.py`
- **Task:** Create `PUT /gdpr/profile` endpoint.
  - Allows updating name, email, etc.
  - (Already largely covered by `PUT /auth/me`, but ensure a specific GDPR-compliant alias or endpoint exists if legally distinct, otherwise alias to `update_profile`).

---

### Sprint 3: Business Logic, Tiers & Analytics

#### B5: Tier Gating Updates

- **File:** `apps/api/app/models/user.py`
- **Task:** Ensure `tier` column supports `free`, `premium` ($14.99), `pro` ($34.99).
- **File:** `apps/api/app/routers/payments.py`
- **Task:** Update checkout session creation logic.
  - Handle `premium` vs `pro` price IDs (from Env).
  - Implement "Upgrade" logic: If user is `premium` and buys `pro`, charge difference (or prorate via Stripe).
- **File:** `apps/api/app/middleware/auth.py`
- **Task:** Update `require_tier` dependency to respect the 3-level hierarchy.

#### B9: Transactional Email Receipts

- **File:** `apps/api/app/services/email_service.py`
- **Task:** Add `send_receipt_email(to, amount, receipt_url)`.
- **File:** `apps/api/app/routers/payments.py`
- **Task:** In the Stripe Webhook handler (`checkout.session.completed`):
  - Call `send_receipt_email`.
  - Ensure this happens server-side, reliable delivery.

#### B10: Partner Notification Email

- **File:** `apps/api/app/services/email_service.py`
- **Task:** Add `send_partner_notification(to, sender_name)`.
- **File:** `apps/api/app/routers/analysis.py`
- **Task:** Add endpoint `POST /analysis/notify-partner`.
  - Input: `partner_email`.
  - Logic: Send generic "Your partner [Name] has analyzed their genetics..." email.
  - Rate Limit: Strict (e.g., 1/hour) to prevent spam.

#### B6: Server-side Anonymous Conversion Analytics

- **File:** `apps/api/app/models/analytics.py` (New)
- **Task:** Create simple counter model: `DailyEvent(date, event_type, count)`.
- **File:** `apps/api/app/services/analytics_service.py` (New)
- **Task:** `increment_event(type)`. Uses `ON CONFLICT DO UPDATE` (upsert) to increment simple counters.
  - Events: `landing_visit`, `upload_start`, `analysis_complete`, `checkout_start`, `purchase_complete`.
- **File:** `apps/api/app/routers/analytics.py` (New)
- **Task:** `POST /analytics/event`.
  - Publicly accessible (or minimal auth).
  - **No PII**: Drops IP, User Agent. Just increments the counter.

---

## Technical Constraints & Standards

- **Testing**: All new routers must have corresponding tests in `apps/api/tests/`.
- **Async**: All DB operations must be `await`.
- **Type Safety**: No `Any` in Pydantic models.
- **Environment**: Secrets (Stripe keys, Resend keys) must come from `get_settings()`.
