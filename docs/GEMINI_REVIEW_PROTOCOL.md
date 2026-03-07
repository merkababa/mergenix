# Gemini Review Protocol

Findings from Claude-Gemini pipeline optimization conversation (2026-02-10).

---

## Problem Statement

Gemini consistently gives **higher grades** than Claude Opus and **misses critical issues**. Phase 7 data showed Gemini missing issues in 6/8 reviewer roles, with grades inflated by ~1 full letter grade.

### What Gemini Misses (Pattern Analysis)

| Issue Type                     | Example                              | Root Cause                                                    |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| Deep async/concurrency         | bcrypt blocking event loop           | Gemini pattern-matches syntax, doesn't simulate runtime state |
| ORM interaction bugs           | lazy="raise" + cascade delete        | Knows patterns individually, misses negative interactions     |
| Security timing attacks        | Early-break in comparison loops      | Applies localized fixes without holistic function analysis    |
| Naming/semantics               | "subscription" for one-time purchase | No business context provided in prompt                        |
| Architectural layer violations | Business logic in routers            | No architectural rules provided in prompt                     |
| Production hardening           | No price validation in webhooks      | Doesn't think adversarially by default                        |

### What Gemini Catches Well

- Basic code structure and readability
- Obvious security issues (cookie flags, rate limiting)
- Schema/API design basics
- Surface-level test coverage gaps
- Documentation needs

### Gemini's Self-Diagnosis

> "My fundamental limitation is that I am a pattern-matching engine, not a true execution simulator. I don't 'run' the code in a virtual machine. To understand that `bcrypt.hashpw` will block the entire event loop requires a mental model of the runtime, not just a pattern."

---

## Solution: Enhanced Review Prompts

### Key Principles

1. **Adversarial Questions** — Force Gemini to TRACE code paths, not just scan
2. **Mandatory Checklists** — Switch from passive scanning to active verification
3. **Business Context** — Always provide the "why" (one-time purchase, not subscription)
4. **Architectural Rules** — Tell Gemini the rules it should enforce
5. **Second Pass Instruction** — Force a "breaker" mindset after initial review
6. **Grading Calibration** — Tie grades to severity, not overall feel

---

## Prompt Template Structure (Per Reviewer)

Every Gemini review prompt MUST include:

```
ROLE: [Reviewer Name]

PRIMARY GOAL: [1-2 sentences describing what this reviewer optimizes for]

BUSINESS CONTEXT: [What this PR does from a product perspective. Critical for naming/semantics accuracy.]

ARCHITECTURAL CONSTRAINTS:
- [Rule 1: e.g., "No blocking the async event loop"]
- [Rule 2: e.g., "Business logic in services, not routers"]
- [Rule 3: e.g., "All secrets compared with constant-time functions"]

MANDATORY CHECKLIST:
- [ ] [Item 1]
- [ ] [Item 2]
- [ ] [Item 3]
... (5-8 items)

ADVERSARIAL QUESTIONS:
1. [Question that forces tracing a specific code path]
2. [Question that forces thinking about failure modes]
3. [Question that forces thinking about malicious users]

GRADING RUBRIC:
- A+ = ZERO issues found after thorough adversarial analysis
- A = only LOW severity issues
- A- = at most one MEDIUM issue
- B+ = multiple MEDIUM or one HIGH issue
- B = one CRITICAL issue
- Below B = multiple HIGH/CRITICAL issues

ANTI-INFLATION: Before giving A+, assume you are WRONG and look harder. A+ should be exceptionally rare. If you haven't found at least one potential concern, you haven't looked hard enough.

SECOND PASS: After your initial review, adopt a purely adversarial "breaker" mindset. Your only goal is to find a way to exploit, break, or crash the system using this new code. Assume inputs are malicious, the network is unreliable, and all systems are unstable. Document any NEW findings and adjust your grade.

UNCERTAINTY FLAGS: If you suspect an issue but aren't confident, mark it as UNCERTAIN with certainty: "UNCERTAIN". These will be escalated to Claude Opus for verification.

---

CONTEXT (in this order):
1. Diff for each file (git diff --unified=10)
2. Full file content for each changed file
3. Full content of key related files (services, models, schemas)
```

---

## Role-Specific Checklists

### Architect

- [ ] Layer purity: all business logic in services, not routers
- [ ] Data model integrity: correct column types, loading strategies
- [ ] Type definitions: specific, no `any`, derive from shared types
- [ ] Separation of concerns: single responsibility per function/module
- [ ] Configuration management: no hardcoded values
- [ ] Error propagation: clean flow, no swallowed errors
- [ ] ORM anti-patterns: no N+1, cascade + lazy loading interactions checked

### QA

- [ ] Happy path test exists
- [ ] Negative path tests (invalid inputs, permission errors)
- [ ] Edge cases: nulls, empty lists, zeros, boundaries
- [ ] Assertion specificity: checks values, not just status codes
- [ ] Mock accuracy: simulates failures, not just success
- [ ] Async test correctness: proper awaits, no race conditions
- [ ] Test readability: clear names and structure

### Technologist

- [ ] Event loop blocking: bcrypt, Stripe, file I/O wrapped in asyncio.to_thread
- [ ] Idiomatic framework usage: FastAPI deps, React hooks, Next.js patterns
- [ ] Efficient queries: SARGable, indexed, no N+1
- [ ] Frontend perf: bundle size impact, code splitting, LCP
- [ ] Resource handling: connections/handles closed on error
- [ ] Caching strategy: appropriate use, correct invalidation

### Business

- [ ] Naming accuracy: matches product spec (not "subscription" for one-time)
- [ ] Feature gating: tier checks on backend, not just frontend
- [ ] Backend price validation: re-verify before charging
- [ ] Idempotency: payment endpoints protect against double-processing
- [ ] Currency handling: smallest unit (cents), no floating point
- [ ] User-facing errors: clear, actionable messages

### Security Analyst

- [ ] No SQL/command injection: parameterized queries only
- [ ] Constant-time comparison: for ALL secret comparisons, no early exits
- [ ] Webhook signature verification: before any processing
- [ ] XSS prevention: all user data escaped/sanitized
- [ ] Auth + authz checks: on every sensitive endpoint
- [ ] CSRF protection: tokens on state-changing POST requests
- [ ] Rate limiting: on auth endpoints, expensive operations

### Code Reviewer

- [ ] Descriptive naming: functions and variables describe purpose
- [ ] Function length: short, focused, single responsibility
- [ ] No magic strings/numbers: named constants instead
- [ ] Comment quality: explains "why", not "what"
- [ ] Import hygiene: organized, no unused imports
- [ ] Layer boundaries: no direct DB calls from routers
- [ ] No code duplication: shared functions for repeated logic

### Legal + Privacy

- [ ] GDPR compliance: personal data processing has lawful basis, data minimization applied
- [ ] Genetic data regulations: GINA (US) / GDPR special categories (EU) — genetic data is sensitive, requires explicit consent
- [ ] Right to deletion: account deletion actually purges ALL user data (not just soft-delete) — all tables, caches, backups
- [ ] Data retention: no indefinite storage of sensitive data, retention periods defined and enforced in code
- [ ] Consent flows: users explicitly consent before data collection, consent is granular and revocable
- [ ] Cookie consent: tracking/analytics cookies require opt-in, essential cookies documented
- [ ] Age verification: genetic data from minors requires parental consent (COPPA/GDPR)
- [ ] Data export: users can request a copy of their data (GDPR Article 20 portability)
- [ ] Third-party data sharing: any data sent to external services (Stripe, analytics) is documented and consented
- [ ] Data flow mapping: genetic data only flows where it should — not logged, cached, or transmitted unnecessarily
- [ ] Encryption adequacy: genetic data encrypted at rest and in transit, key management documented
- [ ] Cross-border transfers: EU users' data handling complies with Standard Contractual Clauses if transferred outside EU

### Ethics / Bioethics

- [ ] Population bias: genetic predictions acknowledge limitations from European-skewed GWAS datasets, results qualified for non-European populations
- [ ] Responsible result framing: carrier risk results presented with appropriate context, not catastrophized (e.g., "25% carrier probability" framed with what that actually means)
- [ ] Emotional harm prevention: potentially distressing results (disease risk, carrier status) have appropriate warnings, context, and links to genetic counseling resources
- [ ] Informed consent UX: consent is genuinely understandable (not just legally sufficient), users know what analysis will be performed before uploading DNA
- [ ] Eugenics guardrails: no feature language that implies "selecting" or "designing" offspring traits — frame as educational/probabilistic, not prescriptive
- [ ] Disclaimer adequacy: disclaimers are prominent, understandable, and honest about prediction accuracy limitations
- [ ] Vulnerable populations: special care for results involving hereditary conditions, mental health predispositions, or stigmatized traits
- [ ] Data purpose limitation: genetic data used only for the stated purpose, not repurposed for research/marketing without separate explicit consent

---

## Output Format

Gemini reviews should output structured findings:

```json
{
  "reviewerRole": "Technologist",
  "overallGrade": "B+",
  "issues": [
    {
      "id": "tech-001",
      "filePath": "apps/api/app/routers/auth.py",
      "lineStart": 42,
      "severity": "HIGH",
      "certainty": "CONFIDENT",
      "description": "bcrypt.hashpw blocks the async event loop",
      "suggestion": "Wrap in asyncio.to_thread()"
    },
    {
      "id": "tech-002",
      "filePath": "apps/api/app/services/payment_service.py",
      "lineStart": 88,
      "severity": "MEDIUM",
      "certainty": "UNCERTAIN",
      "description": "Stripe SDK call may block event loop",
      "suggestion": "Verify if stripe library uses async internally or needs to_thread wrapper"
    }
  ],
  "checklistResults": {
    "eventLoopBlocking": "FAIL - bcrypt not wrapped",
    "idiomaticUsage": "PASS",
    "efficientQueries": "PASS"
  },
  "adversarialFindings": "Under 1000 concurrent requests, bcrypt will...",
  "secondPassFindings": "On second review, noticed Stripe SDK also blocks..."
}
```

---

## Context Packaging Format

**Order: Interleaved (diff + full file per file)**

```
// File: path/to/changed_file.py
// === DIFF ===
[git diff --unified=10 output]

// === FULL FILE ===
[complete file content]

---

// File: path/to/another_file.py
// === DIFF ===
[git diff --unified=10 output]

// === FULL FILE ===
[complete file content]
```

**Rationale:** Diff first focuses attention on changes. Full file after provides context for deeper analysis. Interleaved keeps each file's context together.

---

## Severity Definitions

| Severity     | Definition                                                                             | Examples                                                                           |
| ------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **CRITICAL** | Exploitable vulnerability, data loss, financial loss, system crash                     | SQL injection, event loop blocking on high-traffic endpoint, charging wrong amount |
| **HIGH**     | Incorrect behavior in primary feature, significant perf issue, architectural violation | N+1 on core endpoint, business logic in router, reflected XSS                      |
| **MEDIUM**   | Edge case bug, best practice lapse, confusing code                                     | Missing negative test, poor variable name, inefficient but non-blocking operation  |
| **LOW**      | Stylistic issue, typo, micro-optimization                                              | Comment typo, slightly verbose code, unused import                                 |

---

## Feedback Loop: Claude → Gemini (MANDATORY)

### After EVERY Claude Opus review cycle, the Conductor MUST:

1. **Collect all issues** that Claude found but Gemini missed
2. **Categorize by pattern** (async blocking, naming, security, etc.)
3. **Append to calibration file** at `docs/gemini-calibration.md` (create if not exists)
4. **Include in next Gemini review prompt** as a CALIBRATION section

### Calibration Prompt Format

Every Gemini review prompt MUST include at the top:

```
CALIBRATION FROM PREVIOUS REVIEWS:
- You previously missed: [list from gemini-calibration.md]
- Your UNCERTAIN flag on [X] was CONFIRMED — increase sensitivity for similar patterns
- Your UNCERTAIN flag on [Y] was DISMISSED — this was a false positive, reduce sensitivity
- Common false positives to AVOID: [list]
```

### Calibration File Format (`docs/gemini-calibration.md`)

```markdown
# Gemini Calibration Data

## Confirmed Misses (Gemini missed, Claude caught)

| Phase | Reviewer     | Issue                    | Pattern              | Severity |
| ----- | ------------ | ------------------------ | -------------------- | -------- |
| 7     | Technologist | bcrypt blocks event loop | async-blocking       | CRITICAL |
| 7     | Business     | "subscription" naming    | business-terminology | HIGH     |
| 7     | Architect    | lazy="raise" + cascade   | orm-interaction      | HIGH     |

## Confirmed UNCERTAIN Flags (Gemini was right to flag)

| Phase | Reviewer     | Issue               | Pattern        |
| ----- | ------------ | ------------------- | -------------- |
| 7     | Technologist | Stripe SDK blocking | async-blocking |

## Dismissed UNCERTAIN Flags (Gemini false positive)

| Phase | Reviewer | Issue | Reason |
| ----- | -------- | ----- | ------ |
```

### Rules:

1. This is NOT optional — the feedback loop is what makes Gemini improve over time
2. The calibration data persists across phases (cumulative learning)
3. After 5+ phases, analyze which patterns Gemini has learned vs still misses
4. If a pattern is missed 3+ times despite calibration, skip Gemini for that reviewer role and go directly to Claude

---

## Pipeline Summary

> **MANDATORY:** The Feedback Loop (see section above) MUST be executed after every Stage 2 cycle. Skipping the feedback loop degrades Gemini's accuracy over time. See `docs/gemini-calibration.md` for cumulative calibration data.

```
Stage 1: Gemini (Broad Sweep + Triage)
  - Enhanced prompts with checklists + adversarial questions
  - Structured JSON output with severity + certainty
  - UNCERTAIN flags escalated to Stage 2
  - Iterate until all CONFIDENT issues resolved (all A+)

Stage 2: Claude Opus (Deep Dive)
  - Independent agents per reviewer role
  - Receives Gemini's UNCERTAIN flags as priority review list
  - Full tool access (reads files, traces code paths)
  - Iterate until all A+

Feedback: Claude findings feed back into Gemini's next review prompt
```
