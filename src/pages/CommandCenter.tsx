import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Crosshair,
  FileText,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Sparkles,
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
        <div className="h-64 rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-36 rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
          ))}
        </div>
        <div className="h-[520px] rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tile p-8 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
        <div className="font-bold text-sm text-[var(--critical)]">
          TELEMETRY CONNECTION ERROR
        </div>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{error || 'Unable to load dashboard telemetry.'}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="button-sm mt-6 rounded-full"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          RETRY FETCH
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bento Grid Mission Hero Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Hero Tile: Dark Bento Card */}
        <div className="lg:col-span-8 tile tile--dark rounded-3xl p-8 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-md mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
              <span>PRATYAKSHA INTELLIGENCE CORE</span>
              <span aria-hidden="true">·</span>
              <span className="text-white/70">TELEMETRY TO ACTION</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mt-1">
              {data.municipality.name} Municipal Core
            </h1>

            <p className="text-white/80 text-sm sm:text-base mt-2 max-w-xl font-normal leading-relaxed">
              {data.municipality.corporation}. See the Earth. Understand the Risk. Act Before It
              Escalates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6 relative z-10">
            <button
              type="button"
              onClick={() => navigate('/anomalies')}
              className="button-signal rounded-full px-5 py-2.5 text-xs font-semibold bg-[var(--blue)] text-white hover:bg-[var(--blue-tile)] shadow-md"
            >
              <ShieldAlert className="w-4 h-4 mr-2" aria-hidden="true" />
              ML ANOMALY CONSENSUS
            </button>
            <button
              type="button"
              onClick={() => navigate('/action-plan')}
              className="rounded-full px-5 py-2.5 text-xs font-semibold bg-white/15 text-white hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all hover:scale-[1.02]"
            >
              <FileText className="w-4 h-4 mr-2 inline" aria-hidden="true" />
              GENERATE ACTION PLAN
            </button>
          </div>
        </div>

        {/* Accent Feature Tile: Bold Blue Bento Card */}
        <div className="lg:col-span-4 tile tile--blue rounded-3xl p-7 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                TRIAGE CONSENSUS
              </span>
              <Sparkles className="w-4 h-4 text-white/80" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {data.anomalies.length} Flagged Sectors
            </h3>
            <p className="text-xs text-white/85 leading-relaxed">
              Isolation Forest + DBSCAN spatial contagion + Autoencoder reconstruction MSE running in consensus across {data.municipality.wards.length} municipal wards.
            </p>
          </div>

          <div className="pt-4 border-t border-white/20 flex items-center justify-between">
            <div className="text-xs text-white/90">
              <span className="font-bold text-lg tabular-nums">
                {data.anomalies.filter((a) => a.severity === 'critical').length}
              </span>{' '}
              Critical Severity
            </div>
            <button
              type="button"
              onClick={() => navigate('/anomalies')}
              className="text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3.5 py-1.5 rounded-full backdrop-blur-md transition-all inline-flex items-center gap-1"
            >
              Review
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 6 KPI Cards Strip in Bento Grid */}
      <section
        aria-label="Environmental Key Performance Indicators"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* Main Geospatial Map Viewport in Rounded Bento Card */}
      <section
        aria-label="Interactive Geospatial Intelligence Map"
        className="tile rounded-3xl bg-white p-3 shadow-sm border border-black/[0.04]"
      >
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

      {/* Bento Grid: Anomalies & Analytics Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Detected Anomalies: Modular Tile */}
        <div className="lg:col-span-7 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  LATEST DETECTED ANOMALIES
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Isolation Forest · DBSCAN Spatial Contagion · Autoencoder MSE
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/anomalies')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--blue)] hover:underline"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-black/[0.06] mt-1">
              {data.anomalies.map((anm) => (
                <div
                  key={anm.id}
                  className="py-3.5 px-3 rounded-2xl hover:bg-[var(--canvas)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                          anm.severity === 'critical'
                            ? 'bg-rose-50 text-[var(--critical)] border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {anm.severity}
                      </span>
                      <span className="text-[var(--text-muted)] opacity-50">·</span>
                      <span className="font-mono text-xs font-semibold text-[var(--ink)]">{anm.id}</span>
                      <span className="text-[var(--text-muted)] opacity-50">·</span>
                      <span className="text-xs text-[var(--text-muted)]">{anm.primaryModel}</span>
                    </div>
                    <div className="text-sm font-bold text-[var(--ink)]">
                      {anm.wardName} — {anm.indicator}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
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
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--canvas)] hover:bg-[#E5E5EA] text-[var(--ink)] transition-colors inline-flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3 text-[var(--blue)]" aria-hidden="true" />
                      Locate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnomalyId(anm.id);
                        navigate('/anomalies');
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink)] hover:bg-[#333336] text-white transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Risk Distribution & High-Risk Zones */}
        <div className="lg:col-span-5 space-y-6">
          {/* Risk Distribution Bento Tile */}
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  RISK DISTRIBUTION
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {data.municipality.wards.length} Monitored Sectors
                </p>
              </div>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.riskDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="level" stroke="#8E8E93" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8E8E93" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      borderRadius: '1rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={36}>
                    {data.riskDistribution.map((entry) => (
                      <Cell
                        key={entry.level}
                        fill={entry.level.toLowerCase().includes('critical') ? '#FF3B30' : '#007AFF'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High-Risk Geographic Zones Bento Tile */}
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04]">
            <div className="pb-3 border-b border-black/[0.06] mb-2">
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                HIGH-RISK GEOGRAPHIC ZONES
              </h2>
            </div>
            <div className="divide-y divide-black/[0.06]">
              {data.highRiskZones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setFocusedCoords([...zone.center])}
                  className="w-full text-left py-3 px-3 rounded-2xl hover:bg-[var(--canvas)] transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--ink)]">{zone.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] tabular-nums mt-0.5">
                      LST {zone.lstCelsius}°C · NDVI {zone.ndvi} · NO₂ {zone.no2UmolM2}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold tabular-nums px-2.5 py-1 rounded-full ${
                      zone.riskScore >= 82
                        ? 'bg-rose-50 text-[var(--critical)] border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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

      {/* Bottom Bento Grid: Observations & Municipal Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Observations Table Bento Card */}
        <div className="lg:col-span-6 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-[var(--blue)]" aria-hidden="true" />
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                RECENT SATELLITE OBSERVATIONS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/satellite')}
              className="text-xs font-semibold text-[var(--blue)] hover:underline inline-flex items-center gap-1"
            >
              Explorer
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">MISSION</th>
                  <th className="py-2.5 px-3">BAND</th>
                  <th className="py-2.5 px-3 text-right">CLOUD</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[12px]">
                {data.recentObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-[var(--canvas)] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[var(--ink)] whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)] whitespace-nowrap">
                      {obs.spectralBand}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)]">
                      {obs.cloudCoveragePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          obs.harmonizationStatus === 'harmonized'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {obs.harmonizationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Actions Bento Card */}
        <div className="lg:col-span-6 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
              PENDING MUNICIPAL ACTIONS
            </h2>
            <button
              type="button"
              onClick={() => navigate('/action-plan')}
              className="text-xs font-semibold text-[var(--blue)] hover:underline inline-flex items-center gap-1"
            >
              Action Plan
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y divide-black/[0.06] mt-2">
            {data.pendingActions.length === 0 ? (
              <div className="p-6 text-xs text-[var(--text-muted)]">
                No action plan synthesized for {data.municipality.name} yet.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/action-plan')}
                  className="font-bold underline text-[var(--blue)]"
                >
                  Generate Action Plan
                </button>{' '}
                to synthesize priority recommendations from current telemetry.
              </div>
            ) : (
              data.pendingActions.map((act) => (
                <div key={act.id} className="py-3 px-3 rounded-2xl hover:bg-[var(--canvas)] transition-colors space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[var(--critical)] uppercase text-[10px] bg-rose-50 px-2 py-0.5 rounded-full">
                      {act.priority}
                    </span>
                    <span className="text-[var(--text-muted)] font-medium">
                      {act.suggestedDepartment}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[var(--ink)]">
                    {act.geographicLocation} — {act.category}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {act.recommendedAction}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
