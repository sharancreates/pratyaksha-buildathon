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
      {/* Header */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400">
            DEMO MODE · DETERMINISTIC SYNTHETIC SATELLITE CATALOG (NON-LIVE TELEMETRY)
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">
            Satellite Data Explorer & Geospatial Harmonization Engine
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Normalize multi-mission CRS projections, spatial resolutions (10m–1000m), and temporal cadences onto a unified municipal grid.
          </p>
        </div>

        <button
          type="button"
          disabled={runningPipeline}
          onClick={() => void handleRunIngestAndHarmonize()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {runningPipeline ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {runningPipeline ? 'Harmonizing Tiles...' : 'Run Ingestion & Harmonization'}
        </button>
      </section>

      {/* Mission Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {missions.map((m) => {
          const isSelected = selectedMission === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMission(isSelected ? 'all' : m.id)}
              className={`text-left bg-[#111D2E] rounded-lg p-4 border transition-colors ${
                isSelected
                  ? 'border-cyan-400/70 bg-cyan-950/20'
                  : 'border-slate-800/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-cyan-400">{m.agency}</span>
                <span className="text-emerald-400 uppercase">{m.healthStatus}</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Satellite className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{m.name}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400 truncate">{m.sensor}</div>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                <span>Res: {m.spatialResolutionM}m</span>
                <span>Revisit: {m.revisitDays}d</span>
                <span>{m.activeTiles} tiles</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Filter Control Bar */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-mission">
            Mission Filter
          </label>
          <select
            id="sat-mission"
            value={selectedMission}
            onChange={(e) => setSelectedMission(e.target.value as SatelliteMissionId | 'all')}
            className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
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
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-band">
            Spectral Band / Product
          </label>
          <select
            id="sat-band"
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
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
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-res">
            Harmonized Grid Resolution
          </label>
          <select
            id="sat-res"
            value={targetResolution}
            onChange={(e) => setTargetResolution(Number(e.target.value))}
            className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
          >
            <option value={10}>10m High-Res (Sentinel Grid)</option>
            <option value={30}>30m Standard Municipal Grid</option>
            <option value={100}>100m Macro Regional Grid</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-cloud">
            Max Cloud Coverage: <span className="text-cyan-300 tabular-nums">{maxCloud}%</span>
          </label>
          <input
            id="sat-cloud"
            type="range"
            min={5}
            max={50}
            step={5}
            value={maxCloud}
            onChange={(e) => setMaxCloud(Number(e.target.value))}
            className="w-full accent-cyan-400 mt-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-start">
              From
            </label>
            <input
              id="sat-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2 text-[11px] font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1.5" htmlFor="sat-end">
              To
            </label>
            <input
              id="sat-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2 text-[11px] font-mono text-slate-200"
            />
          </div>
        </div>
      </section>

      {/* Harmonization Pipeline Telemetry */}
      {harmonization && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  Geospatial Harmonization Pipeline Status
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Job {harmonization.jobId} · Target {harmonization.targetCrs} @ {harmonization.targetResolutionM}m
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3">
                <div className="text-[11px] text-slate-400">Raw Obs</div>
                <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                  {harmonization.rawObservationCount}
                </div>
              </div>
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3">
                <div className="text-[11px] text-slate-400">Processed</div>
                <div className="mt-1 text-lg font-mono font-bold text-emerald-400 tabular-nums">
                  {harmonization.processedObservationCount}
                </div>
              </div>
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3">
                <div className="text-[11px] text-slate-400">Coverage</div>
                <div className="mt-1 text-lg font-mono font-bold text-cyan-300 tabular-nums">
                  {harmonization.spatialCoveragePct}%
                </div>
              </div>
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3">
                <div className="text-[11px] text-slate-400">Duration</div>
                <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                  {(harmonization.processingDurationMs / 1000).toFixed(2)}s
                </div>
              </div>
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3">
                <div className="text-[11px] text-slate-400">QA Failed</div>
                <div className="mt-1 text-lg font-mono font-bold text-red-400 tabular-nums">
                  {harmonization.failedIngestionCount}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {harmonization.stages.map((st) => (
                <div
                  key={st.stage}
                  className="bg-[#0D1524] border border-slate-800/80 rounded-md px-3.5 py-2.5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        st.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-100">{st.stage}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{st.detail}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                    {st.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Acquisition Timeline */}
          <div className="xl:col-span-5 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Data Acquisition Coverage vs Cloud Mask
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Spatial usable coverage (%) and cloud interference (%) across filtered granules
              </p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1524',
                      borderColor: '#334155',
                      fontSize: '12px',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="coverage" name="Usable Coverage (%)" fill="#22D3EE" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="cloud" name="Cloud Cover (%)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {savedJobs.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 mb-2">
                  <Database className="w-3.5 h-3.5" />
                  <span>Firestore Synced Pipeline Runs ({savedJobs.length})</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] font-mono text-slate-400">
                  {savedJobs.slice(0, 3).map((j) => (
                    <div key={j.id} className="flex items-center justify-between">
                      <span>{j.id} ({j.municipalityId})</span>
                      <span className="tabular-nums text-slate-300">
                        {j.processedCount}/{j.rawCount} · {j.durationMs}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Observations Table */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Observation Granule Metadata ({observations.length} records)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-amber-400">
            SYNTHETIC DEMO CATALOG
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-xs font-mono text-slate-400">Loading observations...</div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No observations match the current cloud coverage and band filters. Increase the cloud slider or reset band selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Granule ID</th>
                  <th className="px-4 py-2.5 font-medium">Mission</th>
                  <th className="px-4 py-2.5 font-medium">Acquired (UTC)</th>
                  <th className="px-4 py-2.5 font-medium">Spectral Band</th>
                  <th className="px-4 py-2.5 font-medium">CRS Transform</th>
                  <th className="px-4 py-2.5 font-medium text-right">Resampling</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cloud</th>
                  <th className="px-4 py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                {observations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-[#0D1524]/60">
                    <td className="px-4 py-2.5 text-cyan-300 whitespace-nowrap">{obs.id}</td>
                    <td className="px-4 py-2.5 text-slate-200 font-sans font-medium whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap tabular-nums">
                      {obs.acquiredAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{obs.spectralBand}</td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                      {obs.crsSource} → {obs.crsTarget}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      {obs.resolutionSourceM}m → {obs.resolutionTargetM}m
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-slate-500" />
                        {obs.cloudCoveragePct.toFixed(1)}%
                      </span>
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
        )}
      </section>
    </div>
  );
}
