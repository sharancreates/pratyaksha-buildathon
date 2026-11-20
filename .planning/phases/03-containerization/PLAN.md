# Phase 3 Plan: Multi-Service Containerization & Local Compose Verification

## Goal
Implement optimized multi-stage Dockerfiles for both services, create unified `docker-compose.yml` with PostGIS, configure the `/api/py/*` reverse proxy in `server.ts`, and verify container configuration compliance.

---

## Task Breakdown

### Wave 1: Docker Configurations & Reverse Proxy
- **Task 1.1**: Author multi-stage `Dockerfile` for Node.js 24 + Express + React 19 Web BFF.
- **Task 1.2**: Author `backend/Dockerfile` for Python 3.11 FastAPI Geospatial backend.
- **Task 1.3**: Add `.dockerignore` and `backend/.dockerignore`.
- **Task 1.4**: Author `docker-compose.yml` linking Web (3000), Backend (8000), and PostGIS (5432).
- **Task 1.5**: Implement `/api/py/*` reverse proxy in `server.ts` forwarding requests to `GEO_BACKEND_URL` with graceful demo fallback.

### Wave 2: Container & Proxy Test Verification
- **Task 2.1**: Implement `tests/engines/containerConfig.test.ts` verifying Dockerfile instructions, ports, healthchecks, and docker-compose service wiring.
- **Task 2.2**: Run `npm test` verifying all 31 existing tests + container verification tests pass with 100% green exit code 0.

### Wave 3: Documentation & State Transition
- **Task 3.1**: Create `VERIFICATION.md` for Phase 3.
- **Task 3.2**: Update `ROADMAP.md` and `STATE.md` marking Phase 3 completed and queueing Phase 4.
