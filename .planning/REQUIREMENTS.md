# Requirements Specification

## Status: Approved Baseline + Milestone 2 (GCP Deployment)

---

## 1. Geospatial & Satellite Data Requirements

- **REQ-GEO-01 (Multi-Mission Ingestion)**: System shall support metadata cataloging and band extraction for ESA Sentinel-1 (SAR), ESA Sentinel-2 (Optical MSI), NASA MODIS / Sentinel-5P TROPOMI (Atmospheric), and Landsat 8/9 (Thermal TIRS).
- **REQ-GEO-02 (Harmonization Pipeline)**: System shall provide a 4-stage harmonization pipeline:
  1. Coordinate Reference System (CRS) normalization (UTM zones $\to$ EPSG:4326 WGS84).
  2. Spatial reprojection.
  3. Resampling (bilinear/bicubic to uniform target grid, default 30m).
  4. Temporal alignment and cloud mask filtering ($<25\%$ threshold).
- **REQ-GEO-03 (Interactive Map Visualization)**: MapLibre GL map shall support base layer switching (Satellite vs Dark Matter) and provide independent toggles for 6 geospatial overlays: Ward Boundaries, Urban Heat Island, NDVI, Air Quality / $\text{NO}_2$, Risk Zones, and Land Cover.
- **REQ-GEO-04 (Ward Level Granularity)**: Telemetry and polygon geometries shall be rendered for municipal wards across the 5 target cities (Ahmedabad, Delhi, Mumbai, Bengaluru, Chennai).

---

## 2. Machine Learning & Anomaly Consensus Requirements

- **REQ-ML-01 (Multivariate Anomaly Detection)**: System shall evaluate ward telemetry using Isolation Forest (path-length deviation) and Autoencoder reconstruction MSE ($0.0 - 1.0$).
- **REQ-ML-02 (Spatial DBSCAN Clustering)**: Hotspots shall be clustered using the Haversine metric ($\epsilon = 12.5\text{ km}$, $\text{min\_samples} = 2$) to detect regional multi-ward hazard contagion.
- **REQ-ML-03 (Explainable Risk Consensus)**: System shall calculate an explainable $0-100$ consensus score with transparent contribution weights:
  - Isolation Forest: up to 38 pts
  - Autoencoder MSE: up to 28 pts
  - Environmental Threshold: up to 24 pts
  - Spatial Density Cluster: up to 10 pts
- **REQ-ML-04 (Officer Triage Logging)**: Officers shall be able to inspect anomalies, update triage status (`open`, `investigating`, `mitigated`, `resolved`), assign municipal departments, and log notes.

---

## 3. Analytics & Predictive Forecasting Requirements

- **REQ-ANL-01 (Telemetry Analytics)**: Provide interactive Recharts modules for LST, NDVI, $\text{NO}_2$, AQI, Water Body surface area, and Land Cover breakdown.
- **REQ-ANL-02 (Multi-Model Forecasting)**: Forecast indicators over 7-day, 30-day, and 90-day horizons comparing Facebook Prophet, ARIMA, and XGBoost models.
- **REQ-ANL-03 (Forecast Accuracy Metrics)**: Output benchmark metrics (RMSE, MAE, MAPE) and confidence intervals (upper/lower bounds) for each algorithm.

---

## 4. Land Cover Segmentation Requirements

- **REQ-SEG-01 (6-Class Environmental UNet)**: Segment satellite imagery into 6 classes: Water Body, Dense Urban, Sparse Built-up, Dense Vegetation, Open Ground, and Bare/Barren Soil.
- **REQ-SEG-02 (Interactive Canvas Overlay)**: Allow opacity adjustment, pixel probing (class identification on click), and real-time class area percentage computation.
- **REQ-SEG-03 (Transition Matrix)**: Compute 5-year historical land-use transition matrix tracking urban encroachment on water and vegetation.

---

## 5. Municipal Action Plan Requirements

- **REQ-ACT-01 (Automated Plan Synthesis)**: Generate municipal policy recommendations synthesizing satellite evidence, anomaly counts, and risk distribution into prioritized action items.
- **REQ-ACT-02 (Multi-Format Export)**: Support one-click client-side PDF document generation and structured JSON governance export.
- **REQ-ACT-03 (Plan Lifecycle Management)**: Support lifecycle states: `draft`, `approved`, and `archived`.

---

## 6. Security, PII & Firestore Invariants

- **REQ-SEC-01 (PII Isolation)**: Officer profiles in `/users/{userId}` shall be accessible solely by `request.auth.uid == userId` or verified superadmin. Blanket `list` queries on `/users` are strictly prohibited.
- **REQ-SEC-02 (Tenant & Owner Integrity)**: Every document in `/action_plans`, `/anomaly_reviews`, and `/processing_jobs` must carry immutable `ownerId == request.auth.uid`.
- **REQ-SEC-03 (Verified Email Gate)**: Write access across all operational collections requires `request.auth != null && request.auth.token.email_verified == true`.
- **REQ-SEC-04 (Terminal State Immutability)**: Documents in terminal states (`action_plans` with status `archived`, `anomaly_reviews` with status `resolved`, `processing_jobs` with status `completed`) cannot be altered by non-admin users.
- **REQ-SEC-05 (Payload Hardening)**: Document IDs must conform to `^[a-zA-Z0-9_-]{1,128}$`, string lengths must be bounded, and array sizes constrained ($\le 10$ items for `priorityActions`).

---

## 7. System Health & Resilience

- **REQ-RES-01 (Deterministic Demo Fallback)**: In the absence of live GEE credentials, PostgreSQL database, or PyTorch weights, all platform features must function reliably with labeled synthetic demonstration data.
- **REQ-RES-02 (Sub-Second UI Response)**: Dashboard filtering and city switching must render instantaneously without blocking UI threads.

---

## 8. Milestone 2: GCP Cloud-Native Deployment Requirements

- **REQ-DEP-01 (Multi-Stage Docker Packaging)**:
  - Web BFF container (`Dockerfile`): Multi-stage build producing an optimized Node 24 Alpine image bundling compiled React 19 static assets and Express 5 server.
  - Python GIS container (`backend/Dockerfile`): Multi-stage Debian Bookworm build packaging FastAPI, Earth Engine API, Scikit-Learn, PyTorch CPU, and Uvicorn runtime.
- **REQ-DEP-02 (Local Docker Compose Verification)**:
  - System shall provide `docker-compose.yml` orchestrating `web`, `backend`, and `postgis` services with health check dependencies and volume mounting for rapid offline validation.
- **REQ-DEP-03 (Google Artifact Registry Ingestion)**:
  - Container images shall be tagged and pushed to an OCI-compliant Google Artifact Registry repository (`asia-south1-docker.pkg.dev/<project>/pratyaksha-repo/`).
- **REQ-DEP-04 (Cloud Run Dual-Service Architecture)**:
  - Deploy `pratyaksha-web-service` and `pratyaksha-geo-service` to Google Cloud Run in `asia-south1` (Mumbai).
  - Configure auto-scaling ($0 \to 10$ instances) with custom CPU/memory thresholds ($1\text{ vCPU}/512\text{ MiB}$ for Web, $2\text{ vCPU}/2\text{ GiB}$ for Geo).
- **REQ-DEP-05 (Cloud SQL PostGIS Provisioning)**:
  - Provision a Cloud SQL PostgreSQL 15 instance with PostGIS spatial extensions enabled.
  - Execute spatial migrations (`001_init_postgis.sql`) initializing ward geometry polygons and spatial indices.
- **REQ-DEP-06 (Cloud IAM & Workload Identity Least Privilege)**:
  - Establish dedicated runtime Service Account (`sa-pratyaksha-runtime`) with scoped permissions: `roles/secretmanager.secretAccessor`, `roles/cloudsql.client`, `roles/datastore.user`, and Earth Engine access.
- **REQ-DEP-07 (Secret Manager Credential Injection)**:
  - Inject database connection strings, Earth Engine credentials, and Firebase configurations dynamically via Google Secret Manager without committing secrets to source control.
- **REQ-DEP-08 (Serverless VPC Access & Service-to-Service Networking)**:
  - Configure a Serverless VPC Access connector enabling private, low-latency communication between Cloud Run services and Cloud SQL without public internet egress.
  - Route `/api/py/*` requests from Web BFF to Geo Backend over authenticated internal endpoints.
- **REQ-DEP-09 (Cloud Build CI/CD Automation)**:
  - Implement `cloudbuild.yaml` supporting automated build, unit testing, container compilation, and blue-green Cloud Run deployments triggered on Git commit.
- **REQ-DEP-10 (Production Smoke Testing & Synthetic Fallback Assurance)**:
  - System shall verify automated smoke test suites verifying HTTP 200 responses on `/api/health`, `/api/dashboard/overview`, and `/api/anomalies/ahmedabad` post-deployment, guaranteeing zero downtime if external GEE quotas fail.
