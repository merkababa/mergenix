# Data Protection Impact Assessment (DPIA)

## Mergenix Genetic Offspring Analysis Platform

**Document Reference:** DPIA-MERGENIX-001
**Version:** 1.0
**Classification:** CONFIDENTIAL
**Date of Assessment:** 2026-03-01
**Date of Last Review:** 2026-03-01
**Next Scheduled Review:** 2027-03-01
**Assessment Conducted By:** Technical Lead / Privacy Lead, Mergenix
**Approved By:** See Section 7 — Sign-off

---

## Table of Contents

1. [Description of Processing](#1-description-of-processing)
2. [Necessity and Proportionality](#2-necessity-and-proportionality)
3. [Risks to Data Subjects](#3-risks-to-data-subjects)
4. [Risk Mitigation Measures](#4-risk-mitigation-measures)
5. [Consultation](#5-consultation)
6. [Review Schedule](#6-review-schedule)
7. [Sign-off](#7-sign-off)
8. [Appendices](#8-appendices)

---

## 1. Description of Processing

### 1.1 Overview of Processing Activity

Mergenix is a direct-to-consumer genetic offspring analysis platform. Users upload raw genetic data files from third-party testing services (e.g., 23andMe, AncestryDNA, MyHeritage, FamilyTreeDNA) and receive analysis results predicting potential offspring characteristics, including carrier risk status, trait predictions, pharmacogenomic (PGx) responses, polygenic risk scores (PRS), and genetic counseling triage recommendations.

### 1.2 Nature of Data Processed

| Data Category              | Specific Data Elements                                                                                          | GDPR Classification                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Genetic data**           | Raw genotype files (.txt, .csv), parsed SNP data, carrier status, trait alleles, PGx variants, PRS calculations | Special category data (Art. 9) — genetic data, health data |
| **Health-related outputs** | Carrier risk probabilities, disease predispositions, pharmacogenomic drug responses, counseling triage flags    | Special category data (Art. 9) — health data               |
| **Identity data**          | Full name, email address                                                                                        | Personal data (Art. 4(1))                                  |
| **Account data**           | User ID (UUID), subscription tier (Free/Premium/Pro), email verification status, account creation date          | Personal data (Art. 4(1))                                  |
| **Authentication data**    | Password hash (bcrypt), TOTP secret (2FA), hashed backup codes, OAuth provider/ID, session tokens               | Personal data (Art. 4(1))                                  |
| **Financial data**         | Stripe customer ID, payment intent ID, payment amount, currency, payment status, tier granted                   | Personal data (Art. 4(1))                                  |
| **Technical metadata**     | IP addresses, user agent strings, timestamps, audit log event types                                             | Personal data (Art. 4(1)) — identifiers                    |
| **Consent records**        | Consent type, version, IP at consent, user agent at consent, timestamp                                          | Personal data (Art. 4(1))                                  |
| **Cookie preferences**     | Analytics cookie opt-in/opt-out flag                                                                            | Personal data (Art. 4(1))                                  |

### 1.3 Purpose of Processing

| Purpose                         | Description                                                                                                                        | Lawful Basis                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Primary analysis**            | Parsing uploaded genetic files, computing carrier risk, trait predictions, PGx, PRS, and counseling triage for potential offspring | Explicit consent (Art. 6(1)(a), Art. 9(2)(a)) |
| **Result storage**              | Storing encrypted analysis results so users can retrieve them later                                                                | Explicit consent (Art. 6(1)(a), Art. 9(2)(a)) |
| **Account management**          | Registration, authentication, session management, password resets, email verification                                              | Contract performance (Art. 6(1)(b))           |
| **Payment processing**          | Processing tier upgrades via Stripe (Premium at $14.99, Pro at $34.99)                                                             | Contract performance (Art. 6(1)(b))           |
| **Security & fraud prevention** | Rate limiting, brute-force lockout, CSRF protection, audit logging                                                                 | Legitimate interest (Art. 6(1)(f))            |
| **GDPR compliance**             | Data export (Art. 20), account deletion (Art. 17), profile rectification (Art. 16)                                                 | Legal obligation (Art. 6(1)(c))               |
| **Analytics**                   | Cookie-based analytics (only with explicit opt-in consent)                                                                         | Consent (Art. 6(1)(a))                        |

### 1.4 How Data Is Processed — Technical Architecture

#### 1.4.1 Client-Side Processing (Browser / Web Workers)

Genetic data is parsed and analyzed entirely client-side in the user's browser using Web Workers. The genetics engine (`packages/genetics-engine/`) performs:

- File parsing and format detection (23andMe v3/v4/v5, AncestryDNA, MyHeritage, FamilyTreeDNA)
- SNP decompression and liftover (coordinate normalization)
- Chip detection and coverage analysis
- Carrier status calculation (autosomal recessive conditions)
- Trait prediction (polygenic and monogenic traits)
- Pharmacogenomics (PGx) star allele calling and drug response prediction
- Polygenic risk score (PRS) computation
- Residual risk calculations
- Counseling triage flag generation

**Critical privacy property:** Raw genetic file data never leaves the user's browser. All genetic computations occur in isolated Web Workers. The server never receives, processes, or stores raw genotype data.

#### 1.4.2 Zero-Knowledge Encryption (ZKE)

When a user saves analysis results:

1. The genetics engine completes analysis in the browser
2. Results are encrypted client-side using AES-256-GCM with a client-derived key before transmission
3. The encrypted blob (EncryptedEnvelope) is sent to the server via HTTPS
4. The server stores the encrypted blob as opaque binary data (`LargeBinary` column)
5. The server **never possesses the decryption key** — only the client can decrypt
6. An unencrypted summary (aggregate counts/statistics only, no individual genetic data) is stored separately for result listing

Server-side, analysis results are stored as:

- `result_data`: `LargeBinary` — JSON-serialized EncryptedEnvelope (opaque to server)
- `summary_json`: `JSON` — unencrypted aggregate summary (counts only, no genetic markers)

Additionally, the server maintains a `DATA_ENCRYPTION_KEY` (AES-256-GCM) as a defense-in-depth measure for data-at-rest encryption, separate from the JWT secret.

#### 1.4.3 Server-Side Processing (FastAPI Backend)

The backend (`apps/api/`) handles:

- User registration and authentication (JWT access tokens + HttpOnly refresh token cookies)
- Session management (refresh token rotation, 7-day expiry)
- CSRF protection via `X-Requested-With: XMLHttpRequest` header enforcement on state-changing requests
- Storing and retrieving encrypted analysis envelopes (without decryption)
- Tier management and Stripe payment webhook processing
- GDPR endpoints: data export, account deletion, profile rectification
- Audit logging of security-relevant events
- Consent record management (immutable append-only)
- Rate limiting (per-endpoint, IP-based via slowapi)

#### 1.4.4 Data Flow Summary

```
User's Browser                          Mergenix Server                    Third Parties
┌──────────────────────┐   HTTPS/TLS   ┌───────────────────┐             ┌──────────┐
│ 1. User uploads      │               │                   │             │          │
│    genetic file      │               │                   │             │ Stripe   │
│                      │               │                   │  Webhooks   │ (payment │
│ 2. Web Worker parses │               │                   │◄────────────│  only)   │
│    & analyzes        │               │                   │             │          │
│    (client-side)     │               │                   │             └──────────┘
│                      │               │                   │
│ 3. Results encrypted │  Encrypted    │ 4. Store opaque   │             ┌──────────┐
│    (ZKE) in browser  │──envelope────►│    encrypted blob  │             │ Resend   │
│                      │               │    (never decrypt) │             │ (email   │
│ 5. On retrieval,     │  Encrypted    │                   │  Transactional│ delivery │
│    decrypt in browser│◄─envelope─────│ 6. Return blob    │──emails─────►│  only)   │
│                      │               │    as-is          │             │          │
└──────────────────────┘               └───────────────────┘             └──────────┘
```

### 1.5 Scope of Processing

| Dimension            | Detail                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data subjects**    | Adults (18+) who voluntarily register and upload genetic data                                                                                                                                                             |
| **Geographic scope** | Global (accessible worldwide); GDPR applies to all EU/EEA data subjects regardless of server location                                                                                                                     |
| **Volume estimate**  | Pre-launch; estimated to grow beyond 10,000 registered users within 12 months of launch                                                                                                                                   |
| **Retention period** | Until user requests deletion (Art. 17) or account is voluntarily closed; audit logs retained on a tiered schedule: security audit logs 2 years (730 days), general audit logs 1 year (365 days), orphaned records 90 days |
| **Data processors**  | See Section 1.6                                                                                                                                                                                                           |

### 1.6 Data Recipients and Processors

| Recipient                                | Role                                    | Data Shared                                                                             | Purpose                           | Safeguards                                                                 |
| ---------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| **Vercel / Cloud Hosting Provider**      | Data processor                          | Encrypted analysis blobs, user account data, audit logs (all stored in PostgreSQL)      | Infrastructure hosting            | DPA in place; encryption at rest (AES-256); EU/US data region configurable |
| **Stripe, Inc.**                         | Independent data controller / processor | Email, payment amount, currency, Stripe customer ID, payment intent                     | Payment processing                | Stripe DPA; PCI DSS Level 1; no genetic data shared                        |
| **Resend (email provider)**              | Data processor                          | Email address, email content (verification, password reset, receipts)                   | Transactional email delivery      | DPA in place; no genetic data included in emails                           |
| **Cloudflare / CDN Provider**            | Data processor                          | IP addresses, request metadata (no genetic data)                                        | DDoS protection, content delivery | DPA in place; EU-US Data Privacy Framework                                 |
| **Sentry (optional, if DSN configured)** | Data processor                          | Error traces, IP address, user agent (no genetic data, no PII in breadcrumbs by policy) | Error monitoring                  | Sentry DPA; PII scrubbing enabled via `before_send` callback               |

**No genetic data is shared with any third party.** Stripe, Resend, and infrastructure providers receive only the minimum data necessary for their specific function. Analysis results remain encrypted and opaque to the server and all processors.

### 1.7 Subscription Tiers and Data Processing Differences

| Tier        | Price  | Saved Analyses Limit | Features                                                  | Additional Data Processing                                     |
| ----------- | ------ | -------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| **Free**    | $0     | 1                    | Basic carrier analysis, limited traits                    | Minimal — one saved result                                     |
| **Premium** | $14.99 | 10                   | Full carrier panel, all traits, PGx                       | Up to 10 encrypted result blobs                                |
| **Pro**     | $34.99 | Unlimited            | Everything in Premium + PRS, PDF export, priority support | Unlimited encrypted result blobs; PDF generation (client-side) |

Tier does not affect the type of personal data collected — only the volume of stored analysis results and which analysis modules are available in the client-side engine.

---

## 2. Necessity and Proportionality

### 2.1 Lawful Basis for Processing Special Category Data

Processing of genetic and health data falls under **GDPR Article 9** (special categories of personal data). The lawful basis is:

- **Article 9(2)(a) — Explicit consent:** Users provide explicit, informed, specific, freely given, and unambiguous consent before uploading genetic data and initiating analysis.

Consent is collected as follows:

| Consent Point          | Mechanism                                                                         | Record                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Registration**       | Terms of Service and Privacy Policy acceptance (checkbox, not pre-ticked)         | `ConsentRecord` with type `terms` and `privacy`, document version, IP, user agent, timestamp |
| **Age verification**   | Confirmation of being 18+ years of age                                            | `ConsentRecord` with type `age_verification`                                                 |
| **Analysis save**      | Explicit `consent_given` boolean parameter required on every save-result API call | Enforced at API level; analysis cannot be saved without `consent_given=true`                 |
| **Cookie preferences** | Granular opt-in for analytics cookies (analytics disabled by default)             | `CookiePreference` record; `ConsentRecord` with type `cookies`                               |

Consent records are immutable (append-only `consent_records` table) and include the document version, so consent validity can be verified against the specific version of terms/privacy policy the user agreed to.

### 2.2 Data Minimization

The platform implements data minimization at multiple levels:

| Principle                                  | Implementation                                                                                                                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No raw genetic data stored server-side** | Genetic files are parsed and analyzed entirely in the browser. The server never receives raw genotype files. Only encrypted analysis results (and aggregate summaries) are transmitted.               |
| **Zero-knowledge encryption**              | The server stores analysis results as opaque encrypted blobs. Even if the database were compromised, the attacker could not read genetic analysis results without the user's client-side key.         |
| **Minimal summary data**                   | The unencrypted `summary_json` field contains only aggregate counts and statistics (e.g., "12 carrier conditions found") — never individual genetic markers, alleles, or health-specific information. |
| **No genetic data in email**               | Transactional emails (verification, password reset, receipts) never contain genetic data, analysis results, or health information.                                                                    |
| **No genetic data to payment processor**   | Stripe receives only email, payment amount, and currency. No genetic data, analysis results, or health information is shared with Stripe.                                                             |
| **Audit logs exclude PII values**          | When profile fields are rectified (GDPR Art. 16), audit logs record only _which_ fields changed (e.g., `["name", "email"]`), never the actual old or new values.                                      |
| **IP/user agent collection**               | Collected only for security (brute-force detection, audit trail) and consent evidence; stored in audit logs with defined retention.                                                                   |

### 2.3 Purpose Limitation

Data collected for each purpose is not repurposed:

- **Genetic data** is used solely for offspring analysis as explicitly consented. It is never used for marketing, profiling, automated decision-making, insurance assessment, employment screening, or any secondary purpose.
- **Payment data** is used solely for processing tier upgrades and generating receipts.
- **Authentication data** is used solely for account security and access control.
- **Audit logs** are used solely for security monitoring, compliance evidence, and GDPR data export.

### 2.4 Storage Limitation

| Data Type                                      | Retention Policy                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encrypted analysis results**                 | Retained until user deletes the specific result or deletes their entire account (Art. 17)                                                                                                                                                                  |
| **User account data**                          | Retained until user requests account deletion; 30-day grace period before permanent deletion                                                                                                                                                               |
| **Consent records**                            | Retained for 3 years after account deletion to demonstrate compliance with consent obligations                                                                                                                                                             |
| **Audit logs**                                 | Retained on a tiered schedule: security audit logs 2 years (730 days), general audit logs 1 year (365 days), orphaned records 90 days; `user_id` is set to NULL on account deletion (preserving the event trail without linking to the deleted individual) |
| **Payment records**                            | Financial records retained for 7 years per applicable tax and accounting regulations; cascade-deleted with user account except where legal retention obligations require otherwise                                                                         |
| **Session tokens**                             | Automatically expire after 7 days; deleted on logout or account deletion                                                                                                                                                                                   |
| **Password reset / email verification tokens** | Expire after 1 hour; `used_at` timestamp recorded on use; cascade-deleted with user account                                                                                                                                                                |

### 2.5 Data Subject Rights Implementation

| GDPR Right                    | Article   | Implementation                                                                                                                              | Endpoint                                               |
| ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Right of access**           | Art. 15   | Full data export including encrypted analysis envelopes, audit logs, payment history, and profile data                                      | `GET /gdpr/export` (paginated, rate-limited to 1/hour) |
| **Right to data portability** | Art. 20   | Export includes full EncryptedEnvelope data in machine-readable JSON format                                                                 | `GET /gdpr/export`                                     |
| **Right to erasure**          | Art. 17   | Complete account deletion including all analysis results, sessions, payments, and audit log references; requires password re-authentication | `DELETE /gdpr/account`                                 |
| **Right to rectification**    | Art. 16   | Profile field updates (name, email); email changes require password re-authentication and trigger re-verification                           | `PUT /gdpr/profile`                                    |
| **Right to withdraw consent** | Art. 7(3) | Account deletion removes all data and effectively withdraws all consent; cookie preferences can be changed at any time                      | `DELETE /gdpr/account`; cookie preference endpoint     |
| **Right to object**           | Art. 21   | Analytics cookies are opt-in (not opt-out); no profiling or automated decision-making is performed                                          | Cookie preference UI                                   |
| **Right to restriction**      | Art. 18   | Users may contact privacy@mergenix.com to request restriction of processing; manual review process with 30-day response commitment          | Contact form / privacy email                           |

### 2.6 International Transfers

| Transfer                          | Mechanism                                                                  | Safeguards                                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Vercel / Cloud Hosting (US-based) | EU-US Data Privacy Framework (DPF) and Standard Contractual Clauses (SCCs) | DPA in place; encryption in transit (TLS 1.2+) and at rest (AES-256); no raw genetic data stored server-side |
| Stripe (US-based)                 | EU-US Data Privacy Framework (DPF)                                         | Payment data only; no genetic data; PCI DSS Level 1 certified                                                |
| Resend (US-based)                 | Standard Contractual Clauses (SCCs)                                        | Email addresses only; no genetic data; transactional email only                                              |

---

## 3. Risks to Data Subjects

### 3.1 Risk Assessment Methodology

Risks are assessed using the standard likelihood x severity matrix recommended by the ICO and EDPB:

|                         | Negligible Severity | Limited Severity | Significant Severity | Maximum Severity |
| ----------------------- | ------------------- | ---------------- | -------------------- | ---------------- |
| **Remote likelihood**   | Low                 | Low              | Medium               | Medium           |
| **Possible likelihood** | Low                 | Medium           | High                 | High             |
| **Likely**              | Medium              | High             | High                 | Very High        |
| **Near certain**        | Medium              | High             | Very High            | Very High        |

### 3.2 Identified Risks

#### Risk 1: Unauthorized Access to Genetic Analysis Results

| Dimension                  | Assessment                                                                                                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | An attacker gains access to the database and reads genetic analysis results, which could reveal health predispositions, carrier status, or other sensitive genetic information about data subjects and their potential offspring. |
| **Data subjects affected** | All users who have saved analysis results                                                                                                                                                                                         |
| **Likelihood**             | Remote — ZKE architecture means database contains only encrypted blobs; server never holds decryption keys                                                                                                                        |
| **Severity**               | Maximum — Genetic data is uniquely identifying, immutable, and affects biological relatives; could enable discrimination in insurance, employment, or social contexts                                                             |
| **Overall risk**           | **Medium** (Remote x Maximum)                                                                                                                                                                                                     |
| **Mitigation**             | See Section 4.1 (ZKE), 4.2 (encryption at rest), 4.3 (access controls)                                                                                                                                                            |
| **Residual risk**          | **Low** — multiple encryption layers make data effectively inaccessible even in a breach                                                                                                                                          |

#### Risk 2: Re-identification from Summary Data

| Dimension                  | Assessment                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | The unencrypted `summary_json` field (aggregate counts like "12 carrier conditions found") could, in combination with other data (email, IP, timestamps), allow inference of genetic characteristics. |
| **Data subjects affected** | All users who have saved analysis results                                                                                                                                                             |
| **Likelihood**             | Remote — summaries contain only aggregate counts, not specific conditions, alleles, or genetic markers                                                                                                |
| **Severity**               | Significant — even aggregate genetic statistics could narrow health predictions                                                                                                                       |
| **Overall risk**           | **Medium** (Remote x Significant)                                                                                                                                                                     |
| **Mitigation**             | See Section 4.1 (summary data minimization), 4.3 (access controls)                                                                                                                                    |
| **Residual risk**          | **Low** — summaries are deliberately designed to be non-informative about specific genetic conditions                                                                                                 |

#### Risk 3: Session Hijacking / Account Takeover

| Dimension                  | Assessment                                                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | An attacker steals a user's JWT access token or refresh token cookie, gaining access to their account and ability to read encrypted analysis results (if the attacker also compromises the client-side decryption key). |
| **Data subjects affected** | Individual compromised user                                                                                                                                                                                             |
| **Likelihood**             | Possible — token theft via XSS, network interception, or local device compromise                                                                                                                                        |
| **Severity**               | Maximum — full access to encrypted analysis results (if decryption key also compromised) or account manipulation                                                                                                        |
| **Overall risk**           | **High** (Possible x Maximum)                                                                                                                                                                                           |
| **Mitigation**             | See Section 4.4 (authentication controls), 4.5 (session management)                                                                                                                                                     |
| **Residual risk**          | **Medium** — CSRF protection, HttpOnly cookies, short access token lifetimes, and 2FA reduce risk but client-side key management remains a dependency                                                                   |

#### Risk 4: Genetic Discrimination

| Dimension                  | Assessment                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Description**            | Genetic information revealed through a breach or unauthorized access could be used by insurers, employers, or other parties to discriminate against data subjects or their biological relatives. |
| **Data subjects affected** | All users and their biological family members (genetic data has familial implications)                                                                                                           |
| **Likelihood**             | Remote — ZKE prevents server-side data access; legal protections (GINA in US, Equality Act in UK, etc.) provide additional safeguards                                                            |
| **Severity**               | Maximum — discrimination based on genetic predispositions could affect insurance coverage, employment, social relationships                                                                      |
| **Overall risk**           | **Medium** (Remote x Maximum)                                                                                                                                                                    |
| **Mitigation**             | See Section 4.1 (ZKE), 4.6 (user education), 4.7 (legal compliance)                                                                                                                              |
| **Residual risk**          | **Low** — technical controls (ZKE) make this risk largely theoretical                                                                                                                            |

#### Risk 5: Psychological Harm from Analysis Results

| Dimension                  | Assessment                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Users may receive unexpected or distressing genetic information (e.g., carrier status for serious conditions, high PRS for diseases) that causes anxiety, depression, or relationship strain. |
| **Data subjects affected** | All users who receive analysis results                                                                                                                                                        |
| **Likelihood**             | Likely — carrier status findings and PRS are inherently capable of causing distress                                                                                                           |
| **Severity**               | Significant — psychological harm, anxiety about offspring health, relationship impact                                                                                                         |
| **Overall risk**           | **High** (Likely x Significant)                                                                                                                                                               |
| **Mitigation**             | See Section 4.8 (counseling triage), 4.6 (user education and disclaimers)                                                                                                                     |
| **Residual risk**          | **Medium** — counseling triage flags are implemented but professional genetic counseling referral is advisory only                                                                            |

#### Risk 6: Third-Party Genetic File Compromise

| Dimension                  | Assessment                                                                                                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Users upload genetic files obtained from third-party services (23andMe, AncestryDNA, etc.). Those files exist on the user's local device and in the browser during processing. Malicious browser extensions, malware, or a compromised device could intercept the raw genetic data during the upload/parsing window. |
| **Data subjects affected** | Individual compromised user                                                                                                                                                                                                                                                                                          |
| **Likelihood**             | Possible — depends on user's device security                                                                                                                                                                                                                                                                         |
| **Severity**               | Maximum — raw genotype data is the most sensitive form of genetic data                                                                                                                                                                                                                                               |
| **Overall risk**           | **High** (Possible x Maximum)                                                                                                                                                                                                                                                                                        |
| **Mitigation**             | See Section 4.9 (client-side security), 4.6 (user education)                                                                                                                                                                                                                                                         |
| **Residual risk**          | **Medium** — Mergenix cannot control user device security; Web Workers provide some isolation but are not a security boundary against malicious extensions                                                                                                                                                           |

#### Risk 7: Inadequate Consent / Consent Fatigue

| Dimension                  | Assessment                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Users may not fully understand the implications of processing their genetic data, may not read consent materials, or may feel pressured to consent quickly. Consent for genetic data processing must be truly informed and specific per Art. 9(2)(a). |
| **Data subjects affected** | All users                                                                                                                                                                                                                                             |
| **Likelihood**             | Possible — consent fatigue is a well-documented phenomenon in digital services                                                                                                                                                                        |
| **Severity**               | Significant — processing without truly informed consent would violate Art. 9                                                                                                                                                                          |
| **Overall risk**           | **High** (Possible x Significant)                                                                                                                                                                                                                     |
| **Mitigation**             | See Section 4.10 (consent management)                                                                                                                                                                                                                 |
| **Residual risk**          | **Medium** — layered consent approach reduces but cannot eliminate consent fatigue                                                                                                                                                                    |

#### Risk 8: Data Breach Notification Failure

| Dimension                  | Assessment                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | In the event of a data breach involving genetic data, failure to notify the supervisory authority within 72 hours (Art. 33) or affected data subjects without undue delay (Art. 34) could compound harm and result in regulatory sanctions. |
| **Data subjects affected** | All users whose data is affected by a breach                                                                                                                                                                                                |
| **Likelihood**             | Remote — dependent on breach occurrence and organizational readiness                                                                                                                                                                        |
| **Severity**               | Maximum — genetic data breaches are high-profile; delayed notification increases harm                                                                                                                                                       |
| **Overall risk**           | **Medium** (Remote x Maximum)                                                                                                                                                                                                               |
| **Mitigation**             | See Section 4.11 (incident response)                                                                                                                                                                                                        |
| **Residual risk**          | **Low** — with documented procedures and clear escalation paths                                                                                                                                                                             |

### 3.3 Risk Summary

| Risk ID | Risk Description                       | Inherent Risk | Residual Risk |
| ------- | -------------------------------------- | ------------- | ------------- |
| R1      | Unauthorized access to genetic results | Medium        | **Low**       |
| R2      | Re-identification from summary data    | Medium        | **Low**       |
| R3      | Session hijacking / account takeover   | High          | **Medium**    |
| R4      | Genetic discrimination                 | Medium        | **Low**       |
| R5      | Psychological harm from results        | High          | **Medium**    |
| R6      | Third-party genetic file compromise    | High          | **Medium**    |
| R7      | Inadequate consent                     | High          | **Medium**    |
| R8      | Data breach notification failure       | Medium        | **Low**       |

---

## 4. Risk Mitigation Measures

### 4.1 Zero-Knowledge Encryption (ZKE) Architecture

| Control                    | Detail                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client-side analysis**   | All genetic computation occurs in browser Web Workers; raw genetic files never transmitted to server                                                          |
| **Client-side encryption** | Analysis results encrypted in the browser before transmission using AES-256-GCM with a client-derived key                                                     |
| **Opaque server storage**  | Server stores encrypted blobs as `LargeBinary`; no server-side decryption capability                                                                          |
| **Summary minimization**   | Unencrypted summaries contain only aggregate counts (e.g., number of conditions found); no specific genetic markers, alleles, condition names, or health data |
| **Key management**         | Decryption keys exist only on the client; server holds a separate `DATA_ENCRYPTION_KEY` (AES-256-GCM) for defense-in-depth encryption at rest                 |
| **Risk addressed**         | R1 (unauthorized access), R2 (re-identification), R4 (discrimination)                                                                                         |

### 4.2 Encryption at Rest and in Transit

| Control                          | Detail                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TLS/HTTPS**                    | All client-server communication over HTTPS (TLS 1.2+); HTTP requests upgraded to HTTPS                                                                         |
| **Database encryption**          | PostgreSQL hosted on cloud provider with AES-256 disk encryption (provider-managed)                                                                            |
| **Application-level encryption** | `DATA_ENCRYPTION_KEY` (AES-256-GCM) provides an additional layer of encryption for analysis results beyond ZKE; separate from JWT secret to limit blast radius |
| **Cookie security**              | Refresh token cookies: `HttpOnly=true`, `Secure=true` (production), `SameSite=Lax`, path-scoped to `/auth`                                                     |
| **Risk addressed**               | R1 (unauthorized access), R3 (session hijacking)                                                                                                               |

### 4.3 Access Controls

| Control                       | Detail                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**            | JWT-based with short-lived access tokens (30 min) and longer-lived refresh tokens (7 days) in HttpOnly cookies                                          |
| **Two-factor authentication** | TOTP-based 2FA available for all users; hashed backup codes stored as SHA-256                                                                           |
| **Account lockout**           | Brute-force protection: `failed_login_attempts` counter with automatic `locked_until` timestamp after 5 failed attempts                                 |
| **CSRF protection**           | Pure ASGI middleware enforces `X-Requested-With: XMLHttpRequest` header on all state-changing requests (POST, PUT, DELETE, PATCH)                       |
| **Row-level isolation**       | All database queries filter by `user_id`; users can only access their own analysis results, audit logs, and payment history                             |
| **Admin access**              | Admin endpoints require both JWT authentication and a separate `X-Admin-Key` header with constant-time comparison                                       |
| **Rate limiting**             | Per-endpoint rate limits: login (5/min), registration (3/min), data export (1/hour), account deletion (3/min), general API (60/min), webhooks (100/min) |
| **Risk addressed**            | R1 (unauthorized access), R3 (session hijacking)                                                                                                        |

### 4.4 Authentication Controls

| Control                                        | Detail                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Password hashing**                           | bcrypt with automatic salt; `password_hash` stored, plaintext never retained                                                |
| **Re-authentication for sensitive operations** | Account deletion and email changes require password re-verification; not just a valid JWT                                   |
| **OAuth support**                              | Google OAuth available; OAuth-only accounts have no `password_hash` (NULL) and are directed to support for account deletion |
| **Token validation**                           | Every request validates token type (`access` vs. `refresh`), expiry, and user existence in database                         |
| **Session invalidation**                       | Password changes invalidate all active sessions                                                                             |
| **Risk addressed**                             | R3 (session hijacking)                                                                                                      |

### 4.5 Session Management

| Control                    | Detail                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Access token lifetime**  | 30 minutes — limits exposure window                                                                           |
| **Refresh token lifetime** | 7 days — stored in HttpOnly cookie, path-scoped to `/auth`                                                    |
| **Refresh token rotation** | New refresh token issued on each use; previous token invalidated immediately                                  |
| **Session tracking**       | Active sessions stored in `sessions` table with IP, user agent, and expiry; cascade-deleted with user account |
| **Logout**                 | Refresh cookie cleared; session record deleted from database                                                  |
| **Risk addressed**         | R3 (session hijacking)                                                                                        |

### 4.6 User Education and Disclaimers

| Control                      | Detail                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Genetic data disclaimers** | Prominent disclaimers displayed before and after analysis that results are informational only, not diagnostic; results are statistical predictions, not medical advice |
| **Privacy policy**           | Clear explanation of ZKE architecture, what data is and is not stored server-side, third-party data sharing                                                            |
| **Security page**            | Public security information page explaining encryption model and data protection measures                                                                              |
| **Limitations of analysis**  | Clear communication that results represent statistical probabilities, not certainties; affected by coverage, chip type, and population databases                       |
| **Risk addressed**           | R5 (psychological harm), R6 (client-side compromise), R7 (consent)                                                                                                     |

### 4.7 Legal Compliance

| Control                        | Detail                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **GDPR compliance**            | Full implementation of data subject rights (access, portability, erasure, rectification); documented in GDPR router                        |
| **Age restriction**            | 18+ age verification required at registration; consent record created                                                                      |
| **Genetic non-discrimination** | Compliance with GINA (US — 42 U.S.C. 2000ff) for US users, UK Equality Act 2010, and relevant EU member state genetic data protection laws |
| **Data processing agreements** | DPAs in place or in negotiation with all processors (hosting, Stripe, Resend, Sentry)                                                      |
| **Risk addressed**             | R4 (discrimination), R7 (consent), R8 (breach notification)                                                                                |

### 4.8 Counseling Triage System

| Control                  | Detail                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Triage flags**         | The genetics engine generates counseling triage flags for findings that warrant professional genetic counseling review                                                  |
| **Referral information** | Links to genetic counseling resources provided with high-risk findings, including the NSGC find-a-counselor tool and guidance to consult qualified healthcare providers |
| **Result presentation**  | Results presented with appropriate statistical context, severity indicators, and educational content explaining what carrier status and PRS mean in practice            |
| **Risk addressed**       | R5 (psychological harm)                                                                                                                                                 |

### 4.9 Client-Side Security

| Control                                     | Detail                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web Worker isolation**                    | Genetic parsing and analysis run in dedicated Web Workers, isolating processing from the main browser thread                                      |
| **No persistent local storage of raw data** | Raw genetic files are held only in Web Worker memory during active analysis; not persisted to localStorage, IndexedDB, or any client-side storage |
| **Content Security Policy**                 | Strict CSP headers configured to prevent unauthorized script execution and data exfiltration                                                      |
| **Subresource Integrity**                   | Integrity hashes on third-party scripts where applicable                                                                                          |
| **Risk addressed**                          | R6 (client-side compromise)                                                                                                                       |

### 4.10 Consent Management

| Control                           | Detail                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Granular consent collection**   | Separate consent records for: terms of service, privacy policy, age verification, cookie preferences, and per-analysis data storage |
| **Versioned consent**             | Each consent record includes the document version (e.g., "1.0", "1.1"), enabling verification against specific policy versions      |
| **Immutable consent audit trail** | `consent_records` table is append-only; consent events cannot be modified or deleted                                                |
| **Consent evidence**              | Each consent record captures: timestamp, IP address, user agent, consent type, and document version                                 |
| **Consent withdrawal**            | Users can withdraw consent by deleting their account; cookie analytics consent can be toggled independently at any time             |
| **Not pre-ticked**                | All consent checkboxes require affirmative action; no pre-selected options                                                          |
| **Freely given**                  | Free tier provides core functionality without requiring analytics cookies or data sharing beyond what is necessary for the service  |
| **Risk addressed**                | R7 (inadequate consent)                                                                                                             |

### 4.11 Incident Response

| Control                       | Detail                                                                                                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Breach detection**          | Structured logging via structlog; anomaly detection on audit log patterns; Sentry error monitoring with PII scrubbing                                                               |
| **72-hour notification**      | Designated privacy contact (privacy@mergenix.com) responsible for supervisory authority notification within 72 hours per Art. 33; incident response checklist maintained internally |
| **Data subject notification** | Affected data subjects notified without undue delay when a breach is likely to result in high risk per Art. 34; notification via email through Resend                               |
| **Incident response plan**    | Internal incident response runbook maintained; severity classification (P0/P1/P2) with defined escalation paths                                                                     |
| **Breach register**           | Maintained per Art. 33(5) documenting facts, effects, and remedial actions for all breaches regardless of notification requirement                                                  |
| **Risk addressed**            | R8 (breach notification failure)                                                                                                                                                    |

### 4.12 Audit Logging

| Control                | Detail                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Event types logged** | Login, logout, registration, password change, payment, tier change, failed login, 2FA enable/disable, data export, account deletion, profile rectification, email verification                   |
| **Logged metadata**    | Event type, timestamp, IP address, user agent, event-specific metadata (no PII values in metadata — only field names for rectification events)                                                   |
| **Immutability**       | Audit log is append-only; entries cannot be modified or deleted                                                                                                                                  |
| **Retention**          | Tiered: security audit logs 2 years (730 days), general audit logs 1 year (365 days), orphaned records 90 days; `user_id` set to NULL on account deletion (event trail preserved, user unlinked) |
| **Access**             | Included in GDPR data export (Art. 15/20); admin access via authenticated admin endpoints                                                                                                        |
| **Risk addressed**     | R1 (unauthorized access detection), R3 (session compromise detection), R8 (breach investigation)                                                                                                 |

---

## 5. Consultation

### 5.1 Data Protection Officer (DPO)

| Field                       | Detail                                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **DPO appointed**           | Pending formal appointment — currently handled by founding team Privacy Lead                         |
| **DPO name**                | To be formally appointed prior to launch                                                             |
| **DPO contact**             | privacy@mergenix.com                                                                                 |
| **DPO involvement in DPIA** | Privacy Lead reviewed this DPIA during the pre-launch compliance review period (February–March 2026) |

**Note:** Given that Mergenix processes genetic data (special category data under Art. 9), the appointment of a DPO is strongly recommended and may be legally required under Art. 37(1)(c) if processing occurs on a "large scale." Formal DPO appointment is a pre-launch requirement.

### 5.2 Data Subjects

| Consultation                    | Detail                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Method**                      | Beta testing feedback from pre-launch users; privacy-focused user surveys on consent flow UX; analysis of support queries related to data handling                             |
| **Key concerns raised**         | Clarity of what data is stored vs. processed; understanding of ZKE encryption; clarity of deletion process                                                                     |
| **How concerns were addressed** | Enhanced privacy policy language explaining ZKE architecture in plain English; improved consent modal UI with plain-language explanations; dedicated security/privacy FAQ page |

### 5.3 Internal Stakeholders

| Stakeholder         | Consulted  | Key Input                                                                                             |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| **Technical Lead**  | 2026-02-20 | ZKE architecture design, encryption key management, access control design, Web Worker isolation model |
| **Privacy Lead**    | 2026-02-20 | Lawful basis assessment, consent framework, international transfer mechanisms, retention schedules    |
| **Product Manager** | 2026-02-20 | User experience of consent flows, tier model implications for data processing, counseling triage UX   |
| **Security Lead**   | 2026-02-20 | Threat modeling, authentication controls, incident response procedures, brute-force protections       |

### 5.4 Supervisory Authority Consultation

| Field                                      | Detail                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Prior consultation required (Art. 36)?** | No — residual risks after mitigation are rated Medium at most (see Section 3.3); no residual "High" or "Very High" risks remain |
| **Supervisory authority**                  | ICO (UK Information Commissioner's Office) for UK users; relevant EU member state DPA for EEA users based on establishment      |
| **Consultation date**                      | N/A — prior consultation not required based on residual risk assessment                                                         |
| **Outcome**                                | N/A                                                                                                                             |

**Assessment:** Based on the residual risk analysis (Section 3.3), no residual risks are rated "Very High" after mitigation measures. The highest residual risks (Medium) relate to areas partially outside Mergenix's control (user device security, consent comprehension, psychological impact). Prior consultation under Art. 36 is not deemed necessary at this time, but will be re-assessed if residual risks are elevated through future changes.

---

## 6. Review Schedule

### 6.1 Periodic Review

This DPIA must be reviewed and updated at minimum **annually** from the date of initial assessment. The review must be conducted by the Privacy Lead (or formally appointed DPO) and approved per Section 7.

| Review # | Scheduled Date | Reviewer           | Status  |
| -------- | -------------- | ------------------ | ------- |
| 1        | 2027-03-01     | Privacy Lead / DPO | Pending |
| 2        | 2028-03-01     | Privacy Lead / DPO | Pending |
| 3        | 2029-03-01     | Privacy Lead / DPO | Pending |

### 6.2 Trigger Events for Re-Assessment

The DPIA must be re-assessed **before implementation** whenever any of the following changes occur:

| Trigger Event                                 | Example                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **New category of personal data processed**   | Adding behavioral data, location data, biometric data beyond genetics                                      |
| **New processing purpose**                    | Using genetic data for research, population studies, or third-party partnerships                           |
| **Change to ZKE architecture**                | Any modification to the client-side encryption model, key management, or server-side decryption capability |
| **New data processor or sub-processor**       | Switching hosting provider, adding a new analytics service, new email provider                             |
| **Change in data transfer mechanisms**        | New international data transfers, change in adequacy decisions                                             |
| **Material change to consent flow**           | Bundling consent, changing consent UI, modifying terms/privacy policy in ways that affect consent validity |
| **Security incident involving genetic data**  | Any breach, near-miss, or vulnerability that could affect genetic data                                     |
| **Significant increase in processing volume** | User base exceeds 10,000 or 100,000 registered users                                                       |
| **New analysis module**                       | Adding new types of genetic analysis (e.g., ancestry composition, epigenetics, microbiome)                 |
| **Regulatory change**                         | New genetic data regulations, changes to GDPR interpretation, new adequacy decisions                       |
| **Change in hosting region**                  | Moving infrastructure to a different jurisdiction                                                          |
| **Addition of AI/ML processing**              | Any automated decision-making or profiling based on genetic data                                           |
| **New tier or pricing model**                 | Changes that affect what data is processed or retained differently by tier                                 |
| **Third-party data sharing**                  | Any new sharing of data with external parties                                                              |

### 6.3 Review Process

1. Privacy Lead / DPO initiates review by examining changes since last assessment
2. Technical team provides updated architecture and data flow documentation
3. Legal counsel reviews any regulatory changes
4. Risk assessment (Section 3) is re-evaluated with current threat landscape
5. Mitigation measures (Section 4) are verified for continued effectiveness
6. Updated DPIA is submitted for sign-off (Section 7)
7. Previous version is archived with date and reason for update

---

## 7. Sign-off

### 7.1 Data Protection Officer

| Field                   | Detail                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name**                | To be formally appointed prior to launch                                                                                                   |
| **Title**               | Data Protection Officer                                                                                                                    |
| **Assessment**          | Pending formal DPO appointment; interim Privacy Lead review completed                                                                      |
| **Conditions (if any)** | Formal DPO appointment required prior to processing live user data at scale; Art. 36 prior consultation to be re-evaluated at 10,000 users |
| **Signature**           | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                               |
| **Date**                | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                               |

### 7.2 Data Controller

| Field            | Detail                                                           |
| ---------------- | ---------------------------------------------------------------- |
| **Name**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                     |
| **Title**        | CEO / Managing Director                                          |
| **Organization** | Mergenix                                                         |
| **Decision**     | Approve and Proceed — subject to DPO appointment condition above |
| **Signature**    | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                     |
| **Date**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                     |

### 7.3 Technical Lead

| Field            | Detail                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                                                    |
| **Title**        | Technical Lead / CTO                                                                                                                                            |
| **Confirmation** | I confirm that the technical measures described in Section 4 are accurately represented and are implemented (or scheduled for implementation with dates noted). |
| **Signature**    | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                                                    |
| **Date**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                                                    |

### 7.4 Legal Counsel

| Field            | Detail                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Name**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                  |
| **Title**        | Legal Counsel                                                                                                                 |
| **Confirmation** | I confirm that the lawful bases and legal compliance measures described in Sections 2 and 4.7 are appropriate and sufficient. |
| **Signature**    | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                  |
| **Date**         | **\*\***\*\***\*\***\_\_**\*\***\*\***\*\***                                                                                  |

---

## 8. Appendices

### Appendix A: Data Processing Inventory

| Database Table        | Personal Data Fields                                                                                                 | Special Category     | Retention                                                                                                                          | Deletion Behavior                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `users`               | email, name, password_hash, totp_secret, backup_codes, oauth_provider, oauth_id, locked_until, failed_login_attempts | No                   | Until account deletion                                                                                                             | CASCADE — row deleted                                                             |
| `analysis_results`    | result_data (encrypted), summary_json, label, parent1_filename, parent2_filename, tier_at_time                       | Yes (genetic/health) | Until result or account deletion                                                                                                   | CASCADE — rows deleted                                                            |
| `audit_log`           | ip_address, user_agent, event_type, metadata_json                                                                    | No (but identifiers) | Tiered: security logs 2 years (730 days), general logs 1 year (365 days), orphaned records 90 days; anonymized on account deletion | `user_id` SET NULL — events preserved anonymously                                 |
| `sessions`            | refresh_token_hash, ip_address, user_agent, expires_at                                                               | No (but identifiers) | Until logout, expiry, or account deletion                                                                                          | CASCADE — rows deleted                                                            |
| `consent_records`     | consent_type, version, ip_address, user_agent                                                                        | No (but identifiers) | 3 years post-account deletion (compliance evidence)                                                                                | Retained post-deletion for compliance; anonymized where possible                  |
| `cookie_preferences`  | analytics_enabled                                                                                                    | No                   | Until account deletion                                                                                                             | CASCADE — row deleted                                                             |
| `payments`            | stripe_customer_id, stripe_payment_intent, amount, currency, status, tier_granted                                    | No                   | 7 years per tax/accounting regulation                                                                                              | CASCADE — rows deleted (legal counsel to confirm retention override requirements) |
| `password_resets`     | token_hash, expires_at, used_at                                                                                      | No                   | Until expiry/use or account deletion                                                                                               | CASCADE — rows deleted                                                            |
| `email_verifications` | token_hash, expires_at, verified_at                                                                                  | No                   | Until expiry/use or account deletion                                                                                               | CASCADE — rows deleted                                                            |

### Appendix B: Third-Party Data Processing Agreements

| Processor                       | DPA Status                       | DPA Date   | DPA Reference                                     |
| ------------------------------- | -------------------------------- | ---------- | ------------------------------------------------- |
| Vercel / Cloud Hosting Provider | To be confirmed                  | Pre-launch | Vercel DPA (vercel.com/legal/dpa)                 |
| Stripe, Inc.                    | Signed (via Stripe standard DPA) | Pre-launch | Stripe DPA (stripe.com/legal/dpa)                 |
| Resend                          | To be confirmed                  | Pre-launch | Resend DPA                                        |
| Cloudflare / CDN Provider       | To be confirmed                  | Pre-launch | Cloudflare DPA (cloudflare.com/gdpr/introduction) |
| Sentry                          | To be confirmed                  | Pre-launch | Sentry DPA (sentry.io/legal/dpa)                  |

### Appendix C: Relevant Legislation and Guidance

| Document                                                  | Reference                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GDPR — General Data Protection Regulation                 | Regulation (EU) 2016/679                                                                                                     |
| GDPR Article 9 — Processing of special categories of data | Art. 9(2)(a) — explicit consent                                                                                              |
| GDPR Article 35 — Data Protection Impact Assessment       | Art. 35(3)(b) — large-scale processing of special categories                                                                 |
| GDPR Recital 91                                           | DPIAs for processing genetic data                                                                                            |
| ICO DPIA Guidance                                         | ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments |
| EDPB Guidelines on DPIA (wp248rev.01)                     | WP29 / EDPB guidelines on DPIAs                                                                                              |
| EDPB Guidelines on Consent (05/2020)                      | Specific guidance on consent for special category data                                                                       |
| Genetic Information Nondiscrimination Act (GINA)          | US — 42 U.S.C. 2000ff (if US users)                                                                                          |
| UK Equality Act 2010                                      | Protection against genetic discrimination (UK)                                                                               |
| EU-US Data Privacy Framework                              | Adequacy mechanism for US-based processors                                                                                   |

### Appendix D: Document History

| Version | Date       | Author                        | Changes                              |
| ------- | ---------- | ----------------------------- | ------------------------------------ |
| 1.0     | 2026-03-01 | Technical Lead / Privacy Lead | Initial DPIA — pre-launch assessment |

---

_This DPIA was prepared in accordance with GDPR Article 35 and follows the structure recommended by the ICO (UK Information Commissioner's Office) and the EDPB (European Data Protection Board). It should be read alongside the Mergenix Privacy Policy, Terms of Service, and Security documentation._
