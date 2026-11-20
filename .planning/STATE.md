# Project State & Memory

## Current Context
- **Project**: PRATYAKSHA — Unified Satellite Environmental Intelligence Platform
- **Current Milestone**: Milestone 1 (Production Readiness & Persistence Architecture)
- **Active Phase**: Phase 3 (Cloud Firestore & State Persistence)
- **Status**: Phase 2 (Security & Test Automation Harness) executed and verified (31/31 tests passing). Ready for Phase 3 planning.

---

## Progress Overview

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Core Platform Foundation (7 Modules, MapLibre, In-Memory ML) | Complete |
| **Phase 2** | Security & Test Automation Harness | Complete (Verified) |
| **Phase 3** | Cloud Firestore & State Persistence | Next (Ready to Plan) |
| **Phase 4** | Python FastAPI & PostGIS Gateway | Queued |
| **Phase 5** | Production Earth Engine Pipeline & Deployment | Queued |

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

---

## Immediate Next Steps
1. Run `/gsd-plan-phase 3` to plan Phase 3 (Cloud Firestore & State Persistence).
