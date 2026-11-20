# Tech Stack Map

## Overview
PRATYAKSHA is a full-stack B2B Satellite Environmental Intelligence Platform designed for Indian municipal corporations, urban planners, and environmental agencies. It features a hybrid dual-backend architecture: an embedded zero-dependency TypeScript/Node.js server for instant local/demo execution, paired with a specialized Python FastAPI + PostGIS + Google Earth Engine service for high-performance geospatial raster processing and deep learning.

## Languages & Runtimes
| Layer | Language / Version | Runtime / Host | Purpose |
|-------|-------------------|----------------|---------|
| **Frontend** | TypeScript 5.8 | Browser (ES2022 / Vite 6) | High-performance interactive UI & geospatial maps |
| **BFF / App Server** | TypeScript 5.8 | Node.js (via `tsx 4.23`) / Bun | Unified full-stack web app, API routes, demo engines |
| **Geospatial & ML Backend** | Python 3.11+ | Python / Uvicorn | Earth Engine API, PyTorch UNet, PostGIS integrations |
| **Database** | SQL (PostgreSQL 15+) | PostGIS extension | Spatial indexing, polygon geometries, raster metadata |
| **Security Rules** | Common Expression Language (CEL) | Cloud Firestore Rules v2 | Identity-based declarative data protection |

## Frontend Stack & Dependencies
- **Core Framework**: React 19.0.0 (`react`, `react-dom`)
- **Routing**: React Router DOM 7.18.6
- **Styling**: Tailwind CSS 4.1.4 (`@tailwindcss/vite`, `tailwindcss`)
- **Geospatial Visualization**: MapLibre GL JS 6.19.0 (`maplibre-gl`)
- **Data Visualization**: Recharts 3.11.0
- **Icons & Animation**: Lucide React 1.76.0, Framer Motion 14.14.0
- **Document Export**: jsPDF 4.2.1
- **HTTP Client**: Axios 1.21.1

## Backend & Analytics Stack
### TypeScript / Node.js Engine (`src/server/`)
- **Server Framework**: Express 5.3.0 with Vite development middleware
- **Execution Engine**: `tsx` 4.23.15 (TypeScript Execution)
- **Engines Implemented in TypeScript**:
  - `mlEngine.ts`: Isolation Forest path-length scoring approximation, Autoencoder MSE residual scoring, Haversine DBSCAN spatial clustering, multi-model consensus risk scoring (0-100).
  - `forecastEngine.ts`: 7-day, 30-day, and 90-day Prophet/ARIMA/XGBoost curve generators with confidence intervals and RMSE/MAE/MAPE accuracy benchmarks.
  - `segmentationEngine.ts`: 6-class environmental land cover segmentation statistics and 5-year transition matrix.
  - `harmonizer.ts`: CRS normalization (UTM to EPSG:4326), bilinear/bicubic resampling, cloud mask filtering.
  - `reportEngine.ts`: Automated municipal Environment Action Plan synthesis with executive summaries and priority interventions.

### Python Backend (`backend/`)
- **Framework**: FastAPI 0.115.0, Uvicorn 0.32.0, Pydantic 2.9.0
- **ORM & Spatial DB**: SQLAlchemy 2.0.35, GeoAlchemy2 0.15.2, psycopg2-binary 2.9.9
- **Geospatial & Satellite Libraries**:
  - `earthengine-api` 1.2.0 (Google Earth Engine)
  - `geopandas` 1.0.1, `shapely` 2.0.6, `rasterio` 1.4.1, `xarray` 2024.9.0
- **Machine Learning & Time Series**:
  - `scikit-learn` 1.5.2 (IsolationForest, DBSCAN)
  - `prophet` 1.1.6 (Facebook Prophet time-series forecasting)
  - `xgboost` 2.1.1, `statsmodels` 0.14.4 (ARIMA)
  - `torch` 2.4.1 (PyTorch EnvironmentalUNet architecture)

## Database & Cloud Services
- **Google Cloud Firestore**: Client library `firebase 13.4.0`; schemas codified in `firebase-blueprint.json`; security enforced by `firestore.rules`.
- **PostgreSQL 15+ with PostGIS**: Spatial schema and seed data in `backend/database/migrations/001_init_postgis.sql`.
- **Google Earth Engine (GEE)**: Authenticated access to Copernicus Sentinel-1/2, Landsat 8/9, and NASA MODIS/TROPOMI datasets.
