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
  { id: 'heat-island', apiPath: 'heat-island', label: 'URBAN HEAT ISLANDS' },
  { id: 'air-quality', apiPath: 'air-quality', label: 'AIR QUALITY & NO₂' },
  { id: 'vegetation', apiPath: 'vegetation', label: 'VEGETATION & NDVI' },
  { id: 'lst', apiPath: 'heat-island', label: 'LAND SURFACE TEMP' },
  { id: 'water', apiPath: 'water', label: 'WATER BODY MONITORING' },
  { id: 'land-cover', apiPath: 'land-cover', label: 'LAND USE & LAND COVER' },
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

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <section className="tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--canvas)] text-[var(--ink)] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" aria-hidden="true" />
            <span>TELEMETRY HISTORICAL SERIES</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">45-DAY COMPOSITE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] mb-3">
            Environmental Analytics
          </h1>

          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6">
            Harmonized multi-sensor historical trends, ward-level spatial distribution, and baseline deltas.
          </p>

          {/* Module Switcher Tabs: Apple Segmented Pill Control */}
          <div className="flex flex-wrap gap-2 pt-2" role="tablist" aria-label="Analytics Module Selection">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[var(--ink)] text-white shadow-sm'
                    : 'bg-[var(--canvas)] text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[#E5E5EA]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading || !payload ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
          <div className="h-80 rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
        </div>
      ) : activeTab === 'land-cover' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
            <div className="border-b border-black/[0.06] pb-3 mb-4">
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                LAND COVER AREA DISTRIBUTION ({payload.totalAreaKm2} KM²)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {payload.modelArchitecture} · {payload.inferenceMode}
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.classes} layout="vertical" margin={{ top: 4, right: 20, left: 30, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="#8E8E93" fontSize={11} unit="%" />
                  <YAxis type="category" dataKey="label" stroke="#1D1D1F" fontSize={11} width={140} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      borderRadius: '1rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="percentage" name="Share (%)" radius={[0, 6, 6, 0]}>
                    {payload.classes.map((c: any) => (
                      <Cell
                        key={c.id}
                        fill={c.id.includes('built_up') ? '#FF3B30' : '#007AFF'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-4">
            <div className="border-b border-black/[0.06] pb-3">
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                5-YEAR LAND COVER TRANSITION FLOWS
              </h2>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {payload.transitions.map((tr: any, i: number) => (
                <div key={i} className="py-3 px-2 rounded-xl hover:bg-[var(--canvas)] transition-colors space-y-1 group">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--ink)]">
                    <span>
                      {tr.fromClass} → {tr.toClass}
                    </span>
                    <span className="font-mono text-[var(--critical)] tabular-nums">
                      {tr.areaKm2} KM²
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">{tr.driver}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Bento Ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                MUNICIPAL MEAN
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
                  {payload.currentValue}
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {payload.unit}
                </span>
              </div>
            </div>

            <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                HISTORICAL BASELINE
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
                  {payload.baselineValue}
                </span>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {payload.unit}
                </span>
              </div>
            </div>

            <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                RISK CLASSIFICATION
              </div>
              <div className="mt-2">
                <span
                  className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                    payload.riskClassification === 'critical'
                      ? 'bg-rose-50 text-[var(--critical)] border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {payload.riskClassification}
                </span>
              </div>
            </div>

            <div className="tile tile-interactive p-5 rounded-3xl bg-white border border-black/[0.04] shadow-sm hover:scale-[1.02] transition-all group">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                {payload.uhiIntensityCelsius
                  ? 'PEAK UHI CONTRAST'
                  : payload.aqiAverage
                  ? 'MUNICIPAL MEAN AQI'
                  : payload.changePct !== undefined
                  ? 'EXTENT VARIANCE'
                  : 'MONITORED WARDS'}
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
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
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Historical Trend */}
            <div className="xl:col-span-7 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
              <div className="mb-4 border-b border-black/[0.06] pb-3">
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  45-DAY HISTORICAL TRAJECTORY — {payload.indicator}
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Daily composite time-series aligned to municipal grid
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'lst' ? (
                    <LineChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="date" stroke="#8E8E93" fontSize={10} tickFormatter={(d) => d.slice(5)} />
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
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke="#007AFF"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="date" stroke="#8E8E93" fontSize={10} tickFormatter={(d) => d.slice(5)} />
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
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke="#007AFF"
                        strokeWidth={2.5}
                        fill="#007AFF"
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ward Comparison Bar Chart */}
            <div className="xl:col-span-5 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
              <div className="mb-4 border-b border-black/[0.06] pb-3">
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  WARD GEOGRAPHIC DISTRIBUTION
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Current observation vs historical baseline
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.wards} margin={{ top: 8, right: 8, left: -16, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#8E8E93"
                      fontSize={10}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      tickFormatter={(v: string) => v.split(' ')[0]}
                    />
                    <YAxis stroke="#8E8E93" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderColor: 'rgba(0, 0, 0, 0.08)',
                        borderRadius: '1rem',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" name={`Current (${payload.unit})`} fill="#007AFF" radius={[6, 6, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="baseline" name={`Baseline (${payload.unit})`} fill="#D1D5DB" radius={[6, 6, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Insights + Ward Hotspot Table */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-4">
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)] border-b border-black/[0.06] pb-2">
                KEY ENVIRONMENTAL INSIGHTS
              </h2>
              <ul className="space-y-3 text-xs text-[var(--text-muted)] leading-relaxed">
                {(payload.insights || []).map((line: string, i: number) => (
                  <li key={i} className="pb-3 border-b border-black/[0.06] last:border-b-0 last:pb-0 font-normal">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-8 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
              <div className="pb-3 border-b border-black/[0.06] mb-2">
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  WARD-LEVEL HOTSPOT TELEMETRY
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3">MUNICIPAL WARD</th>
                      <th className="px-5 py-3">COORDINATES</th>
                      <th className="px-5 py-3 text-right">CURRENT</th>
                      <th className="px-5 py-3 text-right">BASELINE</th>
                      <th className="px-5 py-3 text-right">DELTA</th>
                      <th className="px-5 py-3 text-right">SEVERITY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black font-mono text-[11px]">
                    {(payload.wards || []).map((w: any) => (
                      <tr key={w.wardId} className="hover:bg-black hover:text-white transition-none group">
                        <td className="px-5 py-3 font-sans font-black uppercase">{w.name}</td>
                        <td className="px-5 py-3 text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
                          {w.coordinates[1].toFixed(3)}°N, {w.coordinates[0].toFixed(3)}°E
                        </td>
                        <td className="px-5 py-3 text-right font-black tabular-nums">
                          {w.value} {payload.unit}
                        </td>
                        <td className="px-5 py-3 text-right text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
                          {w.baseline} {payload.unit}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-[#FF0000] tabular-nums">
                          {w.delta > 0 ? '+' : ''}
                          {w.delta}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-black uppercase ${
                            w.severity === 'critical' ? 'text-[#FF0000]' : 'text-black group-hover:text-white'
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
