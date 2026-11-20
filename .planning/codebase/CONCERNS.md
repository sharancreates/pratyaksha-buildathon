# Technical Concerns, Risks & Tech Debt

## Priority Issues & Risk Matrix

| Risk / Concern | Severity | Category | Affected Area | Impact |
|----------------|----------|----------|---------------|--------|
| **Dual Backend Feature Parity** | High | Architectural Drift | `server.ts` vs `backend/` | TypeScript in-memory engine and Python FastAPI may drift out of sync if new algorithms are added to one but not the other. |
| **Database Persistence Disconnect** | High | Persistence | UI / `server.ts` | The React UI currently talks to the Node Express endpoints which operate purely on in-memory fixtures (`smartCitiesData.ts`). PostGIS and Firestore are designed but not fully plumbed to the active UI state. |
| **Missing Automated Test Runner** | Medium | Quality / CI | `firestore.rules.test.ts` | The security suite is written as a TypeScript specification structure, but needs an active test runner harness (`vitest` + `@firebase/rules-unit-testing`) to execute in CI. |
| **Package Manager Inconsistency** | Low | Tooling | `bun.lock` vs `package.json` | Repo includes `bun.lock` alongside standard npm/node setup, which can cause confusion regarding the intended package manager. |
| **Production Earth Engine Credentials** | Medium | Infrastructure | `backend/services/earth_engine.py` | Live GEE credentials are required for production data. In absence of credentials, fallback works reliably, but production deployment requires service account provisioning. |

---

## Detailed Analysis

### 1. Architectural Parity between Node.js and Python
- **Context**: PRATYAKSHA provides two backend paths:
  1. Node.js + Express (`server.ts` + `src/server/engines/*`): Implements lightweight in-memory simulations of Isolation Forest, Autoencoder MSE, DBSCAN, and Prophet curves.
  2. Python + FastAPI (`backend/*`): Implements production Scikit-Learn `IsolationForest`, `DBSCAN`, `Prophet`, and PyTorch `EnvironmentalUNet`.
- **Risk**: Without a unified proxy or API gateway contract, changes to ML scoring weights or telemetry formulas in one runtime could lead to inconsistent risk consensus scores between the local demo and the production Python service.
- **Remediation**:
  - Expose a single API routing layer (e.g. `server.ts` proxies to `localhost:8000` when FastAPI is healthy, falling back to local TypeScript engines when offline).
  - Define shared JSON schemas for all request/response DTOs.

### 2. State Persistence & Database Plumb-Through
- **Context**: The application features sophisticated data schemas in `backend/database/migrations/001_init_postgis.sql` and `firebase-blueprint.json`. However, officer actions (such as logging an anomaly triage review, updating status, or saving an action plan) currently persist to in-memory arrays in `server.ts`.
- **Risk**: Officer triage decisions and custom action plans do not persist across server restarts unless Firestore or PostGIS is connected.
- **Remediation**:
  - Integrate Firestore client in the frontend for `/action_plans` and `/anomaly_reviews`.
  - Provide a configuration toggle (`VITE_USE_FIRESTORE=true`) to enable live cloud persistence while retaining in-memory fallback.

### 3. Testing Harness Implementation
- **Context**: `firestore.rules` has exhaustive security rules, and `firestore.rules.test.ts` lists all 12 adversarial test cases.
- **Risk**: Without an automated test script configured in `package.json` (e.g. `npm test`), regressions in security rules or business logic might not be caught during rapid development.
- **Remediation**:
  - Add `vitest` to `devDependencies`.
  - Add `npm test` script executing the security rules against Firebase Local Emulator or mock context.

### 4. Satellite Imagery Hardware Acceleration & UNet Weights
- **Context**: `LandCoverSegmentation.tsx` visualizes 6-class land cover segmentation over nadir images.
- **Risk**: Running live inference with PyTorch `EnvironmentalUNet` on high-resolution GeoTIFFs requires GPU resources or optimized ONNX models if run in browser or Node.
- **Remediation**:
  - Export trained PyTorch weights to ONNX / TensorFlow.js for direct client-side edge inference, or maintain precomputed tile pyramids in Cloud Storage.
