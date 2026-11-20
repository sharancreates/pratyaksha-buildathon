"""PRATYAKSHA FastAPI Backend Application Entrypoint.
Run locally with: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.services.earth_engine import EarthEngineService
from backend.services.harmonizer import SatelliteDataHarmonizer
from backend.ml.intelligence_models import (
    AdaptiveProphetTrendForecaster,
    EnvironmentalAnomalyDetector,
    EnvironmentalRiskConsensus,
    SpatialClusterAnalyzer,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pratyaksha.api")

app = FastAPI(
    title="PRATYAKSHA — Unified Satellite Environmental Intelligence API",
    version="1.0.0",
    description="FastAPI + PostGIS + Earth Engine + ML environmental command center API.",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ee_service = EarthEngineService()
harmonizer = SatelliteDataHarmonizer()
detector = EnvironmentalAnomalyDetector()
clusterer = SpatialClusterAnalyzer()
consensus = EnvironmentalRiskConsensus()
forecaster = AdaptiveProphetTrendForecaster()

MunicipalityLiteral = Literal["ahmedabad", "delhi", "mumbai", "bengaluru", "chennai"]


class HarmonizeRequest(BaseModel):
    municipality_id: MunicipalityLiteral = "ahmedabad"
    target_resolution_m: int = Field(default=30, ge=10, le=1000)


class ForecastRequest(BaseModel):
    municipality_id: MunicipalityLiteral = "ahmedabad"
    indicator: str = "lst"
    algorithm: Literal["prophet", "arima", "xgboost"] = "prophet"
    horizon_days: Literal[7, 30, 90] = 30


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "PRATYAKSHA FastAPI Backend",
        "earth_engine_mode": ee_service.data_mode,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/system/status")
async def system_status():
    return {
        "platform": "PRATYAKSHA",
        "tagline": "See the Earth. Understand the Risk. Act Before It Escalates.",
        "earth_engine_authenticated": ee_service.authenticated,
        "data_mode": ee_service.data_mode,
        "postgis_schema": "backend/database/migrations/001_init_postgis.sql",
    }


@app.post("/api/satellite/harmonize")
async def harmonize_satellite(req: HarmonizeRequest):
    sample_batch = [
        {"id": "OBS-1", "cloud_coverage_pct": 8.4, "spatial_coverage_pct": 96.5},
        {"id": "OBS-2", "cloud_coverage_pct": 14.2, "spatial_coverage_pct": 94.1},
        {"id": "OBS-3", "cloud_coverage_pct": 42.8, "spatial_coverage_pct": 41.0},
    ]
    h = SatelliteDataHarmonizer(target_resolution_m=req.target_resolution_m)
    return h.harmonize_batch(req.municipality_id, sample_batch)


@app.post("/api/forecast/predict")
async def predict_forecast(req: ForecastRequest):
    # Deterministic 60-day baseline sequence
    baseline = [39.1 + 0.04 * i + (i % 7) * 0.12 for i in range(60)]
    result = forecaster.predict(baseline, horizon_days=req.horizon_days)
    return {
        "municipality_id": req.municipality_id,
        "indicator": req.indicator,
        "algorithm": req.algorithm,
        "data_mode": ee_service.data_mode,
        **result,
    }


@app.get("/api/satellite/ee-sample")
async def ee_sample(municipality: Optional[str] = "ahmedabad"):
    return {
        "municipality": municipality,
        "ndvi": ee_service.fetch_ndvi([72.42, 22.91, 72.71, 23.12], "2026-10-01", "2026-11-19"),
        "lst": ee_service.fetch_lst([72.42, 22.91, 72.71, 23.12], "2026-10-01", "2026-11-19"),
    }
