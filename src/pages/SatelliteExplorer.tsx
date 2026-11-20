import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Database,
  DownloadCloud,
  Layers,
  Play,
  RefreshCw,
  Satellite,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import {
  fetchSatelliteMissions,
  fetchSatelliteObservations,
  triggerHarmonization,
  triggerSatelliteIngest,
} from '../lib/api';
import {
  logProcessingJobToFirestore,
  subscribeOwnerProcessingJobs,
  type StoredProcessingJobDoc,
} from '../lib/firestoreStore';
import type {
  HarmonizationResult,
  SatelliteMission,
  SatelliteMissionId,
  SatelliteObservation,
} from '../shared/types';

export function SatelliteExplorer() {
  const { municipality, user, pushToast } = useAppContext();

  const [missions, setMissions] = useState<SatelliteMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<SatelliteMissionId | 'all'>('all');
  const [maxCloud, setMaxCloud] = useState<number>(35);
  const [selectedBand, setSelectedBand] = useState<string>('all');
  const [targetResolution, setTargetResolution] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>('2026-11-19');

  const [observations, setObservations] = useState<SatelliteObservation[]>([]);
  const [harmonization, setHarmonization] = useState<HarmonizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [savedJobs, setSavedJobs] = useState<StoredProcessingJobDoc[]>([]);

  useEffect(() => {
    fetchSatelliteMissions()
      .then((res) => setMissions(res.missions))
      .catch(() => setMissions([]));
  }, []);

  const loadObservations = async () => {
    setLoading(true);
    try {
      const res = await fetchSatelliteObservations({
        municipality,
        mission: selectedMission,
        maxCloud,
        band: selectedBand,
        startDate,
        endDate,
      });
      setObservations(res.observations);
      setHarmonization(res.lastHarmonization);
    } catch {
      pushToast({
        title: 'Observation fetch failed',
        description: 'Could not query satellite observations.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadObservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality, selectedMission, maxCloud, selectedBand, startDate, endDate]);

  useEffect(() => {
    if (!user) {
      setSavedJobs([]);
      return;
    }
    const unsub = subscribeOwnerProcessingJobs(user.uid, setSavedJobs);
    return () => unsub();
  }, [user]);

  const handleRunIngestAndHarmonize = async () => {
    setRunningPipeline(true);
    try {
      const ingestRes = await triggerSatelliteIngest({
        municipalityId: municipality,
        missionId: selectedMission,
        maxCloudPct: maxCloud,
      });
      const harmRes = await triggerHarmonization({
        municipalityId: municipality,
        missionId: selectedMission,
        targetResolutionM: targetResolution,
      });
      setHarmonization(harmRes);
      await loadObservations();

      if (user && user.emailVerified) {
        void logProcessingJobToFirestore(harmRes, 'harmonize');
      }

      pushToast({
        title: 'Harmonization pipeline completed',
        description: `Ingested ${ingestRes.ingestedCount} tiles and aligned ${harmRes.processedObservationCount} rasters to ${harmRes.targetCrs} @ ${harmRes.targetResolutionM}m.`,
        variant: 'success',
      });
    } catch {
      pushToast({
        title: 'Harmonization failed',
        description: 'Check parameters and retry pipeline execution.',
        variant: 'error',
      });
    } finally {
      setRunningPipeline(false);
    }
  };

  const timelineData = observations
    .slice(0, 12)
    .reverse()
    .map((o) => ({
      date: o.acquiredAt.slice(5, 10),
      coverage: o.spatialCoveragePct,
      cloud: o.cloudCoveragePct,
    }));

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <section className="tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--canvas)] text-[var(--ink)] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" aria-hidden="true" />
            <span>CATALOG & HARMONIZATION CORE</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">CRS REPROJECTION</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] mb-3">
            Satellite Harmonizer
          </h1>

          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6">
            Normalize multi-mission CRS projections, spatial resolutions (10m–1000m), and temporal
            cadences onto a unified municipal grid.
          </p>

          <button
            type="button"
            disabled={runningPipeline}
            onClick={() => void handleRunIngestAndHarmonize()}
            className="button-signal rounded-full px-5 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {runningPipeline ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {runningPipeline ? 'HARMONIZING TILES...' : 'RUN HARMONIZATION'}
          </button>
        </div>
      </section>

      {/* Mission Bento Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {missions.map((m) => {
          const isSelected = selectedMission === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMission(isSelected ? 'all' : m.id)}
              className={`tile tile-interactive text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-[var(--ink)] text-white border-transparent shadow-md'
                  : 'bg-white text-[var(--ink)] border-black/[0.04] shadow-sm hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>{m.agency}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {m.healthStatus}
                </span>
              </div>
              <div className="mt-2 text-base font-bold tracking-tight flex items-center gap-2">
                <Satellite className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--blue)]'}`} aria-hidden="true" />
                <span className="truncate">{m.name}</span>
              </div>
              <div className={`mt-1 text-xs truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                {m.sensor}
              </div>
              <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] tabular-nums font-medium ${
                isSelected ? 'border-white/20 text-white/90' : 'border-black/[0.06] text-[var(--text-muted)]'
              }`}>
                <span>{m.spatialResolutionM}m Res</span>
                <span>{m.revisitDays}d Revisit</span>
                <span>{m.activeTiles} Tiles</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Filter Control Bar: Bento Tile */}
      <section className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-mission">
            MISSION FILTER
          </label>
          <select
            id="sat-mission"
            value={selectedMission}
            onChange={(e) => setSelectedMission(e.target.value as SatelliteMissionId | 'all')}
            className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
          >
            <option value="all">All 4 Missions</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-band">
            SPECTRAL BAND
          </label>
          <select
            id="sat-band"
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
          >
            <option value="all">All Spectral Bands</option>
            <option value="NDVI">B4/B8 — NDVI Vegetation</option>
            <option value="LST">B10/B11 / MODIS — Thermal LST</option>
            <option value="NO2">TROPOMI — Tropospheric NO₂</option>
            <option value="VV">Sentinel-1 — SAR VV/VH</option>
            <option value="NDWI">B3/B8 — NDWI Surface Water</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-res">
            GRID RESOLUTION
          </label>
          <select
            id="sat-res"
            value={targetResolution}
            onChange={(e) => setTargetResolution(Number(e.target.value))}
            className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
          >
            <option value={10}>10m High-Res (Sentinel)</option>
            <option value={30}>30m Standard Municipal</option>
            <option value={100}>100m Macro Regional</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-cloud">
            MAX CLOUD: <span className="tabular-nums font-mono text-[var(--blue)]">{maxCloud}%</span>
          </label>
          <input
            id="sat-cloud"
            type="range"
            min={5}
            max={50}
            step={5}
            value={maxCloud}
            onChange={(e) => setMaxCloud(Number(e.target.value))}
            className="w-full accent-[var(--blue)] mt-3 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-start">
              FROM
            </label>
            <input
              id="sat-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-2 text-xs font-mono font-medium text-[var(--ink)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="sat-end">
              TO
            </label>
            <input
              id="sat-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-2 text-xs font-mono font-medium text-[var(--ink)]"
            />
          </div>
        </div>
      </section>

      {/* Harmonization Pipeline Telemetry */}
      {harmonization && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--blue)]" aria-hidden="true" />
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                  HARMONIZATION PIPELINE STATUS
                </h2>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                Job {harmonization.jobId} · {harmonization.targetCrs} @ {harmonization.targetResolutionM}m
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  RAW OBS
                </div>
                <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                  {harmonization.rawObservationCount}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  PROCESSED
                </div>
                <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                  {harmonization.processedObservationCount}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  COVERAGE
                </div>
                <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                  {harmonization.spatialCoveragePct}%
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  DURATION
                </div>
                <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                  {(harmonization.processingDurationMs / 1000).toFixed(2)}s
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  QA FAILED
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--critical)]">
                  {harmonization.failedIngestionCount}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {harmonization.stages.map((st) => (
                <div
                  key={st.stage}
                  className="p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        st.status === 'completed' ? 'text-[var(--green)]' : 'text-[var(--critical)]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-xs font-bold text-[var(--ink)]">{st.stage}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {st.detail}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums font-semibold shrink-0">
                    {st.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Acquisition Timeline */}
          <div className="xl:col-span-5 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
                ACQUISITION COVERAGE VS CLOUD MASK
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Spatial usable coverage (%) and cloud interference (%) across filtered granules
              </p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#8E8E93" fontSize={10} tickLine={false} />
                  <YAxis stroke="#8E8E93" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: 'rgba(0, 0, 0, 0.08)',
                      borderRadius: '1rem',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="coverage" name="Coverage (%)" fill="#007AFF" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="cloud" name="Cloud (%)" fill="#FF3B30" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {savedJobs.length > 0 && (
              <div className="pt-3 border-t border-black/[0.06]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] mb-2">
                  <Database className="w-3.5 h-3.5 text-[var(--blue)]" aria-hidden="true" />
                  <span>Firestore Synced Runs ({savedJobs.length})</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto text-xs text-[var(--text-muted)]">
                  {savedJobs.slice(0, 3).map((j) => (
                    <div key={j.id} className="flex items-center justify-between">
                      <span className="font-medium text-[var(--ink)]">{j.id}</span>
                      <span className="tabular-nums">
                        {j.processedObservationCount} tiles · Completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Observations Table Bento Card */}
      <section className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-[var(--blue)]" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">
              OBSERVATION GRANULE METADATA ({observations.length} RECORDS)
            </h2>
          </div>
          <span className="text-[10px] font-semibold text-[var(--blue)] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            Synthetic Demo Catalog
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-xs font-medium text-[var(--text-muted)]">Loading observations...</div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            No observations match current filters. Increase cloud coverage slider or reset band selection.
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">GRANULE ID</th>
                  <th className="py-2.5 px-3">MISSION</th>
                  <th className="py-2.5 px-3">ACQUIRED (UTC)</th>
                  <th className="py-2.5 px-3">SPECTRAL BAND</th>
                  <th className="py-2.5 px-3">CRS TRANSFORM</th>
                  <th className="py-2.5 px-3 text-right">RESAMPLING</th>
                  <th className="py-2.5 px-3 text-right">CLOUD</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[12px]">
                {observations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-[var(--canvas)] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-[var(--ink)] whitespace-nowrap">
                      {obs.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[var(--ink)] whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                      {obs.acquiredAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--ink)] whitespace-nowrap">{obs.spectralBand}</td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)] whitespace-nowrap">
                      {obs.crsSource} → {obs.crsTarget}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                      {obs.resolutionSourceM}m → {obs.resolutionTargetM}m
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                        <Cloud className="w-3 h-3 text-[var(--blue)]" aria-hidden="true" />
                        {obs.cloudCoveragePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          obs.harmonizationStatus === 'harmonized'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-[var(--critical)]'
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
        )}
      </section>
    </div>
  );
}
