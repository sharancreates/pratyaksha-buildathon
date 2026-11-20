import express from 'express';
import axios from 'axios';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  getMunicipality,
  MUNICIPALITIES,
  SATELLITE_MISSIONS,
} from './src/server/data/smartCitiesData.ts';
import { harmonizerService } from './src/server/engines/harmonizer.ts';
import { mlConsensusService } from './src/server/engines/mlEngine.ts';
import { forecastService } from './src/server/engines/forecastEngine.ts';
import { segmentationService } from './src/server/engines/segmentationEngine.ts';
import { reportEngine } from './src/server/engines/reportEngine.ts';
import { getGcpIdToken } from './src/server/utils/gcpAuth.ts';
import type {
  ForecastAlgorithm,
  ForecastHorizon,
  ForecastIndicator,
  KpiCardMetric,
  MunicipalityId,
  SatelliteMissionId,
} from './src/shared/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_CITIES = new Set<MunicipalityId>([
  'ahmedabad',
  'delhi',
  'mumbai',
  'bengaluru',
  'chennai',
]);

function parseCity(raw: unknown): MunicipalityId {
  const s = typeof raw === 'string' ? raw.toLowerCase().trim() : 'ahmedabad';
  return VALID_CITIES.has(s as MunicipalityId) ? (s as MunicipalityId) : 'ahmedabad';
}

function buildKpis(cityId: MunicipalityId): KpiCardMetric[] {
  const city = getMunicipality(cityId);
  const ml = mlConsensusService.detectAndScore(cityId);
  const hist = city.history90d;
  const recent14 = hist.slice(-14);
  const prev14 = hist.slice(-28, -14);

  const avgLst = Number(
    (city.wards.reduce((s, w) => s + w.lstCelsius, 0) / city.wards.length).toFixed(1)
  );
  const prevLst = Number(
    (prev14.reduce((s, d) => s + d.lst, 0) / prev14.length).toFixed(1)
  );
  const lstDelta = Number((((avgLst - prevLst) / Math.max(1, prevLst)) * 100).toFixed(1));

  const avgNdvi = Number(
    (city.wards.reduce((s, w) => s + w.ndvi, 0) / city.wards.length).toFixed(2)
  );
  const prevNdvi = Number(
    (prev14.reduce((s, d) => s + d.ndvi, 0) / prev14.length).toFixed(2)
  );
  const ndviDelta = Number((((avgNdvi - prevNdvi) / Math.max(0.05, prevNdvi)) * 100).toFixed(1));

  const avgAqi = Math.round(
    city.wards.reduce((s, w) => s + w.aqi, 0) / city.wards.length
  );
  const prevAqi = Math.round(
    prev14.reduce((s, d) => s + d.aqi, 0) / prev14.length
  );
  const aqiDelta = Number((((avgAqi - prevAqi) / Math.max(1, prevAqi)) * 100).toFixed(1));

  const avgRisk = city.wards.reduce((s, w) => s + w.riskScore, 0) / city.wards.length;
  const healthIndex = Math.max(18, Math.min(94, Math.round(100 - avgRisk * 0.62)));
  const prevHealth = Math.min(96, healthIndex + 3);
  const healthDelta = Number((((healthIndex - prevHealth) / prevHealth) * 100).toFixed(1));

  return [
    {
      id: 'health-index',
      label: 'Environmental Health Index',
      value: healthIndex,
      formattedValue: `${healthIndex}`,
      unit: '/ 100',
      previousValue: prevHealth,
      deltaPercent: healthDelta,
      deltaLabel: `${healthDelta > 0 ? '+' : ''}${healthDelta}% vs 14d`,
      trend: healthDelta < 0 ? 'down' : 'up',
      isPositiveTrend: healthDelta >= 0,
      status: healthIndex >= 65 ? 'nominal' : healthIndex >= 50 ? 'warning' : 'critical',
      sparkline: recent14.map((d) => Math.max(20, Math.round(92 - (d.lst - 30) * 1.9 - d.aqi * 0.08))),
    },
    {
      id: 'active-anomalies',
      label: 'Active Environmental Anomalies',
      value: ml.summary.totalDetected,
      formattedValue: `${ml.summary.totalDetected}`,
      unit: `${ml.summary.criticalCount} critical`,
      previousValue: Math.max(1, ml.summary.totalDetected - 1),
      deltaPercent: 25.0,
      deltaLabel: `+1 new vs 14d`,
      trend: 'up',
      isPositiveTrend: false,
      status: ml.summary.criticalCount >= 2 ? 'critical' : 'warning',
      sparkline: [2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, ml.summary.totalDetected],
    },
    {
      id: 'avg-lst',
      label: 'Avg Land Surface Temp',
      value: avgLst,
      formattedValue: avgLst.toFixed(1),
      unit: '°C',
      previousValue: prevLst,
      deltaPercent: lstDelta,
      deltaLabel: `${lstDelta > 0 ? '+' : ''}${lstDelta}% vs 14d`,
      trend: lstDelta > 0.5 ? 'up' : lstDelta < -0.5 ? 'down' : 'stable',
      isPositiveTrend: lstDelta <= 0,
      status: avgLst >= 41 ? 'critical' : avgLst >= 37 ? 'warning' : 'nominal',
      sparkline: recent14.map((d) => d.lst),
    },
    {
      id: 'avg-ndvi',
      label: 'Vegetation Health (NDVI)',
      value: avgNdvi,
      formattedValue: avgNdvi.toFixed(2),
      unit: 'index',
      previousValue: prevNdvi,
      deltaPercent: ndviDelta,
      deltaLabel: `${ndviDelta > 0 ? '+' : ''}${ndviDelta}% vs 14d`,
      trend: ndviDelta < -1 ? 'down' : ndviDelta > 1 ? 'up' : 'stable',
      isPositiveTrend: ndviDelta >= 0,
      status: avgNdvi < 0.25 ? 'critical' : avgNdvi < 0.34 ? 'warning' : 'nominal',
      sparkline: recent14.map((d) => d.ndvi),
    },
    {
      id: 'air-quality',
      label: 'Air Quality Indicator',
      value: avgAqi,
      formattedValue: `${avgAqi}`,
      unit: 'AQI',
      previousValue: prevAqi,
      deltaPercent: aqiDelta,
      deltaLabel: `${aqiDelta > 0 ? '+' : ''}${aqiDelta}% vs 14d`,
      trend: aqiDelta > 1 ? 'up' : 'down',
      isPositiveTrend: aqiDelta <= 0,
      status: avgAqi >= 200 ? 'critical' : avgAqi >= 140 ? 'warning' : 'nominal',
      sparkline: recent14.map((d) => d.aqi),
    },
    {
      id: 'monitored-area',
      label: 'Monitored Geographic Area',
      value: city.areaKm2,
      formattedValue: city.areaKm2.toFixed(0),
      unit: 'km²',
      previousValue: city.areaKm2,
      deltaPercent: 0,
      deltaLabel: `${city.wards.length} active wards`,
      trend: 'stable',
      isPositiveTrend: true,
      status: 'nominal',
      sparkline: recent14.map(() => city.areaKm2),
    },
  ];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Lightweight security & rate-aware headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Powered-By', 'PRATYAKSHA-Intelligence-Engine');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  // =========================================================================
  // SYSTEM & HEALTH
  // =========================================================================
  const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || process.env.GEO_BACKEND_URL || 'http://localhost:8000';
  const GEO_BACKEND_URL = PYTHON_SERVICE_URL;

  app.get('/api/health', async (_req, res) => {
    let pythonStatus = 'offline_or_fallback';
    let pythonDetails: unknown = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const resp = await fetch(`${PYTHON_SERVICE_URL.replace(/\/$/, '')}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        pythonStatus = 'connected';
        pythonDetails = await resp.json().catch(() => null);
      }
    } catch {
      pythonStatus = 'offline_or_fallback';
    }

    res.json({
      status: 'healthy',
      service: 'PRATYAKSHA Web BFF',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      earthEngineMode: process.env.GEE_SERVICE_ACCOUNT ? 'AUTHENTICATED' : 'DEMO_FALLBACK',
      pythonBackend: {
        serviceUrl: PYTHON_SERVICE_URL,
        status: pythonStatus,
        details: pythonDetails,
      },
    });
  });

  // =========================================================================
  // PYTHON BACKEND REVERSE PROXY ROUTE (/api/py/*)
  // =========================================================================
  app.all('/api/py/*', async (req, res) => {
    // Forward /api/py/xyz -> ${PYTHON_SERVICE_URL}/api/xyz
    const targetPath = req.originalUrl.replace(/^\/api\/py/, '/api');
    const targetUrl = `${PYTHON_SERVICE_URL.replace(/\/$/, '')}${targetPath}`;

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      }
      if (req.headers['authorization']) {
        headers['Authorization'] = req.headers['authorization'] as string;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
        signal: controller.signal,
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const pyResponse = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      const data = await pyResponse.text();
      res.status(pyResponse.status);
      res.setHeader('Content-Type', pyResponse.headers.get('content-type') || 'application/json');
      return res.send(data);
    } catch (err: any) {
      return res.status(503).json({
        error: 'Python Geospatial Backend Unreachable',
        targetUrl,
        message: err.message,
        fallbackMode: 'DEMO_SYNTHETIC_ACTIVE',
      });
    }
  });

  app.get('/api/system/status', (_req, res) => {
    res.json({
      platform: 'PRATYAKSHA',
      tagline: 'See the Earth. Understand the Risk. Act Before It Escalates.',
      earthEngineAuthenticated: Boolean(process.env.GEE_SERVICE_ACCOUNT),
      dataMode: process.env.GEE_SERVICE_ACCOUNT ? 'LIVE_GEE' : 'DEMO_FALLBACK',
      supportedMunicipalities: Object.values(MUNICIPALITIES).map((m) => ({
        id: m.id,
        name: m.name,
        state: m.state,
        corporation: m.corporation,
        areaKm2: m.areaKm2,
        populationMillions: m.populationMillions,
      })),
      satelliteSyncTimestamp: '2026-11-19T08:15:00Z',
      activeMissions: SATELLITE_MISSIONS.length,
    });
  });

  // =========================================================================
  // DASHBOARD ENDPOINTS
  // =========================================================================
  app.get('/api/dashboard/kpis', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      kpis: buildKpis(cityId),
    });
  });

  app.get('/api/dashboard/overview', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const ml = mlConsensusService.detectAndScore(cityId);
    const observations = harmonizerService.getObservations(cityId).slice(0, 6);
    const reports = reportEngine.list(cityId);

    const riskDistribution = [
      { level: 'Critical', count: city.wards.filter((w) => w.severity === 'critical').length, color: '#EF4444' },
      { level: 'High', count: city.wards.filter((w) => w.severity === 'high').length, color: '#F59E0B' },
      { level: 'Moderate', count: city.wards.filter((w) => w.severity === 'moderate').length, color: '#22D3EE' },
      { level: 'Nominal', count: city.wards.filter((w) => w.severity === 'low').length, color: '#22C55E' },
    ];

    res.json({
      municipality: city,
      kpis: buildKpis(cityId),
      anomalies: ml.anomalies,
      clusters: ml.clusters,
      highRiskZones: [...city.wards].sort((a, b) => b.riskScore - a.riskScore).slice(0, 4),
      recentObservations: observations,
      pendingActions: (reports[0]?.recommendations ?? []).slice(0, 4),
      riskDistribution,
      dataMode: 'DEMO_FALLBACK',
      syncedAt: '2026-11-19T08:15:00Z',
    });
  });

  app.get('/api/dashboard/activity', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const ml = mlConsensusService.detectAndScore(cityId);
    const harm = harmonizerService.getLastHarmonization(cityId);
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      events: [
        {
          id: 'act-1',
          timestamp: '2026-11-19T08:15:00Z',
          category: 'ML Consensus',
          title: `Detected ${ml.summary.totalDetected} anomalies across ${city.name}`,
          detail: `${ml.summary.criticalCount} critical hotspots flagged by Isolation Forest & Autoencoder consensus.`,
        },
        {
          id: 'act-2',
          timestamp: harm.executedAt,
          category: 'Harmonization',
          title: `Reprojected ${harm.processedObservationCount} tiles to ${harm.targetCrs}`,
          detail: `Unified multi-sensor granules onto ${harm.targetResolutionM}m municipal grid.`,
        },
        {
          id: 'act-3',
          timestamp: '2026-11-19T05:32:14Z',
          category: 'Satellite Pass',
          title: 'ESA Sentinel-2 MSI synthetic observation batch ingested',
          detail: `Cloud coverage filtered across ${city.wards.length} municipal wards.`,
        },
      ],
    });
  });

  // =========================================================================
  // SATELLITE ENDPOINTS
  // =========================================================================
  app.get('/api/satellite/missions', (_req, res) => {
    res.json({
      dataMode: 'DEMO_FALLBACK',
      missions: SATELLITE_MISSIONS,
    });
  });

  app.get('/api/satellite/observations', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const missionId = (req.query.mission as SatelliteMissionId | 'all') || 'all';
    const maxCloudPct = req.query.maxCloud ? Number(req.query.maxCloud) : 50;
    const band = typeof req.query.band === 'string' ? req.query.band : 'all';
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    const observations = harmonizerService.getObservations(cityId, {
      missionId,
      maxCloudPct: Number.isFinite(maxCloudPct) ? maxCloudPct : 50,
      band,
      startDate,
      endDate,
    });

    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      lastHarmonization: harmonizerService.getLastHarmonization(cityId),
      observations,
    });
  });

  app.post('/api/satellite/ingest', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const missionId = (req.body?.missionId as SatelliteMissionId | 'all') || 'all';
    const maxCloudPct = Number(req.body?.maxCloudPct ?? 35);
    const result = harmonizerService.ingest(
      cityId,
      missionId,
      Number.isFinite(maxCloudPct) ? maxCloudPct : 35
    );
    res.json(result);
  });

  app.post('/api/satellite/harmonize', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const missionId = (req.body?.missionId as SatelliteMissionId | 'all') || 'all';
    const targetResolutionM = Number(req.body?.targetResolutionM ?? 30);
    const result = harmonizerService.harmonize(
      cityId,
      missionId,
      [10, 30, 100].includes(targetResolutionM) ? targetResolutionM : 30
    );
    res.json(result);
  });

  // =========================================================================
  // ANALYTICS ENDPOINTS
  // =========================================================================
  app.get('/api/analytics/heat-island', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const avgLst = Number(
      (city.wards.reduce((s, w) => s + w.lstCelsius, 0) / city.wards.length).toFixed(1)
    );
    const peakWard = [...city.wards].sort((a, b) => b.lstCelsius - a.lstCelsius)[0];
    const coolWard = [...city.wards].sort((a, b) => a.lstCelsius - b.lstCelsius)[0];
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      indicator: 'Urban Heat Islands (LST)',
      unit: '°C',
      currentValue: avgLst,
      baselineValue: Number((city.wards.reduce((s, w) => s + w.lstBaseline, 0) / city.wards.length).toFixed(1)),
      uhiIntensityCelsius: Number((peakWard.lstCelsius - coolWard.lstCelsius).toFixed(1)),
      riskClassification: avgLst >= 41 ? 'critical' : avgLst >= 37 ? 'high' : 'moderate',
      wards: city.wards.map((w) => ({
        wardId: w.id,
        name: w.name,
        value: w.lstCelsius,
        baseline: w.lstBaseline,
        delta: Number((w.lstCelsius - w.lstBaseline).toFixed(1)),
        severity: w.severity,
        coordinates: w.center,
      })),
      history: city.history90d.slice(-45).map((d) => ({ date: d.date, value: d.lst })),
      insights: [
        `Peak UHI intensity of +${(peakWard.lstCelsius - coolWard.lstCelsius).toFixed(1)} °C observed between ${peakWard.name} (${peakWard.lstCelsius} °C) and ${coolWard.name} (${coolWard.lstCelsius} °C).`,
        `Impervious industrial roofing and low canopy cover (<0.18 NDVI) drive sustained afternoon thermal retention.`,
      ],
    });
  });

  app.get('/api/analytics/air-quality', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const avgNo2 = Number(
      (city.wards.reduce((s, w) => s + w.no2UmolM2, 0) / city.wards.length).toFixed(1)
    );
    const avgAqi = Math.round(city.wards.reduce((s, w) => s + w.aqi, 0) / city.wards.length);
    const worstWard = [...city.wards].sort((a, b) => b.no2UmolM2 - a.no2UmolM2)[0];
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      indicator: 'Air Quality & Tropospheric NO₂',
      unit: 'µmol/m²',
      currentValue: avgNo2,
      aqiAverage: avgAqi,
      baselineValue: Number((city.wards.reduce((s, w) => s + w.no2Baseline, 0) / city.wards.length).toFixed(1)),
      riskClassification: avgAqi >= 200 ? 'critical' : avgAqi >= 140 ? 'high' : 'moderate',
      wards: city.wards.map((w) => ({
        wardId: w.id,
        name: w.name,
        value: w.no2UmolM2,
        aqi: w.aqi,
        baseline: w.no2Baseline,
        delta: Number((w.no2UmolM2 - w.no2Baseline).toFixed(1)),
        severity: w.severity,
        coordinates: w.center,
      })),
      history: city.history90d.slice(-45).map((d) => ({ date: d.date, value: d.no2, aqi: d.aqi })),
      insights: [
        `Highest tropospheric NO₂ plume concentrated over ${worstWard.name} at ${worstWard.no2UmolM2} µmol/m² (AQI ${worstWard.aqi}).`,
        `Weekly weekday-vs-weekend oscillation confirms heavy freight and industrial combustion signatures.`,
      ],
    });
  });

  app.get('/api/analytics/vegetation', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const avgNdvi = Number(
      (city.wards.reduce((s, w) => s + w.ndvi, 0) / city.wards.length).toFixed(3)
    );
    const degradedWard = [...city.wards].sort(
      (a, b) => (a.ndvi - a.ndviBaseline) - (b.ndvi - b.ndviBaseline)
    )[0];
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      indicator: 'Vegetation & Canopy Health (NDVI)',
      unit: 'NDVI',
      currentValue: avgNdvi,
      baselineValue: Number((city.wards.reduce((s, w) => s + w.ndviBaseline, 0) / city.wards.length).toFixed(3)),
      riskClassification: avgNdvi < 0.25 ? 'critical' : avgNdvi < 0.34 ? 'high' : 'moderate',
      wards: city.wards.map((w) => ({
        wardId: w.id,
        name: w.name,
        value: w.ndvi,
        baseline: w.ndviBaseline,
        delta: Number((w.ndvi - w.ndviBaseline).toFixed(3)),
        severity: w.severity,
        coordinates: w.center,
      })),
      history: city.history90d.slice(-45).map((d) => ({ date: d.date, value: d.ndvi })),
      insights: [
        `Steepest canopy contraction detected in ${degradedWard.name} (${degradedWard.ndvi} vs ${degradedWard.ndviBaseline} baseline).`,
        `Protected green cores maintain NDVI > 0.48 and deliver up to 4.5 °C localized cooling benefits.`,
      ],
    });
  });

  app.get('/api/analytics/water', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    const totalWater = Number(
      city.wards.reduce((s, w) => s + w.waterExtentKm2, 0).toFixed(2)
    );
    const baselineWater = Number(
      city.wards.reduce((s, w) => s + w.waterBaselineKm2, 0).toFixed(2)
    );
    const dropPct = Number((((totalWater - baselineWater) / Math.max(0.1, baselineWater)) * 100).toFixed(1));
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      indicator: 'Surface Water Body Monitoring (NDWI + SAR)',
      unit: 'km²',
      currentValue: totalWater,
      baselineValue: baselineWater,
      changePct: dropPct,
      riskClassification: dropPct <= -15 ? 'high' : 'moderate',
      wards: city.wards.map((w) => ({
        wardId: w.id,
        name: w.name,
        value: w.waterExtentKm2,
        baseline: w.waterBaselineKm2,
        delta: Number((w.waterExtentKm2 - w.waterBaselineKm2).toFixed(2)),
        severity: w.severity,
        coordinates: w.center,
      })),
      history: city.history90d.slice(-45).map((d) => ({ date: d.date, value: d.waterExtentKm2 })),
      insights: [
        `Monitored surface-water area changed by ${dropPct}% (${totalWater} km² vs ${baselineWater} km² seasonal baseline).`,
        `Sentinel-1 VV backscatter cross-checks confirm shoreline recession independent of cloud cover.`,
      ],
    });
  });

  app.get('/api/analytics/land-cover', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const seg = segmentationService.runSegmentation(cityId);
    res.json({
      ...seg,
      dataMode: 'DEMO_FALLBACK',
      indicator: 'Land Use & Land Cover (LULC)',
      unit: '%',
    });
  });

  // =========================================================================
  // MACHINE LEARNING ENDPOINTS
  // =========================================================================
  app.get('/api/ml/anomalies', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const sensitivity = req.query.sensitivity ? Number(req.query.sensitivity) : 0.42;
    const epsKm = req.query.epsKm ? Number(req.query.epsKm) : 12.5;
    res.json(mlConsensusService.detectAndScore(cityId, { sensitivity, epsKm }));
  });

  app.post('/api/ml/detect-anomalies', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const sensitivity = Number(req.body?.sensitivity ?? 0.42);
    const epsKm = Number(req.body?.epsKm ?? 12.5);
    res.json(mlConsensusService.detectAndScore(cityId, { sensitivity, epsKm }));
  });

  app.post('/api/ml/risk-consensus', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const result = mlConsensusService.detectAndScore(cityId);
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      avgConsensusRisk: result.summary.avgConsensusRisk,
      clusters: result.clusters,
      rankedHotspots: result.anomalies.map((a) => ({
        anomalyId: a.id,
        wardName: a.wardName,
        consensusRiskScore: a.consensusRiskScore,
        severity: a.severity,
        modelContributions: a.modelContributions,
      })),
    });
  });

  // =========================================================================
  // FORECASTING ENDPOINTS
  // =========================================================================
  app.post('/api/forecast/predict', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const indicator = (req.body?.indicator as ForecastIndicator) || 'lst';
    const algorithm = (req.body?.algorithm as ForecastAlgorithm) || 'prophet';
    const rawHorizon = Number(req.body?.horizonDays ?? 30);
    const horizon: ForecastHorizon = rawHorizon === 7 ? 7 : rawHorizon === 90 ? 90 : 30;

    res.json(forecastService.forecast(cityId, indicator, algorithm, horizon));
  });

  app.get('/api/forecast/history', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const city = getMunicipality(cityId);
    res.json({
      municipalityId: cityId,
      dataMode: 'DEMO_FALLBACK',
      observations: city.history90d,
    });
  });

  app.get('/api/forecast/model-comparison', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    const indicator = (req.query.indicator as ForecastIndicator) || 'lst';
    res.json({
      municipalityId: cityId,
      indicator,
      dataMode: 'DEMO_FALLBACK',
      models: forecastService.compareModels(cityId, indicator),
    });
  });

  // =========================================================================
  // LAND COVER SEGMENTATION ENDPOINTS
  // =========================================================================
  app.post('/api/segmentation/predict', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    res.json(segmentationService.runSegmentation(cityId));
  });

  app.get('/api/segmentation/results', (req, res) => {
    const cityId = parseCity(req.query.municipality);
    res.json(segmentationService.runSegmentation(cityId));
  });

  // =========================================================================
  // ENVIRONMENT ACTION PLAN REPORT ENDPOINTS
  // =========================================================================
  app.post('/api/reports/generate', (req, res) => {
    const cityId = parseCity(req.body?.municipalityId);
    const plan = reportEngine.generate(cityId);
    res.status(201).json(plan);
  });

  app.get('/api/reports', (req, res) => {
    const cityParam = typeof req.query.municipality === 'string' ? parseCity(req.query.municipality) : undefined;
    res.json({
      dataMode: 'DEMO_FALLBACK',
      reports: reportEngine.list(cityParam),
    });
  });

  app.get('/api/reports/:reportId', (req, res) => {
    const report = reportEngine.getById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    return res.json(report);
  });

  app.get('/api/reports/:reportId/download', (req, res) => {
    const report = reportEngine.getById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="PRATYAKSHA_${report.municipalityId}_${report.id}.json"`
    );
    return res.send(JSON.stringify(report, null, 2));
  });

  // =========================================================================
  // PYTHON FASTAPI GEOSPATIAL REVERSE PROXY
  // =========================================================================
  const GEO_BACKEND_URL = process.env.GEO_BACKEND_URL || 'http://localhost:8000';
  app.use('/api/py', async (req, res) => {
    try {
      const targetUrl = `${GEO_BACKEND_URL}/api${req.url}`;
      let authHeader = req.headers.authorization as string | undefined;
      if (!authHeader) {
        const idToken = await getGcpIdToken(GEO_BACKEND_URL);
        if (idToken) {
          authHeader = `Bearer ${idToken}`;
        }
      }
      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        timeout: 15000,
      });
      return res.status(response.status).json(response.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data: unknown }; message: string };
      if (axiosErr.response) {
        return res.status(axiosErr.response.status).json(axiosErr.response.data);
      }
      return res.status(502).json({
        error: 'Python GIS Backend unreachable',
        backendUrl: GEO_BACKEND_URL,
        dataMode: 'DEMO_FALLBACK',
        message: axiosErr.message || 'Service unavailable',
      });
    }
  });
  // API 404 fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Mount Vite middleware in development or static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PRATYAKSHA full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to boot PRATYAKSHA server:', err);
  process.exit(1);
});
