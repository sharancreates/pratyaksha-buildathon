# Multi-stage, CPU-optimized production build for PRATYAKSHA Python 3.11 Geospatial Backend
FROM python:3.11-slim-bookworm AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DEMO_MODE=true

# Install system dependencies required for GDAL, C-extensions, and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Pre-install CPU-only PyTorch wheel to prevent ~2.5GB CUDA bloat
RUN pip install --no-cache-dir torch>=2.4.1 --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Security: create non-root user and set permissions
RUN useradd -m -u 10001 -s /bin/bash appuser && \
    mkdir -p /app/backend && \
    chown -R appuser:appuser /app

# Copy backend source
COPY --chown=appuser:appuser . /app/backend

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
