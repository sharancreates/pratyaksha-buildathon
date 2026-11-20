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
    <div className="space-y-8">
      {/* Hero Header & Controls */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          05
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            PROPHET · ARIMA · XGBOOST · DETERMINISTIC TIME-SERIES ENGINE
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">AI</span>
            <br />
            FORECASTING
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Project 7-day, 30-day, and illustrative 90-day trajectories with confidence intervals and
            cross-model error benchmarking.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void executeForecast(true)}
            className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            RE-RUN FORECAST
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-6 border-t-2 border-black">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="fc-indicator">
              ENVIRONMENTAL INDICATOR
            </label>
            <select
              id="fc-indicator"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value as ForecastIndicator)}
              className="w-full h-10 bg-white border-2 border-black px-3 text-xs font-black uppercase text-black"
            >
              {INDICATORS.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-black mb-2">
              ALGORITHM
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="toolbar" aria-label="Algorithm Selection">
              {ALGORITHMS.map((alg) => (
                <button
                  key={alg.id}
                  type="button"
                  onClick={() => setAlgorithm(alg.id)}
                  className={`py-2 px-2 text-[10px] font-black uppercase tracking-wider transition-none border-2 truncate ${
                    algorithm === alg.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-black hover:bg-[#E5E7EB]'
                  }`}
                >
                  {alg.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-black mb-2">
              FORECAST HORIZON
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="toolbar" aria-label="Horizon Selection">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonDays(h)}
                  className={`py-2 px-2 text-[10px] font-mono font-black uppercase tracking-wider transition-none border-2 ${
                    horizonDays === h
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-black hover:bg-[#E5E7EB]'
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
        <div className="border-2 border-black bg-white p-4 flex items-start gap-3 shadow-[4px_4px_0px_#000]">
          <AlertTriangle className="w-5 h-5 text-[#FF0000] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-black">
            <span className="font-black uppercase tracking-wider">ILLUSTRATIVE LONG-RANGE FORECAST: </span>
            <span className="text-[#4B5563]">{forecast.reliabilityNote}</span>
          </div>
        </div>
      )}

      {/* Forecast Summary Metrics */}
      {forecast && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
              PROJECTED {forecast.horizonDays}-DAY DELTA
            </div>
            <div className="mt-2 flex items-center gap-2">
              {forecast.trendDirection === 'increasing' ? (
                <ArrowUpRight className="w-6 h-6 text-[#FF0000]" aria-hidden="true" />
              ) : forecast.trendDirection === 'decreasing' ? (
                <ArrowDownRight className="w-6 h-6 text-black group-hover:text-white" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-6 h-6 text-black group-hover:text-white" aria-hidden="true" />
              )}
              <span className="text-3xl font-black tabular-nums">
                {forecast.projectedChangePct > 0 ? '+' : ''}
                {forecast.projectedChangePct}%
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono font-bold uppercase text-[#4B5563] group-hover:text-[#D1D5DB]">
              TREND: {forecast.trendDirection}
            </div>
          </div>

          <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
              FORECAST RELIABILITY
            </div>
            <div
              className={`mt-2 text-2xl font-black uppercase ${
                forecast.reliability === 'high'
                  ? 'text-black group-hover:text-white'
                  : 'text-[#FF0000]'
              }`}
            >
              {forecast.reliability}
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
              {forecast.observationsUsed} daily inputs
            </div>
          </div>

          <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
              BACKTEST RMSE / MAE
            </div>
            <div className="mt-2 text-3xl font-black tabular-nums">
              {forecast.metrics.rmse}{' '}
              <span className="text-xs text-[#4B5563] group-hover:text-[#D1D5DB]">/ {forecast.metrics.mae}</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB]">
              UNITS: {forecast.unit}
            </div>
          </div>

          <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
            <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
              MEAN ABS % ERROR (MAPE)
            </div>
            <div className="mt-2 text-3xl font-black tabular-nums">
              {forecast.metrics.mape}%
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] truncate">
              {forecast.algorithmLabel}
            </div>
          </div>
        </section>
      )}

      {/* Historical vs Predicted Chart */}
      <section className="border-2 border-black bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b-2 border-black pb-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-black">
              OBSERVED VS {horizonDays}-DAY PREDICTION ({forecast?.indicatorLabel})
            </h2>
            <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
              SOLID LINE = OBSERVED · DASHED LINE = PREDICTED · BAND = UNCERTAINTY INTERVAL
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-black border border-black px-2 py-0.5">
            {forecast?.algorithmLabel}
          </span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSeries} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                stroke="#000000"
                fontSize={10}
                fontStyle="bold"
                tickFormatter={(d: string) => d.slice(5)}
                minTickGap={22}
              />
              <YAxis stroke="#000000" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#000000',
                  borderWidth: '2px',
                  borderRadius: '0px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                }}
              />
              <Area
                type="monotone"
                dataKey="bandRange"
                name="Confidence Interval"
                fill="#000000"
                fillOpacity={0.08}
                stroke="none"
              />
              <Line
                type="monotone"
                dataKey="actual"
                name={`Observed (${forecast?.unit ?? ''})`}
                stroke="#000000"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name={`Predicted (${forecast?.unit ?? ''})`}
                stroke="#FF0000"
                strokeWidth={2.5}
                strokeDasharray="5 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Model Comparison */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 border-2 border-black bg-white overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-black bg-black text-white">
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              ALGORITHM BENCHMARK COMPARISON
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                <tr>
                  <th className="px-5 py-3">ALGORITHM</th>
                  <th className="px-5 py-3 text-right">RMSE</th>
                  <th className="px-5 py-3 text-right">MAE</th>
                  <th className="px-5 py-3 text-right">MAPE</th>
                  <th className="px-5 py-3">STRENGTH</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {comparison.map((row) => (
                  <tr
                    key={row.algorithm}
                    onClick={() => setAlgorithm(row.algorithm)}
                    className={`cursor-pointer transition-none ${
                      algorithm === row.algorithm
                        ? 'bg-black text-white'
                        : 'hover:bg-[#E5E7EB] text-black'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="font-black uppercase tracking-tight">{row.label}</div>
                      {row.recommended && (
                        <div className="text-[10px] font-mono font-bold text-[#FF0000] group-hover:text-white">
                          RECOMMENDED
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">
                      {row.rmse}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">
                      {row.mae}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-black">
                      {row.mape}%
                    </td>
                    <td className="px-5 py-3 text-[11px] opacity-75 max-w-xs">
                      {row.strengths}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 border-2 border-black bg-white p-6">
          <div className="border-b-2 border-black pb-3 mb-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-black">
              MAPE ERROR COMPARISON (%)
            </h2>
            <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
              LOWER ERROR INDICATES STRONGER BACKTEST FIT
            </p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="algorithm" stroke="#000000" fontSize={10} fontStyle="bold" />
                <YAxis stroke="#000000" fontSize={10} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#000000',
                    borderWidth: '2px',
                    borderRadius: '0px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}
                />
                <Bar dataKey="mape" name="MAPE (%)" fill="#000000" maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
