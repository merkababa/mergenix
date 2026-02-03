# Sample Data Files

Synthetic genetic data files for testing Tortit's multi-format parsers and web upload functionality.

## Data Sources

| Directory | Format | Count | Extension | Notes |
|-----------|--------|-------|-----------|-------|
| `23andme/` | 23andMe raw data | 5 files | .txt | Tab-delimited, versions 3-5 |
| `ancestry/` | AncestryDNA raw data | 6 files | .txt | Tab-delimited, versions 1-2 |
| `myheritage/` | MyHeritage/FTDNA | 6 files | .csv | CSV format, quoted/unquoted variants |
| `vcf/` | VCF 4.2 | 5 files | .vcf | WGS, exome, panel, and clinical variants |

## Important Notice

All data in this directory is **synthetic and generated** for testing purposes. These files do NOT contain real genetic information.

## Usage

Use these files to:
- Test the Tortit web app upload functionality
- Validate parser implementations for each genetic data format
- Verify data transformation pipelines
- Develop and test multi-sample analysis features

## File Variants

Sample files include variations by:
- **Gender**: male, female, mixed
- **Format version**: varies by platform
- **Data type**: WGS (whole genome), exome, clinical panels, ancestry-focused
- **CSV quoting**: quoted and unquoted variants (MyHeritage only)
