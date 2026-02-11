# =============================================================================
# Mergenix — Multi-stage Production Dockerfile
# =============================================================================
# Stage 1 (builder): install Python dependencies into a virtual environment
# Stage 2 (runtime): copy only the venv + app code into a minimal image
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — Builder
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build-time system deps (gcc needed for bcrypt/pillow wheels)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# Create a virtual environment so we can cleanly copy deps to runtime
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 2 — Runtime
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

LABEL maintainer="Mergenix Team"
LABEL version="2.0.0"
LABEL description="Mergenix — Genetic Offspring Analysis Platform"

# Install curl for the health check (nothing else)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy the pre-built virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code (only what is needed at runtime)
COPY app.py .
COPY Source/ ./Source/
COPY pages/ ./pages/
COPY data/ ./data/
COPY .streamlit/config.toml ./.streamlit/config.toml

# Ensure the appuser owns the working directory
RUN chown -R appuser:appuser /app

USER appuser

# Streamlit default port
EXPOSE 8501

# Health check — Streamlit exposes a lightweight health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail http://localhost:8501/_stcore/health || exit 1

ENTRYPOINT ["streamlit", "run", "app.py", \
    "--server.port=8501", \
    "--server.address=0.0.0.0", \
    "--server.headless=true", \
    "--browser.gatherUsageStats=false"]
