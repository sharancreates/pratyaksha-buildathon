# Code Conventions & Engineering Standards

## Coding Standards

### 1. TypeScript & Language Standards
- **Target & Module**: ES2022 with Node ESM (`"type": "module"` in `package.json`, `"moduleResolution": "bundler"` in `tsconfig.json`).
- **Strict Typing**: TypeScript `strict` mode is enabled. Shared data types are consolidated in `src/shared/types.ts`. Avoid `any`; use discriminating unions (e.g. `MunicipalityId = 'ahmedabad' | 'delhi' | 'mumbai' | 'bengaluru' | 'chennai'`).
- **Import Paths**: Clean relative imports or Vite alias paths. Extension-less imports in frontend code; explicit `.ts` extensions in Node server code where required by ESM.

### 2. React & Component Patterns
- **React 19 Standards**: Functional components with React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`).
- **Context Usage**: Shared global state (active city, active layer toggles, date ranges, triage review queue) is managed via `AppContext.tsx`.
- **Component Decomposition**:
  - Clear separation between presentation components (`KpiCard.tsx`, `Layout.tsx`), geospatial components (`IntelligenceMap.tsx`), and route pages (`src/pages/*`).
  - Error boundaries wrap key components (`ErrorBoundary.tsx`) to prevent app crashes during complex map/chart rendering.

### 3. Styling & Theming
- **Tailwind CSS v4**: Utilizes the modern `@tailwindcss/vite` plugin.
- **Visual Aesthetic**: Aerospace / Cyber-Intelligence Dark Theme:
  - Backgrounds: `bg-slate-950`, `bg-slate-900`, `bg-slate-800/80` with glassmorphic borders (`border-slate-800`).
  - Accents:
    - Primary / Normal: Emerald (`emerald-400`, `emerald-500`)
    - Air / Sensor: Cyan (`cyan-400`, `cyan-500`)
    - Warning / Moderate: Amber (`amber-400`, `amber-500`)
    - Danger / Critical Anomaly: Rose (`rose-400`, `rose-500`)
    - Satellite & Space: Indigo / Violet (`indigo-400`, `violet-400`)

### 4. Backend Conventions
- **Dual-Engine Consistency**: Both the TypeScript engines (`src/server/engines/`) and Python services (`backend/services/`, `backend/ml/`) adhere to common output schemas:
  - Anomaly scores normalized to $[0.0, 1.0]$.
  - Risk consensus scores normalized to integer $[0, 100]$.
  - Standardized severity categorization: `low`, `moderate`, `high`, `critical`.
- **API Response Structure**:
  - Consistent JSON payloads.
  - Transparent mode reporting via `data_mode` (`LIVE_GEE` vs `DEMO_FALLBACK`).

### 5. Error Handling & Resilience
- **Graceful Degradation**: When external services (Google Earth Engine, PostGIS, Firebase Auth) are not reachable or configured, the system automatically falls back to deterministic in-memory fixtures (`DEMO_FALLBACK`).
- **User Feedback**: The UI explicitly flags demo/synthetic state in badges and headers, maintaining honesty and transparency for governance audits.
