# R6: Synthetic Test Genome Factory Specification

> **Task:** Design a complete specification for generating synthetic test genome files
> **Delegated to:** Claude (general-purpose agent)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** C (complex code generation — Claude's scaffolding superior to Gemini)

## Objective
Design a comprehensive specification for a synthetic test genome factory that generates realistic raw DNA data files in all formats supported by the Mergenix parser. The factory must produce deterministic, reproducible files that can inject specific pathogenic variants for testing carrier analysis, trait prediction, PGx, and PRS modules.

## Prompt Sent
"Create a complete specification for a synthetic test genome factory. The spec should cover: all supported file formats (23andMe v3/v4/v5, AncestryDNA v1/v2, MyHeritage, VCF), generation parameters (ancestry, sex, carrier status, specific variants to inject), edge case test files (malformed headers, empty files, mixed formats, huge files), golden standard files (known-good reference genomes with verified results), couple test scenarios (carrier x carrier, carrier x non-carrier, etc.), and a TypeScript API design for the factory module."

## Key Findings
- Factory will live at `packages/genetics-engine/src/test-utils/genome-factory.ts`
- Covers all 4 supported formats with format-specific headers, columns, and validation rules
- 1,534-line specification covering 9 major sections
- Defines 15+ edge case test files, 6 golden standard files, and 8 couple test scenarios
- TypeScript API uses builder pattern for ergonomic test authoring
- Full spec saved at `docs/SYNTHETIC_GENOME_FACTORY_SPEC.md`

## Full Results
The complete 1,534-line specification is at [`docs/SYNTHETIC_GENOME_FACTORY_SPEC.md`](../SYNTHETIC_GENOME_FACTORY_SPEC.md).

**Sections covered:**
1. Overview — relationship to existing parser, carrier, traits, PGx, PRS, ethnicity modules
2. File Format Specifications — exact header/column formats for 23andMe (v3/v4/v5), AncestryDNA (v1/v2), MyHeritage, VCF
3. Generation Parameters — ancestry, sex, carrier variants, trait alleles, PGx star alleles, PRS risk levels
4. Edge Case Test Files — malformed headers, empty genotypes, duplicate rsIDs, oversized files, mixed line endings
5. Golden Standard Files — reference genomes with pre-computed expected results for every analysis module
6. Couple Test Scenarios — CF carrier x carrier, sickle cell carrier x non-carrier, double carrier, consanguinity
7. TypeScript API Design — builder pattern (`GenomeFactory.create().format('23andme_v5').sex('female').addCarrierVariant(...)`)
8. SNP Universe and Allele Frequency Data — which rsIDs to include, population-specific allele frequencies
9. Implementation Notes — deterministic seeding, performance targets, CI integration

## Action Items
- [ ] Implement the factory module at `packages/genetics-engine/src/test-utils/genome-factory.ts`
- [ ] Generate golden standard files for each supported format
- [ ] Integrate into existing test suites (replace hand-crafted test data)
- [ ] Add CI step to regenerate golden files on panel data changes

## Impact on Downstream Streams
- **Q (Testing):** Q1-Q14 test suites will use factory-generated files instead of hand-crafted fixtures
- **E (Engine):** Parser, carrier, traits, PGx, PRS modules all get deterministic test inputs
- **T (Types):** Factory API types must align with shared-types definitions
