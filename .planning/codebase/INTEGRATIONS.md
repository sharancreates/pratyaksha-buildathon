# System Integrations Map

## External Services & Cloud Providers

### 1. Google Earth Engine (GEE)
- **Role**: Primary provider of raw multi-mission satellite imagery and environmental bands.
- **Missions Integrated**:
  - **Copernicus Sentinel-2** (`COPERNICUS/S2_SR_HARMONIZED`): Multi-spectral imagery, 10m/20m spatial resolution, 5-day revisit. Key bands: B4 (Red), B8 (NIR) for NDVI calculation.
  - **Landsat 8/9** (`LANDSAT/LC08/C02/T1_L2`): Thermal Infrared Sensor (TIRS) Collection 2 Tier 1 Level 2 for Land Surface Temperature (ST_B10 converted to Celsius via scale `0.00341802 + 149.0 - 273.15`).
  - **Copernicus Sentinel-1**: C-band Synthetic Aperture Radar (SAR) for flood extent and water body delineation.
  - **NASA MODIS / Sentinel-5P TROPOMI**: Atmospheric tropospheric NO₂ column density and Air Quality Index proxies.
- **Authentication Protocol**: Service Account authentication (`ee.ServiceAccountCredentials`) using:
  - `GEE_SERVICE_ACCOUNT`
  - `GEE_PRIVATE_KEY_PATH`
  - `GEE_PROJECT_ID`
- **Fallback Strategy**: Transparent fallback to `DEMO_FALLBACK` / `SYNTHETIC_*` datasets when GEE credentials or packages are unavailable, ensuring zero blocker for local development.

### 2. Google Cloud Firestore
- **Role**: Operational document persistence for municipal officer sessions, action plans, anomaly review triage, and processing audit logs.
- **Collections Configured**:
  - `/users/{userId}`: Officer profiles, department mapping, municipality assignment.
  - `/action_plans/{planId}`: Municipal Environment Action Plans with PDF export metadata.
  - `/anomaly_reviews/{reviewId}`: Triage reviews, assigned departments, status transitions (`open` → `investigating` → `mitigated` → `resolved`).
  - `/processing_jobs/{jobId}`: Satellite pipeline audit logs (`ingest`, `harmonize`, `anomaly_scan`, `segmentation`).
- **Security Enforcement**: CEL rules in `firestore.rules` enforcing strict owner isolation, email verification, immutable audit fields (`createdAt`, `ownerId`), schema validation, and terminal state locks.

### 3. PostgreSQL & PostGIS
- **Role**: Spatial database for municipal boundary polygons, ward geometries, satellite footprints, and historical environmental time series.
- **Schema & Extensions**:
  - PostGIS extension (`CREATE EXTENSION IF NOT EXISTS postgis;`)
  - Tables: `users`, `municipalities`, `satellite_missions`, `satellite_observations`, `environmental_indicators`, `anomaly_detections`, `ward_boundaries`.
  - Spatial indexes using GIST on all `geometry` columns.

### 4. MapLibre GL Tile Providers
- **Role**: Interactive client-side vector/raster map rendering.
- **Tile Sources**:
  - Carto Dark Matter (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`)
  - Esri World Imagery (Satellite raster tiles)
  - Custom GeoJSON dynamic layers for Wards, Risk Zones, Heat Islands, NDVI, and NO₂ contours.

### 5. Document & Report Generation
- **Client-Side PDF Generation**: `jspdf` generates municipal report documents with tables, telemetry, and priority action lists directly in-browser.
- **Structured JSON Export**: Formatted JSON data dumps complying with Indian municipal governance guidelines.
