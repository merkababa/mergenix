# R3: Liftover Methodology

> **Task:** Document methodology for building an rsID-to-genomic-position liftover lookup table
> **Delegated to:** Gemini (gemini-3-pro-preview)
> **Date:** 2026-02-12
> **Status:** COMPLETE
> **Tier:** A+ (research -- Gemini's 1M context ideal for large data analysis)

## Objective

Define the methodology for creating a client-side rsID-to-genomic-coordinate lookup table that supports both GRCh37 (hg19) and GRCh38 (hg38) genome builds, document which DTC providers use which builds, and estimate the data size.

## Key Findings

- **Nearly all consumer DTC providers output GRCh37 (hg19)** -- including 23andMe v5 which is designed on hg38 but exports lifted-over to hg19
- **Only WGS providers (Nebula, Dante, newer MyHeritage WGS)** use GRCh38 natively
- **Total lookup table size is ~40-50KB gzipped** for ~2,823 rsIDs -- negligible for a web app, no server-side lookup needed
- **rsID merges in dbSNP** are a significant pitfall -- deprecated rsIDs must map to current canonical positions
- **Strand flips** between chip versions are rare but must be handled via reference allele comparison

## Full Results

### Methodology for rsID-to-Genomic-Position Liftover

To create a robust client-side lookup table for ~2,800 rsIDs, follow this methodology:

1.  **Source Data Extraction**:
    - Aggregate all unique rsIDs from `carrier-panel.json`, `pgx-panel.json`, and `trait-snps.json`.
    - Filter out any non-standard IDs (e.g., internal "i*" or "VG*" identifiers used by some DTC providers) unless they have a known dbSNP equivalent.

2.  **Coordinate Retrieval (Primary)**:
    - Use the **Ensembl REST API** or **UCSC Genome Browser Table Browser** to batch query coordinates.
    - Fetch coordinates for both **GRCh37 (hg19)** and **GRCh38 (hg38)**.
    - **Constraint**: Restrict results to "primary assembly" chromosomes (1-22, X, Y, MT) to avoid mapping to alternative contigs or patches.

3.  **Data Normalization**:
    - **Chromosome Names**: Normalize to string format without "chr" prefix (e.g., "1", "X", "MT") to match the parser's output format.
    - **Positions**: Ensure 1-based indexing (standard for VCF and DTC raw data files).
    - **Alleles**: Record Reference (Ref) and Alternate (Alt) alleles for both builds to help validate strand orientation (forward vs. reverse) if needed later.

4.  **Validation & Quality Control**:
    - **Liftover Verification**: For rsIDs where the position shifts significantly or changes chromosomes between builds (rare but possible on boundaries), flag for manual review.
    - **DTC Concordance**: Cross-reference hg19 positions with a sample 23andMe v5 raw data file to ensure the lookup matches the specific coordinate system used by consumer files (which often stay on hg19 even for newer chips).

5.  **Output Generation**:
    - Compile into a single JSON object keyed by rsID.
    - Minify the JSON to reduce payload size.

### Provider to Default Genome Build Mapping

| Provider          | Chip Version   | Default Build     | Notes                                                                                                    |
| :---------------- | :------------- | :---------------- | :------------------------------------------------------------------------------------------------------- |
| **23andMe**       | v1 - v4        | **GRCh37 (hg19)** | Native build for these chips.                                                                            |
| **23andMe**       | v5             | **GRCh37 (hg19)** | Chip is designed on hg38, but raw data download is **lifted over to hg19** by 23andMe for compatibility. |
| **AncestryDNA**   | All            | **GRCh37 (hg19)** | Consistently reports in hg19.                                                                            |
| **MyHeritage**    | Microarray     | **GRCh37 (hg19)** | Standard microarray files.                                                                               |
| **MyHeritage**    | WGS (New 2026) | **GRCh38 (hg38)** | New Whole Genome Sequencing kits likely use hg38 VCFs.                                                   |
| **FamilyTreeDNA** | All            | **GRCh37 (hg19)** | Some very old files might be hg36 (rare).                                                                |
| **LivingDNA**     | All            | **GRCh37 (hg19)** |                                                                                                          |
| **Nebula/Dante**  | WGS            | **GRCh38 (hg38)** | Clinical-grade WGS typically delivered as hg38 VCF/BAM.                                                  |

### Sample JSON Schema

The lookup table is designed to be a static, read-only JSON file loaded by the client.

```json
{
  "meta": {
    "version": "1.0",
    "generated_at": "2026-02-13",
    "source": "dbSNP b156"
  },
  "snps": {
    "rs123456": {
      "hg19": {
        "chr": "7",
        "pos": 11718293,
        "ref": "A",
        "alt": "G"
      },
      "hg38": {
        "chr": "7",
        "pos": 11758201,
        "ref": "A",
        "alt": "G"
      }
    },
    "rs789012": {
      "hg19": {
        "chr": "X",
        "pos": 150021,
        "ref": "C",
        "alt": "T"
      },
      "hg38": {
        "chr": "X",
        "pos": 160032,
        "ref": "C",
        "alt": "T"
      }
    }
  }
}
```

### Known Issues & Considerations

1.  **rsID Merges**: dbSNP frequently merges rsIDs. The lookup table should include keys for **both** the old and new rsIDs pointing to the same coordinate object if they appear in our supported panels.
    - _Action:_ Check if any rsIDs in `carrier-panel.json` are deprecated and ensure they map to the current canonical position.
2.  **Multi-Allelic Sites**: Some rsIDs in standard panels (like `rs429358` for APOE) are part of complex haplotypes. The "Ref/Alt" in the lookup table is for position verification only; the _genotype_ logic should be handled by the specific interpreter (e.g., `parser.ts` or `apoe.ts`).
3.  **Strand Flips**: 23andMe and AncestryDNA usually report genotypes on the **positive (+) strand** of GRCh37. However, some older chips or specific SNPs might report on the negative strand. The lookup table provides the reference (+) allele, allowing the client to detect if a strand flip is necessary (e.g., if the user file says "AA" but Ref is "G/T", check if "A" matches the complement).

### Size Estimate

- **Total rsIDs**: ~2,823 (2717 Carrier + 79 Traits + 27 PGx)
- **Entry Size**: ~100-120 bytes per SNP (unminified).
- **Estimated JSON Size**:
  - **Raw**: ~340 KB
  - **Minified**: ~200 KB
  - **Gzipped**: ~40-50 KB

**Recommendation**: This size is negligible for a modern web application. The file can be bundled directly with the client logic (`genetics-engine`) or served as a static asset cached indefinitely. No database or server-side lookup is required.

## Action Items

1. **Script: Build coordinate fetcher** -- Write a script using Ensembl REST API to batch-query all ~2,823 rsIDs for hg19 + hg38 coordinates
2. **Data: Generate `rsid-coordinates.json`** -- Static lookup file following the schema above
3. **Data: Check for deprecated rsIDs** -- Cross-reference our panel rsIDs against current dbSNP to find merged/deprecated entries
4. **Engine: Add build detection** -- Parser should auto-detect genome build from file header or provider metadata
5. **Engine: Add strand-flip detection** -- Compare user genotype alleles against reference alleles to detect complement reporting

## Impact on Downstream Streams

- **Stream E (Engine):** Parser needs build detection and coordinate lookup integration
- **Stream D (Data):** New `rsid-coordinates.json` data file must be generated and maintained
- **Stream T (Testing):** Test cases needed for hg19 vs hg38 inputs and strand-flip scenarios
