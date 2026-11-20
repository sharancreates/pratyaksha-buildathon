export type MunicipalityId = 'ahmedabad' | 'delhi' | 'mumbai' | 'bengaluru' | 'chennai';

export type SeverityLevel = 'low' | 'moderate' | 'high' | 'critical';

export type MapLayerId =
  | 'boundaries'
  | 'heat_island'
  | 'ndvi'
  | 'air_quality'
  | 'risk_zones'
  | 'land_cover';

export type SatelliteMissionId = 'sentinel-1' | 'sentinel-2' | 'modis' | 'landsat-8-9';

export type ForecastAlgorithm = 'prophet' | 'arima' | 'xgboost';

export type ForecastIndicator = 'lst' | 'ndvi' | 'aqi' | 'no2' | 'vegetation_degradation';

export type ForecastHorizon = 7 | 30 | 90;

export interface WardFeature {
  id: string;
  name: string;
  zoneType: 'urban_heat_hotspot' | 'vegetation_degradation' | 'air_pollution' | 'water_change' | 'healthy_green' | 'mixed_urban';
  center: [number, number]; // [lng, lat]
  polygon: [number, number][];
  areaKm2: number;
  population: number;
  lstCelsius: number;
  lstBaseline: number;
  ndvi: number;
  ndviBaseline: number;
  no2UmolM2: number;
  no2Baseline: number;
  aqi: number;
  aqiBaseline: number;
  waterExtentKm2: number;
  waterBaselineKm2: number;
  dominantLandCover: LandCoverClassId;
  riskScore: number; // 0 - 100
  severity: SeverityLevel;
}

export interface DailyObservationPoint {
  date: string;
  lst: number;
  ndvi: number;
  no2: number;
  aqi: number;
  waterExtentKm2: number;
  cloudCoverPct: number;
}

export interface MunicipalityProfile {
  id: MunicipalityId;
  name: string;
  state: string;
  corporation: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  areaKm2: number;
  populationMillions: number;
  crsUtm: string;
  boundary: [number, number][];
  wards: WardFeature[];
  history90d: DailyObservationPoint[];
}

export interface KpiCardMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  unit: string;
  previousValue: number;
  deltaPercent: number;
  deltaLabel: string;
  trend: 'up' | 'down' | 'stable';
  isPositiveTrend: boolean;
  status: 'nominal' | 'elevated' | 'warning' | 'critical';
  sparkline: number[];
}

export interface DetectedAnomaly {
  id: string;
  municipalityId: MunicipalityId;
  wardId: string;
  wardName: string;
  coordinates: [number, number]; // [lng, lat]
  detectedAt: string;
  indicator: string;
  indicatorKey: 'lst' | 'ndvi' | 'no2' | 'water' | 'land_cover';
  observedValue: number;
  baselineValue: number;
  unit: string;
  deviationPercent: number;
  severity: SeverityLevel;
  primaryModel: 'Isolation Forest' | 'DBSCAN Spatial' | 'Autoencoder MSE' | 'Multi-Model Consensus';
  isolationForestScore: number; // 0..1 uncalibrated
  autoencoderError: number; // normalized MSE 0..1
  dbscanClusterId: number | null; // -1 or null if noise
  consensusRiskScore: number; // 0..100 explainable composite
  modelContributions: {
    isolationForest: number;
    autoencoder: number;
    dbscanSpatial: number;
    thresholdSeverity: number;
  };
  scoreDisclaimer: string;
  suggestedIntervention: string;
  department: string;
  scenarioTag: string;
}

export interface SpatialCluster {
  clusterId: number;
  municipalityId: MunicipalityId;
  label: string;
  centroid: [number, number];
  radiusKm: number;
  memberAnomalyIds: string[];
  avgRiskScore: number;
  dominantIndicator: string;
}

export interface SatelliteMission {
  id: SatelliteMissionId;
  name: string;
  agency: 'ESA' | 'NASA' | 'USGS/NASA';
  sensor: string;
  spatialResolutionM: number;
  revisitDays: number;
  spectralBands: { code: string; name: string; wavelength: string; useCase: string }[];
  healthStatus: 'operational' | 'degraded';
  lastPassUtc: string;
  activeTiles: number;
  dataMode: 'DEMO_FALLBACK';
}

export interface SatelliteObservation {
  id: string;
  municipalityId: MunicipalityId;
  missionId: SatelliteMissionId;
  missionName: string;
  acquiredAt: string;
  crsSource: string;
  crsTarget: string;
  resolutionSourceM: number;
  resolutionTargetM: number;
  cloudCoveragePct: number;
  spectralBand: string;
  harmonizationStatus: 'harmonized' | 'pending' | 'failed';
  spatialCoveragePct: number;
  syntheticData: boolean;
  tileId: string;
}

export interface HarmonizationResult {
  jobId: string;
  municipalityId: MunicipalityId;
  missionId: SatelliteMissionId | 'all';
  targetCrs: string;
  targetResolutionM: number;
  rawObservationCount: number;
  processedObservationCount: number;
  failedIngestionCount: number;
  spatialCoveragePct: number;
  processingDurationMs: number;
  executedAt: string;
  stages: {
    stage: string;
    status: 'completed' | 'warning';
    detail: string;
    durationMs: number;
  }[];
  dataMode: 'DEMO_FALLBACK';
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted?: number;
  lower?: number;
  upper?: number;
}

export interface ForecastResponse {
  municipalityId: MunicipalityId;
  indicator: ForecastIndicator;
  indicatorLabel: string;
  unit: string;
  algorithm: ForecastAlgorithm;
  algorithmLabel: string;
  horizonDays: ForecastHorizon;
  series: ForecastPoint[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  projectedChangePct: number;
  reliability: 'high' | 'moderate' | 'illustrative';
  reliabilityNote: string;
  observationsUsed: number;
  metrics: {
    rmse: number;
    mae: number;
    mape: number;
  };
  dataMode: 'DEMO_FALLBACK';
}

export interface ModelComparisonRow {
  algorithm: ForecastAlgorithm;
  label: string;
  rmse: number;
  mae: number;
  mape: number;
  trainingWindowDays: number;
  strengths: string;
  recommended: boolean;
}

export type LandCoverClassId =
  | 'dense_vegetation'
  | 'sparse_vegetation'
  | 'built_up'
  | 'water_bodies'
  | 'bare_soil'
  | 'agricultural';

export interface LandCoverClassStat {
  id: LandCoverClassId;
  label: string;
  color: string;
  areaKm2: number;
  percentage: number;
  fiveYearChangePct: number;
}

export interface LandCoverTransition {
  fromClass: string;
  toClass: string;
  areaKm2: number;
  driver: string;
}

export interface SegmentationResult {
  id: string;
  municipalityId: MunicipalityId;
  municipalityName: string;
  modelArchitecture: string;
  inferenceMode: 'DEMO_FALLBACK_SPECTRAL' | 'VALIDATED_PYTORCH_WEIGHTS';
  weightsStatus: string;
  acquiredAt: string;
  spatialResolutionM: number;
  totalAreaKm2: number;
  classes: LandCoverClassStat[];
  transitions: LandCoverTransition[];
  estimatedIoUDemo: number;
}

export interface ActionRecommendation {
  id: string;
  priority: 'P1 — Immediate' | 'P2 — Near-Term' | 'P3 — Strategic';
  category: string;
  geographicLocation: string;
  coordinates: [number, number];
  supportingEvidence: string;
  suggestedDepartment: string;
  recommendedAction: string;
  suggestedTimeline: string;
  monitoringMetric: string;
}

export interface EnvironmentActionPlan {
  id: string;
  municipalityId: MunicipalityId;
  municipalityName: string;
  corporation: string;
  generatedAt: string;
  dataMode: 'DEMO_FALLBACK';
  title: string;
  executiveSummary: string;
  environmentalHealthOverview: {
    healthIndex: number;
    avgLstCelsius: number;
    avgNdvi: number;
    avgAqi: number;
    avgNo2UmolM2: number;
    totalWaterKm2: number;
    activeAnomalyCount: number;
    criticalAnomalyCount: number;
  };
  majorThreats: {
    title: string;
    severity: SeverityLevel;
    affectedZones: string[];
    summary: string;
  }[];
  geographicHotspots: {
    wardName: string;
    coordinates: [number, number];
    riskScore: number;
    primaryThreat: string;
    metricDetail: string;
  }[];
  satelliteEvidence: {
    missionsUsed: string[];
    observationWindow: string;
    harmonizedGrid: string;
    observationCount: number;
    note: string;
  };
  mlFindings: {
    modelsExecuted: string[];
    anomaliesDetected: number;
    spatialClustersFormed: number;
    topConsensusFinding: string;
  };
  environmentalForecasts: {
    indicator: string;
    horizon: string;
    projectedChange: string;
    reliability: string;
    summary: string;
  }[];
  priorityInterventionAreas: string[];
  recommendations: ActionRecommendation[];
  implementationTimeline: {
    phase: string;
    window: string;
    milestones: string[];
  }[];
  monitoringIndicators: {
    indicator: string;
    baseline: string;
    target12Month: string;
    verificationSource: string;
  }[];
  status: 'draft' | 'approved' | 'archived';
}
