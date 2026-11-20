# Project State & Memory

## Current Context
- **Project**: PRATYAKSHA — Unified Satellite Environmental Intelligence Platform
- **Current Milestone**: Milestone 2 (GCP Cloud-Native Production Deployment) — COMPLETE
- **Active Phase**: All Phases Completed (Phases 1–7 fully implemented and verified)
- **Status**: Milestone 2 fully achieved with 55 passing tests across 13 suites. All CI/CD, Cloud Run, PostGIS, VPC, and Firestore artifacts deployed and verified.

---

## Milestone 2 Progress Overview

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 3** | Multi-Service Containerization & Local Compose Verification | Complete (Verified) |
| **Phase 4** | GCP IAM Security, Artifact Registry & Secret Manager | Complete (Verified) |
| **Phase 5** | Cloud SQL PostGIS & Cloud Firestore Database Provisioning | Complete (Verified) |
| **Phase 6** | Cloud Run Dual-Service Deployment & VPC Networking | Complete (Verified) |
| **Phase 7** | Cloud Build CI/CD Automation & Production Verification | Complete (Verified) |

---

## Architectural Decisions Log (ADR Baseline)

- **ADR-01: Dual Backend Strategy**
  - *Decision*: Maintain a self-contained Express + Vite TypeScript backend (`server.ts`) for zero-configuration local runs and demo presentation, while developing the Python FastAPI service (`backend/`) for high-scale raster/GEE compute.
  - *Rationale*: Allows instant evaluation and testing by judges, municipal officers, or developers without setting up PostgreSQL, PostGIS, or Earth Engine credentials.
- **ADR-02: Deterministic Demonstration Fallback**
  - *Decision*: When external credentials (GEE, database) are missing, fallback automatically to rich, labeled synthetic datasets (`smartCitiesData.ts`) covering 5 major Indian metros with 90 days of telemetry.
  - *Rationale*: Guarantees zero downtime, consistent demo experience, and eliminates onboarding hurdles.
- **ADR-03: Explainable Risk Consensus Model**
  - *Decision*: Combine Isolation Forest (38%), Autoencoder MSE (28%), Environmental Thresholds (24%), and DBSCAN Spatial Contagion (10%) into a transparent $0-100$ score.
  - *Rationale*: Municipal authorities require explainability for environmental regulations and budget allocations, which monolithic black-box neural networks cannot provide.
- **ADR-04: Firestore CEL Invariant Enforcement**
  - *Decision*: Enforce PII isolation, terminal locks, and owner-only access at the Firestore rules level rather than relying solely on client code.
  - *Rationale*: Guarantees multi-tenant security and protects municipal officer identities from data scraping.
- **ADR-05: In-Process Rules Invariant Evaluator for Continuous Testing**
  - *Decision*: Implement `rulesEvaluator.ts` mirroring `firestore.rules` predicates to execute the "Dirty Dozen" security assertions natively in Node/Vitest with $< 100\text{ms}$ execution time and zero external daemon prerequisites.
  - *Rationale*: Guarantees continuous regression testing in sandboxed CI pipelines where Java-based Firebase emulators are constrained.
- **ADR-06: Dual-Service Serverless Cloud Run Hosting on GCP**
  - *Decision*: Split the production cloud deployment into two independent Cloud Run services in `asia-south1`: `pratyaksha-web-service` (Node.js 24 React/Express BFF) and `pratyaksha-geo-service` (Python 3.11 FastAPI Geospatial/GEE Engine).
  - *Rationale*: Cloud Run provides native zero-to-N auto-scaling, pay-per-request economics, and avoids cluster management overhead of GKE while providing isolated resource allocation (1 vCPU for Node, 2 vCPU for Python/PyTorch).
- **ADR-07: Secret Manager & IAM Least Privilege with Synthetic Fallback**
  - *Decision*: Use Google Secret Manager and dedicated Cloud Run service accounts (`sa-pratyaksha-runtime`) for GEE, PostGIS, and Firebase credentials, while strictly preserving the automatic fallback to synthetic telemetry if secrets are absent.
  - *Rationale*: Prevents credential leaks in git/container layers while ensuring deployed instances never crash on startup if external GIS quotas or credentials are not yet configured.
- **ADR-08: Serverless VPC Access for Cloud SQL PostGIS Connectivity**
  - *Decision*: Connect Cloud Run services to Cloud SQL for PostgreSQL + PostGIS via a Serverless VPC Access connector using internal RFC 1918 private IPs or Unix sockets.
  - *Rationale*: Eliminates public internet database exposure, reduces latency within `asia-south1`, and secures municipal environmental records.
- **ADR-09: Service-to-Service IAM Token Resolution via Cloud Metadata**
  - *Decision*: Use Google instance metadata server to acquire IAM ID tokens for inter-service communication between `pratyaksha-web-service` and private `pratyaksha-geo-service`.
  - *Rationale*: Eliminates long-lived static tokens or API keys while ensuring zero unauthorized traffic can reach internal GIS services.
- **ADR-10: Automated CI/CD & Live Smoke Verification Gate**
  - *Decision*: Enforce Cloud Build pipeline (`cloudbuild.yaml`) execution where deployments must pass unit/security tests and live smoke tests before release.
  - *Rationale*: Guarantees zero regression and rapid delivery cadence for critical municipal infrastructure updates.

---

## Production Readiness Summary
- **Test Suite**: 55 tests passing across 13 suites.
- **Deployment**: Ready for automated Cloud Build trigger or manual invocation via `scripts/gcp/setup_all.sh` / `setup_all.ps1`.
- **Runbook**: Published at `docs/MUNICIPAL_OPERATIONS_RUNBOOK.md`.
