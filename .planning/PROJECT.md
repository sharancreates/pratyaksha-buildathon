# PRATYAKSHA — Unified Satellite Environmental Intelligence Platform

> **See the Earth. Understand the Risk. Act Before It Escalates.**

## Executive Summary
PRATYAKSHA is an enterprise B2B Satellite Environmental Intelligence Platform built specifically for Indian municipal corporations, urban planners, and environmental regulatory bodies. The platform ingests multi-mission satellite imagery, executes rigorous geospatial harmonization, extracts ward-level environmental telemetry, detects anomalies using multi-model ML, computes an explainable risk consensus score ($0 - 100$), and synthesizes evidence into exportable Municipal Environment Action Plans.

---

## Problem & Value Proposition
- **The Problem**: Municipal corporations across Indian smart cities face escalating environmental hazards—intense Urban Heat Islands (UHI), air pollution spikes ($\text{NO}_2$ and $\text{PM}_{2.5}$), surface water shrinkage, and vegetation depletion. Existing satellite systems are siloed, require specialized GIS expertise, lack sub-ward granularity, and fail to bridge the gap between raw spectral data and actionable municipal policy.
- **The Solution**: PRATYAKSHA automates the end-to-end intelligence pipeline:
  $$\text{Satellite Data} \longrightarrow \text{Harmonization} \longrightarrow \text{Telemetry} \longrightarrow \text{ML Anomaly Detection} \longrightarrow \text{Risk Consensus} \longrightarrow \text{Forecasts} \longrightarrow \text{Action Plans}$$
- **Key Differentiator**: 
  - Dual-mode architecture: zero-credential deterministic demo mode for instantaneous evaluation + production-ready PostGIS/GEE/PyTorch hooks.
  - Explainable risk consensus breaking down contributions from Isolation Forests, Autoencoder residuals, domain thresholds, and spatial DBSCAN clustering.
  - Built-in compliance with Firestore security invariants preventing data leakage across municipal officers.

---

## System Boundaries & Operational Context

### Target Municipalities (V1 Scope)
1. **Ahmedabad** (Amdavad Municipal Corporation — AMC) - Default demonstration city
2. **Delhi** (Municipal Corporation of Delhi — MCD)
3. **Mumbai** (Brihanmumbai Municipal Corporation — BMC)
4. **Bengaluru** (Bruhat Bengaluru Mahanagara Palike — BBMP)
5. **Chennai** (Greater Chennai Corporation — GCC)

### Core Modules
1. **Command Center (`/`)**: Executive overview with 6 environmental KPI sparkline cards, MapLibre GL geospatial map with 6 layer toggles, ward inspector, and risk distribution.
2. **Satellite Explorer (`/satellite`)**: Multi-mission catalog (Sentinel-1, Sentinel-2, MODIS, Landsat 8/9), spectral band filtering, and interactive harmonization pipeline.
3. **Environmental Analytics (`/analytics`)**: Deep-dive Recharts modules for Heat Islands, Air Quality, NDVI, LST, Water Bodies, and Land Cover.
4. **AI Anomaly Detection (`/anomalies`)**: Multi-model anomaly inspection, Haversine DBSCAN spatial clustering, and officer triage review tracking.
5. **Forecasting Engine (`/forecasting`)**: 7/30/90-day comparative forecasting using Prophet, ARIMA, and XGBoost with RMSE/MAE/MAPE accuracy metrics.
6. **Land Cover Segmentation (`/segmentation`)**: EnvironmentalUNet 6-class segmentation overlay with pixel probe, area statistics, and 5-year transition matrix.
7. **Action Plan (`/action-plan`)**: Automated municipal policy generator synthesizing satellite evidence into structured interventions with PDF and JSON export.

---

## Architecture & Technology Snapshot
- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS v4, MapLibre GL JS, Recharts, Framer Motion, jsPDF
- **BFF / Local Server**: Express 5 on Node.js via `tsx`, in-memory TypeScript analytics engines
- **Heavy Geospatial Backend**: FastAPI, Python 3.11, Earth Engine API, PyTorch, Scikit-Learn, Prophet
- **Persistence**: PostgreSQL 15 + PostGIS (relational/spatial), Google Cloud Firestore (documents/audit)
- **Security**: CEL Firestore Security Rules v2 enforcing PII isolation, terminal locking, and immutable audit logs

---

## Key Contacts & Governance
- **Platform**: PRATYAKSHA Buildathon Initiative
- **Default Superadmin**: `sharanyanagar2@gmail.com`
- **Data Invariants**: Documented in `security_spec.md` and enforced in `firestore.rules`
