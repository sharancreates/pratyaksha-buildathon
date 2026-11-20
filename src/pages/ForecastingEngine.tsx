import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { fetchModelComparison, runForecastPrediction } from '../lib/api';
import type {
  ForecastAlgorithm,
  ForecastHorizon,
  ForecastIndicator,
  ForecastResponse,
  ModelComparisonRow,
} from '../shared/types';

const INDICATORS: { id: ForecastIndicator; label: string }[] = [
  { id: 'lst', label: 'LAND SURFACE TEMP (°C)' },
  { id: 'ndvi', label: 'VEGETATION HEALTH (NDVI)' },
  { id: 'aqi', label: 'AIR QUALITY INDEX (AQI)' },
  { id: 'no2', label: 'TROPOSPHERIC NO₂ (µMOL/M²)' },
  { id: 'vegetation_degradation', label: 'CANOPY DEGRADATION TREND' },
];

const ALGORITHMS: { id: ForecastAlgorithm; label: string }[] = [
  { id: 'prophet', label: 'FACEBOOK PROPHET' },
  { id: 'arima', label: 'ARIMA (2,1,1)' },
  { id: 'xgboost', label: 'XGBOOST REGRESSOR' },
];

const HORIZONS: ForecastHorizon[] = [7, 30, 90];

export function ForecastingEngine() {
  const { municipality, pushToast } = useAppContext();

  const [indicator, setIndicator] = useState<ForecastIndicator>('lst');
  const [algorithm, setAlgorithm] = useState<ForecastAlgorithm>('prophet');
  const [horizonDays, setHorizonDays] = useState<ForecastHorizon>(30);

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [comparison, setComparison] = useState<ModelComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  const executeForecast = async (showToast = false) => {
    setLoading(true);
    try {
      const [pred, comp] = await Promise.all([
        runForecastPrediction({
          municipalityId: municipality,
          indicator,
          algorithm,
          horizonDays,
        }),
        fetchModelComparison(municipality, indicator),
      ]);
      setForecast(pred);
      setComparison(comp.models);
      if (showToast) {
        pushToast({
          title: `${horizonDays}-Day ${pred.algorithmLabel} Forecast Ready`,
          description: `Projected ${pred.projectedChangePct > 0 ? '+' : ''}${pred.projectedChangePct}% change in ${pred.indicatorLabel}.`,
          variant: 'success',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void executeForecast(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality, indicator, algorithm, horizonDays]);

  const chartSeries = (forecast?.series ?? []).map((pt) => ({
    ...pt,
    bandRange:
      pt.lower !== undefined && pt.upper !== undefined ? [pt.lower, pt.upper] : undefined,
  }));

  return (
    <div className="space-y-6">
      {/* Hero Header & Controls */}
      <section className="tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--canvas)] text-[var(--ink)] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" aria-hidden="true" />
            <span>TIME-SERIES FORECASTING CORE</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">PROPHET · ARIMA · XGBOOST</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] mb-3">
            Predictive AI Forecasting
          </h1>

          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6">
            Project 7-day, 30-day, and illustrative 90-day trajectories with confidence intervals and
            cross-model error benchmarking.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void executeForecast(true)}
            className="button-signal rounded-full px-5 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            RE-RUN FORECAST
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-6 border-t border-black/[0.06]">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="fc-indicator">
              ENVIRONMENTAL INDICATOR
            </label>
            <select
              id="fc-indicator"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value as ForecastIndicator)}
              className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
            >
              {INDICATORS.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[var(--ink)] mb-2">
              ALGORITHM
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="toolbar" aria-label="Algorithm Selection">
              {ALGORITHMS.map((alg) => (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => setAlgorithm(alg.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all truncate ${
                    algorithm === alg.id
                      ? 'bg-[var(--ink)] text-white shadow-xs'
                      : 'bg-[var(--canvas)] text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[#E5E5EA]'
                  }`}
                >
                  {alg.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[var(--ink)] mb-2">
              FORECAST HORIZON
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="toolbar" aria-label="Horizon Selection">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonDays(h)}
                  className={`py-2 px-2 text-xs font-mono font-semibold rounded-xl transition-all ${
                    horizonDays === h
                      ? 'bg-[var(--ink)] text-white shadow-xs'
                      : 'bg-[var(--canvas)] text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[#E5E5EA]'
                  }`}
                >
                  {h}-DAY
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reliability Warning for 90-Day Illustrative Horizon */}
      {forecast?.reliability === 'illustrative' && (
        <div className="tile p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-[var(--ink)]">
            <span className="font-bold">Illustrative Long-Range Horizon: </span>
            <span className="text-[var(--text-muted)]">{forecast.reliabilityNote}</span>
          </div>
        </div>
      )}

      {/* Forecast Summary Bento Metrics */}
      {forecast && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              PROJECTED {forecast.horizonDays}-DAY DELTA
            </div>
            <div className="mt-2 flex items-center gap-2">
              {forecast.trendDirection === 'increasing' ? (
                <ArrowUpRight className="w-6 h-6 text-[var(--critical)]" aria-hidden="true" />
              ) : forecast.trendDirection === 'decreasing' ? (
                <ArrowDownRight className="w-6 h-6 text-[var(--green)]" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-6 h-6 text-[var(--text-muted)]" aria-hidden="true" />
              )}
              <span className="text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
                {forecast.projectedChangePct > 0 ? '+' : ''}
                {forecast.projectedChangePct}%
              </span>
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)] capitalize">
              Trend: {forecast.trendDirection}
            </div>
          </div>

          <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              FORECAST RELIABILITY
            </div>
            <div className="mt-2">
              <span
                className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                  forecast.reliability === 'high'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {forecast.reliability}
              </span>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)] tabular-nums">
              {forecast.observationsUsed} daily inputs
            </div>
          </div>

          <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              BACKTEST RMSE / MAE
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
              {forecast.metrics.rmse}{' '}
              <span className="text-xs font-normal text-[var(--text-muted)]">/ {forecast.metrics.mae}</span>
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Units: {forecast.unit}
            </div>
          </div>

          <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              MEAN ABS % ERROR (MAPE)
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
              {forecast.metrics.mape}%
            </div>
            <div className="mt-1 text-xs text-[var(--text-muted)] truncate">
              {forecast.algorithmLabel}
            </div>
          </div>
        </section>
      )}

      {/* Historical vs Predicted Chart Bento Card */}
      <section className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-black/[0.06] pb-3">
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
              OBSERVED VS {horizonDays}-DAY PREDICTION ({forecast?.indicatorLabel})
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Solid line = Observed · Dashed line = Predicted · Shaded band = Uncertainty Interval
            </p>
          </div>
          <span className="text-xs font-semibold text-[var(--blue)] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            {forecast?.algorithmLabel}
          </span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                stroke="#8E8E93"
                fontSize={10}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={22}
              />
              <YAxis stroke="#8E8E93" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderColor: 'rgba(0, 0, 0, 0.08)',
                  borderRadius: '1rem',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="bandRange"
                name="Confidence Interval"
                fill="#007AFF"
                fillOpacity={0.08}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="actual"
                name={`Observed (${forecast?.unit ?? ''})`}
                stroke="#007AFF"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name={`Predicted (${forecast?.unit ?? ''})`}
                stroke="#FF9500"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Model Benchmark Comparison Bento Cards */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="pb-3 border-b border-black/[0.06] mb-2">
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
              ALGORITHM BENCHMARK COMPARISON
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">ALGORITHM</th>
                  <th className="py-2.5 px-3 text-right">RMSE</th>
                  <th className="py-2.5 px-3 text-right">MAE</th>
                  <th className="py-2.5 px-3 text-right">MAPE</th>
                  <th className="py-2.5 px-3">STRENGTH</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[12px]">
                {comparison.map((row) => (
                  <tr
                    key={row.algorithm}
                    onClick={() => setAlgorithm(row.algorithm)}
                    className={`cursor-pointer transition-colors ${
                      algorithm === row.algorithm
                        ? 'bg-[var(--canvas)] font-semibold'
                        : 'hover:bg-[var(--canvas)]'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[var(--ink)]">{row.label}</div>
                      {row.recommended && (
                        <div className="text-[10px] font-bold text-emerald-600">
                          RECOMMENDED FIT
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {row.rmse}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-muted)]">
                      {row.mae}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[var(--ink)]">
                      {row.mape}%
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[var(--text-muted)] max-w-xs">
                      {row.strengths}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
          <div className="border-b border-black/[0.06] pb-3 mb-4">
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
              MAPE ERROR COMPARISON (%)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Lower error indicates stronger backtest fit
            </p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="algorithm" stroke="#8E8E93" fontSize={11} />
                <YAxis stroke="#8E8E93" fontSize={10} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: 'rgba(0, 0, 0, 0.08)',
                    borderRadius: '1rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="mape" name="MAPE (%)" fill="#007AFF" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
