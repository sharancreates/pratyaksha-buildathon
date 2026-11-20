# Testing Strategy & Verification Guide

## Testing Landscape

### 1. Test Architecture

| Test Area | Primary Artifact | Framework / Engine | Coverage Scope |
|-----------|------------------|-------------------|----------------|
| **Firestore Security Rules** | `firestore.rules.test.ts` | Test schema specification (TDD) | Invariant verification, PII isolation, owner integrity |
| **Static Type Verification** | `npm run lint` | TypeScript (`tsc --noEmit`) | Full frontend & backend TypeScript codebase |
| **Production Build Check** | `npm run build` | Vite 6 + Rollup | Tree shaking, asset bundling, CSS compilation |

### 2. Firestore Security Rules Test Suite (`firestore.rules.test.ts`)
The project implements a Phase 0 TDD verification suite for Cloud Firestore security rules, targeting the "Dirty Dozen" adversarial vectors defined in `security_spec.md`:

```
DD-01: Unauthenticated action_plans read           -> PERMISSION_DENIED
DD-02: Unverified email action_plans create         -> PERMISSION_DENIED
DD-03: Shadow field role injection on user profile  -> PERMISSION_DENIED
DD-04: Shadow field injection on action plan update -> PERMISSION_DENIED
DD-05: Cross-user ownerId spoofing on anomaly review-> PERMISSION_DENIED
DD-06: Cross-user PII get on users collection       -> PERMISSION_DENIED
DD-07: ID poisoning (>128 chars / special chars)    -> PERMISSION_DENIED
DD-08: Terminal state mutation (archived plan)      -> PERMISSION_DENIED
DD-09: Immutable field tampering (createdAt/ownerId)-> PERMISSION_DENIED
DD-10: Client timestamp spoofing                    -> PERMISSION_DENIED
DD-11: Unbounded array / value poisoning            -> PERMISSION_DENIED
DD-12: Blanket list scraping across tenants         -> PERMISSION_DENIED
```

### 3. Execution Commands

#### Static Type Checking
```bash
npm run lint
# Executes: tsc --noEmit
```

#### Production Build
```bash
npm run build
# Executes: vite build
```

#### Development Server Execution
```bash
npm run dev
# Executes: tsx server.ts
```

### 4. Testing Gaps & Recommended Additions
1. **Automated Firestore Unit Testing**: Wire `@firebase/rules-unit-testing` with the Firebase Emulator Suite to run `firestore.rules.test.ts` as an automated CI test runner.
2. **Unit Tests for Analytics Engines**: Add Vitest suites covering:
   - `mlEngine.ts` (Isolation forest anomaly scores, DBSCAN clustering bounds)
   - `forecastEngine.ts` (Prophet/ARIMA algorithm convergence, confidence interval calculation)
   - `harmonizer.ts` (CRS reprojection and cloud mask thresholding)
3. **Frontend E2E / Component Testing**: Add Playwright / Vitest + React Testing Library tests for:
   - Map rendering and layer toggle behavior in `IntelligenceMap.tsx`
   - PDF export generation in `ActionPlan.tsx`
   - Municipality selector state transitions in `Layout.tsx`
