#!/bin/bash
# gemini-api.sh — Call Gemini API with a prompt
# Usage: ./scripts/gemini-api.sh "Your prompt here"
# Or:    ./scripts/gemini-api.sh < prompt-file.txt
# Or:    echo "prompt" | ./scripts/gemini-api.sh
# Or:    ./scripts/gemini-api.sh --model gemini-2.5-flash "Quick question"
#
# Env: GEMINI_API_KEY (required)
#
# Options:
#   --model MODEL    Model to use (default: gemini-3-pro-preview)
#   --max-tokens N   Max output tokens (default: 8192)
#   --raw            Output raw JSON instead of just the text
#
# Exit codes:
#   0 = success
#   1 = error (API error, missing params, etc.)
#   2 = rate-limited after all retries

set -euo pipefail

# --- Defaults ---
MODEL="gemini-3-pro-preview"
MAX_TOKENS=8192
RAW_OUTPUT=false
PROMPT=""

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --model)
            MODEL="${2:?--model requires a value}"
            shift 2
            ;;
        --max-tokens)
            MAX_TOKENS="${2:?--max-tokens requires a value}"
            shift 2
            ;;
        --raw)
            RAW_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "Usage: gemini-api.sh [OPTIONS] [PROMPT]"
            echo ""
            echo "Call Gemini API with a prompt string or piped input."
            echo ""
            echo "Arguments:"
            echo "  PROMPT              Prompt text (or pipe via stdin)"
            echo ""
            echo "Options:"
            echo "  --model MODEL       Model to use (default: gemini-3-pro-preview)"
            echo "  --max-tokens N      Max output tokens (default: 8192)"
            echo "  --raw               Output raw JSON instead of extracted text"
            echo "  -h, --help          Show this help"
            echo ""
            echo "Environment:"
            echo "  GEMINI_API_KEY      Required. Your Gemini API key."
            echo ""
            echo "Examples:"
            echo "  ./scripts/gemini-api.sh \"What is 2+2?\""
            echo "  echo \"Summarize this\" | ./scripts/gemini-api.sh"
            echo "  ./scripts/gemini-api.sh --model gemini-2.5-flash \"Quick question\""
            echo "  ./scripts/gemini-api.sh --raw \"Give me JSON\""
            exit 0
            ;;
        -*)
            echo "ERROR: Unknown option: $1" >&2
            echo "Run with --help for usage." >&2
            exit 1
            ;;
        *)
            if [[ -z "$PROMPT" ]]; then
                PROMPT="$1"
            else
                echo "ERROR: Unexpected argument: $1 (prompt already set)" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

# --- Read prompt from stdin if not provided as argument ---
if [[ -z "$PROMPT" ]]; then
    if [[ -t 0 ]]; then
        echo "ERROR: No prompt provided. Pass as argument or pipe via stdin." >&2
        echo "Run with --help for usage." >&2
        exit 1
    fi
    PROMPT=$(cat)
fi

if [[ -z "$PROMPT" ]]; then
    echo "ERROR: Prompt is empty." >&2
    exit 1
fi

# --- Check API key ---
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    echo "ERROR: GEMINI_API_KEY environment variable is not set" >&2
    exit 1
fi

# --- Config ---
API_URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
MAX_RETRIES=3
RETRY_DELAYS=(60 120 300)

# --- Escape prompt for JSON ---
escape_json() {
    local s="$1"
    s="${s//\\/\\\\}"      # backslash
    s="${s//\"/\\\"}"      # double quote
    s="${s//$'\n'/\\n}"    # newline
    s="${s//$'\r'/\\r}"    # carriage return
    s="${s//$'\t'/\\t}"    # tab
    printf '%s' "$s"
}

ESCAPED_PROMPT=$(escape_json "$PROMPT")

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

# --- Retry loop ---
for attempt in $(seq 0 $((MAX_RETRIES - 1))); do
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_URL}?key=${GEMINI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY" 2>&1) || true

    # Extract HTTP status code (last line) and body (everything else)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

    # Check for rate limiting (429)
    if [[ "$HTTP_CODE" == "429" ]]; then
        if [[ $attempt -lt $((MAX_RETRIES - 1)) ]]; then
            DELAY=${RETRY_DELAYS[$attempt]}
            echo "Rate limited (429). Waiting ${DELAY}s before retry..." >&2
            sleep "$DELAY"
            continue
        else
            echo "ERROR: Rate limited after $MAX_RETRIES attempts" >&2
            exit 2
        fi
    fi

    # Check for HTTP success
    if [[ "$HTTP_CODE" == "200" ]]; then
        if [[ "$RAW_OUTPUT" == "true" ]]; then
            echo "$RESPONSE_BODY"
            exit 0
        fi

        # Extract text from candidates[0].content.parts[0].text
        if command -v python3 &>/dev/null; then
            python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    text = data['candidates'][0]['content']['parts'][0]['text']
    print(text, end='')
except (KeyError, IndexError, json.JSONDecodeError) as e:
    print(f'ERROR: Failed to parse response: {e}', file=sys.stderr)
    sys.exit(1)
" <<< "$RESPONSE_BODY"
            exit $?
        elif command -v python &>/dev/null; then
            python -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    text = data['candidates'][0]['content']['parts'][0]['text']
    print(text, end='')
except (KeyError, IndexError, json.JSONDecodeError) as e:
    print('ERROR: Failed to parse response: %s' % e, file=sys.stderr)
    sys.exit(1)
" <<< "$RESPONSE_BODY"
            exit $?
        elif command -v node &>/dev/null; then
            node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
try {
    process.stdout.write(data.candidates[0].content.parts[0].text);
} catch(e) {
    process.stderr.write('ERROR: Failed to parse response: ' + e.message + '\n');
    process.exit(1);
}
" <<< "$RESPONSE_BODY"
            exit $?
        else
            echo "ERROR: No JSON parser available (need python3, python, or node)" >&2
            echo "$RESPONSE_BODY"
            exit 1
        fi
    fi

    # Non-429 HTTP error
    # Try to extract error message
    ERROR_MSG=""
    if command -v python3 &>/dev/null; then
        ERROR_MSG=$(python3 -c "
import json, sys
try:
    data = json.loads(sys.stdin.read())
    msg = data.get('error', {}).get('message', '')
    if msg: print(msg, end='')
except: pass
" <<< "$RESPONSE_BODY" 2>/dev/null) || true
    fi

    if [[ -n "$ERROR_MSG" ]]; then
        echo "ERROR: HTTP $HTTP_CODE — $ERROR_MSG" >&2
    else
        echo "ERROR: HTTP $HTTP_CODE" >&2
        echo "$RESPONSE_BODY" >&2
    fi
    exit 1
done
