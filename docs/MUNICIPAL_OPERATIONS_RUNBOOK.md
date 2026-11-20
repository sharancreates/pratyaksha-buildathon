# PRATYAKSHA Municipal Commissioner Operations Runbook
**Unified Satellite Environmental Intelligence Platform**
*Region: `asia-south1` (Mumbai, India) | Platform Version: 1.0.0-prod*

---

## 1. Executive System Overview & Data Sovereignty

PRATYAKSHA serves as the unified environmental surveillance and decision-support command system for Indian Municipal Corporations (AMC Ahmedabad, MCD Delhi, BMC Mumbai, BBMP Bengaluru, GCC Chennai).

### 1.1 Regional Data Sovereignty
- **Hosting Region**: `asia-south1` (Mumbai) exclusively.
- All telemetry, satellite observations, municipal ward boundary polygons (`geometry(MultiPolygon, 4326)`), citizen environmental indices, and officer audit logs remain strictly within sovereign Indian borders, compliant with Digital Personal Data Protection (DPDP) Act requirements.

### 1.2 Multi-Service Architectural Topology
```
[ HTTPS Public Traffic / Officers ]
               │
               ▼
┌──────────────────────────────────────────────┐
│  pratyaksha-web-service (Google Cloud Run)   │
│  - Port 3000 | Node.js 24 Alpine             │
│  - Public Ingress | Auto-scale: 0 - 10       │
└──────────────────────┬───────────────────────┘
                       │
                       │ Internal HTTP + Google IAM ID Token
                       ▼
┌──────────────────────────────────────────────┐
│  pratyaksha-geo-service (Google Cloud Run)   │
│  - Port 8000 | Python 3.11 Slim Bookworm     │
│  - Internal Ingress | Auto-scale: 0 - 5      │
└──────────────────────┬───────────────────────┘
                       │
                       │ Serverless VPC Connector (pratyaksha-vpc-conn)
                       ▼
┌──────────────────────────────────────────────┐
│  pratyaksha-db (Cloud SQL PostgreSQL 15)     │
│  - PostGIS 3.4 Spatial Extensions            │
│  - Private RFC 1918 VPC Connectivity         │
└──────────────────────────────────────────────┘
```

---

## 2. Service Level Objectives (SLOs) & Production Thresholds

| Metric | SLO Target | Alerting Threshold | Operational Action |
|--------|------------|-------------------|-------------------|
| **API Availability** | >= 99.9% | < 99.5% over 5 min | Inspect Cloud Run crash logs / verify Secret Manager bindings |
| **P95 Latency (BFF)** | <= 250ms | > 500ms over 10 min | Check Cloud Run CPU utilization; increase instance allocation |
| **ML Inference Latency** | <= 1200ms | > 2500ms over 5 min | Check Geo service container memory; scale to max 5 instances |
| **Satellite Sync Health** | 100% Granules Ingested | Failed sync > 3 hours | Trigger `/api/satellite/ingest` fallback |

---

## 3. Real-Time Health & Log Inspection Commands

### 3.1 Live Service Health Check
```bash
# Probing public endpoint
curl -s https://<YOUR_WEB_SERVICE_URL>/api/health | jq .

# Verifying system status & active Indian metro coverage
curl -s https://<YOUR_WEB_SERVICE_URL>/api/system/status | jq .
```

### 3.2 Cloud Run Logs Inspection (Google Cloud CLI)
```bash
# Stream Web BFF logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=pratyaksha-web-service" --project=<PROJECT_ID>

# Stream Geospatial Python backend logs
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=pratyaksha-geo-service" --project=<PROJECT_ID>

# Query PostGIS database audit logs
gcloud logging read "resource.type=cloudsql_database AND resource.labels.database_id=<PROJECT_ID>:pratyaksha-db" --limit=50
```

---

## 4. Auto-Scaling & Cost Governance Controls

### 4.1 Modifying Auto-Scaling Limits
During seasonal environmental crises (e.g. November stubble burning air pollution in Delhi, May heatwaves in Ahmedabad), commissioners can scale capacity dynamically:

```bash
# Scale Web service for heavy municipal traffic (up to 20 instances)
gcloud run services update pratyaksha-web-service \
  --region=asia-south1 \
  --min-instances=2 \
  --max-instances=20

# Scale Geospatial microservice for rapid raster batch re-projection
gcloud run services update pratyaksha-geo-service \
  --region=asia-south1 \
  --min-instances=1 \
  --max-instances=10
```

### 4.2 Scale to Zero (Idle Cost Optimization)
When active monitoring shifts to routine scheduled polling:
```bash
gcloud run services update pratyaksha-web-service --region=asia-south1 --min-instances=0
gcloud run services update pratyaksha-geo-service --region=asia-south1 --min-instances=0
```

---

## 5. Security, IAM & Secret Rotation Procedures

### 5.1 Google Earth Engine (GEE) Key Rotation
When GEE service account credentials expire or rotate quarterly:
```bash
# 1. Generate new JSON key from Google Cloud Console
# 2. Update Secret Manager version
gcloud secrets versions add GEE_SERVICE_ACCOUNT_KEY \
  --data-file=/path/to/new-gee-key.json \
  --project=<PROJECT_ID>

# 3. Redeploy geo service to pick up new :latest secret version
gcloud run services update pratyaksha-geo-service --region=asia-south1
```

### 5.2 Database Password Rotation
```bash
# 1. Update PostgreSQL user password in Cloud SQL
gcloud sql users set-password pratyaksha_app \
  --instance=pratyaksha-db \
  --password="<NEW_STRONG_PASSWORD>"

# 2. Update Secret Manager DATABASE_URL
echo -n "postgresql://pratyaksha_app:<NEW_PASSWORD>@10.8.0.3:5432/pratyaksha_prod" | \
  gcloud secrets versions add DATABASE_URL --data-file=- --project=<PROJECT_ID>

# 3. Restart geo service
gcloud run services update pratyaksha-geo-service --region=asia-south1
```

---

## 6. Emergency Operations & Zero-Downtime Rollback

### 6.1 Instant Revision Rollback
If a newly pushed release exhibits an unforeseen anomaly:
```bash
# 1. List past revisions
gcloud run revisions list --service=pratyaksha-web-service --region=asia-south1

# 2. Direct 100% traffic back to known-stable revision
gcloud run services update-traffic pratyaksha-web-service \
  --to-revisions=<PREVIOUS_STABLE_REVISION_NAME>=100 \
  --region=asia-south1
```

### 6.2 Canary Traffic Splitting
Validate new model weights or UI releases with 10% pilot traffic:
```bash
gcloud run services update-traffic pratyaksha-web-service \
  --to-revisions=<NEW_REVISION>=10,<CURRENT_REVISION>=90 \
  --region=asia-south1
```

---

## 7. Deterministic Demonstration Fallback Guarantee (ADR-02)

In accordance with **ADR-02**:
- If external credentials (GEE, Cloud SQL, Firebase) are disconnected, unconfigured, or experiencing quota exhaustion, PRATYAKSHA automatically activates its **Deterministic Demo Engine**.
- Built-in telemetry covering 5 Indian municipal corporations with 90-day multi-sensor history (`smartCitiesData.ts`, `mlEngine.ts`, `forecastEngine.ts`, `harmonizer.ts`, `segmentationEngine.ts`) ensures that municipal commissioners, disaster responders, and field officers maintain continuous, uninterrupted operational capabilities.
- Status is clearly signaled on the dashboard and API via `earthEngineMode: DEMO_FALLBACK`.
