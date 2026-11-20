# Phase 7 Plan: Cloud Build CI/CD Automation & Production Verification

## Goal
Implement automated CI/CD pipeline via `cloudbuild.yaml`, develop an automated production smoke verification script (`scripts/gcp/11_smoke_test.sh` / `.ps1`), author the Municipal Commissioner Operations Runbook (`docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`), and validate everything via comprehensive automated tests.

---

## Task Breakdown

### Wave 1: Cloud Build CI/CD Pipeline
- **Task 1.1**: Create root `cloudbuild.yaml`:
  - Step 1: Execute `npm test` verifying all unit, engine, and security suites in `node:22-alpine`.
  - Step 2: Build `pratyaksha-web` and `pratyaksha-geo` images with `$COMMIT_SHA` and `latest` tags.
  - Step 3: Push images to Artifact Registry (`${_REGION}-docker.pkg.dev/$PROJECT_ID/${_REPO_NAME}/...`).
  - Step 4: Deploy `pratyaksha-geo-service` (internal ingress, VPC connector, Cloud SQL mount).
  - Step 5: Deploy `pratyaksha-web-service` (public ingress, `GEO_BACKEND_URL`).
  - Step 6: Execute smoke test against the live Web URL.
  - Substitutions for `_REGION`, `_REPO_NAME`, `_VPC_CONNECTOR`, `_DB_INSTANCE`, `_SA_NAME`.

### Wave 2: Live Smoke Verification Harness
- **Task 2.1**: Create `scripts/gcp/11_smoke_test.sh` and `11_smoke_test.ps1`:
  - Accepts `TARGET_URL` (defaults to local or resolves Cloud Run public URL).
  - Probes `/api/health`, `/api/system/status`, `/api/dashboard/overview`, `/api/ml/anomalies`, `/api/forecast/history`, and `/api/analytics/heat-island`.
  - Validates HTTP 200 status codes, JSON schema fields, and response timing.
  - Provides colored pass/fail terminal reports with exit code 0 on success.

### Wave 3: Municipal Commissioner Operations Runbook
- **Task 3.1**: Create `docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`:
  - Architecture & Data Sovereignty (`asia-south1`).
  - Real-time Health Monitoring, Alerting & SLOs.
  - Emergency Incident Response & Traffic Rollbacks.
  - Secret & Credential Rotation Procedures (GEE keys, Cloud SQL passwords).
  - Cost Optimization & Auto-Scaling Controls (min/max instances, concurrency).

### Wave 4: Automated Verification & Documentation
- **Task 4.1**: Implement `tests/engines/cloudBuildCiCd.test.ts`:
  - Validates `cloudbuild.yaml` syntax, step sequence, substitution defaults, and timeout.
  - Validates smoke test scripts exist and check all required endpoints.
  - Validates operations runbook structure, SLO targets, and emergency commands.
- **Task 4.2**: Execute `npm test` verifying 100% test pass rate across all suites.
- **Task 4.3**: Author `VERIFICATION.md` for Phase 7.
- **Task 4.4**: Update `ROADMAP.md` and `STATE.md` marking Milestone 2 fully complete!

---

## Verification Criteria
- [ ] `cloudbuild.yaml` authored with 8-stage pipeline, substitutions, and 1200s timeout.
- [ ] Smoke test scripts (`11_smoke_test.sh` and `.ps1`) verify health, system, dashboard, and ML endpoints.
- [ ] Operations runbook (`docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`) provides actionable guidance for municipal officers.
- [ ] Automated test suite `tests/engines/cloudBuildCiCd.test.ts` passes with exit code 0.
