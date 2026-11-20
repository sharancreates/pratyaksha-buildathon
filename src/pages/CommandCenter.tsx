import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Crosshair,
  FileText,
  RefreshCw,
  Satellite,
  ShieldAlert,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { fetchDashboardOverview, type DashboardOverviewResponse } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { IntelligenceMap } from '../components/IntelligenceMap';

export function CommandCenter() {
  const { municipality, setSelectedAnomalyId, pushToast } = useAppContext();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedCoords, setFocusedCoords] = useState<[number, number] | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDashboardOverview(municipality);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load command center overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFocusedCoords(null);
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-24 rounded-lg bg-[#111D2E] border border-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-32 rounded-lg bg-[#111D2E] border border-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-[520px] rounded-lg bg-[#111D2E] border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#111D2E] border border-red-500/30 rounded-lg p-6 text-sm text-slate-300">
        <div className="font-semibold text-red-400">Telemetry Connection Error</div>
        <p className="mt-1 text-slate-400">{error || 'Unable to load dashboard telemetry.'}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-xs font-medium text-cyan-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mission Header */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
            <span>PRATYAKSHA — FROM SATELLITE DATA TO MUNICIPAL ACTION</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-amber-400">DEMO MODE (SYNTHETIC TELEMETRY)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            {data.municipality.name} Environmental Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {data.municipality.corporation} · See the Earth. Understand the Risk. Act Before It Escalates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/anomalies')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#0D1524] border border-slate-700 text-xs font-medium text-slate-200 hover:border-cyan-400/50 transition-colors whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            ML Anomaly Consensus
          </button>
          <button
            type="button"
            onClick={() => navigate('/action-plan')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 transition-colors whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Generate Action Plan
          </button>
        </div>
      </section>

      {/* 6 KPI Cards Strip */}
      <section aria-label="Environmental Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* Main Geospatial MapLibre Viewport */}
      <section aria-label="Interactive Geospatial Intelligence Map">
        <IntelligenceMap
          municipality={data.municipality}
          anomalies={data.anomalies}
          focusedCoordinates={focusedCoords}
          onInspectAnomaly={(wardId) => {
            const match = data.anomalies.find((a) => a.wardId === wardId);
            if (match) setSelectedAnomalyId(match.id);
            navigate('/anomalies');
          }}
          onOpenActionPlan={() => navigate('/action-plan')}
        />
      </section>

      {/* Intelligence Overview Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Latest Detected Anomalies */}
        <div className="lg:col-span-7 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Latest Detected Anomalies</h2>
              <p className="text-[11px] text-slate-400">
                Multi-model Isolation Forest + DBSCAN + Autoencoder consensus flags
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/anomalies')}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-800/80">
            {data.anomalies.map((anm) => (
              <div
                key={anm.id}
                className="px-4 py-3 hover:bg-[#0D1524]/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span
                      className={
                        anm.severity === 'critical'
                          ? 'text-red-400 font-semibold'
                          : anm.severity === 'high'
                          ? 'text-amber-400 font-semibold'
                          : 'text-cyan-400 font-semibold'
                      }
                    >
                      {anm.severity.toUpperCase()}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-300">{anm.id}</span>
                    <span className="text-slate-600" aria-hidden="true">·</span>
                    <span className="text-slate-400">{anm.primaryModel}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {anm.wardName} — {anm.indicator}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                    Observed {anm.observedValue} {anm.unit} vs Baseline {anm.baselineValue} {anm.unit} (
                    {anm.deviationPercent > 0 ? '+' : ''}
                    {anm.deviationPercent}%) · Consensus {anm.consensusRiskScore}/100
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedCoords([...anm.coordinates]);
                      pushToast({
                        title: `Centered map on ${anm.wardName}`,
                        description: `${anm.coordinates[1].toFixed(4)}°N, ${anm.coordinates[0].toFixed(4)}°E`,
                        variant: 'info',
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#0D1524] border border-slate-700 text-[11px] font-medium text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40"
                  >
                    <Crosshair className="w-3 h-3" />
                    Locate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnomalyId(anm.id);
                      navigate('/anomalies');
                    }}
                    className="px-2.5 py-1.5 rounded bg-cyan-500/15 border border-cyan-500/35 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/25"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Risk Distribution + High-Risk Zones */}
        <div className="lg:col-span-5 space-y-5">
          {/* Risk Distribution */}
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Environmental Risk Distribution</h2>
                <p className="text-[11px] text-slate-400">
                  Ward severity breakdown across {data.municipality.wards.length} monitored sectors
                </p>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.riskDistribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="level" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1524',
                      borderColor: '#334155',
                      fontSize: '12px',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {data.riskDistribution.map((entry) => (
                      <Cell key={entry.level} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High-Risk Geographic Zones */}
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-100">High-Risk Geographic Zones</h2>
            </div>
            <div className="divide-y divide-slate-800/80">
              {data.highRiskZones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setFocusedCoords([...zone.center])}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#0D1524]/70 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-100 truncate">{zone.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      LST {zone.lstCelsius}°C · NDVI {zone.ndvi} · NO₂ {zone.no2UmolM2}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold tabular-nums shrink-0 ${
                      zone.riskScore >= 82
                        ? 'text-red-400'
                        : zone.riskScore >= 68
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {zone.riskScore}/100
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Row: Recent Satellite Observations + Pending Environmental Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Recent Satellite Observations</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/satellite')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Explorer
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Mission</th>
                  <th className="px-4 py-2.5 font-medium">Band</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cloud</th>
                  <th className="px-4 py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {data.recentObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-[#0D1524]/60">
                    <td className="px-4 py-2.5 text-slate-200 font-sans font-medium whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{obs.spectralBand}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">
                      {obs.cloudCoveragePct.toFixed(1)}%
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold uppercase ${
                        obs.harmonizationStatus === 'harmonized'
                          ? 'text-emerald-400'
                          : obs.harmonizationStatus === 'pending'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {obs.harmonizationStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Pending Municipal Environmental Actions</h2>
            <button
              type="button"
              onClick={() => navigate('/action-plan')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Open Action Plan
            </button>
          </div>
          <div className="divide-y divide-slate-800/80">
            {data.pendingActions.length === 0 ? (
              <div className="p-6 text-xs text-slate-400">
                No action plan generated for {data.municipality.name} yet. Click{' '}
                <button
                  type="button"
                  onClick={() => navigate('/action-plan')}
                  className="text-cyan-400 underline"
                >
                  Action Plan
                </button>{' '}
                to generate recommendations from current satellite telemetry.
              </div>
            ) : (
              data.pendingActions.map((act) => (
                <div key={act.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-400 font-semibold">{act.priority}</span>
                    <span className="text-slate-400">{act.suggestedDepartment}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-100">
                    {act.geographicLocation} — {act.category}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{act.recommendedAction}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
