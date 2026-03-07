# Mergenix Master Improvement Plan

**Date:** 2026-02-08
**Based on:** 10 parallel research reports (~8,845 lines of analysis)
**Researchers:** database, frontend, security, UX, performance, auth, testing, competitive, architecture, genetics

---

## Executive Summary

Mergenix occupies a **unique, uncontested niche** — the only platform where two parents can upload raw DNA data and receive offspring disease risk predictions for 2,715 conditions. No competitor offers this. The 23andMe bankruptcy (2025) creates a massive market opportunity.

However, the platform has **critical scientific accuracy bugs, security vulnerabilities, and missing infrastructure** that must be fixed before any public launch. This plan prioritizes 67 improvements across 6 tiers, from "fix today" to "future vision."

---

## TIER 0: CRITICAL BUGS — Fix Immediately (1-3 days)

These are show-stoppers that produce wrong results, crash the app, or create legal liability.

### 0.1 WRONG INHERITANCE MODEL — 45.6% of diseases give incorrect results

- **Source:** Genetics report §2
- **Issue:** `carrier_analysis.py` applies autosomal recessive (AR) logic to ALL 2,715 diseases, but 1,057 are autosomal dominant (AD) and 181 are X-linked
- **Impact:** For AD conditions, a carrier parent's offspring has 50% chance of being AFFECTED, but we report it as "carrier_detected" (massive understatement). For X-linked, results are completely wrong without sex-aware calculation.
- **Fix:** Implement 3 separate risk functions dispatched by `inheritance` field. Add sex-stratified results for X-linked.
- **Files:** `Source/carrier_analysis.py`

### 0.2 TRAIT PREDICTION RUNTIME CRASH

- **Source:** Genetics report §1
- **Issue:** `trait_prediction.py:map_genotype_to_phenotype()` returns a dict, which is then used as a dict key → `TypeError: unhashable type: 'dict'` on EVERY trait prediction
- **Impact:** Trait prediction is completely broken. Zero test coverage means this was never caught.
- **Fix:** Extract `value['phenotype']` string from the nested dict before using as key
- **Files:** `Source/trait_prediction.py`

### 0.3 FALSE "HIPAA COMPLIANT" CLAIM — Legal liability

- **Source:** Security report §CRITICAL-3, Auth report §P0-2
- **Issue:** `pages/auth.py:265` and `pages/home.py` state "HIPAA Compliant" but HIPAA does not apply to DTC genetic testing, and zero HIPAA requirements are met
- **Impact:** Legal liability — making false compliance claims is actionable
- **Fix:** Replace with "Your data is encrypted and never stored permanently" or similar truthful statement
- **Files:** `pages/auth.py`, `pages/home.py`

### 0.4 BROKEN change_password() FUNCTION

- **Source:** Auth report §P0-1
- **Issue:** `pages/account.py` calls `change_password()` with 2 args but the method requires 3 (`email`, `old_password`, `new_password`)
- **Impact:** Password change is completely non-functional
- **Files:** `pages/account.py`, `Source/auth/manager.py`

### 0.5 PAYPAL WEBHOOK — No signature verification

- **Source:** Security report §HIGH-6
- **Issue:** Stripe webhook correctly verifies signatures, but PayPal webhook processes events without authentication — anyone can forge payment events
- **Fix:** Add PayPal webhook signature verification
- **Files:** `Source/payments/paypal_handler.py`

### 0.6 MISSING DEPENDENCY — paypalrestsdk

- **Source:** Architecture report §CRITICAL-1
- **Issue:** `paypal_handler.py` imports `paypalrestsdk` but it's not in `requirements.txt` — fresh installs crash
- **Fix:** Add to requirements.txt (or replace with PayPal REST SDK v2)
- **Files:** `requirements.txt`

---

## TIER 1: SECURITY & DATA INTEGRITY — Before Public Launch (1-2 weeks)

### 1.1 Migrate user data from JSON to SQLite

- **Source:** Database §P0-1, Security §CRITICAL-1/2, Auth §P1-6, Architecture §CRITICAL-5
- **Issue:** `data/users.json` has no concurrency safety, no encryption, no ACID transactions. Concurrent writes corrupt data.
- **Consensus:** ALL 4 reports independently recommend SQLite migration
- **Effort:** 3-5 days

### 1.2 Add 2FA/MFA (TOTP)

- **Source:** Auth §P0-3, Security §HIGH, Competitive analysis
- **Issue:** ALL major competitors (23andMe, Ancestry, MyHeritage) mandate 2FA post-breach. Non-negotiable for genetic data.
- **Approach:** TOTP via `pyotp` library, QR code setup flow
- **Effort:** 3-5 days

### 1.3 Server-side tier validation

- **Source:** Security §HIGH-5
- **Issue:** User tier read from `st.session_state` without server-side re-verification — Pro features accessible without paying
- **Fix:** Validate tier from database on every page load
- **Effort:** 1 day

### 1.4 File upload size limits and streaming VCF parser

- **Source:** Security §HIGH-9, Performance §CRITICAL-3
- **Issue:** Parser reads entire file into memory with no size limit. VCF files can be gigabytes → crash.
- **Fix:** Add file size limit (50MB), stream VCF line-by-line instead of loading entire file
- **Effort:** 2-3 days

### 1.5 Audit logging for auth events

- **Source:** Security §HIGH-7, Architecture §CRITICAL-3
- **Issue:** Zero logging for logins, failures, lockouts, password changes, OAuth flows
- **Fix:** Structured logging to SQLite audit table
- **Effort:** 2 days

### 1.6 Email verification and password reset

- **Source:** Auth §P0-4/5
- **Issue:** `email_verified` always False with no mechanism. "Forgot password?" is a dead link.
- **Effort:** 3-5 days

### 1.7 Rate limiting and account enumeration prevention

- **Source:** Auth §P1-8, Security §HIGH
- **Issue:** Registration reveals existing emails; login has timing side-channel
- **Fix:** Constant-time responses, IP-based throttling
- **Effort:** 1-2 days

### 1.8 Scientific disclaimers

- **Source:** Genetics §14, Competitive §regulatory
- **Issue:** No disclaimers about DTC genetic testing limitations, FDA non-clearance, genetic counseling recommendation
- **Fix:** Add comprehensive disclaimer page/modal, similar to 23andMe/Promethease
- **Effort:** 1 day

---

## TIER 2: PERFORMANCE & CACHING — Quick Wins (3-5 days)

### 2.1 Add @st.cache_data to all data loaders (QUICK WIN)

- **Source:** Performance §CRITICAL-1/2, Database §P0-2
- **Issue:** `carrier_panel.json` (3.06 MB) loaded 3-4 times per page render, uncached
- **Fix:** Add `@st.cache_data` to `load_carrier_panel()`, `load_trait_database()`, `_count_panel()`, `_count_traits()`, `load_traits_corrected()`
- **Impact:** ~400-600ms savings per page load
- **Effort:** 1-2 hours

### 2.2 Pre-compute disease catalog statistics

- **Source:** Performance §MEDIUM-5/6
- **Issue:** `unique_genes`, `high_sev_count`, inheritance counts recomputed on every Streamlit rerun
- **Fix:** Compute once and cache
- **Effort:** 1 hour

### 2.3 Load scientific data into indexed SQLite

- **Source:** Database §P1-3/4
- **Issue:** Disease catalog filtering is O(n) Python list comprehension over 2,715 records
- **Fix:** SQLite with indexes on category, gene, severity + FTS5 full-text search
- **Impact:** 10-20x faster catalog filtering
- **Effort:** 2-3 days

### 2.4 Font loading optimization

- **Source:** Performance §HIGH-4
- **Issue:** Google Fonts via render-blocking `@import`, loading 14 weight files when only 8 used
- **Fix:** Use `<link rel="preload">`, remove unused weights
- **Impact:** 100-500ms FOUT reduction
- **Effort:** 1 hour

### 2.5 Remove unused CSS animations

- **Source:** Performance §MEDIUM-7
- **Issue:** 3 keyframe animations (`breathe`, `dnaStrandSpin`, `pulseGlow`) never referenced
- **Effort:** 15 minutes

---

## TIER 3: FRONTEND & UX — User Experience (2-4 weeks)

### 3.1 Accessibility (WCAG 2.1 AA)

- **Source:** Frontend §Critical-1/3/4
- **Issues:**
  - `--text-dim` fails contrast ratio (3.6:1 dark, 2.5:1 light vs required 4.5:1)
  - No `focus-visible` styles for keyboard navigation
  - No `prefers-reduced-motion` support (16 animations ignore preference)
  - Missing ARIA attributes on decorative elements
- **Effort:** 1-2 days

### 3.2 Responsive/mobile CSS

- **Source:** Frontend §Critical-2, UX §10
- **Issue:** Zero media queries. App breaks on mobile — navbar wraps, 4-column metrics compress, hero overflows
- **Fix:** Add breakpoints at 1024px, 768px, 480px
- **Effort:** 3-5 days

### 3.3 Emotional design for high-risk results

- **Source:** UX §P0, Genetics §14
- **Issue:** Genetic results can be anxiety-inducing. No compassionate framing for high-risk findings.
- **Fix:** Calming animations on results pages, context ("1 in 4 chance" vs "25%"), genetic counseling referral links, "what this means" plain-language explanations
- **Effort:** 2-3 days

### 3.4 User onboarding and sample data demo

- **Source:** UX §P0, Competitive
- **Issue:** No guided experience for first-time users. "See How It Works" button does nothing (L88: `pass`)
- **Fix:** Interactive demo with pre-loaded sample data, guided tour, progressive disclosure
- **Effort:** 3-5 days

### 3.5 Genetic glossary and tooltips

- **Source:** UX §P1
- **Issue:** Non-scientists don't understand "autosomal recessive", "carrier frequency", "penetrance"
- **Fix:** Hoverable tooltips, glossary page, inline explanations
- **Effort:** 2 days

### 3.6 Interactive data visualizations

- **Source:** Frontend §Top5-4/5
- **Improvements:**
  - Interactive Punnett square visualization
  - Combined probability spectrum bar (replace 3 separate bars)
  - Confidence signal-strength indicators
  - Skeleton loading animations
- **Effort:** 5-7 days

### 3.7 Multi-step analysis progress indicator

- **Source:** UX §P2, Frontend §Top5-3
- **Issue:** Analysis of 2,715 diseases shows a basic progress bar. Should show stages: Parsing → Carrier Analysis → Trait Prediction → Generating Report
- **Effort:** 1-2 days

### 3.8 Light mode as default for new users

- **Source:** Frontend §Strategic
- **Rationale:** Dark bioluminescent theme is visually distinctive but reduces clinical credibility. Light mode default + easy toggle.
- **Effort:** 30 minutes

---

## TIER 4: TESTING & INFRASTRUCTURE (2-3 weeks)

### 4.1 Parser test suite (~55 tests)

- **Source:** Testing §P1-1
- **Issue:** 1,262 LOC, 0% tested. Every analysis depends on correct parsing.
- **Coverage:** All 4 formats, format detection, validation, edge cases (malformed files, multi-allelic sites, empty files)
- **Effort:** 3-5 days

### 4.2 Trait prediction tests (~20 tests)

- **Source:** Testing §P1-2
- **Issue:** 324 LOC, 0% tested. Runtime crash went undetected.
- **Effort:** 1-2 days

### 4.3 Auth manager tests (~25 tests)

- **Source:** Testing §P1-4
- **Issue:** Security-critical code with 0% test coverage
- **Effort:** 2-3 days

### 4.4 Tier config and payment tests (~25 + ~12 tests)

- **Source:** Testing §P1-3/5
- **Issue:** Access control and payment logic untested
- **Effort:** 2-3 days

### 4.5 CI improvements

- **Source:** Testing §CI, Architecture §CRITICAL
- **Fixes:**
  - Add `pytest-cov` with coverage threshold (70%+)
  - Make ruff check blocking (remove `continue-on-error: true`)
  - Add coverage badge to README
- **Effort:** 1 day

### 4.6 Dockerfile and deployment infrastructure

- **Source:** Architecture §CRITICAL-4
- **Issue:** No Dockerfile, no docker-compose, no cloud config. Cannot deploy.
- **Fix:** Multi-stage Dockerfile, docker-compose for dev, deployment docs
- **Effort:** 1-2 days

### 4.7 Fix requirements.txt

- **Source:** Architecture §CRITICAL-1/2
- **Issues:**
  - Missing `paypalrestsdk`
  - Dead `streamlit-authenticator` dependency
  - No pinned versions (all `>=` with no upper bounds)
- **Effort:** 1 hour

### 4.8 Unified configuration system

- **Source:** Architecture §Tier2-7
- **Issue:** Settings scattered across .env, .streamlit/config.toml, tier_config.py, hardcoded constants. Stripe price IDs in 2 files that can drift.
- **Fix:** Pydantic-based settings class
- **Effort:** 2 days

---

## TIER 5: GENETIC SCIENCE IMPROVEMENTS (3-6 weeks)

### 5.1 Implement autosomal dominant risk calculation

- **Source:** Genetics §2
- **Impact:** Correct results for 1,057 diseases (38.9% of panel)
- **Effort:** 2-3 days

### 5.2 Implement X-linked risk calculation (sex-stratified)

- **Source:** Genetics §2
- **Impact:** Correct results for 181 diseases (6.7% of panel), sex-aware output
- **Effort:** 2-3 days

### 5.3 Add ethnicity-adjusted carrier frequencies

- **Source:** Genetics §11, Competitive §Gap-3
- **Issue:** Carrier frequencies vary dramatically by population (e.g., CF: 1/25 European vs 1/61 Hispanic)
- **Impact:** Major accuracy improvement, differentiator vs competitors
- **Effort:** 2-3 weeks

### 5.4 Add pharmacogenomics depth (CPIC/DPWG)

- **Source:** Genetics §6, Competitive §Trends
- **Issue:** Current PGx coverage is basic. Major drug-gene interactions (warfarin, clopidogrel, codeine, statins) are industry standard.
- **Effort:** 1-2 weeks

### 5.5 Polygenic risk scores for complex diseases

- **Source:** Genetics §5, Competitive §Trends
- **Issue:** Complex diseases (diabetes, heart disease, cancer) involve multiple SNPs. Punnett squares don't apply.
- **Approach:** PRS calculations using published GWAS effect sizes
- **Effort:** 3-4 weeks

### 5.6 ClinVar data freshness pipeline

- **Source:** Genetics §8
- **Issue:** Panel data can become stale. ClinVar releases monthly updates.
- **Fix:** Automated pipeline to check and merge ClinVar updates
- **Effort:** 1 week

### 5.7 Genetic counseling referral integration

- **Source:** Competitive §Recommendation-1, UX §emotional
- **Issue:** High-risk results with no professional support path. Industry standard is to offer genetic counseling.
- **Fix:** Partner with genetic counseling services, add referral links on high-risk results
- **Effort:** 1 week (technical), ongoing (partnerships)

---

## TIER 6: FUTURE VISION (3-6 months)

### 6.1 FastAPI backend extraction

- **Source:** Architecture §12
- **Rationale:** Streamlit limits: no deep linking, no webhooks, no background processing, session-per-tab
- **Approach:** Extract analysis engines into FastAPI REST API, keep Streamlit as frontend initially
- **Effort:** 3-4 weeks

### 6.2 Additional file format support

- **Source:** Competitive §Gap-5
- **Issue:** We support 4 formats. Xcode Life supports 50+. Each format = missed audience.
- **Priority additions:** FTDNA v2, Nebula Genomics, Dante Labs, Living DNA
- **Effort:** 1-2 days per format

### 6.3 AI-powered health insights

- **Source:** Competitive §Gap-4, Market trends
- **Issue:** SelfDecode and Nucleus have AI health coaches. Market expects this.
- **Approach:** LLM-powered explanations of genetic results, personalized health recommendations
- **Effort:** 2-4 weeks

### 6.4 Shareable/exportable PDF reports

- **Source:** UX §P3
- **Issue:** No way to save, share, or print results. Clinical platforms all offer downloadable reports.
- **Effort:** 1-2 weeks

### 6.5 Internationalization (i18n)

- **Source:** Architecture §8
- **Estimate:** ~3,000 strings to externalize, 3-5 weeks for infrastructure + first language
- **Priority languages:** Spanish, Portuguese, Chinese (largest DTC genetics markets after English)

### 6.6 React frontend migration

- **Source:** Architecture §12
- **When:** Only if Streamlit becomes the bottleneck for growth
- **Approach:** Gradual — FastAPI backend first, then React frontend
- **Effort:** 2-3 months

---

## Implementation Roadmap Summary

| Phase       | Duration   | Focus           | Key Deliverables                                                                              |
| ----------- | ---------- | --------------- | --------------------------------------------------------------------------------------------- |
| **Phase 0** | Days 1-3   | Critical bugs   | Fix inheritance model, trait crash, HIPAA claim, change_password, PayPal webhook, missing dep |
| **Phase 1** | Days 4-14  | Security + data | SQLite migration, 2FA, tier validation, file limits, audit logging, email verification        |
| **Phase 2** | Days 4-7   | Performance     | Caching decorators, pre-computed stats, font optimization (can parallel with Phase 1)         |
| **Phase 3** | Weeks 3-6  | Frontend + UX   | Accessibility, responsive, emotional design, onboarding, glossary, visualizations             |
| **Phase 4** | Weeks 3-5  | Testing + infra | Parser tests, trait tests, auth tests, CI improvements, Dockerfile, config unification        |
| **Phase 5** | Weeks 5-10 | Genetic science | AD/X-linked models, ethnicity-aware frequencies, PGx, PRS, ClinVar pipeline                   |
| **Phase 6** | Months 3-6 | Future vision   | FastAPI, more formats, AI insights, PDF reports, i18n                                         |

---

## Cross-Cutting Themes (Consensus Across Multiple Reports)

| Theme                                                    | Reports Agreeing                              | Priority  |
| -------------------------------------------------------- | --------------------------------------------- | --------- |
| JSON → SQLite migration                                  | Database, Security, Auth, Architecture (4/10) | P0        |
| Inheritance model is wrong for 45.6% of diseases         | Genetics                                      | P0        |
| Trait prediction crashes at runtime                      | Genetics                                      | P0        |
| False HIPAA claim — legal liability                      | Security, Auth (2/10)                         | P0        |
| No 2FA despite handling genetic data                     | Security, Auth, Competitive (3/10)            | P0        |
| Parser has 0% test coverage (1,262 LOC)                  | Testing, Genetics (2/10)                      | P1        |
| No responsive/mobile CSS                                 | Frontend, UX (2/10)                           | P1        |
| No audit logging                                         | Security, Architecture (2/10)                 | P1        |
| Accessibility failures (contrast, keyboard)              | Frontend (1/10)                               | P1        |
| Performance: uncached JSON loading                       | Database, Performance (2/10)                  | P1        |
| No Dockerfile/deployment infrastructure                  | Architecture (1/10)                           | P1        |
| Genetic counseling referral needed                       | Competitive, UX, Genetics (3/10)              | P1        |
| Offspring prediction is our unique competitive advantage | Competitive                                   | Strategic |

---

## Competitive Position Summary

### Our Top 5 Advantages

1. **2,715 disease conditions** — 60x more than 23andMe (45+)
2. **Couple comparison & offspring prediction** — no competitor offers this self-service
3. **Raw data upload** — 40M+ genotyped consumers can use existing data
4. **One-time pricing** — in a market suffering subscription fatigue
5. **Scientific rigor** — OMIM, ClinVar, dbSNP, PubMed citations with confidence levels

### Our Top 5 Gaps to Close

1. **Scientific accuracy** — inheritance model is wrong for 45.6% of diseases (CRITICAL)
2. **Security posture** — no 2FA, no audit logging, JSON user storage
3. **Professional trust signals** — no genetic counseling, false HIPAA claim, no disclaimers
4. **Mobile experience** — zero responsive CSS
5. **Test coverage** — 15-20% estimated, critical modules untested

---

## Report Index

All detailed reports are in `.omc/research/`:

| Report                        | Lines     | Key Finding                                          |
| ----------------------------- | --------- | ---------------------------------------------------- |
| `database-architecture.md`    | 824       | SQLite migration, caching, indexed queries           |
| `frontend-design.md`          | 1,076     | 25 improvements, accessibility audit, responsive CSS |
| `security-audit.md`           | 733       | 3 critical, 6 high, 7 medium findings                |
| `ux-polish.md`                | 1,025     | Emotional design, onboarding, user journey maps      |
| `performance-optimization.md` | 1,072     | 20 optimizations, ~44% speed improvement target      |
| `auth-improvements.md`        | 920       | Broken functions, missing 2FA, OAuth 90% complete    |
| `testing-strategy.md`         | 880       | 15-20% coverage, 5-phase plan to 75%                 |
| `competitive-analysis.md`     | 646       | 13 competitors, unique niche confirmed               |
| `architecture-review.md`      | 908       | 22 recommendations, dependency analysis              |
| `genetics-data-quality.md`    | 761       | Wrong inheritance model, trait crash, accuracy gaps  |
| **TOTAL**                     | **8,845** | **67 prioritized improvements**                      |
