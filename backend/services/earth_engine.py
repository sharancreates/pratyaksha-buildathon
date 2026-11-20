"""Google Earth Engine Service with Automatic Deterministic Demo Fallback."""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List

logger = logging.getLogger("pratyaksha.earth_engine")


class EarthEngineService:
    """Interfaces with Google Earth Engine collections (Sentinel-1/2, MODIS, Landsat).
    Automatically activates deterministic DEMO MODE when credentials are unavailable.
    """

    def __init__(self) -> None:
        self.authenticated = False
        self.data_mode = "DEMO_FALLBACK"
        self._ee = None
        self._initialize()

    def _initialize(self) -> None:
        service_account = os.getenv("GEE_SERVICE_ACCOUNT", "").strip()
        key_path = os.getenv("GEE_PRIVATE_KEY_PATH", "").strip()
        project_id = os.getenv("GEE_PROJECT_ID", "").strip()

        if not service_account or not key_path or not os.path.exists(key_path):
            logger.warning(
                "Earth Engine credentials not configured; activating deterministic DEMO_FALLBACK mode."
            )
            return

        try:
            import ee  # type: ignore

            creds = ee.ServiceAccountCredentials(service_account, key_path)
            ee.Initialize(credentials=creds, project=project_id or None)
            self._ee = ee
            self.authenticated = True
            self.data_mode = "LIVE_GEE"
            logger.info("Google Earth Engine authenticated successfully.")
        except Exception as exc:
            logger.warning("Earth Engine init failed (%s); falling back to DEMO_FALLBACK.", exc)
            self.authenticated = False
            self.data_mode = "DEMO_FALLBACK"

    def fetch_ndvi(self, bbox: List[float], start_date: str, end_date: str) -> Dict[str, Any]:
        if self.authenticated and self._ee is not None:
            ee = self._ee
            region = ee.Geometry.Rectangle(bbox)
            col = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(region)
                .filterDate(start_date, end_date)
                .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 25))
            )
            median_img = col.median()
            ndvi = median_img.normalizedDifference(["B8", "B4"]).rename("NDVI")
            stats = ndvi.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=region, scale=30, maxPixels=1e8
            ).getInfo()
            return {
                "data_mode": "LIVE_GEE",
                "mission": "COPERNICUS/S2_SR_HARMONIZED",
                "mean_ndvi": stats.get("NDVI"),
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
            }

        return {
            "data_mode": "DEMO_FALLBACK",
            "mission": "SYNTHETIC_SENTINEL_2_DEMO",
            "mean_ndvi": 0.25,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "note": "Deterministic demo value; Earth Engine authentication inactive.",
        }

    def fetch_lst(self, bbox: List[float], start_date: str, end_date: str) -> Dict[str, Any]:
        if self.authenticated and self._ee is not None:
            ee = self._ee
            region = ee.Geometry.Rectangle(bbox)
            col = (
                ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                .filterBounds(region)
                .filterDate(start_date, end_date)
            )
            st_band = col.median().select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15)
            stats = st_band.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=region, scale=30, maxPixels=1e8
            ).getInfo()
            return {
                "data_mode": "LIVE_GEE",
                "mission": "LANDSAT/LC08/C02/T1_L2",
                "mean_lst_celsius": stats.get("ST_B10"),
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
            }

        return {
            "data_mode": "DEMO_FALLBACK",
            "mission": "SYNTHETIC_LANDSAT_TIRS_DEMO",
            "mean_lst_celsius": 41.7,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "note": "Deterministic demo value; Earth Engine authentication inactive.",
        }
