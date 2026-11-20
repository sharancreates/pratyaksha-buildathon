import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { segmentationService } from '../../src/server/engines/segmentationEngine.ts';
import { getMunicipality } from '../../src/server/data/smartCitiesData.ts';
import type { MunicipalityId } from '../../src/shared/types.ts';

describe('segmentationEngine: EnvironmentalUNet Land Cover Classification', () => {
  const cities: MunicipalityId[] = ['ahmedabad', 'delhi', 'mumbai', 'bengaluru', 'chennai'];

  test('runSegmentation produces 6 distinct land cover classes totaling ~100%', () => {
    for (const cityId of cities) {
      const city = getMunicipality(cityId);
      const res = segmentationService.runSegmentation(cityId);

      assert.strictEqual(res.municipalityId, cityId);
      assert.strictEqual(res.classes.length, 6, `${cityId} must have exactly 6 land cover classes`);

      const classIds = res.classes.map((c) => c.id);
      const expectedIds = [
        'built_up',
        'dense_vegetation',
        'sparse_vegetation',
        'water_bodies',
        'bare_soil',
        'agricultural',
      ];
      for (const id of expectedIds) {
        assert.ok(classIds.includes(id as any), `${cityId} missing class ${id}`);
      }

      const totalPct = res.classes.reduce((sum, c) => sum + c.percentage, 0);
      assert.ok(
        totalPct >= 99.0 && totalPct <= 101.0,
        `${cityId} class percentages should sum to ~100%, got ${totalPct}`
      );

      const totalArea = res.classes.reduce((sum, c) => sum + c.areaKm2, 0);
      assert.ok(
        Math.abs(totalArea - city.areaKm2) < 5.0,
        `${cityId} class area sum (${totalArea}) should match city area (${city.areaKm2})`
      );
    }
  });

  test('provides valid 5-year land cover transition records', () => {
    const res = segmentationService.runSegmentation('ahmedabad');
    assert.ok(Array.isArray(res.transitions), 'Transitions should be an array');
    assert.ok(res.transitions.length >= 3, 'Should include at least 3 primary transition dynamics');

    for (const t of res.transitions) {
      assert.ok(t.fromClass.length > 0);
      assert.ok(t.toClass.length > 0);
      assert.ok(t.areaKm2 > 0, `Transition area should be > 0, got ${t.areaKm2}`);
      assert.ok(t.driver.length > 5, 'Should include descriptive environmental driver');
    }
  });

  test('returns standard model metadata and IoU benchmark', () => {
    const res = segmentationService.runSegmentation('chennai');
    assert.strictEqual(res.inferenceMode, 'DEMO_FALLBACK_SPECTRAL');
    assert.strictEqual(res.spatialResolutionM, 10);
    assert.ok(res.estimatedIoUDemo > 0.7, 'Demo IoU estimate should exceed 0.7');
  });
});
