# Project Roadmap

## Milestone 1: Production Readiness & Persistence Architecture

### Phase Overview

| Phase | Title | Goal | Status |
|-------|-------|------|--------|
| **Phase 1** | Core Platform Foundation | 7 full-stack modules, MapLibre GL geospatial map, in-memory analytical engines, and 5-city smart cities dataset. | **COMPLETED** |
| **Phase 2** | Security & Test Automation Harness | Wire automated test runner (`vitest` + `@firebase/rules-unit-testing`) to execute the "Dirty Dozen" security assertions and engine unit tests in CI. | **PLANNED** |
| **Phase 3** | Cloud Firestore & State Persistence | Connect UI to Cloud Firestore for live persistence of `/action_plans` and `/anomaly_reviews` with in-memory fallback. | **PLANNED** |
| **Phase 4** | Python FastAPI & PostGIS Gateway | Implement proxy routing in `server.ts` to seamlessly delegate heavy GIS/ML tasks to FastAPI when available. | **PLANNED** |
| **Phase 5** | Production Earth Engine Pipeline & Deployment | Multi-mission live Earth Engine pipeline, Docker containerization, and production municipal deployment guide. | **PLANNED** |

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

### Phase 2: Security & Test Automation Harness
- [ ] Add `vitest` and `@firebase/rules-unit-testing` harness to `package.json`.
- [ ] Implement executable test runner executing all 12 "Dirty Dozen" adversarial security tests against Firebase emulator.
- [ ] Implement unit tests for `mlEngine.ts` (Isolation Forest bounds, DBSCAN clusters, consensus weights).
- [ ] Implement unit tests for `forecastEngine.ts` (horizon intervals, fallback handling).
- [ ] Configure `npm test` script and verify clean exit in CI environment.

### Phase 3: Cloud Firestore & State Persistence
- [ ] Initialize Firebase Client SDK in `src/context/` or `src/services/firebase.ts`.
- [ ] Wire `/action_plans` CRUD operations with Firestore when authenticated, falling back to local storage in demo mode.
- [ ] Wire `/anomaly_reviews` triage review logging to Firestore with owner isolation.
- [ ] Implement client-side auth state hook with email verification check.
- [ ] Validate Firestore audit logging for `/processing_jobs`.

### Phase 4: Python FastAPI & PostGIS Gateway
- [ ] Add reverse-proxy middleware to `server.ts` forwarding `/api/py/*` requests to FastAPI on `localhost:8000`.
- [ ] Provide unified health probe checking both Node and Python backend availability.
- [ ] Connect FastAPI endpoints to PostGIS database for spatial ward boundary and observation queries.
- [ ] Align Python and Node data schemas for ML consensus and time-series predictions.

### Phase 5: Production Earth Engine Pipeline & Deployment
- [ ] Document Google Cloud service account provisioning and GEE project enablement.
- [ ] Containerize full application with Docker (`docker-compose.yml` for Node app, FastAPI, and PostGIS).
- [ ] Export PyTorch EnvironmentalUNet model weights or ONNX graph for optimized inference.
- [ ] Produce municipal commissioner operations and governance deployment manual.
