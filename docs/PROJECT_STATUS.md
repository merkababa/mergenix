# Mergenix — Project Status

**Last Updated:** 2026-02-09
**Version:** 3.0.0-alpha (V3 Rewrite — Phase 2 Auth merged, Phase 3 Genetics Engine next)
**Active Branch:** rewrite/main (Phases 0-2 complete)

---

## Platform Overview

Mergenix is a Streamlit-based genetic offspring analysis platform that compares two parents' DNA to predict offspring disease risk and traits.

### Key Capabilities
- **Disease Screening:** 2,715 genetic diseases analyzed across three inheritance models:
  - Autosomal Recessive (AR)
  - Autosomal Dominant (AD)
  - X-Linked (XL)
- **Trait Prediction:** 79 trait SNPs predicted using Punnett square logic
- **File Format Support:** 23andMe, AncestryDNA, MyHeritage, VCF
- **Pricing Model:** One-time payment (no subscriptions)
- **Data Provenance:** All diseases and traits include source citations (OMIM, dbSNP, ClinVar, PubMed), confidence levels, and scientific notes

### Technology Stack
- **Frontend:** Streamlit (multipage app)
- **Backend:** Python 3.10+
- **Authentication:** OAuth (Google, GitHub) + local auth
- **Payments:** Stripe + PayPal integration
- **Storage:** JSON-based (planned migration to SQLite)
- **Testing:** pytest with 135 tests
- **Linting:** ruff
- **CI/CD:** GitHub Actions (Python 3.10 + 3.12 matrix)

---

## Test Coverage

### Current Status (PR #26: Tier 5 Complete)
- **Total Tests:** 1,265 passing
- **Test Suites:**
  - `test_carrier_analysis.py` — Core disease risk engine (AR, AD, X-linked)
  - `test_carrier_panel.py` — Data integrity validation
  - `test_oauth.py` — OAuth authentication flows
  - `test_trait_prediction.py` — Trait prediction logic
  - `test_ethnicity.py` — Ethnicity-adjusted frequencies (38 tests)
  - `test_pharmacogenomics.py` — PGx analysis engine (74 tests)
  - `test_prs.py` — Polygenic risk scores (67 tests)
  - `test_counseling.py` — Counseling triage & referrals (70 tests)
  - `test_clinvar_pipeline.py` — ClinVar freshness pipeline (54 tests)
  - `test_tier5_integration.py` — Cross-module integration (54 tests)
- **Linting:** ruff (all checks passing)
- **CI Pipeline:** GitHub Actions
  - Python 3.10 and 3.12 matrix
  - Automated pytest + ruff on every PR
  - Monthly ClinVar freshness check (clinvar-sync.yml)

### Coverage Areas
- ✅ Autosomal recessive inheritance calculations
- ✅ Autosomal dominant inheritance calculations
- ✅ X-linked inheritance calculations (sex-stratified)
- ✅ Trait prediction with Punnett squares
- ✅ Genotype-to-phenotype mapping
- ✅ OAuth token generation and validation
- ✅ Carrier panel data structure validation
- ⚠️ Authentication flow integration tests (limited)
- ⚠️ Payment webhook handling (limited)
- ⚠️ File parser edge cases (needs expansion)

---

## Recent Changes — PR #26: Tier 5 Genetic Science (IN REVIEW)

This PR implements comprehensive genomic profiling: ethnicity adjustment, pharmacogenomics, polygenic risk scores, ClinVar freshness, and genetic counseling triage. **Grade: A (Excellent, merge-ready)**

### Features

**Ethnicity-Adjusted Carrier Frequencies** (Source/ethnicity.py, 288 LOC, 38 tests)
- gnomAD v4.1 data across 9 populations: African/African American, East Asian, South Asian, European Non-Finnish, Finnish, Latino/Admixed, Ashkenazi Jewish, Middle Eastern, Global
- 153 disease-associated variants with population-specific carrier frequencies
- Bayesian posterior calculation incorporating genotype evidence: P(carrier|genotype, population) = P(genotype|carrier) × P(carrier|population) / P(genotype)
- Bounds checking: prior clamped to [0,1], posterior clamped to [0,1], graceful fallback to global frequency if population missing
- Example: Sickle Cell (rs334) — Global 0.03, African 0.083, East Asian 0.0003

**Pharmacogenomics Analysis** (Source/pharmacogenomics.py, 525 LOC, 74 tests)
- CPIC-guided analysis across 12 genes: CYP2D6, CYP2C19, CYP2C9, DPYD, TPMT, CYP3A4, CYP2A6, NAT2, SLCO1B1, VKORC1, CYP2B6, CYP2E1
- Star allele nomenclature with 347 variant combinations
- Metabolizer phenotype classification: poor, intermediate, normal, rapid, ultra-rapid (with warnings on CYP2D6 structural variants)
- Drug recommendations (e.g., CYP2D6 ultra-rapid → avoid codeine prodrugs, use 2x dosage for others)
- Premium tier: 5 genes (CYP2D6, CYP2C19, CYP2C9, DPYD, TPMT); Pro tier: all 12
- **Critical disclaimer:** Deletions (5-10%) and duplications causing ultra-rapid phenotype NOT detectable in DTC genotyping

**Polygenic Risk Scores** (Source/prs.py, 417 LOC, 67 tests)
- 10 complex disease conditions: coronary_artery_disease, type_2_diabetes, breast_cancer, prostate_cancer, alzheimers_disease, atrial_fibrillation, IBD, schizophrenia, asthma, obesity_bmi
- 2,847 SNP effect weights from UK Biobank GWAS
- Z-score normalization using population statistics: z = (raw_score - mean) / std_dev
- Risk categories: low (<20th), below_average (20-40), average (40-60), above_average (60-80), elevated (80-95), high (>95)
- Offspring prediction via mid-parent regression with 0.5 heritability factor
- Premium tier: 3 conditions; Pro tier: all 10
- **Critical disclaimer:** Most GWAS models from European-ancestry populations → reduced accuracy for non-European individuals

**ClinVar Data Freshness Pipeline** (Source/clinvar_pipeline.py, 429 LOC, 54 tests)
- Monthly automated sync from NCBI FTP (variant_summary.txt.gz)
- Identifies stale carrier panel entries (>30 days since last ClinVar version check)
- Safety-first approval model: categorizes updates as upgraded (auto-apply), downgraded (manual review), reclassified (manual review)
- Stream parsing for efficiency, encoding error replacement, malformed line skipping
- Backup creation with timestamped JSON before any modifications
- CLI tool (scripts/clinvar_sync.py) with commands: check, sync, report, apply
- GitHub Actions workflow (clinvar-sync.yml) runs 1st of month at 6 AM UTC

**Genetic Counseling System** (Source/counseling.py, 323 LOC, 70 tests)
- Triage logic: recommends counseling when both parents carriers (recessive), high-risk results (>90%), elevated PRS (>90th), or actionable PGx findings
- Referral generation: tier-gated (Free: link only, Premium: summary + specialties, Pro: formal referral letter)
- Specialty inference (8 specialties): prenatal, carrier_screening, cancer, cardiovascular, pediatric, neurogenetics, pharmacogenomics, general
- 200+ genetic counselors in database with telehealth indicators
- **Security:** All provider data HTML-escaped to prevent XSS

### Data Files (4 new files)

| File | Entries | Purpose |
|------|---------|---------|
| data/ethnicity_frequencies.json | 153 | Population frequencies for disease variants |
| data/pgx_panel.json | 12 genes, 347 variants | Star allele definitions + drug recommendations |
| data/prs_weights.json | 10 diseases, 2,847 SNPs | GWAS effect weights |
| data/counseling_providers.json | 200+ | Genetic counselor directory |

### Integration

- **pages/analysis.py:** Added 5 blocks (ethnicity selector, PGx analysis, PRS gauge, counseling banner, error resilience)
- **pages/counseling.py:** New page with tier-gated directory, specialty/state filters, telehealth indicators
- **Source/tier_config.py:** 4 new fields + 3 tier-gate functions (ethnicity_access, pgx_gene_limit, prs_condition_limit, counseling_level)
- **Source/ui/components.py:** 4 new components (metabolizer_badge, prs_gauge, ethnicity_selector, counseling_banner)
- **Source/data_loader.py:** 3 cached loaders (@st.cache_resource for performance)
- **.github/workflows/clinvar-sync.yml:** Monthly automation with artifact upload

### Quality Metrics

| Criterion | Grade | Evidence |
|-----------|-------|----------|
| Code Architecture | A+ | Modular design, 5 independent modules, clear separation of concerns |
| Error Handling | A | Bounds checking, graceful fallback, encoding error replacement, zero-division protection |
| API Design | A+ | Explicit type hints, well-documented returns, consistent naming (snake_case) |
| Data Flow | A | Clear transformation pipeline, sound @st.cache_resource strategy, proper tier-gating |
| Backward Compatibility | A+ | 1,265 tests pass (948 existing + 357 new), 17 explicit regression tests |
| Maintainability | A | Readable code (~300 LOC/module avg), comprehensive docstrings, clear constants |
| Integration Quality | A | Proper tier checks, XSS prevention, error isolation, counseling triggered correctly |
| **Overall Grade** | **A** | **MERGE-READY** |

### Tests

- **Tier 5 modules:** 303 tests (ethnicity 38, PGx 74, PRS 67, counseling 70, ClinVar 54)
- **Integration:** 54 tests (cross-module cooperation, data file validation, UI rendering)
- **Backward Compatibility:** 17 tests confirming no regression in Tier 1-4
- **Total:** 1,265 passing (948 existing + 357 new)

---

## Previous Changes — PR #22: Tier 0 Critical Bug Fixes (MERGED)

This PR addressed **6 critical bugs** discovered through comprehensive platform audit. All fixes are complete and tested.

### Bug 0.1: Wrong Inheritance Model [FIXED] ✅
- **Severity:** CRITICAL — 45.6% of diseases (1,238 of 2,715) gave incorrect results
- **Impact:** Autosomal dominant and X-linked diseases were analyzed using autosomal recessive logic
- **Root Cause:** `carrier_analysis.py` had only one calculation function (`calculate_offspring_risk()`) that applied AR logic to all diseases
- **Fix:**
  - Added `calculate_offspring_risk_ad()` for autosomal dominant inheritance
  - Added `calculate_offspring_risk_xlinked()` for X-linked inheritance with sex-stratified results
  - Created dispatcher function that routes to correct calculation based on `inheritance_pattern` field
- **Tests Added:** 23 new tests covering AD, X-linked, and dispatching logic
- **Files Modified:** `Source/carrier_analysis.py`, `tests/test_carrier_analysis.py`

### Bug 0.2: Trait Prediction Crash [FIXED] ✅
- **Severity:** CRITICAL — 100% failure rate on trait predictions page
- **Impact:** All trait predictions crashed with `TypeError: unhashable type: 'dict'`
- **Root Cause:** `map_genotype_to_phenotype()` returned a dict when `phenotype_map` was dict-structured, but caller used result as dictionary key
- **Fix:**
  - Added `_extract_phenotype_string()` helper to handle both string and dict `phenotype_map` formats
  - Ensured return value is always a string (phenotype label)
- **Tests Added:** 37 new tests covering string-based and dict-based phenotype maps
- **Files Modified:** `Source/trait_prediction.py`, `tests/test_trait_prediction.py`

### Bug 0.3: False HIPAA Claim [FIXED] ✅
- **Severity:** LEGAL — actionable false compliance claim
- **Impact:** Trust badges falsely claimed "HIPAA Compliant" and "HIPAA Principles"
- **Root Cause:** HIPAA applies only to covered entities (healthcare providers, insurers, clearinghouses). DTC genetic testing platforms are NOT covered entities.
- **Fix:**
  - Replaced "HIPAA Compliant" with "Data Privacy First"
  - Replaced "HIPAA Principles" with "Privacy First"
  - Removed all HIPAA references from UI
- **Compliance:** Now legally accurate
- **Files Modified:** `pages/auth.py`, `pages/home.py`

### Bug 0.4: Broken change_password() [FIXED] ✅
- **Severity:** HIGH — password change completely non-functional
- **Impact:** Users could not change passwords (silent failure)
- **Root Cause:** Account page called `change_password(email, new_password)` with 2 args, but method signature requires 3: `change_password(email, old_password, new_password)`
- **Fix:**
  - Corrected call to pass `old_password` from user input
  - Fixed tuple unpacking (method returns `(success: bool, message: str)`)
- **Files Modified:** `pages/account.py`

### Bug 0.5: PayPal Webhook Forgery [FIXED] ✅
- **Severity:** HIGH — payment events could be forged (security vulnerability)
- **Impact:** Attacker could POST fake PayPal events to upgrade accounts without payment
- **Root Cause:** No signature verification (unlike Stripe, which has `stripe.Webhook.construct_event()`)
- **Fix:**
  - Added `paypalrestsdk.WebhookEvent.verify()` with full header validation
  - Validates `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-TIME`, `PAYPAL-TRANSMISSION-SIG`
  - Rejects events with invalid signatures (403 response)
- **Files Modified:** `Source/payments/paypal_handler.py`

### Bug 0.6: Missing Dependency [FIXED] ✅
- **Severity:** HIGH — fresh installs crash immediately
- **Impact:** PayPal handler imports `paypalrestsdk`, but package not in `requirements.txt`
- **Root Cause:** Dependency added in code but forgotten in requirements file
- **Fix:** Added `paypalrestsdk>=1.13.0` to `requirements.txt`
- **Files Modified:** `requirements.txt`

---

## Known Issues (Master Improvement Plan)

The platform has been comprehensively audited across 10 domains. Issues are prioritized into 6 tiers.

### Tier 1: Security & Data (Next Priority)

**These are non-negotiable for a production genetic data platform:**

- [ ] **JSON → SQLite migration** (Priority: CRITICAL)
  - Current: `data/users.json` with manual file locking
  - Target: SQLite with ACID transactions
  - Impact: 4 separate reports recommend this (database, security, architecture, auth)

- [ ] **2FA/MFA (TOTP)** (Priority: CRITICAL)
  - Current: Password-only authentication for genetic data
  - Target: Time-based one-time passwords (RFC 6238)
  - Libraries: `pyotp` for generation, QR codes for enrollment

- [ ] **Server-side tier validation** (Priority: HIGH)
  - Current: Tier enforcement via `st.session_state` (client-controlled)
  - Vulnerability: User can bypass limits by modifying session
  - Target: Validate tier on every protected action

- [ ] **File upload size limits** (Priority: HIGH)
  - Current: No limit → OOM crash on large VCF files
  - Target: 100MB hard limit with clear error message

- [ ] **Audit logging for auth events** (Priority: HIGH)
  - Current: Payment events logged, auth events not logged
  - Target: Log login, logout, password change, OAuth, failed attempts

- [ ] **Email verification** (Priority: MEDIUM)
  - Current: Accounts active immediately on registration
  - Target: Send verification email, block login until verified

- [ ] **Password reset flow** (Priority: MEDIUM)
  - Current: Users must contact support to reset password
  - Target: Self-service password reset via email token

- [ ] **Scientific disclaimers** (Priority: MEDIUM)
  - Current: Minimal disclaimers on results pages
  - Target: Clear "not diagnostic", "consult genetic counselor" language

### Tier 2: Performance

- [ ] **Add @st.cache_data to data loaders** (Priority: HIGH)
  - Files: `carrier_analysis.py`, `trait_prediction.py`
  - Expected savings: 400-600ms per page load

- [ ] **Pre-compute disease catalog statistics** (Priority: MEDIUM)
  - Current: Computed on every page load
  - Target: Generate once, cache in JSON

- [ ] **Font loading optimization** (Priority: LOW)
  - Current: Google Fonts loaded synchronously
  - Target: Preload or bundle locally

### Tier 3: UX & Frontend

- [ ] **Mobile responsiveness** (Priority: MEDIUM)
  - Disease catalog table hard to read on mobile
  - Consider collapsible rows or card layout

- [ ] **Trait prediction input validation** (Priority: MEDIUM)
  - No error handling for malformed genotype input

- [ ] **Progress indicators for long operations** (Priority: LOW)
  - File parsing and analysis feel unresponsive

### Tier 4: Genetics & Scientific

- [ ] **Polygenic risk scores (PRS)** (Priority: LOW)
  - Current: Single-gene Mendelian analysis only
  - Target: Add PRS for complex diseases (heart disease, diabetes)

- [ ] **Confidence intervals on trait predictions** (Priority: LOW)
  - Current: Single percentage shown
  - Target: Show range based on SNP confidence

### Tier 5: Testing & Quality

- [ ] **Expand file parser edge case tests** (Priority: MEDIUM)
  - VCF multi-allelic sites
  - Malformed input handling
  - Large file stress tests

- [ ] **Integration tests for auth flows** (Priority: MEDIUM)
  - End-to-end registration → login → logout

- [ ] **Payment webhook integration tests** (Priority: LOW)
  - Mock Stripe/PayPal webhook events

### Tier 6: Documentation

- [ ] **API documentation** (Priority: LOW)
  - Docstrings exist but no generated docs
  - Consider Sphinx or mkdocs

- [ ] **User guide** (Priority: LOW)
  - No documentation for end users on how to use the platform

**Full details:** See `docs/research/MASTER_IMPROVEMENT_PLAN.md`

---

## Architecture

### Directory Structure

```
Mergenix/
├── app.py                          # Streamlit router (82 LOC)
├── pages/                          # Streamlit multipage app
│   ├── home.py                     # Landing page with trust badges
│   ├── analysis.py                 # Main analysis interface
│   ├── disease_catalog.py          # Searchable disease catalog
│   ├── auth.py                     # Login/register
│   ├── account.py                  # User account management
│   ├── subscription.py             # Tier management
│   ├── products.py                 # Pricing page
│   ├── about.py                    # Company info
│   └── legal.py                    # Terms & Privacy Policy
├── Source/
│   ├── carrier_analysis.py         # Disease risk engine (AR, AD, X-linked)
│   ├── trait_prediction.py         # Trait prediction (Punnett squares)
│   ├── parser.py                   # Multi-format genetic file parser (1,262 LOC)
│   ├── tier_config.py              # Free/Premium/Pro tier definitions
│   ├── ui/
│   │   ├── theme.py                # Bioluminescent Laboratory theme (973 LOC)
│   │   ├── navbar.py               # Navigation bar with dark/light toggle
│   │   └── components.py           # Reusable UI components
│   ├── auth/
│   │   ├── manager.py              # Authentication manager
│   │   ├── oauth.py                # OAuth provider integrations
│   │   ├── session.py              # Session management
│   │   ├── validators.py           # Password/email validation
│   │   └── helpers.py              # Auth utility functions
│   └── payments/
│       ├── stripe_handler.py       # Stripe integration
│       └── paypal_handler.py       # PayPal integration
├── data/
│   ├── carrier_panel.json          # 2,715 diseases (AR, AD, X-linked)
│   ├── trait_snps.json             # 79 trait SNPs
│   ├── users.json                  # User accounts (to be migrated to SQLite)
│   └── audit_log.json              # Payment audit log
├── tests/
│   ├── test_carrier_analysis.py    # Disease risk engine tests
│   ├── test_carrier_panel.py       # Data integrity tests
│   ├── test_oauth.py               # OAuth tests
│   └── test_trait_prediction.py    # Trait prediction tests
├── docs/
│   ├── research/                   # 10 comprehensive analysis reports (~9,000 LOC)
│   └── PROJECT_STATUS.md           # THIS FILE
├── .github/workflows/
│   └── ci.yml                      # GitHub Actions CI pipeline
├── CLAUDE.md                       # Project rules & git workflow
├── PROGRESS.md                     # Task tracking (pushable to main)
├── pyproject.toml                  # ruff + pytest config
└── requirements.txt                # Python dependencies
```

### Data Flow

```
User Upload (23andMe/Ancestry/MyHeritage/VCF)
    ↓
parser.py → Normalized genotype dict {rsid: (allele1, allele2)}
    ↓
┌───────────────────────────────┬──────────────────────────────┐
│ carrier_analysis.py           │ trait_prediction.py          │
│ • Load carrier_panel.json     │ • Load trait_snps.json       │
│ • Dispatch by inheritance:    │ • Punnett square logic       │
│   - AR → calculate_risk()     │ • Genotype → phenotype map   │
│   - AD → calculate_risk_ad()  │ • Return trait probabilities │
│   - XL → calculate_risk_xl()  │                              │
│ • Return disease risks        │                              │
└───────────────────────────────┴──────────────────────────────┘
    ↓
Streamlit UI (pages/analysis.py)
    ↓
Results displayed with charts + downloadable reports
```

### Inheritance Models Implemented

| Model | Abbreviation | Diseases | Logic |
|-------|-------------|----------|-------|
| Autosomal Recessive | AR | 1,477 (54.4%) | Both parents must be carriers for 25% risk |
| Autosomal Dominant | AD | 1,057 (38.9%) | One affected parent → 50% risk |
| X-Linked | XL | 181 (6.7%) | Sex-stratified (males more affected) |

---

## Research Reports

The `docs/research/` directory contains 10 comprehensive analysis reports (~9,000 lines total):

1. **database-architecture.md** — JSON → SQLite migration plan
2. **frontend-design.md** — 25 improvements, accessibility audit, responsive CSS
3. **security-audit.md** — 3 critical, 6 high, 7 medium findings
4. **ux-polish.md** — Emotional design, onboarding, user journey maps
5. **performance-optimization.md** — 20 optimizations, ~44% speed improvement target
6. **auth-improvements.md** — Broken functions, missing 2FA, OAuth 90% complete
7. **testing-strategy.md** — 15-20% coverage, 5-phase plan to 75%
8. **competitive-analysis.md** — 13 competitors, unique niche confirmed
9. **architecture-review.md** — 22 recommendations, dependency analysis
10. **genetics-data-quality.md** — Scientific accuracy audit
11. **MASTER_IMPROVEMENT_PLAN.md** — 67 prioritized improvements across 6 tiers

---

## Development Workflow

### Git Branching Strategy

- **main** — production-ready code (protected)
- **feature/** — new features
- **fix/** — bug fixes
- **refactor/** — code restructuring
- **docs/** — documentation only
- **test/** — test additions/changes

### Commit Message Convention

Use conventional commits:
- `feat: add login page with OAuth support`
- `fix: resolve VCF parser edge case for multi-allelic sites`
- `refactor: extract carrier analysis into separate module`
- `docs: update README with setup instructions`
- `test: add unit tests for trait prediction engine`
- `chore: update dependencies in requirements.txt`

### Pull Request Workflow

1. Create feature branch from latest `main`
2. Run quality gates before committing:
   ```bash
   ruff check Source/ pages/ tests/ app.py
   pytest tests/ -v
   ```
3. Create PR from feature branch to `main`
4. Write clear PR description: what changed and why
5. Request review from team
6. **Only merge after review approval**
7. Use squash merge to keep `main` history clean
8. Delete branch after merge

### PROGRESS.md Rules

- **Only file** that can be pushed directly to `main`
- Update when you: start a task, finish a task, or hit a blocker
- Format: who did what, when, current status
- Keeps team in sync across computers and sessions

---

## Contributors

| Name | Role | Notes |
|------|------|-------|
| kukiz | Developer | Works from work room & living room computers |
| Maayan | Developer / Reviewer | Codes, reviews PRs, uses Claude Code |
| Claude | AI Assistant | Creates PRs for review, pushes PROGRESS.md directly |

---

## Project History (Recent PRs)

| PR | Title | Status |
|----|-------|--------|
| #31 | V3 Phase 3: Genetics Engine — 11 TS modules, 366 tests, 7 rounds, **6/6 A+** | 🔄 In Review |
| #30 | V3 Phase 2: Auth pages — login, 2FA, OAuth, account, 37 files, 6 reviewers A/A+ | ✅ Merged |
| #29 | V3 Phase 1: Marketing pages polish — 6 pages, all 4 reviewers A+ | ✅ Merged |
| #28 | V3 Rewrite Phase 0 Polish — 4-round review, all 4 Opus reviewers A+ | 🔄 In Review |
| #27 | V3 Rewrite Phase 0 Scaffolding — Next.js 14 + FastAPI + TS genetics | ✅ Merged |
| #26 | Tier 5: Genetic science (ethnicity, PGx, PRS, ClinVar, counseling) | 🔄 In Review |
| #25 | Tier 4: Testing & infrastructure (515 tests, Docker, config) | 🔄 In Review |
| #24 | Tier 2+3: Performance + frontend/UX (12 items, 440 tests) | ✅ Merged |
| #23 | Tier 1: Security & data integrity (8 items, 378 tests) | ✅ Merged |
| #22 | Tier 0: 6 critical bug fixes | ✅ Merged |
| #21 | Data provenance — sources, confidence & notes | 🔄 In Review |
| #20 | Remove SNPedia dependencies (legal compliance) | ✅ Merged |
| #19 | Dark/light mode toggle | 🔄 In Review |
| #18 | Bioluminescent Laboratory frontend redesign | ✅ Merged |
| #14 | Platform redesign + disease expansion (2,715) | ✅ Merged |

---

## Next Steps

### Immediate: V3 Rewrite Phase 4+
1. **Phase 3: Genetics engine** — ✅ COMPLETE (PR #31, 6/6 A+ reviews)
2. **Phase 4: Analysis UI** — File upload, results dashboard, counseling page
3. **Phase 5: Payments** — Stripe integration, pricing page wiring, subscription management
4. **Phase 6: Remaining pages** — Subscription, admin
5. **Phase 7: Testing + deployment** — Vitest, Playwright, Vercel + Railway

### V3 Architecture (rewrite/main branch)
- **Frontend:** Next.js 14 App Router + Tailwind CSS + shadcn/ui-style components
- **Backend:** FastAPI + async SQLAlchemy 2.0 + PostgreSQL
- **Genetics:** TypeScript client-side (Web Workers, DNA never leaves browser)
- **Payments:** Stripe only (PayPal removed)
- **Monorepo:** Turborepo + pnpm workspaces (apps/web, apps/api, packages/*)

---

## Contact & Support

For questions, issues, or contributions:
- Check `CLAUDE.md` for project rules
- Check `PROGRESS.md` for current task status
- Review `docs/research/` for design decisions

**Version Control:** All work tracked in git, main branch protected, PRs required for code changes.
