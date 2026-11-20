import type {
  HarmonizationResult,
  MunicipalityId,
  SatelliteMissionId,
  SatelliteObservation,
} from '../../shared/types';
import { getMunicipality, SATELLITE_MISSIONS } from '../data/smartCitiesData.ts';

export class SatelliteDataHarmonizer {
  private observationsCache: Map<MunicipalityId, SatelliteObservation[]> = new Map();
  private lastHarmonization: Map<MunicipalityId, HarmonizationResult> = new Map();

  public getObservations(
    municipalityId: MunicipalityId,
    filters?: {
      missionId?: SatelliteMissionId | 'all';
      maxCloudPct?: number;
      band?: string;
      startDate?: string;
      endDate?: string;
    }
  ): SatelliteObservation[] {
    if (!this.observationsCache.has(municipalityId)) {
      this.observationsCache.set(municipalityId, this.buildDeterministicObservations(municipalityId));
    }

    let list = this.observationsCache.get(municipalityId)!;
    if (filters?.missionId && filters.missionId !== 'all') {
      list = list.filter((o) => o.missionId === filters.missionId);
    }
    if (typeof filters?.maxCloudPct === 'number') {
      list = list.filter((o) => o.cloudCoveragePct <= filters.maxCloudPct!);
    }
    if (filters?.band && filters.band !== 'all') {
      list = list.filter((o) => o.spectralBand.toLowerCase().includes(filters.band!.toLowerCase()));
    }
    if (filters?.startDate) {
      list = list.filter((o) => o.acquiredAt.slice(0, 10) >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((o) => o.acquiredAt.slice(0, 10) <= filters.endDate!);
    }
    return list;
  }

  public ingest(
    municipalityId: MunicipalityId,
    missionId: SatelliteMissionId | 'all',
    maxCloudPct = 30
  ): {
    ingestedCount: number;
    skippedCloudyCount: number;
    municipalityId: MunicipalityId;
    missionId: SatelliteMissionId | 'all';
    dataMode: 'DEMO_FALLBACK';
    observations: SatelliteObservation[];
  } {
    const existing = this.getObservations(municipalityId);
    const matching =
      missionId === 'all' ? existing : existing.filter((o) => o.missionId === missionId);
    const valid = matching.filter((o) => o.cloudCoveragePct <= maxCloudPct);
    const skipped = matching.length - valid.length;

    return {
      ingestedCount: valid.length,
      skippedCloudyCount: skipped,
      municipalityId,
      missionId,
      dataMode: 'DEMO_FALLBACK',
      observations: valid,
    };
  }

  public harmonize(
    municipalityId: MunicipalityId,
    missionId: SatelliteMissionId | 'all' = 'all',
    targetResolutionM = 30
  ): HarmonizationResult {
    const city = getMunicipality(municipalityId);
    const obs = this.getObservations(municipalityId, { missionId });

    const failed = obs.filter((o) => o.harmonizationStatus === 'failed').length;
    const processed = obs.length - failed;

    // Mark all pending items harmonized in cache
    const allObs = this.observationsCache.get(municipalityId) || [];
    for (const item of allObs) {
      if ((missionId === 'all' || item.missionId === missionId) && item.harmonizationStatus === 'pending') {
        item.harmonizationStatus = 'harmonized';
        item.resolutionTargetM = targetResolutionM;
      }
    }

    const avgCoverage =
      processed > 0
        ? Number(
            (
              obs
                .filter((o) => o.harmonizationStatus !== 'failed')
                .reduce((acc, o) => acc + o.spatialCoveragePct, 0) / processed
            ).toFixed(1)
          )
        : 0;

    const result: HarmonizationResult = {
      jobId: `HARM-${municipalityId.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      municipalityId,
      missionId,
      targetCrs: 'EPSG:4326',
      targetResolutionM,
      rawObservationCount: obs.length,
      processedObservationCount: processed,
      failedIngestionCount: failed,
      spatialCoveragePct: avgCoverage,
      processingDurationMs: 1240 + obs.length * 18,
      executedAt: new Date().toISOString(),
      stages: [
        {
          stage: 'Metadata & Granule Validation',
          status: 'completed',
          detail: `Validated ${obs.length} synthetic demo tiles across ${city.name} bounding box.`,
          durationMs: 185,
        },
        {
          stage: 'CRS Normalization & Reprojection',
          status: 'completed',
          detail: `Reprojected UTM granules (${city.crsUtm}) to standardized WGS84 (EPSG:4326) municipal grid.`,
          durationMs: 310,
        },
        {
          stage: `Spatial Resampling (${targetResolutionM}m Grid)`,
          status: 'completed',
          detail: `Bilinearly resampled 10m Sentinel-2, 10m SAR, 30m Landsat, and 1000m MODIS bands to ${targetResolutionM}m grid.`,
          durationMs: 420,
        },
        {
          stage: 'Cloud Masking & Temporal Alignment',
          status: failed > 0 ? 'warning' : 'completed',
          detail:
            failed > 0
              ? `Aligned ${processed} clean tiles; excluded ${failed} observations exceeding QA cloud/shadow threshold.`
              : `Aligned ${processed} observations with zero QA drops.`,
          durationMs: 325,
        },
      ],
      dataMode: 'DEMO_FALLBACK',
    };

    this.lastHarmonization.set(municipalityId, result);
    return result;
  }

  public getLastHarmonization(municipalityId: MunicipalityId): HarmonizationResult {
    return this.lastHarmonization.get(municipalityId) ?? this.harmonize(municipalityId, 'all', 30);
  }

  private buildDeterministicObservations(municipalityId: MunicipalityId): SatelliteObservation[] {
    const city = getMunicipality(municipalityId);
    const observations: SatelliteObservation[] = [];
    const anchor = new Date('2026-11-19T06:00:00Z');

    const missionConfigs = SATELLITE_MISSIONS;
    for (let i = 0; i < 24; i++) {
      const m = missionConfigs[i % missionConfigs.length];
      const band = m.spectralBands[i % m.spectralBands.length];
      const dt = new Date(anchor.getTime() - i * 36 * 3600000);
      const cloudPct =
        m.id === 'sentinel-1'
          ? 0
          : Number((((i * 11 + city.name.length * 7) % 44) + 2.4).toFixed(1));
      const isFailed = cloudPct > 40;
      const isPending = !isFailed && i === 0;

      observations.push({
        id: `OBS-${municipalityId.slice(0, 3).toUpperCase()}-${String(1042 - i)}`,
        municipalityId,
        missionId: m.id,
        missionName: m.name,
        acquiredAt: dt.toISOString(),
        crsSource: m.id === 'modis' ? 'EPSG:6974' : city.crsUtm,
        crsTarget: 'EPSG:4326',
        resolutionSourceM: m.spatialResolutionM,
        resolutionTargetM: 30,
        cloudCoveragePct: cloudPct,
        spectralBand: `${band.code} (${band.name})`,
        harmonizationStatus: isFailed ? 'failed' : isPending ? 'pending' : 'harmonized',
        spatialCoveragePct: isFailed ? 38.2 : Number((99.4 - cloudPct * 0.35).toFixed(1)),
        syntheticData: true,
        tileId: `T43Q${municipalityId.slice(0, 2).toUpperCase()}-${String(20261119 - Math.floor(i / 2))}`,
      });
    }

    return observations;
  }
}

export const harmonizerService = new SatelliteDataHarmonizer();
