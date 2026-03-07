# Stream F — Planning Research Index

**Date:** 2026-02-14
**Method:** 10 Gemini planning personas (gemini-3-pro-preview --yolo), fired in parallel
**Status:** All 10 complete

## Persona Results Summary

| #   | Persona       | Key Contribution                                                                                                                    |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architect     | PDF Worker isolation, EncryptionService facade, CoupleContext state, state machine expansion for legal gates                        |
| 2   | QA            | Testing strategy (Vitest for logic, Playwright for flows), tier leakage detection, worker resilience testing                        |
| 3   | Scientist     | Coverage meter as #1 safety feature, PRS ancestry invalidity, Mendelian vs complex trait distinction, residual risk false precision |
| 4   | Technologist  | Off-main-thread file reading, virtua/react-virtuoso for variable heights, debounced filtering, lazy-load pdf-lib                    |
| 5   | Business      | Pricing update ($12.90→$14.99, $29.90→$34.99), Free tier devaluation risk, conversion funnel design                                 |
| 6   | Designer      | Focus restoration in useFocusTrap, consent scroll anti-pattern, semantic color palette for contrast, "Skip Results" link            |
| 7   | Security      | Fake zero-knowledge risk (raw JSON in saveResult), client-side tier bypass, DEK session timeout, file upload sanitization           |
| 8   | Code Quality  | Hook extraction (useCarrierFilter), CarrierTab decomposition, Worker pattern for PDF, Zustand slicing                               |
| 9   | Legal/Privacy | GDPR Article 9 explicit consent, encrypted save barrier, "tier_locked" vs "not_tested" distinction, consent state machine           |
| 10  | Ethics        | "Layers of Disclosure" approach, crisis resources on high-risk, visual neutrality (no red/skull), free tier false reassurance       |

## Unanimous Findings (All 10 Agree)

1. **Build consent gates BEFORE results display** — F28, F2, F27, F25 are prerequisites
2. **Virtualization is mandatory** — 2,697 carrier entries will crash mobile browsers
3. **Client-side encryption must block raw save** — analysis-client.ts sends raw JSON today
4. **PDF generation must run in dedicated Web Worker** — will freeze UI otherwise
5. **Legal text placeholders needed** — Stream L not started yet, create placeholder constants

## Sprint Consensus

All 10 personas converge on a 4-sprint structure:

- Sprint 1: Foundation + Gates (design tokens, virtualization spike, consent modals, terminology)
- Sprint 2: Core UX + Tiers (couple upload, sensitive guards, tier logic)
- Sprint 3: Results + Visualization (coverage meter, Virtual Baby, PRS context, a11y)
- Sprint 4: Output + Compliance (PDF, save/encrypt, GDPR, security page)

## Full Results

Individual persona outputs stored in conversation context (2026-02-14 session).
