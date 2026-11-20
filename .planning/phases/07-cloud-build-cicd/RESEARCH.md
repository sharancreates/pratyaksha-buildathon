# Phase 7 Research: Cloud Build CI/CD Automation & Production Verification

## 1. Domain Objective
Establish an enterprise-grade automated CI/CD pipeline using Google Cloud Build, author an end-to-end smoke verification harness for live Cloud Run endpoints, and formulate a comprehensive Municipal Commissioner Operations Runbook. This represents the concluding phase of **Milestone 2: GCP Cloud-Native Production Deployment**.

---

## 2. Technical Architecture & Component Specification

### 2.1 Google Cloud Build Pipeline (`cloudbuild.yaml`)
Cloud Build orchestrates an 8-stage automated delivery pipeline triggered on commits or manual submission:
```
  [ Commit / Push to main ]
             │
             ▼
  ┌──────────────────────────────────────────┐
  │ Stage 1: Continuous Security & Testing   │ (node:22-alpine -> npm test)
  └──────────────────┬───────────────────────┘
                     │ (All 52 tests pass)
                     ▼
  ┌──────────────────────────────────────────┐
  │ Stage 2: Parallel Docker Image Builds    │ (Web & Geo images tagged with $COMMIT_SHA)
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │ Stage 3: Artifact Registry Pushes        │ (asia-south1-docker.pkg.dev/...:tag & :latest)
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │ Stage 4: Deploy Internal Geo Microservice│ (Cloud Run: 2 vCPU, 2 GiB, VPC connector)
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │ Stage 5: Deploy Public Web BFF Service   │ (Cloud Run: 1 vCPU, 512 MiB, GEO_BACKEND_URL)
  └──────────────────┬───────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────┐
  │ Stage 6: Automated Live E2E Smoke Tests  │ (scripts/gcp/11_smoke_test.sh against Web URL)
  └──────────────────────────────────────────┘
```

- **Cloud Build Substitutions**:
  - `_REGION`: `asia-south1`
  - `_REPO_NAME`: `pratyaksha-repo`
  - `_VPC_CONNECTOR`: `pratyaksha-vpc-conn`
  - `_DB_INSTANCE`: `pratyaksha-db`
  - `_SA_NAME`: `sa-pratyaksha-runtime`
- **Build Options & Logging**:
  - `logging: CLOUD_LOGGING_ONLY`
  - `timeout: 1200s`

### 2.2 Live Production Smoke Test Harness (`scripts/gcp/11_smoke_test.sh` / `.ps1`)
The smoke test script probes critical platform endpoints against a live or local endpoint:
1. `GET /api/health`: Asserts HTTP 200, `status === "healthy"`, presence of `earthEngineMode`.
2. `GET /api/system/status`: Asserts HTTP 200, `platform === "PRATYAKSHA"`, presence of 5 municipal jurisdictions.
3. `GET /api/dashboard/overview?municipality=ahmedabad`: Asserts HTTP 200, KPI array length $\ge 4$, wards, anomalies, clusters.
4. `GET /api/ml/anomalies?municipality=ahmedabad`: Asserts HTTP 200, summary metrics, ranked anomalies list.
5. `GET /api/forecast/history?municipality=mumbai`: Asserts HTTP 200, 90-day telemetry series.
6. `GET /api/analytics/heat-island?municipality=delhi`: Asserts HTTP 200, UHI intensity, ward temperatures.

### 2.3 Municipal Commissioner Operations Runbook (`docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`)
Designed for municipal decision-makers, disaster response teams, and urban engineering leads:
- **Topology & Data Sovereignty**: All telemetry processed within India (`asia-south1` Mumbai).
- **Service Level Objectives (SLOs)**:
  - 99.9% API uptime for municipal surveillance.
  - $< 200\text{ms}$ median latency on dashboard queries.
  - Zero downtime automated failover to synthetic baseline (**ADR-02**).
- **Security & Multi-Tenant Access Controls**:
  - Firestore security rule enforcement (**ADR-04**).
  - Least-privilege IAM service accounts (**ADR-07**).
  - PostgreSQL pgaudit spatial access logs.
- **Scaling, Budget, & Incident Management**:
  - Zero-to-N auto-scaling controls.
  - GEE quota and Secret Manager key rotation.
  - Emergency rollback commands via `gcloud run services update-traffic`.

---

## 3. Deliverables Checklist
1. `cloudbuild.yaml` in project root.
2. `scripts/gcp/11_smoke_test.sh` and `11_smoke_test.ps1`.
3. `docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`.
4. Automated test suite `tests/engines/cloudBuildCiCd.test.ts`.
5. `.planning/phases/07-cloud-build-cicd/PLAN.md` and `VERIFICATION.md`.
