# Mergenix — Project Status

**Last Updated:** 2026-02-08
**Version:** 2.0.0
**Branch:** fix/tier0-critical-bugs

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

### Current Status
- **Total Tests:** 135 passing
- **Test Suites:**
  - `test_carrier_analysis.py` — Core disease risk engine (AR, AD, X-linked)
  - `test_carrier_panel.py` — Data integrity validation
  - `test_oauth.py` — OAuth authentication flows
  - `test_trait_prediction.py` — Trait prediction logic
- **Linting:** ruff (all checks passing)
- **CI Pipeline:** GitHub Actions
  - Python 3.10 and 3.12 matrix
  - Automated pytest + ruff on every PR

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

## Recent Changes — PR #22: Tier 0 Critical Bug Fixes

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
| #22 | fix: tier 0 critical bugs — inheritance, traits, HIPAA, auth, webhooks | ✅ CURRENT BRANCH |
| #21 | feat: add data provenance — sources, confidence & notes | ✅ Merged |
| #20 | fix: remove all SNPedia dependencies (legal compliance) | ✅ Merged |
| #19 | feat: add dark/light mode toggle with Daylight Laboratory theme | ✅ Merged |
| #14 | feat: rebrand Tortit → Mergenix, expand disease panel to 2,715 | ✅ Merged |

---

## Next Steps (After PR #22 Merge)

1. **Begin Tier 1 work** — JSON → SQLite migration
2. **Implement 2FA/MFA** — TOTP with pyotp
3. **Add server-side tier validation** — protect against session bypass
4. **Expand test coverage** — integration tests for auth flows
5. **Performance optimization** — add @st.cache_data to data loaders

---

## Contact & Support

For questions, issues, or contributions:
- Check `CLAUDE.md` for project rules
- Check `PROGRESS.md` for current task status
- Review `docs/research/` for design decisions

**Version Control:** All work tracked in git, main branch protected, PRs required for code changes.
