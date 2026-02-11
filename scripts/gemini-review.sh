#!/bin/bash
# gemini-review.sh — Run Gemini review for a single reviewer role
# Usage: ./scripts/gemini-review.sh <role> <prompt-file> [output-dir] [model] [--max-tokens N]
#
# The conductor prepares prompt files and calls this script for each reviewer.
# This replaces the Gemini Coordinator agent, saving ~$2-5 per review cycle.
#
# Uses Gemini REST API via curl (no gemini CLI dependency).
# Env: GEMINI_API_KEY (required)
#
# Exit codes:
#   0 = success
#   1 = error (API error, missing params, etc.)
#   2 = rate-limited after all retries

set -euo pipefail

# --- Parse arguments ---
ROLE=""
PROMPT_FILE=""
OUTPUT_DIR="/tmp/gemini-reviews"
MODEL="gemini-3-pro-preview"
MAX_TOKENS=8192

while [[ $# -gt 0 ]]; do
    case "$1" in
        --max-tokens)
            MAX_TOKENS="${2:?--max-tokens requires a value}"
            shift 2
            ;;
        --model)
            MODEL="${2:?--model requires a value}"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="${2:?--output-dir requires a value}"
            shift 2
            ;;
        *)
            if [[ -z "$ROLE" ]]; then
                ROLE="$1"
            elif [[ -z "$PROMPT_FILE" ]]; then
                PROMPT_FILE="$1"
            elif [[ "$OUTPUT_DIR" == "/tmp/gemini-reviews" ]]; then
                # Positional: 3rd arg is output-dir for backward compat
                OUTPUT_DIR="$1"
            elif [[ "$MODEL" == "gemini-3-pro-preview" ]]; then
                # Positional: 4th arg is model for backward compat
                MODEL="$1"
            else
                echo "ERROR: Unexpected argument: $1" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$ROLE" || -z "$PROMPT_FILE" ]]; then
    echo "Usage: gemini-review.sh <role> <prompt-file> [output-dir] [model] [--max-tokens N]" >&2
    exit 1
fi

if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    echo "ERROR: GEMINI_API_KEY environment variable is not set" >&2
    exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: Prompt file not found: $PROMPT_FILE" >&2
    exit 1
fi

# --- Config ---
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
MAX_RETRIES=3
RETRY_DELAYS=(60 120 300)

mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/${ROLE}-review.txt"
OUTPUT_RAW="$OUTPUT_DIR/${ROLE}-review.raw.json"

# --- Read prompt and escape for JSON ---
PROMPT_CONTENT=$(<"$PROMPT_FILE")

# Escape special JSON characters: backslash, double quote, newline, tab, carriage return
escape_json() {
    local s="$1"
    s="${s//\\/\\\\}"      # backslash
    s="${s//\"/\\\"}"      # double quote
    s="${s//$'\n'/\\n}"    # newline
    s="${s//$'\r'/\\r}"    # carriage return
    s="${s//$'\t'/\\t}"    # tab
    printf '%s' "$s"
}

ESCAPED_PROMPT=$(escape_json "$PROMPT_CONTENT")

# --- Build request body ---
REQUEST_BODY=$(cat <<ENDJSON
{
  "contents": [
    {
      "parts": [
        {
          "text": "${ESCAPED_PROMPT}"
        }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": ${MAX_TOKENS}
  }
}
ENDJSON
)

echo "[$(date)] Starting Gemini review: $ROLE (model: $MODEL, max_tokens: $MAX_TOKENS)"

# --- Retry loop ---
for attempt in $(seq 0 $((MAX_RETRIES - 1))); do
    echo "[$(date)] Attempt $((attempt + 1)) of $MAX_RETRIES..."

    HTTP_CODE_FILE=$(mktemp)
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}?key=${GEMINI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY" 2>&1) || true

    # Extract HTTP status code (last line) and body (everything else)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')
    rm -f "$HTTP_CODE_FILE"

    # Check for rate limiting (429)
    if [[ "$HTTP_CODE" == "429" ]]; then
        if [[ $attempt -lt $((MAX_RETRIES - 1)) ]]; then
            DELAY=${RETRY_DELAYS[$attempt]}
            echo "[$(date)] Rate limited (429). Waiting ${DELAY}s before retry..."
            sleep "$DELAY"
            continue
        else
            echo "[$(date)] FAILED: $ROLE review -- rate limited after $MAX_RETRIES attempts"
            echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
            echo "RATE_LIMITED" > "$OUTPUT_FILE"
            exit 2
        fi
    fi

    # Check for HTTP success
    if [[ "$HTTP_CODE" == "200" ]]; then
        # Save raw JSON response
        echo "$RESPONSE_BODY" > "$OUTPUT_RAW"

        # Extract text from candidates[0].content.parts[0].text
        # Use python if available, fall back to sed/grep
        if command -v python3 &>/dev/null; then
            EXTRACTED=$(python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    text = data['candidates'][0]['content']['parts'][0]['text']
    print(text, end='')
except (KeyError, IndexError, json.JSONDecodeError) as e:
    print(f'ERROR: Failed to parse response: {e}', file=sys.stderr)
    sys.exit(1)
" <<< "$RESPONSE_BODY") || {
                echo "[$(date)] FAILED: $ROLE review -- could not parse API response"
                echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
                exit 1
            }
        elif command -v python &>/dev/null; then
            EXTRACTED=$(python -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    text = data['candidates'][0]['content']['parts'][0]['text']
    print(text, end='')
except (KeyError, IndexError, json.JSONDecodeError) as e:
    print('ERROR: Failed to parse response: %s' % e, file=sys.stderr)
    sys.exit(1)
" <<< "$RESPONSE_BODY") || {
                echo "[$(date)] FAILED: $ROLE review -- could not parse API response"
                echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
                exit 1
            }
        else
            # Fallback: try to use node
            if command -v node &>/dev/null; then
                EXTRACTED=$(node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
try {
    process.stdout.write(data.candidates[0].content.parts[0].text);
} catch(e) {
    process.stderr.write('ERROR: Failed to parse response: ' + e.message + '\n');
    process.exit(1);
}
" <<< "$RESPONSE_BODY") || {
                    echo "[$(date)] FAILED: $ROLE review -- could not parse API response (tried python3, python, node)"
                    echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
                    exit 1
                }
            else
                echo "[$(date)] FAILED: $ROLE review -- no JSON parser available (need python3, python, or node)"
                echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
                exit 1
            fi
        fi

        echo "$EXTRACTED" > "$OUTPUT_FILE"
        echo "[$(date)] SUCCESS: $ROLE review saved to $OUTPUT_FILE"
        echo "[$(date)] Raw JSON saved to $OUTPUT_RAW"
        exit 0
    fi

    # Non-429 HTTP error
    echo "[$(date)] FAILED: $ROLE review -- HTTP $HTTP_CODE"
    echo "$RESPONSE_BODY" > "$OUTPUT_RAW"
    exit 1
done
