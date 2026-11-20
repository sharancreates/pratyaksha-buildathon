import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { forecastService } from '../../src/server/engines/forecastEngine.ts';
import type { ForecastAlgorithm, ForecastHorizon, ForecastIndicator } from '../../src/shared/types.ts';

describe('forecastEngine: Multi-Algorithm & Horizon Prediction', () => {
  const horizons: ForecastHorizon[] = [7, 30, 90];
  const algorithms: ForecastAlgorithm[] = ['prophet', 'arima', 'xgboost'];
  const indicators: ForecastIndicator[] = ['lst', 'ndvi', 'aqi', 'no2'];

  test('forecast returns valid response for all horizon intervals', () => {
    for (const h of horizons) {
      const res = forecastService.forecast('ahmedabad', 'lst', 'prophet', h);
      assert.strictEqual(res.horizonDays, h);
      assert.strictEqual(res.algorithm, 'prophet');
      assert.ok(res.series.length > h, 'Series should include historical window plus horizon days');
      
      const futurePoints = res.series.filter((p) => p.actual === undefined && p.predicted !== undefined);
      assert.strictEqual(futurePoints.length, h, `Should have exactly ${h} forecast points`);
    }
  });

  test('forecast maintains confidence envelope: lower <= predicted <= upper', () => {
    for (const algo of algorithms) {
      const res = forecastService.forecast('delhi', 'aqi', algo, 30);
      const futurePoints = res.series.filter((p) => p.actual === undefined && p.predicted !== undefined);
      assert.strictEqual(futurePoints.length, 30);

      for (const pt of futurePoints) {
        assert.ok(typeof pt.predicted === 'number');
        assert.ok(typeof pt.lower === 'number');
        assert.ok(typeof pt.upper === 'number');
        assert.ok(
          pt.lower! <= pt.predicted! + 0.001,
          `lower (${pt.lower}) must be <= predicted (${pt.predicted}) for ${algo}`
        );
        assert.ok(
          pt.predicted! <= pt.upper! + 0.001,
          `predicted (${pt.predicted}) must be <= upper (${pt.upper}) for ${algo}`
        );
      }
    }
  });

  test('compareModels outputs valid benchmark comparisons with RMSE, MAE, and MAPE', () => {
    const benchmarks = forecastService.compareModels('mumbai', 'no2');
    assert.ok(Array.isArray(benchmarks), 'Should return algorithm comparison rows');
    assert.strictEqual(benchmarks.length, 3, 'Should benchmark all 3 algorithms');

    for (const b of benchmarks) {
      assert.ok(['prophet', 'arima', 'xgboost'].includes(b.algorithm));
      assert.ok(b.rmse > 0, `RMSE should be > 0 for ${b.algorithm}, got ${b.rmse}`);
      assert.ok(b.mae > 0, `MAE should be > 0 for ${b.algorithm}, got ${b.mae}`);
      assert.ok(b.mape > 0, `MAPE should be > 0 for ${b.algorithm}, got ${b.mape}`);
    }
  });

  test('handles all environmental indicators correctly', () => {
    for (const ind of indicators) {
      const res = forecastService.forecast('bengaluru', ind, 'prophet', 7);
      assert.strictEqual(res.indicator, ind);
      assert.ok(typeof res.projectedChangePct === 'number');
      assert.ok(res.metrics.rmse > 0);
      assert.ok(['stable', 'increasing', 'decreasing'].includes(res.trendDirection));
    }
  });
});
