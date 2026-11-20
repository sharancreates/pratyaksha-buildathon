# Phase 3 Research: Multi-Service Containerization & Local Compose Verification

## 1. Domain & Technology Findings

### 1.1 Node.js 24 + React 19 + Express 5 Containerization
- **Runtime Choice**: `node:24-alpine` provides minimal attack surface and small image size (~150MB).
- **Multi-Stage Strategy**:
  - *Stage 1 (Builder)*: Copies `package.json`, installs dependencies, runs `npm run build` (compiles React 19 SPA to `dist/`).
  - *Stage 2 (Runner)*: Copies production code (`server.ts`, `src/server/`, `src/shared/`, `dist/`). Runs with `NODE_ENV=production` on `PORT=3000`.
- **Optimization**: Since `server.ts` uses `tsx` to run TypeScript directly without an explicit tsc compile step, we can either:
  - Install `tsx` in production runner stage.
  - Or run `tsx server.ts` directly in the container.
- **Port Binding**: Respects `process.env.PORT || 3000` (critical for Cloud Run in Phase 6).

### 1.2 Python 3.11 FastAPI + PyTorch Geospatial Containerization
- **Runtime Choice**: `python:3.11-slim-bookworm` (Debian Bookworm) is required for C-libraries (`gdal`, `geos`, `proj`, `rasterio`, `psycopg2`). Alpine is strongly discouraged for Python GIS due to musl libc incompatibility with pre-built GDAL/Rasterio wheels.
- **PyTorch Image Bloat Mitigation**:
  - The default `pip install torch` downloads ~2.5 GB of CUDA / cuDNN libraries that are unnecessary on Cloud Run CPU.
  - Using CPU-only PyTorch wheel: `pip install torch --index-url https://download.pytorch.org/whl/cpu` reduces image size by over 75% (~600MB vs ~3.2GB).
- **Environment & Non-Root Execution**:
  - Create non-root user `appuser:appuser` for security compliance.
  - Default `DEMO_MODE=true` so the container boots instantaneously without requiring active Earth Engine service account keys or PostGIS credentials.

### 1.3 PostGIS 15 Container & Database Seeding
- **Image**: `postgis/postgis:15-3.4-alpine` is the official lightweight PostGIS image.
- **Auto-Initialization**: Mounting `./backend/database/migrations/001_init_postgis.sql` to `/docker-entrypoint-initdb.d/` executes spatial schema migrations (`spatial_ref_sys`, `municipal_wards`, `spatial_observations`) on the initial container startup.
- **Health Check**: `pg_isready -U pratyaksha -d pratyaksha` verifies readiness before dependent services start.

### 1.4 Docker Compose Service Dependencies & Inter-Container Networking
- **Service Mesh**:
  - `web` (Node.js BFF): port 3000. Depends on `backend` healthy.
  - `backend` (FastAPI): port 8000. Depends on `db` healthy.
  - `db` (PostGIS): port 5432.
- **Reverse Proxy Route (`/api/py/*`)**:
  - In `server.ts`, requests matching `/api/py/*` can be streamed or proxied to `PYTHON_SERVICE_URL` (default `http://backend:8000`).
  - Allows the React single-page frontend to talk to a single origin (`localhost:3000`) while seamlessly accessing both Node and Python APIs.

---

## 2. Invariants & Guardrails

1. **Deterministic Demonstration Guarantee (ADR-02)**: All containerized services must boot and pass health checks cleanly even when `DATABASE_URL` is unreachable or Earth Engine keys are absent.
2. **Layer Caching**: `package.json` and `backend/requirements.txt` must be copied and installed in early stages to maximize Docker layer cache hits.
3. **Environment Security**: No sensitive secrets or private keys embedded in Dockerfile layers; all configurable via `.env` or Docker Compose environment variables.
