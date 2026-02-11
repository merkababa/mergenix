#!/bin/bash
# ============================================================
# Mergenix API — Container entrypoint
# Waits for the database, runs migrations, then starts uvicorn.
# ============================================================

set -euo pipefail

# ── Wait for database ──────────────────────────────────────────────────────
echo "[entrypoint] Waiting for database to become ready..."

MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

# Extract host and port from DATABASE_URL using Python's urllib.parse
# (robust against passwords containing special characters like @ or :)
DB_HOST=$(python3 -c "from urllib.parse import urlparse; r=urlparse('$DATABASE_URL'); print(r.hostname)")
DB_PORT=$(python3 -c "from urllib.parse import urlparse; r=urlparse('$DATABASE_URL'); print(r.port or 5432)")

while [ "$RETRIES" -lt "$MAX_RETRIES" ]; do
    if python -c "
import socket, sys
try:
    s = socket.create_connection(('${DB_HOST}', ${DB_PORT}), timeout=2)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        echo "[entrypoint] Database is ready at ${DB_HOST}:${DB_PORT}"
        break
    fi

    RETRIES=$((RETRIES + 1))
    echo "[entrypoint] Database not ready (attempt ${RETRIES}/${MAX_RETRIES}), retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

if [ "$RETRIES" -eq "$MAX_RETRIES" ]; then
    echo "[entrypoint] ERROR: Database not reachable after ${MAX_RETRIES} attempts. Exiting."
    exit 1
fi

# ── Run database migrations ────────────────────────────────────────────────
echo "[entrypoint] Running Alembic migrations..."
if ! alembic upgrade head; then
    echo "[entrypoint] ERROR: Alembic migration failed. Exiting."
    exit 1
fi
echo "[entrypoint] Migrations applied successfully."

# ── Start application ──────────────────────────────────────────────────────
echo "[entrypoint] Starting Mergenix API..."
exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000
