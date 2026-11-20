# Codebase Structure Map

## Directory Tree

```
pratyaksha-buildathon/
├── .env.example                       # Environment template (GEE, DB, Port configs)
├── .gitignore                         # Git exclusion rules
├── bun.lock                           # Bun lockfile
├── eslint.config.js                   # ESLint configuration
├── firebase-blueprint.json            # Entity schemas & Firestore blueprint
├── firestore.rules                    # Production Firestore CEL security rules
├── firestore.rules.test.ts            # TDD Dirty Dozen security assertion suite
├── index.html                         # HTML entrypoint
├── metadata.json                      # Project metadata
├── package.json                       # Node dependencies & build scripts
├── README.md                          # Documentation & quickstart
├── security_spec.md                   # Firestore security specifications & invariant checklist
├── server.ts                          # Unified Node.js Express server + API endpoints (598 lines)
├── tsconfig.json                      # TypeScript compiler configuration
├── vite.config.ts                     # Vite + React + Tailwind v4 build config
│
├── backend/                           # Python FastAPI + Geospatial Backend
│   ├── main.py                        # FastAPI application entrypoint & REST routes
│   ├── requirements.txt               # Python package dependencies
│   ├── database/
│   │   └── migrations/
│   │       └── 001_init_postgis.sql   # PostGIS schema & smart cities seed data
│   ├── ml/
│   │   └── intelligence_models.py     # IsolationForest, DBSCAN, Prophet, RiskConsensus, UNet
│   └── services/
│       ├── earth_engine.py            # GEE service with DEMO_FALLBACK
│       └── harmonizer.py              # Geospatial CRS & resolution harmonization
│
└── src/                               # React 19 Frontend & TypeScript Engines
    ├── App.tsx                        # Root application layout & route declarations
    ├── index.css                      # Tailwind v4 theme & global typography
    ├── main.tsx                       # React DOM root initialization
    ├── vite-env.d.ts                  # Vite client type definitions
    │
    ├── assets/
    │   └── images/                    # Satellite nadir imagery assets for UNet segmentation
    │       ├── satellite_ahmedabad_nadir_1795150976598.jpg
    │       └── satellite_bengaluru_nadir_1795150979193.jpg
    │
    ├── components/                    # Reusable UI & Geospatial Components
    │   ├── ErrorBoundary.tsx          # React error boundary with fallback UI
    │   ├── IntelligenceMap.tsx        # MapLibre GL JS interactive map with multi-layer overlays
    │   ├── KpiCard.tsx                # Environmental KPI cards with mini sparklines
    │   └── Layout.tsx                 # Navigation sidebar, topbar, municipality selector, notifications
    │
    ├── context/                       # Global Client State
    │   └── AppContext.tsx             # City selection, date range, layer toggles, alert state
    │
    ├── pages/                         # Route-Level Page Views
    │   ├── ActionPlan.tsx             # Municipal Action Plan generator, PDF & JSON export
    │   ├── AnomalyDetection.tsx       # ML Anomaly triage, DBSCAN clusters, officer review
    │   ├── CommandCenter.tsx          # Executive dashboard with map and 6 telemetry KPIs
    │   ├── EnvironmentalAnalytics.tsx # Deep-dive Recharts analytical graphs
    │   ├── ForecastingEngine.tsx      # Comparative forecasting (Prophet, ARIMA, XGBoost)
    │   ├── LandCoverSegmentation.tsx  # 6-class UNet canvas overlay, pixel probe, transition matrix
    │   └── SatelliteExplorer.tsx      # Catalog search & Geospatial Harmonization pipeline
    │
    ├── server/                        # TypeScript Server Data & Analytics Engines
    │   ├── data/
    │   │   └── smartCitiesData.ts     # Deterministic 5-city smart city dataset & 90-day history
    │   └── engines/
    │       ├── forecastEngine.ts      # Multi-algorithm forecast curve generator
    │       ├── harmonizer.ts          # Resampling, CRS normalization & cloud masking
    │       ├── mlEngine.ts            # Isolation Forest, Autoencoder MSE, DBSCAN & Consensus
    │       ├── reportEngine.ts        # Automated municipal action plan generator
    │       └── segmentationEngine.ts  # Land cover class stats & transition matrices
    │
    └── shared/                        # Shared TypeScript Definitions
        └── types.ts                   # Core interfaces, Enums, Municipality profiles, DTOs
```

## Key Files & Responsibilities

| File Path | Description |
|-----------|-------------|
| `server.ts` | Express 5 application hosting all `/api/*` routes, Vite middleware integration, and in-memory engine dispatch. |
| `src/shared/types.ts` | Single source of truth for TypeScript types across frontend and server. |
| `src/server/data/smartCitiesData.ts` | Complete telemetry, polygon coordinates, and 90-day time series for 5 smart cities (Ahmedabad, Delhi, Mumbai, Bengaluru, Chennai). |
| `src/server/engines/mlEngine.ts` | In-memory execution of Isolation Forest, Autoencoder MSE residual, and spatial DBSCAN clustering. |
| `src/components/IntelligenceMap.tsx` | High-performance MapLibre GL implementation with 6 interactive layer toggles and ward polygon popups. |
| `backend/main.py` | FastAPI application serving `/api/health`, `/api/satellite/harmonize`, and `/api/forecast/predict`. |
| `backend/ml/intelligence_models.py` | Python machine learning suite wrapping Scikit-Learn, PyTorch, and Prophet. |
| `firestore.rules` | 260-line hardened Firestore security specification implementing PII isolation, terminal locks, and owner integrity. |
| `security_spec.md` | Formal specifications detailing data invariants and the "Dirty Dozen" adversarial security tests. |
