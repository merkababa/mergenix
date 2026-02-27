# Review Fix Manifest — Full Website Re-Review (2026-02-22)

## Summary
- **10 Claude reviewers**, 171 raw issues → **~85 unique issues** after deduplication
- **Target:** All 10 reviewers at A+
- **Strategy:** Batch fixes by file ownership, delegate to executor agents, re-review

---

## PRIORITY 1: CRITICAL (Must fix — blocks launch)

### C1. KEYS!.txt — Live production credentials exposed
- **Flagged by:** Security
- **File:** `KEYS!.txt` (repo root)
- **Fix:** Delete file, add to `.gitignore`, user must rotate all credentials
- **Owner:** Conductor (git command)

### C2. ZKE encryption claimed but unimplemented
- **Flagged by:** Security, Legal, QA
- **Files:**
  - `apps/web/app/(marketing)/privacy/_components/privacy-content.tsx` (lines 331-338)
  - `apps/web/app/(marketing)/security/_components/security-content.tsx` (lines 206-212)
  - `apps/web/lib/constants/legal-placeholders.ts` (line 34)
- **Fix:** Update ALL marketing/legal copy to say encryption is "planned for future release" — not active. Add "(Coming Soon)" labels.
- **Owner:** Executor A (marketing/legal pages)

### C3. PGx probabilities displayed as 2500%
- **Flagged by:** Scientist
- **File:** `apps/web/components/genetics/results/pgx-tab.tsx` (line 296)
- **Fix:** Change `(pred.probability * 100).toFixed(0)` → `pred.probability.toFixed(0)` (engine returns 0-100 scale)
- **Owner:** Executor B (genetics components)

### C4. CYP2D6*2 star allele misclassification
- **Flagged by:** Scientist
- **File:** `packages/genetics-data/pgx-panel.json` (lines 22-24)
- **Fix:** Change defining genotype from `"AG"` to `"AA"` per PharmVar/CPIC
- **Owner:** Executor C (genetics data)

### C5. Free tier false advertising — claims "Top 25 disease screening" + "10 basic traits"
- **Flagged by:** Business
- **File:** `apps/web/lib/pricing-data.ts` (lines 42-49)
- **Fix:** Change to match reality: "All 79 trait predictions" (traits: 'all'), remove disease claim (diseases: 0)
- **Owner:** Executor A (marketing/legal pages)

### C6. Broken /pricing link on sample report
- **Flagged by:** Business
- **File:** `apps/web/app/(marketing)/sample-report/_components/sample-report-content.tsx` (line 416)
- **Fix:** Change `href="/pricing"` → `href="/products"`
- **Owner:** Executor A (marketing/legal pages)

---

## PRIORITY 2: HIGH (Should fix before launch)

### H1. Strand reference SNP errors (4 errors)
- **Flagged by:** Scientist
- **File:** `packages/genetics-engine/src/strand.ts`
  - Line 131: rs12913832 ref allele A → G
  - Line 108: rs7903146 chromosome 9 → 10; remove fabricated rs7903146_10 (line 111), add real chr9 SNP
  - Line 83: rs1800629 chromosome 3 → 6, add real chr3 SNP
  - Line 136: Remove palindromic rs9939609 (A/T), replace with non-palindromic chr16 SNP
- **Owner:** Executor C (genetics data/engine)

### H2. rs1805008 description mislabel (R151C → R160W)
- **Flagged by:** Scientist
- **File:** `packages/genetics-data/trait-snps.json` (line 197)
- **Fix:** Change "R151C mutation" → "R160W mutation"
- **Owner:** Executor C (genetics data)

### H3. "Subscription" terminology in one-time pricing model
- **Flagged by:** Business
- **Files:**
  - `apps/web/app/(app)/subscription/page.tsx` (lines 116, 168) — rename page title/heading to "My Plan"
  - `apps/web/components/layout/navbar.tsx` (line 287) — change "Subscription" link label
- **Owner:** Executor D (app pages + layout)

### H4. Backend tiers.py "monthly" key for one-time pricing
- **Flagged by:** Business
- **File:** `apps/api/app/constants/tiers.py` (lines 42-43)
- **Fix:** Rename `"monthly"` key → `"amount"` or `"one_time"`; update payment_service.py references
- **Owner:** Executor E (backend)

### H5. Overview tab misleading Premium upsell (claims missing traits)
- **Flagged by:** Business
- **File:** `apps/web/components/genetics/results/overview-tab.tsx` (line 134)
- **Fix:** Change message to focus on what Pro actually adds (all diseases, couple analysis, offspring, PDF export)
- **Owner:** Executor B (genetics components)

### H6. Comparison table contradicts pricing cards for free tier
- **Flagged by:** Business
- **File:** `apps/web/app/(marketing)/products/_components/products-content.tsx` (line 31) — already correct
- **Fix:** Align pricing-data.ts (C5 fix handles this)
- **Owner:** Covered by C5

### H7. Nested `<Link><Button>` invalid HTML
- **Flagged by:** Designer
- **File:** `apps/web/app/(auth)/register/_components/register-content.tsx` (lines 538-542)
- **Fix:** Replace `<Link><Button>` with `<Link className={buttonVariants(...)}>` pattern
- **Owner:** Executor F (auth components)

### H8. Incomplete role="menu" keyboard navigation
- **Flagged by:** Designer
- **File:** `apps/web/components/auth/user-menu.tsx` (lines 102-150)
- **Fix:** Change `role="menu"` → remove role (or `role="list"`), `role="menuitem"` → remove (simplest fix per reviewer)
- **Owner:** Executor F (auth components)

### H9. No server-side audit trail for genetic consent (GDPR Art 7)
- **Flagged by:** Legal
- **Files:**
  - `apps/web/app/(app)/analysis/page.tsx` (lines 196-199)
  - `apps/web/lib/stores/legal-store.ts` (lines 182-184)
- **Fix:** Add `recordConsent("genetic_data_processing", "1.0")` API call when consent is granted
- **Owner:** Executor D (app pages)

### H10. Privacy notice missing effective date
- **Flagged by:** Legal
- **File:** `apps/web/app/(marketing)/privacy/_components/privacy-content.tsx`
- **Fix:** Add "Effective date: February 2026" / "Last updated: February 2026" header
- **Owner:** Executor A (marketing/legal pages)

### H11. DPO and EU Representative not designated (pre-launch note)
- **Flagged by:** Legal
- **Fix:** Update privacy page to say "Will be appointed before public launch" (already partially there). Add timeline. This is a business action, not a code fix — mark as acknowledged.
- **Owner:** Executor A (marketing/legal pages) — strengthen language

### H12. Newsletter form collects email with no backend/consent
- **Flagged by:** Legal, Business
- **File:** `apps/web/components/layout/footer.tsx` (line 89)
- **Fix:** Remove newsletter form until backend integration ready, OR add consent checkbox + disclaimer
- **Owner:** Executor D (layout)

### H13. Consent withdrawal not recorded server-side
- **Flagged by:** Legal
- **File:** `apps/web/components/account/consent-management.tsx` (lines 107-109)
- **Fix:** Add API call to record withdrawal event with timestamp
- **Owner:** Executor D (app pages)

### H14. Population-adjusted analysis gated behind paywall (equity issue)
- **Flagged by:** Ethics
- **File:** `apps/web/components/genetics/population-selector.tsx` (lines 29-44)
- **Fix:** Enable population selector for all tiers (remove tier gate)
- **Owner:** Executor B (genetics components)

### H15. "Ethnicity-adjusted frequencies" listed as Pro feature
- **Flagged by:** Ethics
- **File:** `apps/web/lib/pricing-data.ts` (line 98)
- **Fix:** Move to Free tier features (or remove from tier differentiation)
- **Owner:** Executor A (marketing/legal pages)

### H16. Deterministic marketing language ("Know Your Genetic Future")
- **Flagged by:** Ethics
- **Files:**
  - `apps/web/app/_components/home-content.tsx` (line 153) — "Know Your Genetic Future" → "Explore Your Genetic Possibilities"
  - `apps/web/app/_components/home-content.tsx` (line 111) — "Actionable Results" → "Clear, Understandable Results"
  - `apps/web/app/_components/home-content.tsx` (line 328) — "genetic future" → "genetic health"
- **Owner:** Executor A (marketing/legal pages)

### H17. Referral letter upsold during high-urgency counseling
- **Flagged by:** Ethics
- **File:** `apps/web/components/genetics/results/counseling-tab.tsx` (lines 293-319)
- **Fix:** Unlock referral letters when urgency is "high" regardless of tier
- **Owner:** Executor B (genetics components)

### H18. Untested concurrent 401 refresh deduplication
- **Flagged by:** QA
- **File:** `apps/web/__tests__/api/client.test.ts` + `apps/web/lib/api/client.ts` (lines 220-245)
- **Fix:** Add test for concurrent 401 → single refresh → all retries succeed
- **Owner:** Executor G (tests)

### H19. patch() method has zero test coverage
- **Flagged by:** QA
- **File:** `apps/web/__tests__/api/client.test.ts`
- **Fix:** Add test analogous to put test
- **Owner:** Executor G (tests)

### H20. No test coverage for file-dropzone, user-menu, navbar
- **Flagged by:** QA
- **Files:** New test files needed
- **Fix:** Add integration tests for these 3 high-traffic components
- **Owner:** Executor G (tests)

### H21. OAuth state parameter not validated client-side
- **Flagged by:** Security
- **File:** `apps/web/app/(auth)/callback/_components/callback-content.tsx` (lines 20-21)
- **Fix:** Store state in sessionStorage before redirect, verify on callback
- **Owner:** Executor F (auth components)

### H22. IndexedDB no runtime guard against plaintext storage
- **Flagged by:** Security, Legal
- **File:** `apps/web/lib/storage/indexed-db-store.ts` (lines 62-73)
- **Fix:** Add runtime validation that encryptedEnvelope has expected JSON structure before storing
- **Owner:** Executor D (app pages/storage)

---

## PRIORITY 3: MEDIUM

### M1. Missing "use client" on analysis-store.ts and announcer-store.ts
- **Files:** `apps/web/lib/stores/analysis-store.ts`, `apps/web/lib/stores/announcer-store.ts`
- **Fix:** Add `"use client";` as first line
- **Owner:** Executor D

### M2. Cross-store dependencies (auth→legal→analysis)
- **Files:** `auth-store.ts`, `legal-store.ts`
- **Fix:** Move syncAgeVerification call to AuthProvider; move analysis reset to component that triggers withdrawal
- **Owner:** Executor D

### M3. Unsafe `as Tier` type assertions (3 locations)
- **Files:** `analysis-client.ts:98,112`, `payment-client.ts:88`, `use-genetics-worker.ts:65`
- **Fix:** Create `parseTier()` utility with runtime validation
- **Owner:** Executor D

### M4. `Record<string, unknown>` weak typing in analysis-client
- **File:** `apps/web/lib/api/analysis-client.ts` (lines 65,75,76,133,134)
- **Fix:** Type as `FullAnalysisResult` or `Partial<FullAnalysisResult>`
- **Owner:** Executor D

### M5. Hook organization: modal-manager in hooks/, pdf hook in lib/
- **Fix:** Move `use-modal-manager.ts` → `lib/stores/modal-manager-store.ts`; move `use-pdf-export.ts` → `hooks/`
- **Owner:** Executor D

### M6. Badge variant "outline" used but not defined
- **File:** `apps/web/components/genetics/results/carrier-tab.tsx` (line 187)
- **Fix:** Add `outline` variant to Badge component, or change usage to `"default"`
- **Owner:** Executor B

### M7. MotionProvider inconsistently applied
- **File:** `apps/web/app/layout.tsx`
- **Fix:** Wrap entire children tree in MotionProvider; remove redundant wrapping in MarketingLayout and HomePage
- **Owner:** Executor D

### M8. `executeRequest` returns `undefined as T` for 204
- **File:** `apps/web/lib/api/client.ts` (lines 201-203)
- **Fix:** Create separate `executeVoidRequest` or type 204-returning methods with `void`
- **Owner:** Executor D

### M9. Unused dependencies: @tanstack/react-query + recharts
- **File:** `apps/web/package.json`
- **Fix:** Remove both from dependencies
- **Owner:** Executor D

### M10. Zustand destructuring without selectors (SubscriptionPage + UpgradeModal)
- **Files:** `apps/web/app/(app)/subscription/page.tsx` (lines 48-58), `apps/web/components/payment/upgrade-modal.tsx` (line 76)
- **Fix:** Use individual selectors
- **Owner:** Executor D

### M11. TOP_25_FREE_DISEASES has only 21 entries
- **File:** `packages/genetics-data/index.ts` (lines 159-181)
- **Fix:** Rename to `TOP_21_FREE_DISEASES` or add 4 more diseases
- **Owner:** Executor C

### M12. VCF parser no negative allele index check
- **File:** `packages/genetics-engine/src/parser.ts` (lines 336-339)
- **Fix:** Add `if (idxA < 0 || idxB < 0) continue;`
- **Owner:** Executor C

### M13. Carrier status ignores multi-allelic/indel genotypes
- **File:** `packages/genetics-engine/src/carrier.ts` (lines 215-246)
- **Fix:** Add indel-aware genotype comparison for "/" separated VCF genotypes
- **Owner:** Executor C

### M14. Haploid VCF genotypes silently skipped (X-linked)
- **File:** `packages/genetics-engine/src/parser.ts` (line 334)
- **Fix:** Handle single allele GT by duplicating for hemizygous representation
- **Owner:** Executor C

### M15. DRY: Error extraction pattern repeated 14 times across stores
- **Files:** All 4 stores
- **Fix:** Extract `extractErrorMessage(error, fallback)` utility
- **Owner:** Executor D

### M16. DRY: Parent A/B drug recommendation tables identical
- **File:** `apps/web/components/genetics/results/pgx-tab.tsx` (lines 200-278)
- **Fix:** Extract `DrugRecommendationTable` sub-component
- **Owner:** Executor B

### M17. DRY: Duplicated risk category labels
- **File:** `apps/web/components/genetics/results/prs-tab.tsx` (lines 42-52)
- **Fix:** Import `RISK_CATEGORY_LABELS` from genetics-constants instead of local duplicate
- **Owner:** Executor B

### M18. Inconsistent file size limits (50MB UI vs 200MB worker)
- **Files:** `hooks/use-genetics-worker.ts:16`, `components/genetics/couple-upload-card.tsx:16`
- **Fix:** Single shared constant in genetics-constants.ts
- **Owner:** Executor B

### M19. carrier-tab.tsx 744 LOC — extract CarrierResultCard
- **File:** `apps/web/components/genetics/results/carrier-tab.tsx`
- **Fix:** Extract CarrierResultCard into own file
- **Owner:** Executor B

### M20. Auth store god object (473 lines, 18 actions)
- **File:** `apps/web/lib/stores/auth-store.ts`
- **Fix:** Split into slices (auth-core, auth-profile, auth-session, auth-2fa)
- **Owner:** Executor D

### M21. Carrier mode toggle missing ARIA group semantics
- **File:** `apps/web/components/genetics/results/carrier-tab.tsx` (lines 616-637)
- **Fix:** Add `role="radiogroup"` wrapper with `aria-pressed` on buttons
- **Owner:** Executor B

### M22. Button loading state missing sr-only text + aria-busy
- **File:** `apps/web/components/ui/button.tsx`
- **Fix:** Add `aria-hidden="true"` on Loader2, `<span className="sr-only">Loading</span>`, `aria-busy={isLoading}`
- **Owner:** Executor B

### M23. Password strength meter missing role="meter"
- **File:** `apps/web/components/auth/password-strength-display.tsx` (lines 41-48)
- **Fix:** Add `role="meter"` with aria-valuenow/min/max/label
- **Owner:** Executor F

### M24. Overview stat icons missing aria-hidden
- **File:** `apps/web/components/genetics/results/overview-tab.tsx` (line 116)
- **Fix:** Add `aria-hidden="true"` to `<stat.icon>`
- **Owner:** Executor B

### M25. "High Risk" stat card lacks context
- **Flagged by:** Ethics
- **File:** `apps/web/components/genetics/results/overview-tab.tsx` (line 86)
- **Fix:** Add tooltip: "Based on statistical associations, not clinical diagnoses"
- **Owner:** Executor B

### M26. Consent version not tracked
- **Flagged by:** Legal
- **File:** `apps/web/components/legal/consent-modal.tsx` (lines 60-67)
- **Fix:** Add version constant, pass when recording consent
- **Owner:** Executor D

### M27. GDPR re-consent comment legally inaccurate
- **Flagged by:** Legal
- **File:** `apps/web/lib/stores/legal-store.ts` (lines 95-96)
- **Fix:** Update comment to "deliberate design choice for additional user protection"
- **Owner:** Executor D

### M28. Partner consent self-certified only
- **Flagged by:** Legal
- **File:** `apps/web/components/legal/partner-consent-checkbox.tsx`
- **Fix:** Log self-certification server-side with timestamp
- **Owner:** Executor D

### M29. Age verification easily bypassed (localStorage 6mo)
- **Flagged by:** Legal
- **Fix:** Add DOB field instead of just checkbox. Low priority — acknowledge as known limitation.

### M30. Framer Motion in 44 files — consider CSS for simple animations
- **Flagged by:** Technologist
- **Fix:** Document as future optimization. Not blocking A+.

### M31. Sample report missing VCF in format list
- **Flagged by:** Business
- **File:** `apps/web/app/(marketing)/sample-report/_components/sample-report-content.tsx` (line 406)
- **Fix:** Add "or VCF" to format list
- **Owner:** Executor A

### M32. "Serious family planners" phrasing
- **Flagged by:** Ethics
- **File:** `apps/web/lib/pricing-data.ts` (line 64)
- **Fix:** Change to "Comprehensive screening for families"
- **Owner:** Executor A

### M33. Disease descriptions use "defect" / "abnormalities"
- **Flagged by:** Ethics
- **File:** `apps/web/lib/disease-data.ts` (lines 236, 385, 479, 490, 582, 593)
- **Fix:** Replace "defect" → "variant"/"alteration", "abnormalities" → "changes"/"involvement"
- **Owner:** Executor A

### M34. Population frequencies without evolutionary context
- **Flagged by:** Ethics
- **File:** `apps/web/lib/disease-data.ts` (lines 751, 763-764, 778, 836)
- **Fix:** Add contextual note about founder effects/genetic drift. Use "European descent" not "Caucasian"
- **Owner:** Executor A

### M35. Sample report missing PRS ancestry warning
- **Flagged by:** Ethics
- **File:** `apps/web/app/(marketing)/sample-report/_components/sample-report-content.tsx`
- **Fix:** Include PRS_ANCESTRY_WARNING in sample report PRS section
- **Owner:** Executor A

### M36. Offspring risk percentages lack confidence context
- **Flagged by:** Ethics
- **File:** `apps/web/components/genetics/results/carrier-tab.tsx` (lines 384-458)
- **Fix:** Add tooltip about Mendelian theoretical probabilities, penetrance, expressivity
- **Owner:** Executor B

---

## PRIORITY 4: LOW / INFO (Polish)

### L1. No barrel exports (architectural decision — acceptable)
### L2. File objects in Zustand (acceptable, documented)
### L3. `new Date().getFullYear()` in render (negligible)
### L4. GlassCard not memoized (low impact)
### L5. Traits list not virtualized (79 items manageable)
### L6. Rate limiter Map can grow (serverless OK)
### L7. Footer/Navbar could be partially server-rendered (optimization)
### L8. home-content.tsx 562 lines (split into sections)
### L9. HMAC re-derived per request (Edge Runtime constraint)
### L10. No next/image (no raster images currently)
### L11. Hardcoded hex colors (use CSS vars)
### L12. Password validation logic duplicated
### L13. Array index as key in counseling reasons
### L14. console.warn in legal-store (production)
### L15. TODO in client.ts for retry policy
### L16. Dead code in encryption.ts stubs
### L17. Ancestry logic embedded in prs-tab (extract to utils)
### L18. PRS weights use simulated effect sizes (documented)
### L19. Ethnicity Bayesian hardcoded 0.005 (acceptable for rare variants)
### L20. PRS per-allele average normalization non-standard (documented)
### L21. Fixed +/-0.5 SD PRS offspring uncertainty
### L22. Carrier defaults unknown to zero risk (mitigated by UI)
### L23. Coming-soon hardcoded white text (temporary page)
### L24. Payment cancel "Try Again" goes to /products not /subscription
### L25. Demo button only visible when no files selected
### L26. Footer heading hierarchy (h4)
### L27. Coming-soon brand span not heading
### L28. Cookie dismiss vs essential-only distinction
### L29. HIPAA-aware badge phrasing
### L30. Arbitration clause + EU ODR link
### L31. Consent records retention ambiguity
### L32. Privacy notice data category consistency
### L33. Carrier search input missing aria-label
### L34. CPRA button touch target
### L35. PRS heading hidden behind SensitiveContentGuard
### L36. Password requirement icons missing aria-hidden
### L37. Cookie toggle touch target size
### L38. Color contrast marginal with text-dim at 10px
### L39. Inline arrow fn in overview-tab onUpgrade
### L40. stats array recreated every render in overview-tab
### L41. Continuous Framer Motion animations when not visible
### L42. "10 basic trait predictions" vs "All traits" in shared-types

---

## Execution Plan

### Phase 1: Critical Fixes (6 issues)
**Executor teams by file ownership:**

| Executor | Files Owned | Issues |
|----------|-------------|--------|
| **A** (marketing/legal pages) | pricing-data.ts, home-content.tsx, privacy-content.tsx, security-content.tsx, legal-placeholders.ts, products-content.tsx, sample-report-content.tsx, disease-data.ts | C2, C5, C6, H10, H11, H15, H16, M31-35 |
| **B** (genetics components) | pgx-tab.tsx, overview-tab.tsx, carrier-tab.tsx, counseling-tab.tsx, prs-tab.tsx, population-selector.tsx, button.tsx, couple-upload-card.tsx | C3, H5, H17, M6, M16-19, M21-22, M24-25, M36 |
| **C** (genetics engine/data) | strand.ts, pgx-panel.json, trait-snps.json, genetics-data/index.ts, parser.ts, carrier.ts | C4, H1, H2, M11-14 |
| **D** (stores/hooks/app pages) | All stores, hooks, api clients, layout, middleware, indexed-db-store, consent-management | H9, H12, H13, H22, M1-5, M7-10, M15, M20, M26-28 |
| **E** (backend) | apps/api/ | H4 |
| **F** (auth components) | register-content.tsx, user-menu.tsx, callback-content.tsx, password-strength-display.tsx | H7, H8, H21, M23 |
| **G** (tests) | apps/web/__tests__/ | H18-20 |

### Phase 2: Re-review (only reviewers that gave below A)
After fixes, re-review with all 10 reviewers. Only fix issues from reviewers still below A+.

### Phase 3: Final polish pass
Address remaining LOW/INFO items that reviewers flag in re-review.
