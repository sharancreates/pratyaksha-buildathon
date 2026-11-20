# PRATYAKSHA GCP Cloud-Native Deployment Architecture & Research

## 1. Executive Deployment Topology

PRATYAKSHA is architected as a high-performance, cost-effective, serverless containerized deployment on Google Cloud Platform (GCP), hosted in the **`asia-south1` (Mumbai)** region to ensure low-latency data access for Indian municipal corporations.

```
                              [ HTTPS User Traffic ]
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          Google Cloud Run (Web BFF)       │
                  │   Node.js 24 + Express + React 19 SPA     │
                  │        (pratyaksha-web-service)           │
                  └─────────────────────┬─────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │ Internal Service-to-     │ Firestore SDK            │ Client
             │ Service Reverse Proxy    │ (asia-south1)            │ Invariants
             ▼                          ▼                          ▼
┌───────────────────────────┐ ┌───────────────────┐      ┌──────────────────┐
│   Google Cloud Run (Geo)  │ │  Cloud Firestore  │      │  Officer Browser │
│   Python 3.11 + FastAPI   │ │  Action Plans,    │      │  MapLibre WebGL  │
│ (pratyaksha-geo-service)  │ │  Triage Reviews,  │      │  Local Cache     │
└─────────────┬─────────────┘ │  Audit Jobs       │      └──────────────────┘
              │               └───────────────────┘
              │ Cloud SQL Auth Proxy / Unix Socket
              ▼
┌───────────────────────────┐
│  Cloud SQL for PostgreSQL │
│  PostgreSQL 15 + PostGIS  │
│  Wards, Rasters, Spatial  │
└───────────────────────────┘
```

---

## 2. Core GCP Services & Resource Allocation

### 2.1 Compute: Google Cloud Run (Serverless Containers)
- **Service 1: `pratyaksha-web-service` (Node.js React/Express BFF)**
  - *Base Image*: `node:24-alpine`
  - *Build Strategy*: Multi-stage Docker build (Stage 1: build Vite static bundle; Stage 2: lightweight Node runtime serving API routes and static assets).
  - *vCPU / Memory*: 1 vCPU, 512 MiB RAM (scales to zero when idle, max 10 instances).
  - *Port*: 3000 (standardized on `PORT` environment variable).
  - *Reverse Proxy*: Forwards `/api/py/*` calls internally to the Python FastAPI backend using Cloud Run service-to-service IAM authentication.

- **Service 2: `pratyaksha-geo-service` (Python FastAPI Heavy Geospatial Engine)**
  - *Base Image*: `python:3.11-slim-bookworm`
  - *Dependencies*: `fastapi`, `uvicorn`, `earthengine-api`, `scikit-learn`, `torch` (CPU wheel), `prophet`, `asyncpg`, `geoalchemy2`.
  - *vCPU / Memory*: 2 vCPU, 2 GiB RAM (optimized for numpy array manipulation and UNet tensor inference).
  - *Port*: 8000.
  - *Ingress*: Internal-only (service-to-service) or protected with IAM authentication token.

### 2.2 Storage & Databases
- **Cloud Firestore (`asia-south1`)**:
  - Hosts `/users/{uid}`, `/action_plans/{planId}`, `/anomaly_reviews/{revId}`, and `/processing_jobs/{jobId}`.
  - Deploys existing production-tested security rules (`firestore.rules`).
- **Cloud SQL for PostgreSQL + PostGIS (`db-custom-1-3840` in `asia-south1`)**:
  - PostgreSQL 15 with `postgis`, `postgis_raster`, and `uuid-ossp` extensions.
  - Hosts municipal ward boundaries (`geometry(MultiPolygon, 4326)`), sensor observations, and spatial spatial indexes (`GIST`).
  - Connection via Cloud SQL Auth Proxy or Serverless VPC Access connector.
- **Google Cloud Storage (GCS)**:
  - Bucket: `pratyaksha-satellite-cache-asia-south1`
  - Stores cached Sentinel-2 GeoTIFF tiles and generated municipal Action Plan PDF reports.

### 2.3 Identity, Security & Secret Management
- **Google Secret Manager**:
  - `GEE_SERVICE_ACCOUNT_KEY`: Service account JSON key for Earth Engine authentication.
  - `DATABASE_URL`: PostgreSQL connection string with password.
  - `FIREBASE_APPLET_CONFIG`: Service configuration for Firestore admin access.
- **Cloud IAM & Service Accounts**:
  - Dedicated Service Account: `sa-pratyaksha-runtime@<project-id>.iam.gserviceaccount.com`
  - Roles:
    - `roles/secretmanager.secretAccessor` (access credentials at startup)
    - `roles/cloudsql.client` (connect to Cloud SQL instance)
    - `roles/earthengine.writer` / Earth Engine registered user
    - `roles/datastore.user` (Firestore read/write)

### 2.4 CI/CD: Google Cloud Build
- Triggered on push to `main` branch.
- Compiles TypeScript, runs verification unit tests (`npm test`), builds Docker containers, pushes images to **Google Artifact Registry** (`asia-south1-docker.pkg.dev/<project-id>/pratyaksha-repo/`), and executes atomic rolling deployments to Cloud Run.

---

## 3. Resilience & Synthetic Fallback Invariant

In alignment with **ADR-02 (Deterministic Demonstration Fallback)**:
- If Cloud SQL or Google Earth Engine credentials are not attached, the deployed Cloud Run containers automatically fall back to the built-in deterministic telemetry engines (`smartCitiesData.ts`, `mlEngine.ts`, `forecastEngine.ts`).
- At no point will the deployment crash loop or fail health checks due to missing external GIS credentials.
- Status is clearly signaled across `/api/health` and `/api/system/status`.
