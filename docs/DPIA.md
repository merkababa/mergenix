# Data Protection Impact Assessment (DPIA)

> **TEMPLATE -- NOT YET COMPLETED**
>
> This document is a structural template for the Mergenix DPIA.
> All sections marked with `[BRACKETS]` require completion by the
> Data Protection Officer, Legal Counsel, and Technical Lead before
> this DPIA can be considered operative.  Do not rely on this
> document for compliance purposes until all placeholders have been
> filled and the sign-off in Section 7 is complete.

## Mergenix Genetic Offspring Analysis Platform

**Document Reference:** DPIA-MERGENIX-001
**Version:** 1.0
**Classification:** CONFIDENTIAL
**Date of Assessment:** [DATE — e.g., 2026-03-01]
**Date of Last Review:** [DATE]
**Next Scheduled Review:** [DATE — 12 months from assessment]
**Assessment Conducted By:** [NAME, ROLE]
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

| Data Category | Specific Data Elements | GDPR Classification |
|---|---|---|
| **Genetic data** | Raw genotype files (.txt, .csv), parsed SNP data, carrier status, trait alleles, PGx variants, PRS calculations | Special category data (Art. 9) — genetic data, health data |
| **Health-related outputs** | Carrier risk probabilities, disease predispositions, pharmacogenomic drug responses, counseling triage flags | Special category data (Art. 9) — health data |
| **Identity data** | Full name, email address | Personal data (Art. 4(1)) |
| **Account data** | User ID (UUID), subscription tier (Free/Premium/Pro), email verification status, account creation date | Personal data (Art. 4(1)) |
| **Authentication data** | Password hash (bcrypt), TOTP secret (2FA), hashed backup codes, OAuth provider/ID, session tokens | Personal data (Art. 4(1)) |
| **Financial data** | Stripe customer ID, payment intent ID, payment amount, currency, payment status, tier granted | Personal data (Art. 4(1)) |
| **Technical metadata** | IP addresses, user agent strings, timestamps, audit log event types | Personal data (Art. 4(1)) — identifiers |
| **Consent records** | Consent type, version, IP at consent, user agent at consent, timestamp | Personal data (Art. 4(1)) |
| **Cookie preferences** | Analytics cookie opt-in/opt-out flag | Personal data (Art. 4(1)) |

### 1.3 Purpose of Processing

| Purpose | Description | Lawful Basis |
|---|---|---|
| **Primary analysis** | Parsing uploaded genetic files, computing carrier risk, trait predictions, PGx, PRS, and counseling triage for potential offspring | Explicit consent (Art. 6(1)(a), Art. 9(2)(a)) |
| **Result storage** | Storing encrypted analysis results so users can retrieve them later | Explicit consent (Art. 6(1)(a), Art. 9(2)(a)) |
| **Account management** | Registration, authentication, session management, password resets, email verification | Contract performance (Art. 6(1)(b)) |
| **Payment processing** | Processing tier upgrades via Stripe (Premium at $14.99, Pro at $34.99) | Contract performance (Art. 6(1)(b)) |
| **Security & fraud prevention** | Rate limiting, brute-force lockout, CSRF protection, audit logging | Legitimate interest (Art. 6(1)(f)) |
| **GDPR compliance** | Data export (Art. 20), account deletion (Art. 17), profile rectification (Art. 16) | Legal obligation (Art. 6(1)(c)) |
| **Analytics** | Cookie-based analytics (only with explicit opt-in consent) | Consent (Art. 6(1)(a)) |

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
2. Results are encrypted client-side before transmission
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

| Dimension | Detail |
|---|---|
| **Data subjects** | Adults (18+) who voluntarily register and upload genetic data |
| **Geographic scope** | Global (accessible worldwide); GDPR applies to all EU/EEA data subjects regardless of server location |
| **Volume estimate** | [ESTIMATED NUMBER] of registered users; [ESTIMATED NUMBER] of genetic analyses stored |
| **Retention period** | Until user requests deletion (Art. 17) or account is voluntarily closed; audit logs retained for [PERIOD — e.g., 3 years] for security and legal compliance |
| **Data processors** | See Section 1.6 |

### 1.6 Data Recipients and Processors

| Recipient | Role | Data Shared | Purpose | Safeguards |
|---|---|---|---|---|
| **[HOSTING PROVIDER — e.g., Vercel, AWS, GCP]** | Data processor | Encrypted analysis blobs, user account data, audit logs (all stored in PostgreSQL) | Infrastructure hosting | [DPA REFERENCE]; encryption at rest; [HOSTING REGION] |
| **Stripe, Inc.** | Independent data controller / processor | Email, payment amount, currency, Stripe customer ID, payment intent | Payment processing | Stripe DPA; PCI DSS Level 1; no genetic data shared |
| **Resend (email provider)** | Data processor | Email address, email content (verification, password reset, receipts) | Transactional email delivery | [DPA REFERENCE]; no genetic data included in emails |
| **[CDN PROVIDER — e.g., Cloudflare, Vercel Edge]** | Data processor | IP addresses, request metadata (no genetic data) | DDoS protection, content delivery | [DPA REFERENCE] |
| **Sentry (optional, if DSN configured)** | Data processor | Error traces, IP address, user agent (no genetic data, no PII in breadcrumbs by policy) | Error monitoring | Sentry DPA; PII scrubbing enabled |

**No genetic data is shared with any third party.** Stripe, Resend, and infrastructure providers receive only the minimum data necessary for their specific function. Analysis results remain encrypted and opaque to the server and all processors.

### 1.7 Subscription Tiers and Data Processing Differences

| Tier | Price | Saved Analyses Limit | Features | Additional Data Processing |
|---|---|---|---|---|
| **Free** | $0 | 1 | Basic carrier analysis, limited traits | Minimal — one saved result |
| **Premium** | $14.99 | 10 | Full carrier panel, all traits, PGx | Up to 10 encrypted result blobs |
| **Pro** | $34.99 | Unlimited | Everything in Premium + PRS, PDF export, priority support | Unlimited encrypted result blobs; PDF generation (client-side) |

Tier does not affect the type of personal data collected — only the volume of stored analysis results and which analysis modules are available in the client-side engine.

---

## 2. Necessity and Proportionality

### 2.1 Lawful Basis for Processing Special Category Data

Processing of genetic and health data falls under **GDPR Article 9** (special categories of personal data). The lawful basis is:

- **Article 9(2)(a) — Explicit consent:** Users provide explicit, informed, specific, freely given, and unambiguous consent before uploading genetic data and initiating analysis.

Consent is collected as follows:

| Consent Point | Mechanism | Record |
|---|---|---|
| **Registration** | Terms of Service and Privacy Policy acceptance (checkbox, not pre-ticked) | `ConsentRecord` with type `terms` and `privacy`, document version, IP, user agent, timestamp |
| **Age verification** | Confirmation of being 18+ years of age | `ConsentRecord` with type `age_verification` |
| **Analysis save** | Explicit `consent_given` boolean parameter required on every save-result API call | Enforced at API level; analysis cannot be saved without `consent_given=true` |
| **Cookie preferences** | Granular opt-in for analytics cookies (analytics disabled by default) | `CookiePreference` record; `ConsentRecord` with type `cookies` |

Consent records are immutable (append-only `consent_records` table) and include the document version, so consent validity can be verified against the specific version of terms/privacy policy the user agreed to.

### 2.2 Data Minimization

The platform implements data minimization at multiple levels:

| Principle | Implementation |
|---|---|
| **No raw genetic data stored server-side** | Genetic files are parsed and analyzed entirely in the browser. The server never receives raw genotype files. Only encrypted analysis results (and aggregate summaries) are transmitted. |
| **Zero-knowledge encryption** | The server stores analysis results as opaque encrypted blobs. Even if the database were compromised, the attacker could not read genetic analysis results without the user's client-side key. |
| **Minimal summary data** | The unencrypted `summary_json` field contains only aggregate counts and statistics (e.g., "12 carrier conditions found") — never individual genetic markers, alleles, or health-specific information. |
| **No genetic data in email** | Transactional emails (verification, password reset, receipts) never contain genetic data, analysis results, or health information. |
| **No genetic data to payment processor** | Stripe receives only email, payment amount, and currency. No genetic data, analysis results, or health information is shared with Stripe. |
| **Audit logs exclude PII values** | When profile fields are rectified (GDPR Art. 16), audit logs record only *which* fields changed (e.g., `["name", "email"]`), never the actual old or new values. |
| **IP/user agent collection** | Collected only for security (brute-force detection, audit trail) and consent evidence; stored in audit logs with defined retention. |

### 2.3 Purpose Limitation

Data collected for each purpose is not repurposed:

- **Genetic data** is used solely for offspring analysis as explicitly consented. It is never used for marketing, profiling, automated decision-making, insurance assessment, employment screening, or any secondary purpose.
- **Payment data** is used solely for processing tier upgrades and generating receipts.
- **Authentication data** is used solely for account security and access control.
- **Audit logs** are used solely for security monitoring, compliance evidence, and GDPR data export.

### 2.4 Storage Limitation

| Data Type | Retention Policy |
|---|---|
| **Encrypted analysis results** | Retained until user deletes the specific result or deletes their entire account (Art. 17) |
| **User account data** | Retained until user requests account deletion |
| **Consent records** | Retained for [PERIOD — e.g., 3 years after account deletion] to demonstrate compliance with consent obligations |
| **Audit logs** | Retained for [PERIOD — e.g., 3 years] for security investigation and regulatory compliance; `user_id` is set to NULL on account deletion (preserving the event trail without linking to the deleted individual) |
| **Payment records** | Financial records retained for [PERIOD — e.g., 7 years] per [APPLICABLE TAX/ACCOUNTING REGULATION]; cascade-deleted with user account (adjust if legal retention required) |
| **Session tokens** | Automatically expire after 7 days; deleted on logout or account deletion |
| **Password reset / email verification tokens** | Expire after [PERIOD — e.g., 1 hour]; used_at timestamp recorded on use |

### 2.5 Data Subject Rights Implementation

| GDPR Right | Article | Implementation | Endpoint |
|---|---|---|---|
| **Right of access** | Art. 15 | Full data export including encrypted analysis envelopes, audit logs, payment history, and profile data | `GET /gdpr/export` (paginated, rate-limited to 1/hour) |
| **Right to data portability** | Art. 20 | Export includes full EncryptedEnvelope data in machine-readable JSON format | `GET /gdpr/export` |
| **Right to erasure** | Art. 17 | Complete account deletion including all analysis results, sessions, payments, and audit log references; requires password re-authentication | `DELETE /gdpr/account` |
| **Right to rectification** | Art. 16 | Profile field updates (name, email); email changes require password re-authentication and trigger re-verification | `PUT /gdpr/profile` |
| **Right to withdraw consent** | Art. 7(3) | Account deletion removes all data and effectively withdraws all consent; cookie preferences can be changed at any time | `DELETE /gdpr/account`; cookie preference endpoint |
| **Right to object** | Art. 21 | Analytics cookies are opt-in (not opt-out); no profiling or automated decision-making is performed | Cookie preference UI |
| **Right to restriction** | Art. 18 | [TO BE IMPLEMENTED — describe mechanism for restricting processing upon request] | [ENDPOINT TBD] |

### 2.6 International Transfers

| Transfer | Mechanism | Safeguards |
|---|---|---|
| [HOSTING PROVIDER] servers in [REGION] | [ADEQUACY DECISION / STANDARD CONTRACTUAL CLAUSES / OTHER] | [DESCRIBE SAFEGUARDS] |
| Stripe (US-based) | [EU-US DATA PRIVACY FRAMEWORK / SCCs] | Payment data only; no genetic data |
| Resend (US-based) | [EU-US DATA PRIVACY FRAMEWORK / SCCs] | Email addresses only; no genetic data |

---

## 3. Risks to Data Subjects

### 3.1 Risk Assessment Methodology

Risks are assessed using the standard likelihood x severity matrix recommended by the ICO and EDPB:

| | Negligible Severity | Limited Severity | Significant Severity | Maximum Severity |
|---|---|---|---|---|
| **Remote likelihood** | Low | Low | Medium | Medium |
| **Possible likelihood** | Low | Medium | High | High |
| **Likely** | Medium | High | High | Very High |
| **Near certain** | Medium | High | Very High | Very High |

### 3.2 Identified Risks

#### Risk 1: Unauthorized Access to Genetic Analysis Results

| Dimension | Assessment |
|---|---|
| **Description** | An attacker gains access to the database and reads genetic analysis results, which could reveal health predispositions, carrier status, or other sensitive genetic information about data subjects and their potential offspring. |
| **Data subjects affected** | All users who have saved analysis results |
| **Likelihood** | Remote — ZKE architecture means database contains only encrypted blobs; server never holds decryption keys |
| **Severity** | Maximum — Genetic data is uniquely identifying, immutable, and affects biological relatives; could enable discrimination in insurance, employment, or social contexts |
| **Overall risk** | **Medium** (Remote x Maximum) |
| **Mitigation** | See Section 4.1 (ZKE), 4.2 (encryption at rest), 4.3 (access controls) |
| **Residual risk** | **Low** — multiple encryption layers make data effectively inaccessible even in a breach |

#### Risk 2: Re-identification from Summary Data

| Dimension | Assessment |
|---|---|
| **Description** | The unencrypted `summary_json` field (aggregate counts like "12 carrier conditions found") could, in combination with other data (email, IP, timestamps), allow inference of genetic characteristics. |
| **Data subjects affected** | All users who have saved analysis results |
| **Likelihood** | Remote — summaries contain only aggregate counts, not specific conditions, alleles, or genetic markers |
| **Severity** | Significant — even aggregate genetic statistics could narrow health predictions |
| **Overall risk** | **Medium** (Remote x Significant) |
| **Mitigation** | See Section 4.1 (summary data minimization), 4.3 (access controls) |
| **Residual risk** | **Low** — summaries are deliberately designed to be non-informative about specific genetic conditions |

#### Risk 3: Session Hijacking / Account Takeover

| Dimension | Assessment |
|---|---|
| **Description** | An attacker steals a user's JWT access token or refresh token cookie, gaining access to their account and ability to read encrypted analysis results (if the attacker also compromises the client-side decryption key). |
| **Data subjects affected** | Individual compromised user |
| **Likelihood** | Possible — token theft via XSS, network interception, or local device compromise |
| **Severity** | Maximum — full access to encrypted analysis results (if decryption key also compromised) or account manipulation |
| **Overall risk** | **High** (Possible x Maximum) |
| **Mitigation** | See Section 4.4 (authentication controls), 4.5 (session management) |
| **Residual risk** | **Medium** — CSRF protection, HttpOnly cookies, short access token lifetimes, and 2FA reduce risk but client-side key management remains a dependency |

#### Risk 4: Genetic Discrimination

| Dimension | Assessment |
|---|---|
| **Description** | Genetic information revealed through a breach or unauthorized access could be used by insurers, employers, or other parties to discriminate against data subjects or their biological relatives. |
| **Data subjects affected** | All users and their biological family members (genetic data has familial implications) |
| **Likelihood** | Remote — ZKE prevents server-side data access; legal protections (GINA in US, Equality Act in UK, etc.) provide additional safeguards |
| **Severity** | Maximum — discrimination based on genetic predispositions could affect insurance coverage, employment, social relationships |
| **Overall risk** | **Medium** (Remote x Maximum) |
| **Mitigation** | See Section 4.1 (ZKE), 4.6 (user education), 4.7 (legal compliance) |
| **Residual risk** | **Low** — technical controls (ZKE) make this risk largely theoretical |

#### Risk 5: Psychological Harm from Analysis Results

| Dimension | Assessment |
|---|---|
| **Description** | Users may receive unexpected or distressing genetic information (e.g., carrier status for serious conditions, high PRS for diseases) that causes anxiety, depression, or relationship strain. |
| **Data subjects affected** | All users who receive analysis results |
| **Likelihood** | Likely — carrier status findings and PRS are inherently capable of causing distress |
| **Severity** | Significant — psychological harm, anxiety about offspring health, relationship impact |
| **Overall risk** | **High** (Likely x Significant) |
| **Mitigation** | See Section 4.8 (counseling triage), 4.6 (user education and disclaimers) |
| **Residual risk** | **Medium** — counseling triage flags are implemented but professional genetic counseling referral is advisory only |

#### Risk 6: Third-Party Genetic File Compromise

| Dimension | Assessment |
|---|---|
| **Description** | Users upload genetic files obtained from third-party services (23andMe, AncestryDNA, etc.). Those files exist on the user's local device and in the browser during processing. Malicious browser extensions, malware, or a compromised device could intercept the raw genetic data during the upload/parsing window. |
| **Data subjects affected** | Individual compromised user |
| **Likelihood** | Possible — depends on user's device security |
| **Severity** | Maximum — raw genotype data is the most sensitive form of genetic data |
| **Overall risk** | **High** (Possible x Maximum) |
| **Mitigation** | See Section 4.9 (client-side security), 4.6 (user education) |
| **Residual risk** | **Medium** — Mergenix cannot control user device security; Web Workers provide some isolation but are not a security boundary against malicious extensions |

#### Risk 7: Inadequate Consent / Consent Fatigue

| Dimension | Assessment |
|---|---|
| **Description** | Users may not fully understand the implications of processing their genetic data, may not read consent materials, or may feel pressured to consent quickly. Consent for genetic data processing must be truly informed and specific per Art. 9(2)(a). |
| **Data subjects affected** | All users |
| **Likelihood** | Possible — consent fatigue is a well-documented phenomenon in digital services |
| **Severity** | Significant — processing without truly informed consent would violate Art. 9 |
| **Overall risk** | **High** (Possible x Significant) |
| **Mitigation** | See Section 4.10 (consent management) |
| **Residual risk** | **Medium** — layered consent approach reduces but cannot eliminate consent fatigue |

#### Risk 8: Data Breach Notification Failure

| Dimension | Assessment |
|---|---|
| **Description** | In the event of a data breach involving genetic data, failure to notify the supervisory authority within 72 hours (Art. 33) or affected data subjects without undue delay (Art. 34) could compound harm and result in regulatory sanctions. |
| **Data subjects affected** | All users whose data is affected by a breach |
| **Likelihood** | Remote — dependent on breach occurrence and organizational readiness |
| **Severity** | Maximum — genetic data breaches are high-profile; delayed notification increases harm |
| **Overall risk** | **Medium** (Remote x Maximum) |
| **Mitigation** | See Section 4.11 (incident response) |
| **Residual risk** | **Low** — with documented procedures and clear escalation paths |

### 3.3 Risk Summary

| Risk ID | Risk Description | Inherent Risk | Residual Risk |
|---|---|---|---|
| R1 | Unauthorized access to genetic results | Medium | **Low** |
| R2 | Re-identification from summary data | Medium | **Low** |
| R3 | Session hijacking / account takeover | High | **Medium** |
| R4 | Genetic discrimination | Medium | **Low** |
| R5 | Psychological harm from results | High | **Medium** |
| R6 | Third-party genetic file compromise | High | **Medium** |
| R7 | Inadequate consent | High | **Medium** |
| R8 | Data breach notification failure | Medium | **Low** |

---

## 4. Risk Mitigation Measures

### 4.1 Zero-Knowledge Encryption (ZKE) Architecture

| Control | Detail |
|---|---|
| **Client-side analysis** | All genetic computation occurs in browser Web Workers; raw genetic files never transmitted to server |
| **Client-side encryption** | Analysis results encrypted in the browser before transmission using [ENCRYPTION ALGORITHM — e.g., AES-256-GCM with client-derived key] |
| **Opaque server storage** | Server stores encrypted blobs as `LargeBinary`; no server-side decryption capability |
| **Summary minimization** | Unencrypted summaries contain only aggregate counts (e.g., number of conditions found); no specific genetic markers, alleles, condition names, or health data |
| **Key management** | Decryption keys exist only on the client; server holds a separate `DATA_ENCRYPTION_KEY` (AES-256-GCM) for defense-in-depth encryption at rest |
| **Risk addressed** | R1 (unauthorized access), R2 (re-identification), R4 (discrimination) |

### 4.2 Encryption at Rest and in Transit

| Control | Detail |
|---|---|
| **TLS/HTTPS** | All client-server communication over HTTPS (TLS 1.2+); HTTP requests upgraded to HTTPS |
| **Database encryption** | [DESCRIBE — e.g., PostgreSQL with TDE, or cloud provider disk encryption (AWS EBS, GCP PD)] |
| **Application-level encryption** | `DATA_ENCRYPTION_KEY` (AES-256-GCM) provides an additional layer of encryption for analysis results beyond ZKE; separate from JWT secret to limit blast radius |
| **Cookie security** | Refresh token cookies: `HttpOnly=true`, `Secure=true` (production), `SameSite=Lax`, path-scoped to `/auth` |
| **Risk addressed** | R1 (unauthorized access), R3 (session hijacking) |

### 4.3 Access Controls

| Control | Detail |
|---|---|
| **Authentication** | JWT-based with short-lived access tokens (30 min) and longer-lived refresh tokens (7 days) in HttpOnly cookies |
| **Two-factor authentication** | TOTP-based 2FA available for all users; hashed backup codes stored as SHA-256 |
| **Account lockout** | Brute-force protection: `failed_login_attempts` counter with automatic `locked_until` timestamp after [THRESHOLD — e.g., 5] failed attempts |
| **CSRF protection** | Pure ASGI middleware enforces `X-Requested-With: XMLHttpRequest` header on all state-changing requests (POST, PUT, DELETE, PATCH) |
| **Row-level isolation** | All database queries filter by `user_id`; users can only access their own analysis results, audit logs, and payment history |
| **Admin access** | Admin endpoints require both JWT authentication and a separate `X-Admin-Key` header with constant-time comparison |
| **Rate limiting** | Per-endpoint rate limits: login (5/min), registration (3/min), data export (1/hour), account deletion (3/min), general API (60/min), webhooks (100/min) |
| **Risk addressed** | R1 (unauthorized access), R3 (session hijacking) |

### 4.4 Authentication Controls

| Control | Detail |
|---|---|
| **Password hashing** | bcrypt with automatic salt; password_hash stored, plaintext never retained |
| **Re-authentication for sensitive operations** | Account deletion and email changes require password re-verification; not just a valid JWT |
| **OAuth support** | Google OAuth available; OAuth-only accounts have no password_hash (NULL) and are directed to support for account deletion |
| **Token validation** | Every request validates token type (`access` vs. refresh), expiry, and user existence in database |
| **Session invalidation** | Password changes invalidate all active sessions |
| **Risk addressed** | R3 (session hijacking) |

### 4.5 Session Management

| Control | Detail |
|---|---|
| **Access token lifetime** | 30 minutes — limits exposure window |
| **Refresh token lifetime** | 7 days — stored in HttpOnly cookie, path-scoped to `/auth` |
| **Refresh token rotation** | [DESCRIBE — e.g., token rotation on each refresh; old token invalidated] |
| **Session tracking** | Active sessions stored in `sessions` table with IP, user agent, and expiry; cascade-deleted with user account |
| **Logout** | Refresh cookie cleared; session record deleted |
| **Risk addressed** | R3 (session hijacking) |

### 4.6 User Education and Disclaimers

| Control | Detail |
|---|---|
| **Genetic data disclaimers** | [DESCRIBE — e.g., prominent disclaimers that analysis is informational, not diagnostic; results are statistical predictions, not medical advice] |
| **Privacy policy** | Clear explanation of ZKE architecture, what data is and is not stored server-side, third-party data sharing |
| **Security page** | Public security information page explaining encryption model and data protection measures |
| **Limitations of analysis** | Clear communication that results represent statistical probabilities, not certainties; affected by coverage, chip type, and population databases |
| **Risk addressed** | R5 (psychological harm), R6 (client-side compromise), R7 (consent) |

### 4.7 Legal Compliance

| Control | Detail |
|---|---|
| **GDPR compliance** | Full implementation of data subject rights (access, portability, erasure, rectification); documented in GDPR router |
| **Age restriction** | 18+ age verification required at registration; consent record created |
| **Genetic non-discrimination** | [DESCRIBE AWARENESS — e.g., compliance with GINA (US), Equality Act 2010 (UK), relevant EU member state genetic data laws] |
| **Data processing agreements** | DPAs in place with all processors (hosting, Stripe, Resend, Sentry) |
| **Risk addressed** | R4 (discrimination), R7 (consent), R8 (breach notification) |

### 4.8 Counseling Triage System

| Control | Detail |
|---|---|
| **Triage flags** | The genetics engine generates counseling triage flags for findings that warrant professional genetic counseling review |
| **Referral information** | [DESCRIBE — e.g., links to genetic counseling resources, NSGC find-a-counselor tool, clear guidance to consult healthcare providers] |
| **Result presentation** | [DESCRIBE — e.g., results presented with appropriate context, severity indicators, and educational content] |
| **Risk addressed** | R5 (psychological harm) |

### 4.9 Client-Side Security

| Control | Detail |
|---|---|
| **Web Worker isolation** | Genetic parsing and analysis run in dedicated Web Workers, isolating processing from the main browser thread |
| **No persistent local storage of raw data** | Raw genetic files are held only in Web Worker memory during active analysis; not persisted to localStorage, IndexedDB, or any client-side storage |
| **Content Security Policy** | [DESCRIBE CSP HEADERS — e.g., strict CSP preventing unauthorized script execution] |
| **Subresource Integrity** | [DESCRIBE SRI — e.g., integrity hashes on third-party scripts] |
| **Risk addressed** | R6 (client-side compromise) |

### 4.10 Consent Management

| Control | Detail |
|---|---|
| **Granular consent collection** | Separate consent records for: terms of service, privacy policy, age verification, cookie preferences, and per-analysis data storage |
| **Versioned consent** | Each consent record includes the document version (e.g., "1.0", "1.1"), enabling verification against specific policy versions |
| **Immutable consent audit trail** | `consent_records` table is append-only; consent events cannot be modified or deleted (even on account deletion — [CONFIRM RETENTION POLICY]) |
| **Consent evidence** | Each consent record captures: timestamp, IP address, user agent, consent type, and document version |
| **Consent withdrawal** | Users can withdraw consent by deleting their account; cookie analytics consent can be toggled independently at any time |
| **Not pre-ticked** | All consent checkboxes require affirmative action; no pre-selected options |
| **Freely given** | Free tier provides core functionality without requiring analytics cookies or data sharing beyond what is necessary for the service |
| **Risk addressed** | R7 (inadequate consent) |

### 4.11 Incident Response

| Control | Detail |
|---|---|
| **Breach detection** | [DESCRIBE — e.g., monitoring, alerting, anomaly detection] |
| **72-hour notification** | [DESCRIBE PROCEDURE for notifying supervisory authority within 72 hours per Art. 33] |
| **Data subject notification** | [DESCRIBE PROCEDURE for notifying affected individuals without undue delay per Art. 34 when breach is likely to result in high risk] |
| **Incident response plan** | [REFERENCE to incident response plan document] |
| **Breach register** | [DESCRIBE — e.g., maintained per Art. 33(5) documenting facts, effects, and remedial actions] |
| **Risk addressed** | R8 (breach notification failure) |

### 4.12 Audit Logging

| Control | Detail |
|---|---|
| **Event types logged** | Login, logout, registration, password change, payment, tier change, failed login, 2FA enable/disable, data export, account deletion, profile rectification, email verification |
| **Logged metadata** | Event type, timestamp, IP address, user agent, event-specific metadata (no PII values in metadata — only field names for rectification events) |
| **Immutability** | Audit log is append-only; entries cannot be modified or deleted |
| **Retention** | [PERIOD — e.g., 3 years]; `user_id` set to NULL on account deletion (event trail preserved, user unlinked) |
| **Access** | Included in GDPR data export (Art. 15/20); admin access via authenticated admin endpoints |
| **Risk addressed** | R1 (unauthorized access detection), R3 (session compromise detection), R8 (breach investigation) |

---

## 5. Consultation

### 5.1 Data Protection Officer (DPO)

| Field | Detail |
|---|---|
| **DPO appointed** | [YES/NO — GDPR Art. 37 requires a DPO when core activities consist of large-scale processing of special category data] |
| **DPO name** | [NAME] |
| **DPO contact** | [EMAIL, PHONE] |
| **DPO involvement in DPIA** | [DESCRIBE — e.g., DPO reviewed and provided input on this DPIA on DATE] |

**Note:** Given that Mergenix processes genetic data (special category data under Art. 9), the appointment of a DPO is strongly recommended and may be legally required under Art. 37(1)(c) if processing occurs on a "large scale."

### 5.2 Data Subjects

| Consultation | Detail |
|---|---|
| **Method** | [DESCRIBE — e.g., user research, beta testing feedback, privacy-focused user surveys] |
| **Key concerns raised** | [SUMMARIZE] |
| **How concerns were addressed** | [SUMMARIZE] |

### 5.3 Internal Stakeholders

| Stakeholder | Consulted | Key Input |
|---|---|---|
| **[CTO / Technical Lead]** | [DATE] | ZKE architecture design, encryption key management, access control design |
| **[Legal Counsel]** | [DATE] | Lawful basis assessment, consent framework, international transfer mechanisms |
| **[Product Manager]** | [DATE] | User experience of consent flows, tier model implications |
| **[Security Lead]** | [DATE] | Threat modeling, authentication controls, incident response |

### 5.4 Supervisory Authority Consultation

| Field | Detail |
|---|---|
| **Prior consultation required (Art. 36)?** | [YES/NO — required if the DPIA indicates that processing would result in a high risk in the absence of measures taken by the controller to mitigate the risk] |
| **Supervisory authority** | [NAME — e.g., ICO (UK), CNIL (France), BfDI (Germany), DPC (Ireland)] |
| **Consultation date** | [DATE or N/A] |
| **Outcome** | [SUMMARIZE or N/A] |

**Assessment:** Based on the residual risk analysis (Section 3.3), no residual risks are rated "Very High" after mitigation measures. The highest residual risks (Medium) relate to areas partially outside Mergenix's control (user device security, consent comprehension, psychological impact). [CONFIRM WHETHER PRIOR CONSULTATION IS DEEMED NECESSARY.]

---

## 6. Review Schedule

### 6.1 Periodic Review

This DPIA must be reviewed and updated at minimum **annually** from the date of initial assessment. The review must be conducted by [RESPONSIBLE ROLE — e.g., DPO, Privacy Lead] and approved per Section 7.

| Review # | Scheduled Date | Reviewer | Status |
|---|---|---|---|
| 1 | [DATE + 12 months] | [NAME] | Pending |
| 2 | [DATE + 24 months] | [NAME] | Pending |
| 3 | [DATE + 36 months] | [NAME] | Pending |

### 6.2 Trigger Events for Re-Assessment

The DPIA must be re-assessed **before implementation** whenever any of the following changes occur:

| Trigger Event | Example |
|---|---|
| **New category of personal data processed** | Adding behavioral data, location data, biometric data beyond genetics |
| **New processing purpose** | Using genetic data for research, population studies, or third-party partnerships |
| **Change to ZKE architecture** | Any modification to the client-side encryption model, key management, or server-side decryption capability |
| **New data processor or sub-processor** | Switching hosting provider, adding a new analytics service, new email provider |
| **Change in data transfer mechanisms** | New international data transfers, change in adequacy decisions |
| **Material change to consent flow** | Bundling consent, changing consent UI, modifying terms/privacy policy in ways that affect consent validity |
| **Security incident involving genetic data** | Any breach, near-miss, or vulnerability that could affect genetic data |
| **Significant increase in processing volume** | User base exceeds [THRESHOLD — e.g., 10,000 / 100,000] registered users |
| **New analysis module** | Adding new types of genetic analysis (e.g., ancestry composition, epigenetics, microbiome) |
| **Regulatory change** | New genetic data regulations, changes to GDPR interpretation, new adequacy decisions |
| **Change in hosting region** | Moving infrastructure to a different jurisdiction |
| **Addition of AI/ML processing** | Any automated decision-making or profiling based on genetic data |
| **New tier or pricing model** | Changes that affect what data is processed or retained differently by tier |
| **Third-party data sharing** | Any new sharing of data with external parties |

### 6.3 Review Process

1. [RESPONSIBLE ROLE] initiates review by examining changes since last assessment
2. Technical team provides updated architecture and data flow documentation
3. Legal counsel reviews any regulatory changes
4. Risk assessment (Section 3) is re-evaluated with current threat landscape
5. Mitigation measures (Section 4) are verified for continued effectiveness
6. Updated DPIA is submitted for sign-off (Section 7)
7. Previous version is archived with date and reason for update

---

## 7. Sign-off

### 7.1 Data Protection Officer

| Field | Detail |
|---|---|
| **Name** | [DPO NAME] |
| **Title** | Data Protection Officer |
| **Assessment** | [APPROVE / APPROVE WITH CONDITIONS / REJECT] |
| **Conditions (if any)** | [LIST ANY CONDITIONS FOR APPROVAL] |
| **Signature** | ______________________________ |
| **Date** | ______________________________ |

### 7.2 Data Controller

| Field | Detail |
|---|---|
| **Name** | [DATA CONTROLLER NAME] |
| **Title** | [TITLE — e.g., CEO, Managing Director] |
| **Organization** | [LEGAL ENTITY NAME — e.g., Mergenix Ltd.] |
| **Decision** | [APPROVE AND PROCEED / APPROVE WITH ADDITIONAL MEASURES / DEFER PENDING FURTHER REVIEW] |
| **Signature** | ______________________________ |
| **Date** | ______________________________ |

### 7.3 Technical Lead

| Field | Detail |
|---|---|
| **Name** | [TECHNICAL LEAD NAME] |
| **Title** | [TITLE — e.g., CTO, Lead Engineer] |
| **Confirmation** | I confirm that the technical measures described in Section 4 are accurately represented and are implemented (or scheduled for implementation with dates noted). |
| **Signature** | ______________________________ |
| **Date** | ______________________________ |

### 7.4 Legal Counsel

| Field | Detail |
|---|---|
| **Name** | [LEGAL COUNSEL NAME] |
| **Title** | [TITLE] |
| **Confirmation** | I confirm that the lawful bases and legal compliance measures described in Sections 2 and 4.7 are appropriate and sufficient. |
| **Signature** | ______________________________ |
| **Date** | ______________________________ |

---

## 8. Appendices

### Appendix A: Data Processing Inventory

| Database Table | Personal Data Fields | Special Category | Retention | Deletion Behavior |
|---|---|---|---|---|
| `users` | email, name, password_hash, totp_secret, backup_codes, oauth_provider, oauth_id, locked_until, failed_login_attempts | No | Until account deletion | CASCADE — row deleted |
| `analysis_results` | result_data (encrypted), summary_json, label, parent1_filename, parent2_filename, tier_at_time | Yes (genetic/health) | Until result or account deletion | CASCADE — rows deleted |
| `audit_log` | ip_address, user_agent, event_type, metadata_json | No (but identifiers) | [RETENTION PERIOD] | `user_id` SET NULL — events preserved anonymously |
| `sessions` | refresh_token_hash, ip_address, user_agent, expires_at | No (but identifiers) | Until logout, expiry, or account deletion | CASCADE — rows deleted |
| `consent_records` | consent_type, version, ip_address, user_agent | No (but identifiers) | [RETENTION PERIOD post-deletion] | CASCADE — [CONFIRM: should consent records survive account deletion for compliance evidence?] |
| `cookie_preferences` | analytics_enabled | No | Until account deletion | CASCADE — row deleted |
| `payments` | stripe_customer_id, stripe_payment_intent, amount, currency, status, tier_granted | No | [RETENTION PERIOD per tax law] | CASCADE — rows deleted [CONFIRM: may need retention override] |
| `password_resets` | token_hash, expires_at, used_at | No | Until expiry/use or account deletion | CASCADE — rows deleted |
| `email_verifications` | token_hash, expires_at, verified_at | No | Until expiry/use or account deletion | CASCADE — rows deleted |

### Appendix B: Third-Party Data Processing Agreements

| Processor | DPA Status | DPA Date | DPA Reference |
|---|---|---|---|
| [HOSTING PROVIDER] | [SIGNED / PENDING / NOT STARTED] | [DATE] | [REFERENCE] |
| Stripe, Inc. | [SIGNED / PENDING / NOT STARTED] | [DATE] | [REFERENCE] |
| Resend | [SIGNED / PENDING / NOT STARTED] | [DATE] | [REFERENCE] |
| [CDN PROVIDER] | [SIGNED / PENDING / NOT STARTED] | [DATE] | [REFERENCE] |
| Sentry | [SIGNED / PENDING / NOT STARTED] | [DATE] | [REFERENCE] |

### Appendix C: Relevant Legislation and Guidance

| Document | Reference |
|---|---|
| GDPR — General Data Protection Regulation | Regulation (EU) 2016/679 |
| GDPR Article 9 — Processing of special categories of data | Art. 9(2)(a) — explicit consent |
| GDPR Article 35 — Data Protection Impact Assessment | Art. 35(3)(b) — large-scale processing of special categories |
| GDPR Recital 91 | DPIAs for processing genetic data |
| ICO DPIA Guidance | ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments |
| EDPB Guidelines on DPIA (wp248rev.01) | WP29 / EDPB guidelines on DPIAs |
| EDPB Guidelines on Consent (05/2020) | Specific guidance on consent for special category data |
| Genetic Information Nondiscrimination Act (GINA) | US — 42 U.S.C. 2000ff (if US users) |
| UK Equality Act 2010 | Protection against genetic discrimination (UK) |
| [MEMBER STATE GENETIC DATA LAW] | [REFERENCE — some EU states have additional genetic data protections] |

### Appendix D: Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | [DATE] | [AUTHOR] | Initial DPIA |
| | | | |

---

*This DPIA was prepared in accordance with GDPR Article 35 and follows the structure recommended by the ICO (UK Information Commissioner's Office) and the EDPB (European Data Protection Board). It should be read alongside the Mergenix Privacy Policy, Terms of Service, and Security documentation.*
