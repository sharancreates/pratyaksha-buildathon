import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EnvironmentalAnomalyDetector,
  SpatialClusterAnalyzer,
  EnvironmentalRiskConsensus,
  mlConsensusService,
} from '../../src/server/engines/mlEngine.ts';
import { getMunicipality } from '../../src/server/data/smartCitiesData.ts';
import type { DetectedAnomaly } from '../../src/shared/types.ts';

describe('mlEngine: EnvironmentalAnomalyDetector', () => {
  const detector = new EnvironmentalAnomalyDetector();
  const ahmedabad = getMunicipality('ahmedabad');

  test('scoreWard produces bounded anomaly score and autoencoder MSE', () => {
    const ward = ahmedabad.wards[0]; // Danilimda (urban heat hotspot)
    const result = detector.scoreWard(ward);

    assert.ok(result.isolationScore >= 0.15 && result.isolationScore <= 0.96,
      `isolationScore ${result.isolationScore} out of bounds [0.15, 0.96]`);
    assert.ok(result.autoencoderMse >= 0.04 && result.autoencoderMse <= 0.95,
      `autoencoderMse ${result.autoencoderMse} out of bounds [0.04, 0.95]`);
    assert.ok(['lst', 'ndvi', 'no2', 'water', 'land_cover'].includes(result.primaryIndicator),
      `invalid primaryIndicator: ${result.primaryIndicator}`);
    assert.ok(typeof result.deviationPct === 'number', 'deviationPct should be a number');
  });

  test('scoreWard correctly identifies heat island deviation on elevated LST ward', () => {
    const hotWard = ahmedabad.wards.find((w) => w.zoneType === 'urban_heat_hotspot');
    assert.ok(hotWard, 'Should find an urban heat hotspot ward in Ahmedabad');
    const result = detector.scoreWard(hotWard);
    assert.strictEqual(result.primaryIndicator, 'lst');
    assert.ok(result.observed > result.baseline, 'Observed LST should exceed baseline for heat hotspot');
  });
});

describe('mlEngine: SpatialClusterAnalyzer (Haversine DBSCAN)', () => {
  const clusterer = new SpatialClusterAnalyzer();

  test('clusters proximate anomalies into same cluster', () => {
    const sampleAnomalies: DetectedAnomaly[] = [
      {
        id: 'A1',
        municipalityId: 'ahmedabad',
        wardId: 'w1',
        wardName: 'Danilimda',
        coordinates: [72.585, 23.015],
        detectedAt: '2026-11-20T00:00:00Z',
        indicator: 'LST',
        indicatorKey: 'lst',
        observedValue: 42.1,
        baselineValue: 36.2,
        unit: '°C',
        deviationPercent: 16.3,
        severity: 'critical',
        primaryModel: 'Isolation Forest',
        isolationForestScore: 0.85,
        autoencoderError: 0.65,
        dbscanClusterId: null,
        consensusRiskScore: 84,
        modelContributions: { isolationForest: 32, autoencoder: 18, dbscanSpatial: 10, thresholdSeverity: 24 },
        scoreDisclaimer: '',
        suggestedIntervention: '',
        department: '',
        scenarioTag: '',
      },
      {
        id: 'A2',
        municipalityId: 'ahmedabad',
        wardId: 'w2',
        wardName: 'Behrampura',
        coordinates: [72.592, 23.022], // ~1 km from A1
        detectedAt: '2026-11-20T00:00:00Z',
        indicator: 'LST',
        indicatorKey: 'lst',
        observedValue: 41.8,
        baselineValue: 36.0,
        unit: '°C',
        deviationPercent: 16.1,
        severity: 'critical',
        primaryModel: 'Isolation Forest',
        isolationForestScore: 0.82,
        autoencoderError: 0.61,
        dbscanClusterId: null,
        consensusRiskScore: 81,
        modelContributions: { isolationForest: 31, autoencoder: 17, dbscanSpatial: 10, thresholdSeverity: 23 },
        scoreDisclaimer: '',
        suggestedIntervention: '',
        department: '',
        scenarioTag: '',
      },
    ];

    const { clusters, membership } = clusterer.cluster('ahmedabad', sampleAnomalies, 12.5, 2);
    assert.strictEqual(clusters.length, 1, 'Should form 1 cluster from 2 close points');
    assert.strictEqual(membership.get('A1'), 1);
    assert.strictEqual(membership.get('A2'), 1);
  });
});

describe('mlEngine: Integrated mlConsensusService', () => {
  test('detectAndScore returns sorted anomalies and clusters for all 5 cities', () => {
    const cities = ['ahmedabad', 'delhi', 'mumbai', 'bengaluru', 'chennai'] as const;
    for (const cityId of cities) {
      const result = mlConsensusService.detectAndScore(cityId);
      assert.ok(result.anomalies.length > 0, `${cityId} should have detected anomalies`);
      assert.ok(Array.isArray(result.clusters), `${cityId} should return clusters array`);
      assert.ok(result.summary.totalDetected > 0, `${cityId} summary totalDetected should be > 0`);
      assert.ok(result.summary.avgConsensusRisk >= 0 && result.summary.avgConsensusRisk <= 100);

      // Verify descending sort order by consensusRiskScore
      for (let i = 1; i < result.anomalies.length; i++) {
        assert.ok(
          result.anomalies[i - 1].consensusRiskScore >= result.anomalies[i].consensusRiskScore,
          'anomalies should be sorted in descending order of consensusRiskScore'
        );
      }

      // Verify model contributions
      for (const a of result.anomalies) {
        assert.ok(a.consensusRiskScore >= 18 && a.consensusRiskScore <= 99);
        assert.ok(a.modelContributions.isolationForest >= 0);
        assert.ok(a.modelContributions.autoencoder >= 0);
        assert.ok(a.modelContributions.thresholdSeverity >= 0);
        assert.ok([3, 10].includes(a.modelContributions.dbscanSpatial));
      }
    }
  });
});
