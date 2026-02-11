#!/bin/bash
# Copy reference data from legacy Streamlit project (data/) to this package.
#
# Run from the packages/genetics-data/ directory:
#   bash copy-data.sh
#
# Or from the repository root:
#   pnpm --filter @mergenix/genetics-data copy-data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../../data"

if [ ! -d "$DATA_DIR" ]; then
  echo "ERROR: Legacy data directory not found at $DATA_DIR"
  echo "Make sure you are running this from the correct location."
  exit 1
fi

echo "Copying reference data from $DATA_DIR..."

cp "$DATA_DIR/carrier_panel.json"          "$SCRIPT_DIR/carrier-panel.json"
cp "$DATA_DIR/trait_snps.json"             "$SCRIPT_DIR/trait-snps.json"
cp "$DATA_DIR/pgx_panel.json"             "$SCRIPT_DIR/pgx-panel.json"
cp "$DATA_DIR/prs_weights.json"           "$SCRIPT_DIR/prs-weights.json"
cp "$DATA_DIR/ethnicity_frequencies.json" "$SCRIPT_DIR/ethnicity-frequencies.json"
cp "$DATA_DIR/glossary.json"              "$SCRIPT_DIR/glossary.json"
cp "$DATA_DIR/counseling_providers.json"  "$SCRIPT_DIR/counseling-providers.json"

echo "Done. Copied 7 data files:"
echo "  - carrier-panel.json      (carrier disease panel)"
echo "  - trait-snps.json          (trait SNP database)"
echo "  - pgx-panel.json           (pharmacogenomics panel)"
echo "  - prs-weights.json         (polygenic risk score weights)"
echo "  - ethnicity-frequencies.json (population carrier frequencies)"
echo "  - glossary.json            (genetics glossary)"
echo "  - counseling-providers.json (counselor directory)"
