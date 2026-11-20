import axios from 'axios';
import type {
  DetectedAnomaly,
  EnvironmentActionPlan,
  ForecastAlgorithm,
  ForecastHorizon,
  ForecastIndicator,
  ForecastResponse,
  HarmonizationResult,
  KpiCardMetric,
  ModelComparisonRow,
  MunicipalityId,
  MunicipalityProfile,
  SatelliteMission,
  SatelliteObservation,
  SegmentationResult,
  SpatialCluster,
} from '../shared/types';

export interface DashboardOverviewResponse {
  municipality: MunicipalityProfile;
  kpis: KpiCardMetric[];
  anomalies: DetectedAnomaly[];
  riskDistribution: { level: string; count: number; fill: string }[];
}

export async function fetchDashboardOverview(
  cityId: MunicipalityId
): Promise<DashboardOverviewResponse> {
  const { data } = await axios.get<DashboardOverviewResponse>(
    `/api/dashboard/overview?city=${cityId}`
  );
  return data;
}

export async function fetchAnomalies(
  cityId: MunicipalityId,
  sensitivity = 0.42,
  epsKm = 12.5
): Promise<{
  anomalies: DetectedAnomaly[];
  clusters: SpatialCluster[];
  summary: { totalDetected: number; criticalCount: number; highCount: number; avgConsensusRisk: number };
}> {
  const { data } = await axios.get(
    `/api/ml/anomalies?city=${cityId}&sensitivity=${sensitivity}&epsKm=${epsKm}`
  );
  return data;
}

export async function runAnomalyDetection(payload: {
  municipalityId: MunicipalityId;
  sensitivity?: number;
  epsKm?: number;
}): Promise<{
  anomalies: DetectedAnomaly[];
  clusters: SpatialCluster[];
  summary: { totalDetected: number; criticalCount: number; highCount: number; avgConsensusRisk: number };
}> {
  const { data } = await axios.post('/api/ml/detect-anomalies', payload);
  return data;
}

export async function fetchSatelliteMissions(): Promise<{ missions: SatelliteMission[] }> {
  const { data } = await axios.get('/api/satellite/missions');
  return data;
}

export async function fetchSatelliteObservations(params: {
  municipality: MunicipalityId;
  mission?: string;
  maxCloud?: number;
  band?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ observations: SatelliteObservation[]; lastHarmonization: HarmonizationResult }> {
  const query = new URLSearchParams();
  query.set('city', params.municipality);
  if (params.mission && params.mission !== 'all') query.set('mission', params.mission);
  if (params.maxCloud !== undefined) query.set('maxCloud', String(params.maxCloud));
  if (params.band && params.band !== 'all') query.set('band', params.band);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  const { data } = await axios.get(`/api/satellite/observations?${query.toString()}`);
  return data;
}

export async function triggerSatelliteIngest(payload: {
  municipalityId: MunicipalityId;
  missionId?: string;
  maxCloudPct?: number;
}): Promise<any> {
  const { data } = await axios.post('/api/satellite/ingest', payload);
  return data;
}

export async function triggerHarmonization(payload: {
  municipalityId: MunicipalityId;
  missionId?: string;
  targetResolutionM?: number;
}): Promise<HarmonizationResult> {
  const { data } = await axios.post('/api/satellite/harmonize', payload);
  return data.result;
}

export async function fetchAnalyticsModule(
  modulePath: string,
  cityId: MunicipalityId
): Promise<any> {
  const { data } = await axios.get(`/api/analytics/${modulePath}?city=${cityId}`);
  return data;
}

export async function fetchModelComparison(
  cityId: MunicipalityId,
  indicator: string
): Promise<{ models: ModelComparisonRow[] }> {
  const { data } = await axios.get(
    `/api/forecast/model-comparison?city=${cityId}&indicator=${indicator}`
  );
  return data;
}

export async function runForecastPrediction(payload: {
  municipalityId: MunicipalityId;
  indicator: ForecastIndicator;
  algorithm: ForecastAlgorithm;
  horizonDays: ForecastHorizon;
}): Promise<ForecastResponse> {
  const { data } = await axios.post('/api/forecast/predict', payload);
  return data;
}

export async function fetchSegmentation(cityId: MunicipalityId): Promise<SegmentationResult> {
  const { data } = await axios.get(`/api/segmentation/results?city=${cityId}`);
  return data;
}

export async function runSegmentationInference(payload: {
  municipalityId: MunicipalityId;
  confidenceThreshold?: number;
}): Promise<SegmentationResult> {
  const { data } = await axios.post('/api/segmentation/predict', payload);
  return data;
}

export async function fetchReports(): Promise<{ reports: EnvironmentActionPlan[] }> {
  const { data } = await axios.get('/api/reports');
  return data;
}

export async function generateActionPlanReport(
  municipalityId: MunicipalityId
): Promise<EnvironmentActionPlan> {
  const { data } = await axios.post('/api/reports/generate', { municipalityId });
  return data;
}
