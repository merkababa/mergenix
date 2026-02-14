# Stream F (Frontend) — Execution Plan

**Date:** 2026-02-14
**Status:** APPROVED (pending user confirmation)
**Planning Method:** 10 Gemini planning personas (gemini-3-pro-preview --yolo) fired in parallel, Claude synthesis
**Total Tasks:** 47 (F1-F48, excluding removed F41)

---

## Cross-Domain Consensus (All 10 Personas Agree)

1. **Build consent gates BEFORE results display** — F28 (age), F2 (consent), F27 (partner), F25 (chip limits) are hard prerequisites
2. **Virtualization is mandatory** — 2,697 carrier entries will crash mobile without react-window/virtua
3. **Client-side encryption must block raw save** — `analysis-client.ts` currently sends raw JSON; F15/F45 BLOCKED until Stream S/B
4. **PDF generation in dedicated Web Worker** — `pdf-lib` is synchronous/CPU-intensive, will freeze UI
5. **Legal text needs placeholders** — L-stream not started, create `lib/constants/legal-placeholders.ts`
6. **Color contrast audit before UI build-out** — Fix design tokens first (F19), avoid CSS refactor churn
7. **Tier enforcement should happen in Worker, not just UI** — prevents client-side bypass of paid features

---

## Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Fake "zero-knowledge" (raw save) | **HIGH** | Block F15 until encryption exists; create EncryptionService facade |
| Mobile memory crash (200MB files + PDF) | **HIGH** | Off-main-thread file reading, dedicated PDF worker, aggressive cleanup |
| Free tier false reassurance | **HIGH** | Persistent "only 25/2,697 tested" banner; distinguish "not tested" vs "not detected" |
| PRS ancestry mismatch misinterpretation | **HIGH** | Suppress or badge "Low Confidence" for non-European populations |
| Pricing mismatch in code ($12.90 vs $14.99) | **MEDIUM** | Update pricing-data.ts + payments.ts immediately |
| Legal text dependency (L-stream) | **MEDIUM** | Create placeholder constants file, swap in final copy later |

---

## Gemini Delegation Plan (Execution)

**8 tasks to Gemini (17%), 39 tasks to Claude (83%).**

| Task | Gemini Tier | What Gemini Does | What Claude Does |
|------|------------|------------------|------------------|
| F6 | A+ | Find all instances, produce rename map | Apply renames, test |
| F19 | A+ | Audit contrast ratios, propose semantic tokens | Implement CSS changes, verify |
| F24 | A+ | Research keywords, draft JSON-LD + OG tags | Implement in Next.js metadata |
| F1 | A | Prototype couple upload card design | Integrate, wire to store/worker |
| F4 | A | Prototype Virtual Baby card design | Integrate, wire tier gating |
| F22 | A | Prototype virtualization setup with virtua | Integrate, wire to carrier data |
| F42 | A | Create sample demo report content | Integrate into marketing page |
| F48 | A | Test pdf-lib PDF/UA compliance, font embedding | Review findings, decide approach |

---

## Sprint Structure (4 PRs)

### Sprint 1: Foundation + Gates (~15 tasks)

Design tokens, infrastructure, consent modals. This sprint establishes the accessible foundation and legal gates that ALL other sprints build on.

| Task | Priority | Description | Delegation |
|------|----------|-------------|------------|
| F19 | **CRITICAL** | Color contrast audit + semantic tokens | **Gemini** (A+) |
| F22 | HIGH | List virtualization component (virtua/react-virtuoso) | **Gemini** (A) |
| F48 | HIGH | PDF/UA feasibility spike (pdf-lib validation) | **Gemini** (A) |
| F6 | HIGH | Global terminology rename (Negative→Variant Not Detected, Screening→Analysis, Diagnosis→Report) | **Gemini** (A+) |
| F28 | **CRITICAL** | Age verification gate (18+ modal, role='dialog', focus trap) | Claude |
| F2 | **CRITICAL** | Pre-analysis consent modal (scroll+accept, Article 9, IntersectionObserver) | Claude |
| F27 | **CRITICAL** | Partner consent mandatory checkbox (blocks analysis) | Claude |
| F25 | **CRITICAL** | Pre-payment chip limitation disclosure (0.02% of genome, before paywall) | Claude |
| F44 | HIGH | Skip to Main Content link (WCAG 2.4.1) | Claude |
| F32 | HIGH | Focus management architecture (modal focus trap, session timeout, focus restoration) | Claude |
| F36 | HIGH | React Error Boundaries (all visualization components) | Claude |
| F35 | HIGH | Global error announcer (aria-live region for error codes) | Claude |
| F16 | HIGH | aria-live on analysis progress (screen reader announces stages) | Claude |
| F20 | **CRITICAL** | Touch target sizing (>= 44x44px on mobile) | Claude |
| F34 | MEDIUM | Reduced motion support (prefers-reduced-motion) | Claude |

**Dependencies:** None (this is the foundation sprint)
**Deliverables:** Semantic design tokens, virtualization component, consent gates, a11y infrastructure
**Branch:** `feature/stream-f-sprint-1-foundation`

---

### Sprint 2: Core UX + Tiers (~10 tasks)

Couple upload, sensitive guards, business logic. Builds on Sprint 1's gates and infrastructure.

| Task | Priority | Description | Delegation |
|------|----------|-------------|------------|
| F1 | **CRITICAL** | Couple upload flow ("Upload Mom + Upload Dad" unified card, partner consent, encrypts under uploader's key) | **Gemini** prototype → Claude integration |
| F4 | HIGH | Virtual Baby summary card (predicted traits, "Simulation Only" disclaimer, Free=eye color only) | **Gemini** prototype → Claude integration |
| F3 | **CRITICAL** | Sensitive content guard (3 granular reveals: Carrier, PRS, PGx; blur/reveal; AD pre-reveal warning) | Claude |
| F11 | **CRITICAL** | Free tier = traits only (remove TOP_25_FREE_DISEASES, blur carrier as upsell, normalizing context) | Claude |
| F12 | HIGH | Premium tier ($14.99) — individual health: carrier + PGx + PRS | Claude |
| F13 | HIGH | Pro tier ($34.99) — couple/offspring, includes both Premium reports, full Virtual Baby | Claude |
| F18 | MEDIUM | Mobile stack layout for couple upload (vertical Mom/Dad on mobile) | Claude |
| F15 | HIGH | Save choice UX — "Save encrypted" vs "Download PDF" (STUB — encryption pending S6/B3) | Claude |
| F14 | HIGH | PDF report trigger — user triggers client-side PDF, choose save or download | Claude |
| F29 | HIGH | Delete Account & Data button (triggers backend nuclear delete) | Claude |

**Dependencies:** Sprint 1 complete (gates, focus management, design tokens)
**Deliverables:** Couple upload flow, tier gating, sensitive content guards, save/download stubs
**Branch:** `feature/stream-f-sprint-2-core-ux`

---

### Sprint 3: Results + Visualization (~13 tasks)

Coverage meters, PRS context, clinical disclaimers, accessibility improvements.

| Task | Priority | Description | Delegation |
|------|----------|-------------|------------|
| F5 | HIGH | Coverage confidence meter (per-disease: "Tested X of Y variants", role='meter', visual bar) | Claude |
| F9 | MEDIUM | Residual risk display (post-test probability for "Not Detected" results) | Claude |
| F10 | MEDIUM | CYP2D6 warning display (array genotyping limitations, hybrid alleles, CNV) | Claude |
| F8 | HIGH | Ancestry confidence badge ("Low Confidence — ancestry mismatch" for non-EUR PRS) | Claude |
| F7 | HIGH | NSGC counseling link + emotional support resources (empathetic messaging, helpline) | Claude |
| F30 | **CRITICAL** | PRS environmental context ("genes + environment", offspring disclaimer, statistical estimates) | Claude |
| F31 | HIGH | Clinical testing recommendation ("NOT a replacement for clinical carrier screening") | Claude |
| F26 | HIGH | Per-page "What This Cannot Tell You" section (collapsible, untested variants, not-a-diagnosis) | Claude |
| F33 | **CRITICAL** | Accessible data visualization (SR text equivalents, High Contrast Mode, WCAG 1.4.1 no color-only) | Claude |
| F37 | MEDIUM | Heading hierarchy enforcement (h1→h2→h3, no skipped levels) | Claude |
| F39 | HIGH | Virtualized list accessibility (aria-rowcount, aria-setsize, focus management) | Claude |
| F17 | MEDIUM | Mobile card view for variant tables (tables→VariantCard on mobile) | Claude |
| F23 | MEDIUM | Friendly error mapping (translate codes to actionable messages, aria-invalid, "Copy Debug Info") | Claude |

**Dependencies:** Sprint 1 (virtualization, design tokens, error boundaries) + Sprint 2 (tier logic, sensitive guards)
**Deliverables:** All result tab enhancements, coverage meters, PRS context, mobile responsiveness
**Branch:** `feature/stream-f-sprint-3-results`

---

### Sprint 4: Output + Compliance (~9 tasks)

PDF generation, encryption stubs, GDPR, security page, SEO.

| Task | Priority | Description | Delegation |
|------|----------|-------------|------------|
| F21 | HIGH | Client-side PDF generation (pdf-lib, dedicated Web Worker, PDF/UA, mobile memory guard, HTML print fallback) | Claude |
| F42 | MEDIUM | Sample report for landing page (realistic demo with fake data) | **Gemini** (A) |
| F24 | MEDIUM | SEO & Open Graph metadata (keywords, JSON-LD, couple marketing disclaimer) | **Gemini** (A+) |
| F46 | HIGH | Security Architecture page (/security, zero-knowledge explainer, data flow diagrams) | Claude |
| F47 | HIGH | GDPR compliance checklist (consent withdrawal UI, privacy notice, Article 6 basis) — partial, needs B12/L14 | Claude |
| F40 | MEDIUM | Stale results banner (dataVersion mismatch, explain re-upload needed) | Claude |
| F38 | MEDIUM | WCAG 1.4.10 Reflow (content legible at 400% zoom, 320px width) | Claude |
| F43 | HIGH | IndexedDB hydration barrier (skeleton UI, schema version check) — STUB until S6 | Claude |
| F45 | HIGH | Session DEK restore (cached CryptoKey, per-tab DEK, 15-min idle timeout) — STUB until B3 | Claude |

**Dependencies:** Sprint 1 (PDF spike F48 results), Sprint 2 (tier logic for PDF content), Sprint 3 (all result components for PDF rendering)
**Deliverables:** PDF generation, security page, GDPR UI, SEO, encryption stubs
**Branch:** `feature/stream-f-sprint-4-output`

---

## Blocked Tasks (Stubbed, Completed by Later Streams)

| Task | Blocked By | What Gets Stubbed | What Completes It |
|------|-----------|-------------------|-------------------|
| F15 | S6 (encryption), B3 (key mgmt) | UI shell + "encryption coming soon" | Stream S + Stream B |
| F43 | S6 (encryption) | Skeleton UI + unencrypted IndexedDB | Stream S |
| F45 | B3 (key management) | Password-always-required fallback | Stream B |
| F47 | B12 (data rectification), L14 (DPO) | Consent withdrawal UI only | Stream B + Stream L |
| F2 content | L3 (legal text) | Placeholder constants | Stream L |
| F26 content | L3 (legal text) | Placeholder constants | Stream L |
| F25 content | L10 (chip limitation text) | Placeholder constants | Stream L |

---

## New Libraries Required

| Library | Purpose | Sprint |
|---------|---------|--------|
| `virtua` or `react-virtuoso` | List virtualization (2,697 carrier entries) | Sprint 1 |
| `pdf-lib` | Client-side PDF generation (pure JS, Web Worker compatible) | Sprint 4 |
| `idb` or `dexie` | IndexedDB wrapper (encrypted local storage) | Sprint 4 |
| `argon2-browser` (WASM) | Key derivation for zero-knowledge encryption | Sprint 4 (stub) |

---

## Architectural Decisions (from Persona Synthesis)

1. **PDF Worker Isolation** (Architect): Dedicated `pdf.worker.ts` separate from genetics worker — prevents UI freeze and memory contention
2. **State Machine Expansion** (Architect, Legal): `AnalysisStep` type must include `age_gate` → `consent_gate` → `parsing` states
3. **CoupleContext in Store** (Architect): Formal `CoupleContext` object grouping parentA, parentB, consentGiven flags
4. **EncryptionService Facade** (Architect, Security): `lib/services/encryption.ts` interface even before backend is ready
5. **Worker-Level Tier Filtering** (Security, QA): Worker returns sanitized data per tier, not just UI hiding
6. **Legal Placeholder Constants** (all Legal-dependent tasks): `lib/constants/legal-placeholders.ts` with swappable keys
7. **Semantic Color Tokens** (Designer): Replace hardcoded hex (teal, rose) with CSS variables that adapt to theme for both light/dark modes
8. **Hook Extraction** (Code Quality): `useCarrierFilter`, `useSensitiveReveal`, `useTierGate` — prevent God Components
9. **CarrierTab Decomposition** (Code Quality): `CarrierTab` (layout) → `CarrierList` (virtualization) → `CarrierCard` (presentation)
10. **"Layers of Disclosure"** (Ethics): Safe Zone (traits) → Consent Gate → Contextualized Result (never raw numbers alone)
11. **Mendelian vs Complex Distinction** (Scientist): Virtual Baby must distinguish high-predictability (eye color) from low-predictability (height) traits
12. **Pricing Update** (Business): $12.90→$14.99, $29.90→$34.99 in pricing-data.ts + payments.ts immediately
13. **Off-Main-Thread File Reading** (Technologist): Pass File objects to worker, use `file.text()` inside worker, not on main thread
14. **react-virtuoso over react-window** (Technologist): Better for variable-height expandable cards

---

## 10 Persona Summaries

### 1. Architect
- PDF Worker isolation (separate from genetics worker)
- EncryptionService facade pattern
- CoupleContext state object in AnalysisStore
- State machine expansion: idle → age_gate → consent_gate → parsing
- Zero-knowledge boundary: encrypt BEFORE transmission
- 5-sprint grouping: Architecture → Input Flow → Results → Business Logic → Compliance

### 2. QA
- Testing strategy: Vitest for logic/state, Playwright for user flows
- Mock Worker responses for most UI tests; one real smoke test with sample file
- Tier leakage detection (Free users accessing Pro data)
- Worker resilience testing (terminate mid-analysis)
- Mobile viewport tests for upload and results
- Need synthetic "Mom + Dad" compatible test data sets

### 3. Scientist
- Coverage meter is the #1 scientific safety feature — must be prominent, not tooltip
- PRS ancestry mismatch: European-derived PRS invalid for African/Asian ancestry
- Residual risk: only display if detection rate estimate exists for user's chip
- Mendelian vs complex trait distinction in Virtual Baby
- "Mom/Dad" = biological sex assumption for X-linked math — must clarify
- Build "Trust Architecture" (F25, F26, F5) before flashy features
- Clinical-grade (carrier) vs recreational (traits/PRS) — use different visual language

### 4. Technologist
- Off-main-thread file reading (pass File to worker, not file.text() on main thread)
- react-virtuoso for variable-height expandable cards (better than react-window)
- Debounced filtering (300ms) for carrier search
- Lazy-load pdf-lib and chart libraries via import()
- IndexedDB (idb/dexie) not localStorage for multi-MB data
- Selective Zustand subscriptions (s.metadata.tier not s.fullResults)
- Stable worker callbacks (useCallback or define outside render)

### 5. Business
- Pricing mismatch: code has $12.90/$29.90, plan says $14.99/$34.99 — update first
- Free tier devaluation risk: removing Top 25 diseases → lean into Virtual Baby (eye color) as viral hook
- "Not Detected" misinterpretation risk → F9 residual risk critical
- Conversion funnel: Free (traits, eye color preview) → Premium (individual health) → Pro (couple + offspring)
- Pre-payment transparency (F25) prevents chargebacks

### 6. Designer
- Focus restoration in useFocusTrap (return focus to trigger button on modal close)
- Consent "scroll to accept" is a11y anti-pattern — use IntersectionObserver + visible status
- Semantic color palette BEFORE building UI (avoid refactoring CSS twice)
- "Skip Results" link before virtualized list for keyboard users
- Emotional design: "High Risk" in orange/bold, NOT flashing red/skull icons
- Mobile: light mode contrast issues with neon colors (teal, rose)

### 7. Security
- CRITICAL: analysis-client.ts sends raw JSON — fake zero-knowledge until encrypted
- Client-side tier bypass accepted for offline analyzer (privacy tradeoff)
- File upload: enforce size limits + timeout in Worker (prevent zip bombs)
- PDF generation: sanitize all text inputs (prevent PDF-based XSS)
- CSP update needed for Worker blobs + OAuth scripts
- Session timeout (15 min) clears DEK from memory
- Partner consent logged in local audit trail if results saved

### 8. Code Quality
- Hook encapsulation: useCarrierFilter, useSensitiveReveal, useTierGate
- CarrierTab decomposition: layout → virtualization → presentation
- PDF Worker follows existing useGeneticsWorker pattern with typed messages
- Zustand slicing: if AnalysisStore grows, create UiStore
- Component naming: PascalCase components, kebab-case files
- Strict type sharing via packages/shared-types
- axe-core + manual keyboard test before every merge

### 9. Legal/Privacy
- GDPR Article 9: explicit consent checkbox for genetic data processing
- "tier_locked" status distinct from "not_tested" — prevent misleading absence
- Consent state machine in store: idle → age_verified → terms_accepted → processing
- EncryptedStorageClient wrapper intercepts all saveResult calls
- "Clear Analysis Data" button separate from full account deletion
- No "silent uploads" — error logs must be sanitized of genetic data
- Cookie banner defaults to "Essential Only" (GDPR)

### 10. Ethics
- "Layers of Disclosure": Safe Zone (traits) → Consent Gate → Contextualized Result
- Crisis resources: any "High Risk" result → immediate "Talk to a Counselor" link
- Visual neutrality: orange/bold for risk, NOT red/skull/flashing (prevent emotional distress)
- Free tier: persistent "only 25/2,697 tested" banner (prevent false reassurance)
- Non-consensual spouse testing: checkbox shifts liability, optional "Notify Partner" email
- High-penetrance late-onset conditions (Huntington's, APOE e4/e4): require second confirmation
- "Simulation Only" disclaimer baked into ALL PDF/image outputs (can't be cropped)

---

## Execution Order

```
Sprint 1 (Foundation + Gates)
  ├── Gemini: F19 (contrast), F22 (virtualization), F48 (PDF spike), F6 (terminology)
  └── Claude: F28, F2, F27, F25, F44, F32, F36, F35, F16, F20, F34
       ↓
Sprint 2 (Core UX + Tiers)
  ├── Gemini: F1 (prototype), F4 (prototype)
  └── Claude: F3, F11, F12, F13, F18, F15-stub, F14, F29
       ↓
Sprint 3 (Results + Visualization)
  └── Claude: F5, F9, F10, F8, F7, F30, F31, F26, F33, F37, F39, F17, F23
       ↓
Sprint 4 (Output + Compliance)
  ├── Gemini: F42 (sample report), F24 (SEO)
  └── Claude: F21, F46, F47, F40, F38, F43-stub, F45-stub
```

Each sprint = 1 PR. Review pipeline: Static → Gemini (10/10 A+) → Claude (10/10 A+) → Merge.
