# Phase 3 Research: Multi-Service Containerization & Local Compose Verification

## 1. Domain Objective
Containerize PRATYAKSHA into lightweight, production-grade, OCI-compliant container images targeting Google Cloud Run in `asia-south1` (Mumbai), with local orchestration verified via Docker Compose.

---

## 2. Container Architecture Decisions

### 2.1 Web Service (`pratyaksha-web-service`)
- **Base OS**: `node:24-alpine` for minimal surface area (< 180MB uncompressed).
- **Multi-Stage Pattern**:
  - `builder`: Compiles React 19 SPA with Vite into `/app/dist`.
  - `runner`: Production image carrying only `/app/dist`, `package.json`, production dependencies, and server runtime (`server.ts`, `src/server/*`, `src/shared/*`).
- **Internal Service Proxy**:
  - `server.ts` exposes `/api/py/*` which proxies incoming geospatial requests to `GEO_BACKEND_URL` (default: `http://backend:8000`).
  - Implements fallback error handling: if the Python GIS backend is unreachable, the web service returns a structured 502 with `dataMode: DEMO_FALLBACK` instead of dropping connection.

### 2.2 Geospatial Engine (`pratyaksha-geo-service`)
- **Base OS**: `python:3.11-slim-bookworm` (provides stable Debian C libraries for GDAL, GEOS, and PROJ required by GeoPandas and Rasterio).
- **Layer Optimization**:
  - Install system dependencies (`libpq-dev`, `libgdal-dev`).
  - Install python wheels with `--no-cache-dir`.
  - Copy backend module and expose on port 8000.
- **Resilience**:
  - Automatically loads `EarthEngineService` in `DEMO_FALLBACK` when GEE credentials are not configured.

### 2.3 PostGIS Database Container
- **Image**: `postgis/postgis:15-3.4` (PostgreSQL 15 with PostGIS 3.4).
- **Initialization**: Automatically mounts `backend/database/migrations/` into `/docker-entrypoint-initdb.d/` to run `001_init_postgis.sql` on first boot.
- **Healthcheck**: Uses `pg_isready -U pratyaksha -d pratyaksha`.

---

## 3. Deliverables Checklist
1. `Dockerfile` (Root Node.js 24 multi-stage build)
2. `backend/Dockerfile` (Python 3.11 FastAPI build)
3. `.dockerignore` and `backend/.dockerignore`
4. `docker-compose.yml` (Orchestrates Web, Backend, and PostGIS)
5. `/api/py/*` reverse proxy in `server.ts`
6. Automated integration tests verifying container and proxy contracts
