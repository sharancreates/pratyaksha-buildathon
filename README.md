# PRATYAKSHA — Unified Satellite Environmental Intelligence Platform

> **See the Earth. Understand the Risk. Act Before It Escalates.**

PRATYAKSHA is a full-stack B2B Satellite Environmental Intelligence Platform designed for Indian municipal corporations, urban planners, and government environmental agencies. It automates the end-to-end intelligence pipeline:

`Satellite Data → Geospatial Harmonization → Environmental Indicators → ML Anomaly Detection → Risk Consensus → Forecasting → Land Cover Segmentation → Municipal Environment Action Plan`

---

## Core Modules

1. **Command Center (`/`)**: 6 live environmental KPI cards with sparklines, interactive **MapLibre GL JS** geospatial map (Satellite & Dark basemaps, toggleable Heat Island, NDVI, Air Quality/NO₂, Risk Zones, Land Cover, and Ward Boundary layers), ward telemetry inspector, anomaly alerts, and risk distribution.
2. **Satellite Data Explorer (`/satellite`)**: Multi-mission catalog (ESA Sentinel-1, ESA Sentinel-2, NASA MODIS/TROPOMI, Landsat 8/9), spectral band & cloud-coverage filtering, and executable Geospatial Harmonization pipeline (`CRS Normalization → Reprojection → Resampling → Temporal Alignment`).
3. **Environmental Analytics (`/analytics`)**: Dedicated Recharts analytical modules for Urban Heat Islands, Air Quality & NO₂, Vegetation & NDVI, Land Surface Temperature, Water Body Monitoring, and Land Use & Land Cover.
4. **AI Anomaly Detection (`/anomalies`)**: Isolation Forest + Autoencoder MSE + Haversine DBSCAN Spatial Clustering + Explainable Multi-Model Risk Consensus with officer triage review logging.
5. **Forecasting Engine (`/forecasting`)**: 7-day, 30-day, and illustrative 90-day forecasts comparing Facebook Prophet, ARIMA, and XGBoost with confidence intervals and RMSE/MAE/MAPE benchmarks.
6. **Land Cover Segmentation (`/segmentation`)**: EnvironmentalUNet 6-class segmentation over nadir satellite imagery with adjustable canvas overlay opacity, pixel probe, area statistics, and 5-year transition matrix.
7. **Environment Action Plan (`/action-plan`)**: Automated municipal policy generator synthesizing satellite evidence, ML findings, and forecasts into structured government recommendations with **PDF** and **JSON** export plus persistent report history.

---

## Demo Data & Transparency

- Includes deterministic demonstration datasets for **Ahmedabad (default)**, **Delhi**, **Mumbai**, **Bengaluru**, and **Chennai**.
- When Google Earth Engine credentials or trained PyTorch UNet weights are not configured, **DEMO MODE** activates automatically and is explicitly labeled across the UI and API responses.

---

## Local Setup

### 1. Unified Full-Stack Web App (React + Vite + Express API on Port 3000)

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. All `/api/*` endpoints and the React frontend run together on port 3000 with zero external credential requirements.

### 2. Optional Python FastAPI + PostgreSQL/PostGIS Backend (`/backend`)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

#### PostgreSQL + PostGIS Database Setup & Seed

```bash
createdb pratyaksha
psql -d pratyaksha -f backend/database/migrations/001_init_postgis.sql
```

#### Google Earth Engine Authentication (Optional)

```bash
earthengine authenticate
# Or set GEE_SERVICE_ACCOUNT and GEE_PRIVATE_KEY_PATH in .env
```

#### Start FastAPI Server

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Build & Verification

```bash
npm run lint
npm run build
```