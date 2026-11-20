# Project Roadmap

## Milestone 1: Production Readiness & Persistence Architecture (COMPLETED)

### Phase Overview

| Phase | Title | Goal | Status |
|-------|-------|------|--------|
| **Phase 1** | Core Platform Foundation | 7 full-stack modules, MapLibre GL geospatial map, in-memory analytical engines, and 5-city smart cities dataset. | **COMPLETED** |
| **Phase 2** | Security & Test Automation Harness | Wire automated test runner (`vitest` + `@firebase/rules-unit-testing`) to execute the "Dirty Dozen" security assertions and engine unit tests in CI. | **COMPLETED** |

---

## Milestone 2: GCP Cloud-Native Production Deployment (ACTIVE)

### Phase Overview

| Phase | Title | Goal | Status |
|-------|-------|------|--------|
| **Phase 3** | Multi-Service Containerization & Local Compose Verification | Create optimized multi-stage Dockerfiles for Node Web BFF and Python FastAPI, plus unified `docker-compose.yml` with PostGIS. | **COMPLETED** |
| **Phase 4** | GCP IAM Security, Artifact Registry & Secret Manager | Set up GCP project APIs, Artifact Registry repository, runtime Service Account with least-privilege IAM, and Secret Manager schemas. | **COMPLETED** |
| **Phase 5** | Cloud SQL PostGIS & Cloud Firestore Database Provisioning | Provision PostgreSQL 15 + PostGIS instance in `asia-south1`, execute spatial migrations, and verify Firestore production rules. | **COMPLETED** |
| **Phase 6** | Cloud Run Dual-Service Deployment & VPC Networking | Deploy Web BFF and Python GIS services to Cloud Run with Serverless VPC Connector and internal service-to-service proxying. | **READY TO PLAN** |
| **Phase 7** | Cloud Build CI/CD Automation & Production Verification | Establish automated `cloudbuild.yaml` deployment pipeline, execute live smoke testing, and draft municipal operations runbook. | **PLANNED** |

---

## Detailed Phase Breakdown

### Phase 1: Core Platform Foundation (Completed Baseline)
- [x] Command Center (`/`) with 6 KPI sparkline cards and MapLibre GL interactive map.
- [x] Satellite Data Explorer (`/satellite`) with multi-mission catalog and 4-stage harmonization pipeline.
- [x] Environmental Analytics (`/analytics`) with Recharts time-series modules for UHI, NDVI, $\text{NO}_2$, LST, and water bodies.
- [x] AI Anomaly Detection (`/anomalies`) with Isolation Forest, Autoencoder MSE, Haversine DBSCAN, and risk consensus scoring.
- [x] Forecasting Engine (`/forecasting`) comparing Prophet, ARIMA, and XGBoost with accuracy benchmarks.
- [x] Land Cover Segmentation (`/segmentation`) with EnvironmentalUNet 6-class overlay and transition matrix.
- [x] Municipal Action Plan (`/action-plan`) with PDF and JSON export.
- [x] Deterministic 5-city dataset (Ahmedabad, Delhi, Mumbai, Bengaluru, Chennai) with 90-day historical telemetry.
- [x] Firestore security rules specification (`firestore.rules` and `security_spec.md`).

### Phase 2: Security & Test Automation Harness (Completed Baseline)
- [x] Add test harness and scripts to `package.json` and configure `vitest.config.ts`.
- [x] Implement executable test runner executing all 12 "Dirty Dozen" adversarial security tests and positive assertions.
- [x] Implement unit tests for `mlEngine.ts` (Isolation Forest bounds, DBSCAN clusters, consensus weights).
- [x] Implement unit tests for `forecastEngine.ts` (horizon intervals, confidence envelope, benchmark metrics).
- [x] Implement unit tests for `harmonizer.ts` and `segmentationEngine.ts`.
- [x] Configure `npm test` script and verify clean exit in CI environment with 31/31 passing tests.

---

### Phase 3: Multi-Service Containerization & Local Compose Verification
- [x] Implement multi-stage `Dockerfile` for Node.js 24 + Express + React 19 frontend/BFF with production minification.
- [x] Implement multi-stage `backend/Dockerfile` for Python 3.11 FastAPI backend with PyTorch CPU and Earth Engine client dependencies.
- [x] Author unified `docker-compose.yml` linking Web, FastAPI backend, and `postgis/postgis:15-3.4` database service.
- [x] Verify local containerized run with health checks (`/api/health`) and synthetic fallback assurance.
- [x] Add `.dockerignore` for both services to prevent bloat from node_modules, cache, and virtual environments.

### Phase 4: GCP IAM Security, Artifact Registry & Secret Manager Architecture
- [x] Create GCP service enablement scripts for `run.googleapis.com`, `artifactregistry.googleapis.com`, `sqladmin.googleapis.com`, `secretmanager.googleapis.com`, and `earthengine.googleapis.com`.
- [x] Establish OCI Artifact Registry repository `pratyaksha-repo` in region `asia-south1`.
- [x] Define dedicated runtime service account `sa-pratyaksha-runtime` with minimal required IAM roles (`secretmanager.secretAccessor`, `cloudsql.client`, `datastore.user`, `run.invoker`).
- [x] Author Secret Manager configuration templates for `DATABASE_URL`, `GEE_SERVICE_ACCOUNT_KEY`, and `FIREBASE_CONFIG`.

### Phase 5: Cloud SQL PostGIS & Cloud Firestore Database Provisioning
- [x] Formulate Cloud SQL PostgreSQL 15 provisioning commands with PostGIS spatial extension flags.
- [x] Verify execution of `backend/database/migrations/001_init_postgis.sql` on the managed instance.
- [x] Configure Cloud SQL Auth Proxy and Unix socket paths for container runtime connections.
- [x] Confirm Cloud Firestore native mode configuration in `asia-south1` and validate `firestore.rules` security policies.

### Phase 6: Cloud Run Dual-Service Deployment & Serverless VPC Networking
- [ ] Deploy `pratyaksha-geo-service` (Python FastAPI) to Cloud Run with environment variable and Secret Manager bindings.
- [ ] Deploy `pratyaksha-web-service` (Node.js React/BFF) to Cloud Run with public ingress and auto-scaling rules.
- [ ] Implement reverse-proxy delegation in `server.ts` forwarding `/api/py/*` requests to the internal Cloud Run geo service endpoint.
- [ ] Configure Serverless VPC Access connector for private internal communication to Cloud SQL without public IP exposure.

### Phase 7: Cloud Build CI/CD Automation & Production Verification
- [ ] Author `cloudbuild.yaml` automated build and deploy pipeline with step-by-step test, build, push, and deploy tasks.
- [ ] Develop end-to-end smoke verification script testing `/api/health`, `/api/dashboard/overview`, and `/api/anomalies/ahmedabad` on the live Cloud Run endpoint.
- [ ] Write municipal commissioner operations runbook covering scaling policies, logs inspection, and credential rotation.
