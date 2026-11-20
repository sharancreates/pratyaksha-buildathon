import type {
  ActionRecommendation,
  EnvironmentActionPlan,
  MunicipalityId,
} from '../../shared/types';
import { getMunicipality } from '../data/smartCitiesData.ts';
import { mlConsensusService } from './mlEngine.ts';
import { forecastService } from './forecastEngine.ts';
import { harmonizerService } from './harmonizer.ts';

export class ActionPlanReportEngine {
  private reports: Map<string, EnvironmentActionPlan> = new Map();

  constructor() {
    // Seed an initial Ahmedabad action plan so report history is immediately demonstrable
    this.generate('ahmedabad');
  }

  public generate(municipalityId: MunicipalityId): EnvironmentActionPlan {
    const city = getMunicipality(municipalityId);
    const ml = mlConsensusService.detectAndScore(municipalityId);
    const harm = harmonizerService.getLastHarmonization(municipalityId);
    const lstForecast = forecastService.forecast(municipalityId, 'lst', 'prophet', 30);
    const ndviForecast = forecastService.forecast(municipalityId, 'ndvi', 'prophet', 30);
    const no2Forecast = forecastService.forecast(municipalityId, 'no2', 'xgboost', 30);

    const avgLst = Number(
      (city.wards.reduce((s, w) => s + w.lstCelsius, 0) / city.wards.length).toFixed(1)
    );
    const avgNdvi = Number(
      (city.wards.reduce((s, w) => s + w.ndvi, 0) / city.wards.length).toFixed(2)
    );
    const avgAqi = Math.round(
      city.wards.reduce((s, w) => s + w.aqi, 0) / city.wards.length
    );
    const avgNo2 = Number(
      (city.wards.reduce((s, w) => s + w.no2UmolM2, 0) / city.wards.length).toFixed(1)
    );
    const totalWater = Number(
      city.wards.reduce((s, w) => s + w.waterExtentKm2, 0).toFixed(2)
    );
    const avgRisk =
      city.wards.reduce((s, w) => s + w.riskScore, 0) / city.wards.length;
    const healthIndex = Math.max(18, Math.min(94, Math.round(100 - avgRisk * 0.62)));

    const sortedWards = [...city.wards].sort((a, b) => b.riskScore - a.riskScore);
    const topAnomalies = ml.anomalies;

    const recommendations: ActionRecommendation[] = topAnomalies.slice(0, 5).map((anm, idx) => {
      const priority: ActionRecommendation['priority'] =
        anm.severity === 'critical'
          ? 'P1 — Immediate'
          : anm.severity === 'high'
          ? 'P2 — Near-Term'
          : 'P3 — Strategic';

      const metric =
        anm.indicatorKey === 'lst'
          ? 'Reduce peak daytime LST by ≥ 1.8 °C over 12 months (Landsat TIRS)'
          : anm.indicatorKey === 'no2'
          ? 'Lower tropospheric NO₂ column by ≥ 15% in target corridor (MODIS/TROPOMI)'
          : anm.indicatorKey === 'water'
          ? 'Restore ≥ 12% seasonal surface-water extent (Sentinel-1 SAR + NDWI)'
          : 'Increase ward mean NDVI by +0.06 via native canopy planting (Sentinel-2)';

      const timeline =
        priority === 'P1 — Immediate'
          ? '0–90 Days (Emergency Municipal Deployment)'
          : priority === 'P2 — Near-Term'
          ? '3–6 Months (Quarterly Engineering Rollout)'
          : '6–12 Months (Annual Master Plan Integration)';

      return {
        id: `REC-${municipalityId.slice(0, 3).toUpperCase()}-${idx + 1}`,
        priority,
        category: anm.indicator,
        geographicLocation: anm.wardName,
        coordinates: anm.coordinates,
        supportingEvidence: `Observed ${anm.observedValue} ${anm.unit} vs baseline ${anm.baselineValue} ${anm.unit} (${anm.deviationPercent > 0 ? '+' : ''}${anm.deviationPercent}%). Risk consensus ${anm.consensusRiskScore}/100 via ${anm.primaryModel}.`,
        suggestedDepartment: anm.department,
        recommendedAction: anm.suggestedIntervention,
        suggestedTimeline: timeline,
        monitoringMetric: metric,
      };
    });

    const majorThreats = topAnomalies.slice(0, 4).map((a) => ({
      title: `${a.indicator} — ${a.wardName}`,
      severity: a.severity,
      affectedZones: [a.wardName],
      summary: `${a.observedValue} ${a.unit} recorded against ${a.baselineValue} ${a.unit} historical baseline (consensus score ${a.consensusRiskScore}/100).`,
    }));

    const id = `EAP-${municipalityId.slice(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    const plan: EnvironmentActionPlan = {
      id,
      municipalityId,
      municipalityName: city.name,
      corporation: city.corporation,
      generatedAt: new Date().toISOString(),
      dataMode: 'DEMO_FALLBACK',
      title: `${city.name} Municipal Environment Action Plan (2026–2027)`,
      executiveSummary: `Synthesized from ${harm.processedObservationCount} harmonized multi-mission satellite observations across ${city.areaKm2} km² of ${city.corporation}, this Environment Action Plan identifies ${ml.summary.totalDetected} active environmental anomalies (${ml.summary.criticalCount} critical). Mean Land Surface Temperature stands at ${avgLst} °C with mean NDVI at ${avgNdvi} and municipal AQI at ${avgAqi}. Immediate P1 interventions target ${sortedWards[0].name} and ${sortedWards[1].name} to mitigate thermal stress, atmospheric NO₂ loading, and surface-water shrinkage prior to peak seasonal escalation.`,
      environmentalHealthOverview: {
        healthIndex,
        avgLstCelsius: avgLst,
        avgNdvi,
        avgAqi,
        avgNo2UmolM2: avgNo2,
        totalWaterKm2: totalWater,
        activeAnomalyCount: ml.summary.totalDetected,
        criticalAnomalyCount: ml.summary.criticalCount,
      },
      majorThreats,
      geographicHotspots: sortedWards.slice(0, 4).map((w) => ({
        wardName: w.name,
        coordinates: w.center,
        riskScore: w.riskScore,
        primaryThreat: w.zoneType.replace(/_/g, ' '),
        metricDetail: `LST ${w.lstCelsius}°C · NDVI ${w.ndvi} · NO₂ ${w.no2UmolM2} µmol/m² · AQI ${w.aqi}`,
      })),
      satelliteEvidence: {
        missionsUsed: ['ESA Sentinel-2 MSI (10m)', 'ESA Sentinel-1 SAR (10m)', 'Landsat 8/9 TIRS (30m)', 'NASA MODIS / TROPOMI (1km)'],
        observationWindow: `${city.history90d[0].date} to ${city.history90d[city.history90d.length - 1].date} (90-day harmonized series)`,
        harmonizedGrid: `${harm.targetCrs} @ ${harm.targetResolutionM}m municipal analysis grid`,
        observationCount: harm.processedObservationCount,
        note: 'Generated in deterministic DEMO MODE using synthetic demonstration telemetry consistent across all dashboard modules.',
      },
      mlFindings: {
        modelsExecuted: ml.summary.modelsExecuted,
        anomaliesDetected: ml.summary.totalDetected,
        spatialClustersFormed: ml.clusters.length,
        topConsensusFinding: topAnomalies[0]
          ? `${topAnomalies[0].wardName} reached a ${topAnomalies[0].consensusRiskScore}/100 multi-model risk consensus driven by ${topAnomalies[0].indicator} (${topAnomalies[0].observedValue} ${topAnomalies[0].unit}).`
          : 'No severe multi-model consensus anomalies above threshold.',
      },
      environmentalForecasts: [
        {
          indicator: 'Land Surface Temperature',
          horizon: '30-Day (Prophet)',
          projectedChange: `${lstForecast.projectedChangePct > 0 ? '+' : ''}${lstForecast.projectedChangePct}%`,
          reliability: lstForecast.reliability,
          summary: `Projected ${lstForecast.trendDirection} thermal trend (${lstForecast.reliabilityNote})`,
        },
        {
          indicator: 'Vegetation Health (NDVI)',
          horizon: '30-Day (Prophet)',
          projectedChange: `${ndviForecast.projectedChangePct > 0 ? '+' : ''}${ndviForecast.projectedChangePct}%`,
          reliability: ndviForecast.reliability,
          summary: `Projected ${ndviForecast.trendDirection} canopy trajectory across peri-urban fringes.`,
        },
        {
          indicator: 'Tropospheric NO₂',
          horizon: '30-Day (XGBoost)',
          projectedChange: `${no2Forecast.projectedChangePct > 0 ? '+' : ''}${no2Forecast.projectedChangePct}%`,
          reliability: no2Forecast.reliability,
          summary: `Projected ${no2Forecast.trendDirection} atmospheric column loading near industrial corridors.`,
        },
      ],
      priorityInterventionAreas: sortedWards.slice(0, 3).map((w) => `${w.name} (Risk ${w.riskScore}/100)`),
      recommendations,
      implementationTimeline: [
        {
          phase: 'Phase 1 — Emergency Thermal & Emission Controls',
          window: 'Days 0–90',
          milestones: [
            `Deploy cool-roof coatings and misting shelters in ${sortedWards[0].name}.`,
            `Conduct mobile NO₂ stack & heavy-freight audits across ${sortedWards[1].name}.`,
            'Publish bi-weekly Sentinel-2 & Landsat heat advisories to ward commissioners.',
          ],
        },
        {
          phase: 'Phase 2 — Canopy & Catchment Restoration',
          window: 'Months 3–6',
          milestones: [
            'Launch native urban tree-canopy corridors along degraded peri-urban fringes.',
            'Clear stormwater inlets and demarcate wetland buffer boundaries using SAR polygons.',
          ],
        },
        {
          phase: 'Phase 3 — Institutional Telemetry & Audit Loop',
          window: 'Months 6–12',
          milestones: [
            'Integrate municipal GIS zoning updates with quarterly EnvironmentalUNet land-cover audits.',
            'Verify 12-month KPI targets against harmonized multi-sensor baselines.',
          ],
        },
      ],
      monitoringIndicators: [
        {
          indicator: 'Mean Municipal Land Surface Temperature',
          baseline: `${avgLst} °C`,
          target12Month: `${(avgLst - 1.5).toFixed(1)} °C`,
          verificationSource: 'Landsat 8/9 B10/B11 + MODIS Daily LST',
        },
        {
          indicator: 'Mean Urban Vegetation Index (NDVI)',
          baseline: `${avgNdvi}`,
          target12Month: `${(avgNdvi + 0.05).toFixed(2)}`,
          verificationSource: 'ESA Sentinel-2 MSI B4/B8 (10m)',
        },
        {
          indicator: 'Tropospheric NO₂ Column Density',
          baseline: `${avgNo2} µmol/m²`,
          target12Month: `${(avgNo2 * 0.85).toFixed(1)} µmol/m²`,
          verificationSource: 'TROPOMI / MODIS Atmospheric Column',
        },
        {
          indicator: 'Monitored Surface Water Extent',
          baseline: `${totalWater} km²`,
          target12Month: `${(totalWater * 1.12).toFixed(2)} km²`,
          verificationSource: 'ESA Sentinel-1 SAR VV + Sentinel-2 NDWI',
        },
      ],
      status: 'draft',
    };

    this.reports.set(plan.id, plan);
    return plan;
  }

  public list(municipalityId?: MunicipalityId): EnvironmentActionPlan[] {
    const all = Array.from(this.reports.values()).sort((a, b) =>
      b.generatedAt.localeCompare(a.generatedAt)
    );
    return municipalityId ? all.filter((r) => r.municipalityId === municipalityId) : all;
  }

  public getById(id: string): EnvironmentActionPlan | undefined {
    return this.reports.get(id);
  }
}

export const reportEngine = new ActionPlanReportEngine();
