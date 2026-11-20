import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { fetchAnalyticsModule } from '../lib/api';

type AnalyticsTab =
  | 'heat-island'
  | 'air-quality'
  | 'vegetation'
  | 'lst'
  | 'water'
  | 'land-cover';

const TABS: { id: AnalyticsTab; apiPath: 'heat-island' | 'air-quality' | 'vegetation' | 'water' | 'land-cover'; label: string }[] = [
  { id: 'heat-island', apiPath: 'heat-island', label: 'Urban Heat Islands' },
  { id: 'air-quality', apiPath: 'air-quality', label: 'Air Quality & NO₂' },
  { id: 'vegetation', apiPath: 'vegetation', label: 'Vegetation & NDVI' },
  { id: 'lst', apiPath: 'heat-island', label: 'Land Surface Temp' },
  { id: 'water', apiPath: 'water', label: 'Water Body Monitoring' },
  { id: 'land-cover', apiPath: 'land-cover', label: 'Land Use & Land Cover' },
];

export function EnvironmentalAnalytics() {
  const { municipality } = useAppContext();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('heat-island');
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const tabMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAnalyticsModule(tabMeta.apiPath, municipality)
      .then((res) => {
        if (active) setPayload(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [municipality, tabMeta.apiPath]);

  const accentColor =
    activeTab === 'heat-island' || activeTab === 'lst'
      ? '#F59E0B'
      : activeTab === 'vegetation'
      ? '#22C55E'
      : activeTab === 'air-quality'
      ? '#EF4444'
      : '#22D3EE';

  return (
    <div className="space-y-6">
      {/* Header + Segmented Module Switcher */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Environmental Analytics Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Harmonized multi-sensor historical trends, ward-level spatial distribution, and baseline deltas
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400">
            DEMO TELEMETRY · 45-DAY SERIES
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 bg-[#0D1524] p-1 rounded-md border border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {loading || !payload ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-80 rounded-lg bg-[#111D2E] border border-slate-800 animate-pulse" />
          <div className="h-80 rounded-lg bg-[#111D2E] border border-slate-800 animate-pulse" />
        </div>
      ) : activeTab === 'land-cover' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Land Cover Area Distribution ({payload.totalAreaKm2} km²)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 mb-4">
              {payload.modelArchitecture} · {payload.inferenceMode}
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.classes} layout="vertical" margin={{ top: 4, right: 20, left: 24, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} unit="%" />
                  <YAxis type="category" dataKey="label" stroke="#CBD5E1" fontSize={11} width={135} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1524',
                      borderColor: '#334155',
                      fontSize: '12px',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="percentage" name="Share (%)" radius={[0, 4, 4, 0]}>
                    {payload.classes.map((c: any) => (
                      <Cell key={c.id} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              5-Year Land Cover Transition Flows
            </h2>
            <div className="divide-y divide-slate-800/80">
              {payload.transitions.map((tr: any, i: number) => (
                <div key={i} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-100">
                      {tr.fromClass} → {tr.toClass}
                    </span>
                    <span className="font-mono font-semibold text-amber-400 tabular-nums">
                      {tr.areaKm2} km²
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{tr.driver}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
              <div className="text-xs text-slate-400">Current Municipal Mean</div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
                  {payload.currentValue}
                </span>
                <span className="text-xs font-mono text-slate-400">{payload.unit}</span>
              </div>
            </div>
            <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
              <div className="text-xs text-slate-400">Historical Baseline</div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-mono font-bold text-slate-300 tabular-nums">
                  {payload.baselineValue}
                </span>
                <span className="text-xs font-mono text-slate-400">{payload.unit}</span>
              </div>
            </div>
            <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
              <div className="text-xs text-slate-400">Risk Classification</div>
              <div
                className={`mt-1.5 text-xl font-mono font-bold uppercase ${
                  payload.riskClassification === 'critical'
                    ? 'text-red-400'
                    : payload.riskClassification === 'high'
                    ? 'text-amber-400'
                    : 'text-cyan-300'
                }`}
              >
                {payload.riskClassification}
              </div>
            </div>
            <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
              <div className="text-xs text-slate-400">
                {payload.uhiIntensityCelsius
                  ? 'Peak UHI Contrast'
                  : payload.aqiAverage
                  ? 'Municipal Mean AQI'
                  : payload.changePct !== undefined
                  ? 'Extent Variance'
                  : 'Monitored Wards'}
              </div>
              <div className="mt-1.5 text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                {payload.uhiIntensityCelsius
                  ? `+${payload.uhiIntensityCelsius} °C`
                  : payload.aqiAverage
                  ? `${payload.aqiAverage} AQI`
                  : payload.changePct !== undefined
                  ? `${payload.changePct}%`
                  : `${payload.wards?.length ?? 6}`}
              </div>
            </div>
          </section>

          {/* Charts Grid */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Historical Trend */}
            <div className="xl:col-span-7 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-100">
                  45-Day Harmonized Historical Trajectory — {payload.indicator}
                </h2>
                <p className="text-xs text-slate-400">
                  Daily composite time-series aligned to EPSG:4326 municipal grid
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'lst' ? (
                    <LineChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="#94A3B8" fontSize={11} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D1524',
                          borderColor: '#334155',
                          fontSize: '12px',
                          borderRadius: '6px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke={accentColor}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={accentColor} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                      <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickFormatter={(d) => d.slice(5)} />
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
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke={accentColor}
                        strokeWidth={2}
                        fill="url(#analyticsFill)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ward Comparison Bar Chart */}
            <div className="xl:col-span-5 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-100">
                  Geographic Distribution Across Wards
                </h2>
                <p className="text-xs text-slate-400">Observed current vs historical baseline</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.wards} margin={{ top: 8, right: 8, left: -16, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={10}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      tickFormatter={(v: string) => v.split(' ')[0]}
                    />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0D1524',
                        borderColor: '#334155',
                        fontSize: '12px',
                        borderRadius: '6px',
                      }}
                    />
                    <Bar dataKey="value" name={`Current (${payload.unit})`} fill={accentColor} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="baseline" name={`Baseline (${payload.unit})`} fill="#475569" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Insights + Ward Hotspot Table */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">Key Environmental Insights</h2>
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed">
                {(payload.insights || []).map((line: string, i: number) => (
                  <li key={i} className="pb-3 border-b border-slate-800/80 last:border-b-0 last:pb-0">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-8 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-100">Ward-Level Hotspot Telemetry</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Municipal Ward</th>
                      <th className="px-4 py-2.5 font-medium">Coordinates</th>
                      <th className="px-4 py-2.5 font-medium text-right">Current</th>
                      <th className="px-4 py-2.5 font-medium text-right">Baseline</th>
                      <th className="px-4 py-2.5 font-medium text-right">Delta</th>
                      <th className="px-4 py-2.5 font-medium text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                    {(payload.wards || []).map((w: any) => (
                      <tr key={w.wardId} className="hover:bg-[#0D1524]/60">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-100">{w.name}</td>
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums">
                          {w.coordinates[1].toFixed(3)}°N, {w.coordinates[0].toFixed(3)}°E
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-100 font-semibold tabular-nums">
                          {w.value} {payload.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">
                          {w.baseline} {payload.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right text-amber-400 tabular-nums">
                          {w.delta > 0 ? '+' : ''}
                          {w.delta}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-semibold uppercase ${
                            w.severity === 'critical'
                              ? 'text-red-400'
                              : w.severity === 'high'
                              ? 'text-amber-400'
                              : w.severity === 'moderate'
                              ? 'text-cyan-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {w.severity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
