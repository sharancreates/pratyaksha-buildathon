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
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          03
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            TELEMETRY · 45-DAY HARMONIZED HISTORICAL SERIES
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">ENVIRONMENTAL</span>
            <br />
            ANALYTICS
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Harmonized multi-sensor historical trends, ward-level spatial distribution, and baseline deltas.
          </p>

          {/* Module Switcher Tabs */}
          <div className="flex flex-wrap gap-2 pt-2" role="tablist" aria-label="Analytics Module Selection">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider transition-none border-2 ${
                  activeTab === t.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-[#E5E7EB]'
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
          <div className="h-80 border-2 border-black bg-[#E5E7EB] animate-pulse" />
          <div className="h-80 border-2 border-black bg-[#E5E7EB] animate-pulse" />
        </div>
      ) : activeTab === 'land-cover' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 border-2 border-black bg-white p-6">
            <div className="border-b-2 border-black pb-3 mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                LAND COVER AREA DISTRIBUTION ({payload.totalAreaKm2} KM²)
              </h2>
              <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
                {payload.modelArchitecture} · {payload.inferenceMode}
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payload.classes} layout="vertical" margin={{ top: 4, right: 20, left: 30, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" stroke="#000000" fontSize={10} fontStyle="bold" unit="%" />
                  <YAxis type="category" dataKey="label" stroke="#000000" fontSize={11} fontStyle="bold" width={140} />
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
                  <Bar dataKey="percentage" name="Share (%)">
                    {payload.classes.map((c: any) => (
                      <Cell
                        key={c.id}
                        fill={c.id.includes('built_up') ? '#FF0000' : '#000000'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 border-2 border-black bg-white p-6 space-y-4">
            <div className="border-b-2 border-black pb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                5-YEAR LAND COVER TRANSITION FLOWS
              </h2>
            </div>
            <div className="divide-y-2 divide-black">
              {payload.transitions.map((tr: any, i: number) => (
                <div key={i} className="py-3 space-y-1 hover:bg-black hover:text-white transition-none group px-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span>
                      {tr.fromClass} → {tr.toClass}
                    </span>
                    <span className="font-mono text-[#FF0000] tabular-nums">
                      {tr.areaKm2} KM²
                    </span>
                  </div>
                  <div className="text-[11px] text-[#4B5563] group-hover:text-[#D1D5DB]">{tr.driver}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                MUNICIPAL MEAN
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums">
                  {payload.currentValue}
                </span>
                <span className="text-xs font-mono font-bold text-[#4B5563] group-hover:text-[#D1D5DB]">
                  {payload.unit}
                </span>
              </div>
            </div>

            <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                HISTORICAL BASELINE
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums">
                  {payload.baselineValue}
                </span>
                <span className="text-xs font-mono font-bold text-[#4B5563] group-hover:text-[#D1D5DB]">
                  {payload.unit}
                </span>
              </div>
            </div>

            <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                RISK CLASSIFICATION
              </div>
              <div
                className={`mt-2 text-2xl font-black uppercase ${
                  payload.riskClassification === 'critical'
                    ? 'text-[#FF0000]'
                    : 'text-black group-hover:text-white'
                }`}
              >
                {payload.riskClassification}
              </div>
            </div>

            <div className="border-2 border-black p-5 bg-white hover:bg-black hover:text-white transition-none group">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                {payload.uhiIntensityCelsius
                  ? 'PEAK UHI CONTRAST'
                  : payload.aqiAverage
                  ? 'MUNICIPAL MEAN AQI'
                  : payload.changePct !== undefined
                  ? 'EXTENT VARIANCE'
                  : 'MONITORED WARDS'}
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums">
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
            <div className="xl:col-span-7 border-2 border-black bg-white p-6">
              <div className="mb-4 border-b-2 border-black pb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-black">
                  45-DAY HISTORICAL TRAJECTORY — {payload.indicator}
                </h2>
                <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
                  DAILY COMPOSITE TIME-SERIES ALIGNED TO MUNICIPAL GRID
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'lst' ? (
                    <LineChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#000000" fontSize={10} fontStyle="bold" tickFormatter={(d) => d.slice(5)} />
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
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke="#000000"
                        strokeWidth={2.5}
                        dot={false}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={payload.history} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" stroke="#000000" fontSize={10} fontStyle="bold" tickFormatter={(d) => d.slice(5)} />
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
                        dataKey="value"
                        name={`${payload.indicator} (${payload.unit})`}
                        stroke="#000000"
                        strokeWidth={2.5}
                        fill="#000000"
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ward Comparison Bar Chart */}
            <div className="xl:col-span-5 border-2 border-black bg-white p-6">
              <div className="mb-4 border-b-2 border-black pb-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-black">
                  WARD GEOGRAPHIC DISTRIBUTION
                </h2>
                <p className="text-[10px] font-mono text-[#4B5563] uppercase mt-0.5">
                  CURRENT OBSERVATION VS HISTORICAL BASELINE
                </p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.wards} margin={{ top: 8, right: 8, left: -16, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#000000"
                      fontSize={10}
                      fontStyle="bold"
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      tickFormatter={(v: string) => v.split(' ')[0]}
                    />
                    <YAxis stroke="#000000" fontSize={10} />
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
                    <Bar dataKey="value" name={`Current (${payload.unit})`} fill="#000000" maxBarSize={20} />
                    <Bar dataKey="baseline" name={`Baseline (${payload.unit})`} fill="#9CA3AF" maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Insights + Ward Hotspot Table */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 border-2 border-black bg-white p-6 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-2">
                KEY ENVIRONMENTAL INSIGHTS
              </h2>
              <ul className="space-y-3 text-xs text-[#4B5563] leading-relaxed">
                {(payload.insights || []).map((line: string, i: number) => (
                  <li key={i} className="pb-3 border-b border-black/20 last:border-b-0 last:pb-0 font-medium">
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-8 border-2 border-black bg-white overflow-hidden">
              <div className="px-6 py-4 border-b-2 border-black bg-black text-white">
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  WARD-LEVEL HOTSPOT TELEMETRY
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                    <tr>
                      <th className="px-5 py-3">MUNICIPAL WARD</th>
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
