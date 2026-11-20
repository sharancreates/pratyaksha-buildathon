# Phase 5 Research: Cloud SQL PostGIS & Cloud Firestore Database Provisioning

## 1. Domain Objective
Architect and formulate production database provisioning for PRATYAKSHA in `asia-south1` (Mumbai):
1. Managed **Cloud SQL PostgreSQL 15** with spatial PostGIS extension, optimized flags, and automated migrations (`001_init_postgis.sql`).
2. Serverless **Cloud Firestore** in Native Mode with verified security policies (`firestore.rules`) and composite indexing (`firestore.indexes.json`).

---

## 2. Technical Decisions & Architectures

### 2.1 Cloud SQL for PostgreSQL 15 Architecture
- **Instance Identifier**: `pratyaksha-db`
- **Database Engine**: PostgreSQL 15 (`POSTGRES_15`)
- **Tier**: `db-custom-1-3840` (1 vCPU, 3.75 GiB RAM)
- **Region**: `asia-south1` (Mumbai)
- **High Availability**: Regional availability option for enterprise disaster resilience; Single-zone option for cost-optimized development.
- **Database Flags**:
  - `cloudsql.enable_pgaudit=on` (audit logging for government compliance)
  - `shared_preload_libraries=pg_stat_statements` (query performance profiling)
  - `max_connections=100`
- **Extensions Installed**:
  - `postgis` (spatial geometry, ST_DWithin, ST_Intersects, ST_Contains)
  - `uuid-ossp` (GUID generation)
- **Connection Methods**:
  1. **Cloud Run Unix Socket**: `/cloudsql/${PROJECT_ID}:asia-south1:pratyaksha-db` via Cloud SQL proxy sidecar/mount.
  2. **Serverless VPC Access**: Private RFC 1918 internal IP across VPC subnet.

### 2.2 Database Initialization & Migrations
- Migration file: `backend/database/migrations/001_init_postgis.sql`
- Creates 9 core spatial and operational tables:
  - `users`: Municipal officers, departments, and roles.
  - `municipalities`: 5 smart cities with boundary polygon geometries.
  - `satellite_missions`: Multi-mission sensor metadata (Sentinel, Landsat, MODIS).
  - `satellite_observations`: Granules, spectral bands, cloud cover %, spatial footprints.
  - `environmental_indicators`: Daily ward-level telemetry (LST, NDVI, NO₂, AQI, water).
  - `anomaly_events`: ML detected anomalies with DBSCAN cluster tags and point geometries.
  - `forecasts`: Time-series forecast points with confidence bounds.
  - `land_cover_results`: UNet 6-class segmentation and IoU estimates.
  - `action_plans`: Generated policy interventions.
- Spatial indexing: GIST indexes on all geometry columns (`boundary_geom`, `footprint_geom`, `ward_geom`, `location_geom`).

### 2.3 Cloud Firestore Native Mode & Security
- **Database Mode**: Cloud Firestore Native Mode (`(default)` database).
- **Location**: `asia-south1` (Mumbai).
- **Security Rules**: Deploys `firestore.rules` (260 lines of hardened CEL rules verified by Phase 2 tests).
- **Composite Indexes (`firestore.indexes.json`)**:
  - `action_plans`: `ownerId` (ASC), `createdAt` (DESC)
  - `anomaly_reviews`: `ownerId` (ASC), `status` (ASC), `updatedAt` (DESC)
  - `processing_jobs`: `ownerId` (ASC), `createdAt` (DESC)

---

## 3. Deliverables Checklist
1. `scripts/gcp/05_provision_cloud_sql.sh` and `05_provision_cloud_sql.ps1`
2. `scripts/gcp/06_run_migrations.sh` and `06_run_migrations.ps1`
3. `scripts/gcp/07_deploy_firestore_rules.sh` and `07_deploy_firestore_rules.ps1`
4. `firestore.indexes.json`
5. Automated test suite `tests/engines/cloudSqlPostgres.test.ts`
