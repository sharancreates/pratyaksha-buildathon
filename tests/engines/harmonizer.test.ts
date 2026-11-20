import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { harmonizerService } from '../../src/server/engines/harmonizer.ts';

describe('harmonizerEngine: Satellite Data Harmonization Pipeline', () => {
  test('getObservations retrieves deterministic satellite observations for city', () => {
    const obs = harmonizerService.getObservations('ahmedabad');
    assert.ok(obs.length > 0, 'Should return observation granules for Ahmedabad');
    
    for (const o of obs) {
      assert.strictEqual(o.municipalityId, 'ahmedabad');
      assert.ok(typeof o.cloudCoveragePct === 'number');
      assert.ok(o.resolutionSourceM > 0);
      assert.ok(o.spectralBand.length > 0);
    }
  });

  test('filters observations by cloud coverage threshold', () => {
    const maxCloud = 15;
    const filtered = harmonizerService.getObservations('delhi', { maxCloudPct: maxCloud });
    for (const o of filtered) {
      assert.ok(o.cloudCoveragePct <= maxCloud, `Cloud coverage ${o.cloudCoveragePct} must be <= ${maxCloud}`);
    }
  });

  test('ingest correctly tallies ingested vs skipped cloudy observations', () => {
    const res = harmonizerService.ingest('mumbai', 'all', 20);
    assert.strictEqual(res.municipalityId, 'mumbai');
    assert.ok(res.ingestedCount >= 0);
    assert.ok(res.skippedCloudyCount >= 0);
    assert.strictEqual(res.observations.length, res.ingestedCount);
  });

  test('harmonize executes 4-stage pipeline to EPSG:4326 with 30m resolution', () => {
    const result = harmonizerService.harmonize('bengaluru', 'all', 30);
    assert.strictEqual(result.targetCrs, 'EPSG:4326');
    assert.strictEqual(result.targetResolutionM, 30);
    assert.ok(result.rawObservationCount > 0);
    assert.strictEqual(result.processedObservationCount + result.failedIngestionCount, result.rawObservationCount);

    // Verify 4 stages
    assert.strictEqual(result.stages.length, 4);
    assert.strictEqual(result.stages[0].stage, 'Metadata & Granule Validation');
    assert.strictEqual(result.stages[1].stage, 'CRS Normalization & Reprojection');
    assert.strictEqual(result.stages[2].stage, 'Spatial Resampling (30m Grid)');
    assert.strictEqual(result.stages[3].stage, 'Cloud Masking & Temporal Alignment');

    for (const s of result.stages) {
      assert.ok(['completed', 'warning'].includes(s.status));
      assert.ok(s.durationMs > 0);
    }
  });
});
