# ============================================================
# Mergenix API — Multi-stage production Docker build
# ============================================================

# Stage 1: Builder — install dependencies into a virtual env
FROM python:3.12-slim AS builder

WORKDIR /build

COPY requirements.txt .

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime — lean image with only what we need
FROM python:3.12-slim AS runtime

# Install curl for health check and bash for entrypoint
RUN apt-get update && apt-get install -y --no-install-recommends curl bash && rm -rf /var/lib/apt/lists/*

# Security: run as non-root user
RUN groupadd --gid 1001 mergenix \
    && useradd --uid 1001 --gid mergenix --shell /bin/false --create-home mergenix

WORKDIR /app

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY . .

# Fix line endings (Windows CRLF → Unix LF) and make executable
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Ensure proper ownership
RUN chown -R mergenix:mergenix /app

USER mergenix

EXPOSE 8000

# Health check — hits the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["curl", "--fail", "--max-time", "4", "http://localhost:8000/health"]

ENTRYPOINT ["/app/entrypoint.sh"]
