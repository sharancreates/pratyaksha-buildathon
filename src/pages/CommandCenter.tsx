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
      <div className="space-y-8">
        <div className="h-64 border-2 border-black bg-[#E5E7EB] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-36 border-t-2 border-black bg-[#E5E7EB] animate-pulse" />
          ))}
        </div>
        <div className="h-[520px] border-2 border-black bg-[#E5E7EB] animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-2 border-black bg-white p-8">
        <div className="font-black uppercase tracking-wider text-sm text-[#FF0000]">
          TELEMETRY CONNECTION ERROR
        </div>
        <p className="mt-2 text-sm text-[#4B5563]">{error || 'Unable to load dashboard telemetry.'}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="button-sm mt-6"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" aria-hidden="true" />
          RETRY FETCH
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Mission Hero Header with Exaggerated Display Typography */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          01
        </span>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold tracking-wider text-black uppercase mb-3">
            <span className="bg-black text-white px-2 py-0.5">PRATYAKSHA</span>
            <span>·</span>
            <span>TELEMETRY TO ACTION</span>
            <span>·</span>
            <span className="text-[#FF0000]">DEMO MODE ACTIVE</span>
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">{data.municipality.name}</span>
            <br />
            INTELLIGENCE
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            {data.municipality.corporation}. See the Earth. Understand the Risk. Act Before It
            Escalates.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/anomalies')}
              className="button-sm"
            >
              <ShieldAlert className="w-4 h-4 mr-2" aria-hidden="true" />
              ML ANOMALY CONSENSUS
            </button>
            <button
              type="button"
              onClick={() => navigate('/action-plan')}
              className="button-sm bg-black text-white hover:bg-white hover:text-black"
            >
              <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
              GENERATE ACTION PLAN
            </button>
          </div>
        </div>
      </section>

      {/* 6 KPI Cards Strip */}
      <section
        aria-label="Environmental Key Performance Indicators"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {data.kpis.map((metric) => (
          <KpiCard key={metric.id} metric={metric} />
        ))}
      </section>

      {/* Main Geospatial Map Viewport */}
      <section
        aria-label="Interactive Geospatial Intelligence Map"
        className="border-2 border-black bg-white p-2"
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

      {/* Intelligence Overview Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Detected Anomalies */}
        <div className="lg:col-span-7 border-2 border-black bg-white flex flex-col justify-between">
          <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                LATEST DETECTED ANOMALIES
              </h2>
              <p className="text-[10px] font-mono text-[#D1D5DB] uppercase mt-0.5">
                ISOLATION FOREST + DBSCAN + AUTOENCODER CONSENSUS
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/anomalies')}
              className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-white hover:text-[#FF0000]"
            >
              VIEW ALL
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="divide-y-2 divide-black">
            {data.anomalies.map((anm) => (
              <div
                key={anm.id}
                className="px-6 py-4 hover:bg-black hover:text-white transition-none group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span
                      className={`font-black uppercase px-1.5 py-0.5 border ${
                        anm.severity === 'critical'
                          ? 'border-[#FF0000] text-[#FF0000] bg-white group-hover:bg-[#FF0000] group-hover:text-white'
                          : 'border-black text-black group-hover:border-white group-hover:text-white'
                      }`}
                    >
                      {anm.severity.toUpperCase()}
                    </span>
                    <span className="text-[#4B5563] group-hover:text-[#D1D5DB]">·</span>
                    <span className="font-bold">{anm.id}</span>
                    <span className="text-[#4B5563] group-hover:text-[#D1D5DB]">·</span>
                    <span className="text-[#4B5563] group-hover:text-[#D1D5DB]">{anm.primaryModel}</span>
                  </div>
                  <div className="text-sm font-black uppercase tracking-tight">
                    {anm.wardName} — {anm.indicator}
                  </div>
                  <div className="text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
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
                    className="button-sm !py-1.5 !px-3 text-[11px] group-hover:border-white group-hover:text-white"
                  >
                    <Crosshair className="w-3 h-3 mr-1" aria-hidden="true" />
                    LOCATE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnomalyId(anm.id);
                      navigate('/anomalies');
                    }}
                    className="button-sm !py-1.5 !px-3 text-[11px] bg-black text-white group-hover:bg-white group-hover:text-black group-hover:border-white"
                  >
                    INSPECT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Risk Distribution + High-Risk Zones */}
        <div className="lg:col-span-5 space-y-6">
          {/* Risk Distribution */}
          <div className="border-2 border-black bg-white p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-black">
                  RISK DISTRIBUTION
                </h2>
                <p className="text-[10px] font-mono text-[#4B5563] uppercase">
                  {data.municipality.wards.length} MONITORED SECTORS
                </p>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.riskDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="level" stroke="#000000" fontSize={10} fontStyle="bold" tickLine={false} />
                  <YAxis stroke="#000000" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#000000',
                      borderWidth: '2px',
                      borderRadius: '0px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#000000',
                    }}
                  />
                  <Bar dataKey="count" maxBarSize={40}>
                    {data.riskDistribution.map((entry) => (
                      <Cell
                        key={entry.level}
                        fill={entry.level.toLowerCase().includes('critical') ? '#FF0000' : '#000000'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* High-Risk Geographic Zones */}
          <div className="border-2 border-black bg-white overflow-hidden">
            <div className="px-6 py-3 border-b-2 border-black bg-black text-white">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                HIGH-RISK GEOGRAPHIC ZONES
              </h2>
            </div>
            <div className="divide-y-2 divide-black">
              {data.highRiskZones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setFocusedCoords([...zone.center])}
                  className="w-full text-left px-6 py-3 hover:bg-black hover:text-white transition-none group flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-tight">{zone.name}</div>
                    <div className="text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
                      LST {zone.lstCelsius}°C · NDVI {zone.ndvi} · NO₂ {zone.no2UmolM2}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-black tabular-nums shrink-0 px-2 py-0.5 border ${
                      zone.riskScore >= 82
                        ? 'border-[#FF0000] text-[#FF0000] bg-white group-hover:bg-[#FF0000] group-hover:text-white'
                        : 'border-black text-black group-hover:border-white group-hover:text-white'
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

      {/* Bottom Row: Recent Observations + Pending Environmental Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 border-2 border-black bg-white overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-white" aria-hidden="true" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                RECENT SATELLITE OBSERVATIONS
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/satellite')}
              className="text-xs font-black uppercase tracking-wider text-white hover:text-[#FF0000]"
            >
              EXPLORER →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                <tr>
                  <th className="px-5 py-3">MISSION</th>
                  <th className="px-5 py-3">BAND</th>
                  <th className="px-5 py-3 text-right">CLOUD</th>
                  <th className="px-5 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black font-mono text-[11px]">
                {data.recentObservations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-black hover:text-white transition-none group">
                    <td className="px-5 py-3 font-sans font-black uppercase whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="px-5 py-3 text-[#4B5563] group-hover:text-[#D1D5DB] whitespace-nowrap">
                      {obs.spectralBand}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {obs.cloudCoveragePct.toFixed(1)}%
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-black uppercase ${
                        obs.harmonizationStatus === 'harmonized'
                          ? 'text-black group-hover:text-white'
                          : 'text-[#FF0000]'
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

        <div className="lg:col-span-6 border-2 border-black bg-white overflow-hidden">
          <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              PENDING MUNICIPAL ACTIONS
            </h2>
            <button
              type="button"
              onClick={() => navigate('/action-plan')}
              className="text-xs font-black uppercase tracking-wider text-white hover:text-[#FF0000]"
            >
              PLAN →
            </button>
          </div>
          <div className="divide-y-2 divide-black">
            {data.pendingActions.length === 0 ? (
              <div className="p-8 text-xs text-[#4B5563]">
                No action plan generated for {data.municipality.name} yet. Click{' '}
                <button
                  type="button"
                  onClick={() => navigate('/action-plan')}
                  className="font-bold underline text-black hover:text-[#FF0000]"
                >
                  Action Plan
                </button>{' '}
                to synthesize recommendations from current satellite telemetry.
              </div>
            ) : (
              data.pendingActions.map((act) => (
                <div key={act.id} className="px-6 py-4 space-y-1 hover:bg-black hover:text-white transition-none group">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-black uppercase text-[#FF0000]">{act.priority}</span>
                    <span className="text-[#4B5563] group-hover:text-[#D1D5DB] uppercase">
                      {act.suggestedDepartment}
                    </span>
                  </div>
                  <div className="text-xs font-black uppercase tracking-tight">
                    {act.geographicLocation} — {act.category}
                  </div>
                  <p className="text-xs text-[#4B5563] group-hover:text-[#D1D5DB] leading-relaxed">
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
