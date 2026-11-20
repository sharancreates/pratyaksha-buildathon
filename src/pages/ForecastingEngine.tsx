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
  { id: 'lst', label: 'Land Surface Temperature (°C)' },
  { id: 'ndvi', label: 'Vegetation Health (NDVI)' },
  { id: 'aqi', label: 'Air Quality Index (AQI)' },
  { id: 'no2', label: 'Tropospheric NO₂ (µmol/m²)' },
  { id: 'vegetation_degradation', label: 'Vegetation Degradation Trend' },
];

const ALGORITHMS: { id: ForecastAlgorithm; label: string }[] = [
  { id: 'prophet', label: 'Facebook Prophet' },
  { id: 'arima', label: 'ARIMA (2,1,1)' },
  { id: 'xgboost', label: 'XGBoost Regressor' },
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
      {/* Header & Controls */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              PROPHET · ARIMA · XGBOOST · DETERMINISTIC TIME-SERIES ENGINE
            </div>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">
              Environmental Forecasting Engine
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Project 7-day, 30-day, and illustrative 90-day trajectories with confidence intervals and cross-model error benchmarking.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void executeForecast(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Re-Run Forecast
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="fc-indicator">
              Environmental Indicator
            </label>
            <select
              id="fc-indicator"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value as ForecastIndicator)}
              className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
            >
              {INDICATORS.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-mono text-slate-400 mb-1.5">
              Forecasting Algorithm
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#0D1524] p-1 rounded-md border border-slate-800">
              {ALGORITHMS.map((alg) => (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => setAlgorithm(alg.id)}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                    algorithm === alg.id
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {alg.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-mono text-slate-400 mb-1.5">
              Forecast Horizon
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#0D1524] p-1 rounded-md border border-slate-800">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonDays(h)}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition-colors whitespace-nowrap ${
                    horizonDays === h
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {h}-Day
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reliability Warning for 90-Day Illustrative Horizon */}
      {forecast?.reliability === 'illustrative' && (
        <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg px-4 py-3 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Illustrative Long-Range Forecast: </span>
            {forecast.reliabilityNote}
          </div>
        </div>
      )}

      {/* Forecast Summary Metrics */}
      {forecast && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400">Projected {forecast.horizonDays}-Day Delta</div>
            <div className="mt-1.5 flex items-center gap-2">
              {forecast.trendDirection === 'increasing' ? (
                <ArrowUpRight className="w-5 h-5 text-amber-400" />
              ) : forecast.trendDirection === 'decreasing' ? (
                <ArrowDownRight className="w-5 h-5 text-cyan-400" />
              ) : (
                <ArrowRight className="w-5 h-5 text-emerald-400" />
              )}
              <span className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
                {forecast.projectedChangePct > 0 ? '+' : ''}
                {forecast.projectedChangePct}%
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400 uppercase">
              Trend: {forecast.trendDirection}
            </div>
          </div>

          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400">Forecast Reliability</div>
            <div
              className={`mt-1.5 text-xl font-mono font-bold uppercase ${
                forecast.reliability === 'high'
                  ? 'text-emerald-400'
                  : forecast.reliability === 'moderate'
                  ? 'text-cyan-300'
                  : 'text-amber-400'
              }`}
            >
              {forecast.reliability}
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400 tabular-nums">
              {forecast.observationsUsed} daily harmonized inputs
            </div>
          </div>

          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400">Backtest RMSE / MAE</div>
            <div className="mt-1.5 text-2xl font-mono font-bold text-slate-100 tabular-nums">
              {forecast.metrics.rmse} <span className="text-xs text-slate-500">/ {forecast.metrics.mae}</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400">
              Units: {forecast.unit}
            </div>
          </div>

          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
            <div className="text-xs text-slate-400">Mean Abs % Error (MAPE)</div>
            <div className="mt-1.5 text-2xl font-mono font-bold text-cyan-300 tabular-nums">
              {forecast.metrics.mape}%
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400 truncate">
              {forecast.algorithmLabel}
            </div>
          </div>
        </section>
      )}

      {/* Historical vs Predicted Chart */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Historical Observations vs {horizonDays}-Day Prediction ({forecast?.indicatorLabel})
            </h2>
            <p className="text-xs text-slate-400">
              Solid cyan = observed harmonized series · Dashed amber = predicted trajectory · Shaded band = uncertainty interval
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {forecast?.algorithmLabel}
          </span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="date"
                stroke="#94A3B8"
                fontSize={11}
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={22}
              />
              <YAxis stroke="#94A3B8" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0D1524',
                  borderColor: '#334155',
                  fontSize: '12px',
                  borderRadius: '6px',
                }}
              />
              <Area
                type="monotone"
                dataKey="bandRange"
                name="Confidence Interval"
                fill="#F59E0B"
                fillOpacity={0.14}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="actual"
                name={`Observed (${forecast?.unit ?? ''})`}
                stroke="#22D3EE"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name={`Predicted (${forecast?.unit ?? ''})`}
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Model Comparison */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">
              Algorithm Benchmark Comparison
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Algorithm</th>
                  <th className="px-4 py-2.5 font-medium text-right">RMSE</th>
                  <th className="px-4 py-2.5 font-medium text-right">MAE</th>
                  <th className="px-4 py-2.5 font-medium text-right">MAPE</th>
                  <th className="px-4 py-2.5 font-medium">Strength</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {comparison.map((row) => (
                  <tr
                    key={row.algorithm}
                    onClick={() => setAlgorithm(row.algorithm)}
                    className={`cursor-pointer transition-colors ${
                      algorithm === row.algorithm ? 'bg-cyan-500/12' : 'hover:bg-[#0D1524]/70'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{row.label}</div>
                      {row.recommended && (
                        <div className="text-[10px] font-mono text-emerald-400">RECOMMENDED</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200 tabular-nums">
                      {row.rmse}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                      {row.mae}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-cyan-300 tabular-nums">
                      {row.mape}%
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 max-w-xs">
                      {row.strengths}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            MAPE Error Comparison (%)
          </h2>
          <p className="text-xs text-slate-400 mb-4">Lower error indicates stronger backtest fit</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="algorithm" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1524',
                    borderColor: '#334155',
                    fontSize: '12px',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="mape" name="MAPE (%)" fill="#22D3EE" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
