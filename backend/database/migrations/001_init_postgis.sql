-- PRATYAKSHA PostgreSQL + PostGIS Schema & Deterministic Smart Cities Seed
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(128) UNIQUE NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) UNIQUE NOT NULL,
  department VARCHAR(120) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'officer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS municipalities (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  corporation VARCHAR(160) NOT NULL,
  area_km2 DOUBLE PRECISION NOT NULL,
  population_millions DOUBLE PRECISION NOT NULL,
  utm_crs VARCHAR(32) NOT NULL,
  center_geom GEOMETRY(Point, 4326) NOT NULL,
  boundary_geom GEOMETRY(Polygon, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS satellite_missions (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  agency VARCHAR(40) NOT NULL,
  sensor VARCHAR(120) NOT NULL,
  spatial_resolution_m INTEGER NOT NULL,
  revisit_days INTEGER NOT NULL,
  health_status VARCHAR(24) NOT NULL DEFAULT 'operational'
);

CREATE TABLE IF NOT EXISTS satellite_observations (
  id VARCHAR(64) PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  mission_id VARCHAR(32) NOT NULL REFERENCES satellite_missions(id),
  acquired_at TIMESTAMPTZ NOT NULL,
  crs_source VARCHAR(32) NOT NULL,
  crs_target VARCHAR(32) NOT NULL DEFAULT 'EPSG:4326',
  resolution_source_m INTEGER NOT NULL,
  resolution_target_m INTEGER NOT NULL DEFAULT 30,
  cloud_coverage_pct DOUBLE PRECISION NOT NULL,
  spectral_band VARCHAR(80) NOT NULL,
  harmonization_status VARCHAR(24) NOT NULL,
  synthetic_data BOOLEAN NOT NULL DEFAULT TRUE,
  footprint_geom GEOMETRY(Polygon, 4326)
);

CREATE TABLE IF NOT EXISTS environmental_indicators (
  id SERIAL PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  ward_id VARCHAR(64) NOT NULL,
  ward_name VARCHAR(120) NOT NULL,
  observed_date DATE NOT NULL,
  lst_celsius DOUBLE PRECISION,
  ndvi DOUBLE PRECISION,
  no2_umol_m2 DOUBLE PRECISION,
  aqi INTEGER,
  water_extent_km2 DOUBLE PRECISION,
  ward_geom GEOMETRY(Polygon, 4326)
);

CREATE TABLE IF NOT EXISTS anomaly_events (
  id VARCHAR(64) PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  ward_id VARCHAR(64) NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  indicator VARCHAR(80) NOT NULL,
  severity VARCHAR(24) NOT NULL,
  primary_model VARCHAR(64) NOT NULL,
  isolation_forest_score DOUBLE PRECISION NOT NULL,
  autoencoder_error DOUBLE PRECISION NOT NULL,
  dbscan_cluster_id INTEGER,
  consensus_risk_score DOUBLE PRECISION NOT NULL,
  location_geom GEOMETRY(Point, 4326) NOT NULL,
  suggested_intervention TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forecasts (
  id SERIAL PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  indicator VARCHAR(40) NOT NULL,
  algorithm VARCHAR(32) NOT NULL,
  horizon_days INTEGER NOT NULL,
  target_date DATE NOT NULL,
  predicted_value DOUBLE PRECISION NOT NULL,
  lower_bound DOUBLE PRECISION,
  upper_bound DOUBLE PRECISION,
  reliability VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS land_cover_results (
  id VARCHAR(64) PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  model_architecture VARCHAR(120) NOT NULL,
  inference_mode VARCHAR(48) NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  class_breakdown JSONB NOT NULL,
  transitions JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS action_plans (
  id VARCHAR(64) PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  title VARCHAR(180) NOT NULL,
  executive_summary TEXT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id VARCHAR(64) PRIMARY KEY,
  municipality_id VARCHAR(32) NOT NULL REFERENCES municipalities(id),
  mission_id VARCHAR(32) NOT NULL,
  job_type VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL,
  raw_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  level VARCHAR(16) NOT NULL,
  component VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_geom ON anomaly_events USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_indicators_geom ON environmental_indicators USING GIST (ward_geom);
CREATE INDEX IF NOT EXISTS idx_municipalities_geom ON municipalities USING GIST (boundary_geom);

-- Seed 5 Indian Smart Cities
INSERT INTO municipalities (id, name, state, corporation, area_km2, population_millions, utm_crs, center_geom, boundary_geom)
VALUES
  ('ahmedabad', 'Ahmedabad', 'Gujarat', 'Ahmedabad Municipal Corporation (AMC)', 505.0, 8.65, 'EPSG:32643',
   ST_SetSRID(ST_MakePoint(72.5714, 23.0225), 4326),
   ST_SetSRID(ST_MakeEnvelope(72.42, 22.91, 72.71, 23.12, 4326), 4326)),
  ('delhi', 'Delhi', 'NCT of Delhi', 'Municipal Corporation of Delhi (MCD)', 1484.0, 21.4, 'EPSG:32643',
   ST_SetSRID(ST_MakePoint(77.2090, 28.6139), 4326),
   ST_SetSRID(ST_MakeEnvelope(77.00, 28.47, 77.38, 28.77, 4326), 4326)),
  ('mumbai', 'Mumbai', 'Maharashtra', 'Brihanmumbai Municipal Corporation (BMC)', 603.4, 20.9, 'EPSG:32643',
   ST_SetSRID(ST_MakePoint(72.8850, 19.1120), 4326),
   ST_SetSRID(ST_MakeEnvelope(72.77, 18.97, 73.02, 19.25, 4326), 4326)),
  ('bengaluru', 'Bengaluru', 'Karnataka', 'Bruhat Bengaluru Mahanagara Palike (BBMP)', 741.0, 13.6, 'EPSG:32643',
   ST_SetSRID(ST_MakePoint(77.6150, 12.9780), 4326),
   ST_SetSRID(ST_MakeEnvelope(77.45, 12.85, 77.78, 13.10, 4326), 4326)),
  ('chennai', 'Chennai', 'Tamil Nadu', 'Greater Chennai Corporation (GCC)', 426.0, 11.7, 'EPSG:32644',
   ST_SetSRID(ST_MakePoint(80.2250, 13.0450), 4326),
   ST_SetSRID(ST_MakeEnvelope(80.10, 12.88, 80.33, 13.20, 4326), 4326))
ON CONFLICT (id) DO NOTHING;

INSERT INTO satellite_missions (id, name, agency, sensor, spatial_resolution_m, revisit_days)
VALUES
  ('sentinel-2', 'ESA Sentinel-2A/2B', 'ESA', 'MultiSpectral Instrument (MSI)', 10, 5),
  ('sentinel-1', 'ESA Sentinel-1A', 'ESA', 'C-Band SAR', 10, 6),
  ('landsat-8-9', 'Landsat 8 / 9 OLI-TIRS', 'USGS/NASA', 'OLI + Thermal IR Sensor', 30, 8),
  ('modis', 'NASA MODIS Terra/Aqua + TROPOMI', 'NASA', 'MODIS Thermal & Atmospheric Column', 1000, 1)
ON CONFLICT (id) DO NOTHING;
