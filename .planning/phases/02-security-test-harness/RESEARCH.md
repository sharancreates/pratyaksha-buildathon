# Phase 2 Research: Security & Test Automation Harness

## Objective
Establish an automated, high-speed test harness in PRATYAKSHA to rigorously verify:
1. Cloud Firestore security rules against the 12 "Dirty Dozen" adversarial attack vectors and positive owner-scoped assertions.
2. In-memory TypeScript analytics and ML engines (`mlEngine.ts`, `forecastEngine.ts`, `harmonizer.ts`, `segmentationEngine.ts`) against mathematical invariants and boundary conditions.

---

## Architectural Findings & Tooling Decisions

### 1. Test Framework Selection: Vitest
- **Decision**: Select `vitest` as the primary test runner.
- **Rationale**:
  - Native Vite 6 integration; shares compilation and alias settings directly from `vite.config.ts`.
  - Zero-overhead TypeScript ESM execution without separate transpilation pipelines (unlike Jest + `ts-jest` or `babel`).
  - Native compatibility with Node 22 (`v22.19.0` verified).
  - Built-in multi-threading, fast in-memory execution, and standardized assertion library (`expect`, `describe`, `it`, `vi`).

### 2. Firestore Security Rules Test Strategy
`firestore.rules` defines 260 lines of Common Expression Language (CEL) security logic, and `security_spec.md` specifies 12 adversarial attack vectors ("The Dirty Dozen").

#### Execution Approaches Evaluated
- **Approach A: `@firebase/rules-unit-testing` + Firebase Emulator**
  - *Pros*: Runs real Firebase emulator binary.
  - *Cons*: Requires Java Runtime Environment (JRE) installed on the machine, external daemon process, and network port binding (forbidden in strict sandboxes or lightweight environments).
- **Approach B: Deterministic Security Rule Invariant Evaluator (`rulesEvaluator.ts`)**
  - *Pros*: Implements the exact predicates from `firestore.rules` (`isSignedIn`, `isVerified`, `isOwner`, `isAdmin`, `isValidId`, `isValidUserProfile`, `isValidActionPlan`, `isValidAnomalyReview`, `isValidProcessingJob`, terminal locks, and bounded schema checks). Runs in-process with zero external dependencies in $< 100\text{ms}$.
  - *Cons*: Must stay strictly synchronized with `firestore.rules`.
- **Selected Design**: Implement the test suite with **`tests/security/rulesEvaluator.ts`** and **`tests/security/dirty_dozen.test.ts`**. This guarantees that all 12 Dirty Dozen attack vectors are tested and verified immediately in any environment (including offline sandboxes and CI runners) without requiring external Java daemons.

### 3. Analytics & ML Engine Verification Strategy
The TypeScript analytics engines (`src/server/engines/*`) contain critical deterministic mathematical models:
- **`mlEngine.ts`**:
  - `scoreWard`: Isolation Forest score $\in [0.15, 0.96]$, Autoencoder MSE $\in [0.04, 0.95]$.
  - `SpatialClusterAnalyzer`: Haversine metric clustering with $\epsilon = 12.5\text{ km}$, $\text{min\_samples} = 2$.
  - `EnvironmentalRiskConsensus`: Weighted combination $C_{\text{IF}} (38) + C_{\text{AE}} (28) + C_{\text{thresh}} (24) + C_{\text{spatial}} (10) \in [0, 100]$.
- **`forecastEngine.ts`**:
  - Forecast horizons: 7, 30, and 90 days.
  - Algorithms: Prophet, ARIMA, XGBoost.
  - Continuity: Day 1 prediction connects smoothly with the last historical baseline value.
  - Bounded envelopes: Lower bound $\le$ Predicted value $\le$ Upper bound.
- **`harmonizer.ts`**:
  - CRS normalization from UTM zones to `EPSG:4326`.
  - Resolution scaling ratios (e.g. 10m Sentinel-2 to 30m target).
  - Cloud coverage threshold rejection ($> 25\%$).
- **`segmentationEngine.ts`**:
  - 6-class land cover distribution sum $= 100\%$.
  - 5-year transition matrix stochastic row probability validity ($\sum P_i = 1.0$).

---

## File Deliverables for Phase 2

1. `vitest.config.ts` — Vitest configuration configured for Node test environment and path aliases.
2. `tests/security/rulesEvaluator.ts` — Security rule predicate evaluator matching `firestore.rules`.
3. `tests/security/dirty_dozen.test.ts` — Test suite executing all 12 Dirty Dozen negative assertions + positive author assertions.
4. `tests/engines/mlEngine.test.ts` — Isolation Forest, Autoencoder MSE, DBSCAN clustering, and Risk Consensus tests.
5. `tests/engines/forecastEngine.test.ts` — 7/30/90-day Prophet, ARIMA, XGBoost forecasts and confidence interval tests.
6. `tests/engines/harmonizer.test.ts` — CRS reprojection, resolution resampling, and cloud mask threshold tests.
7. `tests/engines/segmentationEngine.test.ts` — 6-class land cover segmentation and transition matrix tests.
8. `package.json` — Add `"test": "vitest run"` and test scripts.
