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
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          02
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            CATALOG · CRS REPROJECTION · TEMPORAL HARMONIZATION
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">SATELLITE</span>
            <br />
            HARMONIZER
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Normalize multi-mission CRS projections, spatial resolutions (10m–1000m), and temporal
            cadences onto a unified municipal grid.
          </p>

          <button
            type="button"
            disabled={runningPipeline}
            onClick={() => void handleRunIngestAndHarmonize()}
            className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
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

      {/* Mission Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {missions.map((m) => {
          const isSelected = selectedMission === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMission(isSelected ? 'all' : m.id)}
              className={`text-left p-5 border-2 transition-none group ${
                isSelected
                  ? 'border-black bg-black text-white'
                  : 'border-black bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold">{m.agency}</span>
                <span
                  className={`uppercase font-black px-1 border ${
                    isSelected ? 'border-white text-white' : 'border-black text-black group-hover:border-white group-hover:text-white'
                  }`}
                >
                  {m.healthStatus}
                </span>
              </div>
              <div className="mt-2 text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Satellite className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{m.name}</span>
              </div>
              <div className="mt-1 text-xs text-[#4B5563] group-hover:text-[#D1D5DB] truncate">
                {m.sensor}
              </div>
              <div className="mt-4 pt-3 border-t border-black/20 group-hover:border-white/20 flex items-center justify-between text-[11px] font-mono tabular-nums font-bold">
                <span>{m.spatialResolutionM}M RES</span>
                <span>{m.revisitDays}D REVISIT</span>
                <span>{m.activeTiles} TILES</span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Filter Control Bar */}
      <section className="border-2 border-black bg-white p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-mission">
            MISSION FILTER
          </label>
          <select
            id="sat-mission"
            value={selectedMission}
            onChange={(e) => setSelectedMission(e.target.value as SatelliteMissionId | 'all')}
            className="w-full h-10 bg-white border-2 border-black px-3 text-xs font-bold uppercase text-black"
          >
            <option value="all">ALL 4 MISSIONS</option>
            {missions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-band">
            SPECTRAL BAND
          </label>
          <select
            id="sat-band"
            value={selectedBand}
            onChange={(e) => setSelectedBand(e.target.value)}
            className="w-full h-10 bg-white border-2 border-black px-3 text-xs font-bold uppercase text-black"
          >
            <option value="all">ALL SPECTRAL BANDS</option>
            <option value="NDVI">B4/B8 — NDVI VEGETATION</option>
            <option value="LST">B10/B11 / MODIS — THERMAL LST</option>
            <option value="NO2">TROPOMI — TROPOSPHERIC NO₂</option>
            <option value="VV">SENTINEL-1 — SAR VV/VH</option>
            <option value="NDWI">B3/B8 — NDWI SURFACE WATER</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-res">
            GRID RESOLUTION
          </label>
          <select
            id="sat-res"
            value={targetResolution}
            onChange={(e) => setTargetResolution(Number(e.target.value))}
            className="w-full h-10 bg-white border-2 border-black px-3 text-xs font-bold uppercase text-black"
          >
            <option value={10}>10M HIGH-RES (SENTINEL)</option>
            <option value={30}>30M STANDARD MUNICIPAL</option>
            <option value={100}>100M MACRO REGIONAL</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-cloud">
            MAX CLOUD: <span className="tabular-nums font-mono">{maxCloud}%</span>
          </label>
          <input
            id="sat-cloud"
            type="range"
            min={5}
            max={50}
            step={5}
            value={maxCloud}
            onChange={(e) => setMaxCloud(Number(e.target.value))}
            className="w-full accent-black mt-3 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-start">
              FROM
            </label>
            <input
              id="sat-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 bg-white border-2 border-black px-2 text-xs font-mono font-bold text-black"
            >
            </input>
          </div>
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="sat-end">
              TO
            </label>
            <input
              id="sat-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 bg-white border-2 border-black px-2 text-xs font-mono font-bold text-black"
            >
            </input>
          </div>
        </div>
      </section>

      {/* Harmonization Pipeline Telemetry */}
      {harmonization && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 border-2 border-black bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-black" aria-hidden="true" />
                <h2 className="text-xs font-black uppercase tracking-widest text-black">
                  HARMONIZATION PIPELINE STATUS
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#4B5563]">
                JOB {harmonization.jobId} · {harmonization.targetCrs} @ {harmonization.targetResolutionM}M
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-none group">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                  RAW OBS
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums">
                  {harmonization.rawObservationCount}
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-none group">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                  PROCESSED
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums">
                  {harmonization.processedObservationCount}
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-none group">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                  COVERAGE
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums">
                  {harmonization.spatialCoveragePct}%
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-none group">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                  DURATION
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums">
                  {(harmonization.processingDurationMs / 1000).toFixed(2)}s
                </div>
              </div>
              <div className="border-2 border-black p-3 bg-white hover:bg-black hover:text-white transition-none group">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                  QA FAILED
                </div>
                <div className="mt-1 text-2xl font-black tabular-nums text-[#FF0000]">
                  {harmonization.failedIngestionCount}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {harmonization.stages.map((st) => (
                <div
                  key={st.stage}
                  className="border-2 border-black p-3 flex items-start justify-between gap-3 hover:bg-black hover:text-white transition-none group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        st.status === 'completed' ? 'text-black group-hover:text-white' : 'text-[#FF0000]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight">{st.stage}</div>
                      <div className="text-[11px] text-[#4B5563] group-hover:text-[#D1D5DB] mt-0.5">
                        {st.detail}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums font-bold shrink-0">
                    {st.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Acquisition Timeline */}
          <div className="xl:col-span-5 border-2 border-black bg-white p-6 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                ACQUISITION COVERAGE VS CLOUD MASK
              </h2>
              <p className="text-[11px] text-[#4B5563] mt-1">
                Spatial usable coverage (%) and cloud interference (%) across filtered granules
              </p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#000000" fontSize={10} fontStyle="bold" tickLine={false} />
                  <YAxis stroke="#000000" fontSize={10} tickLine={false} domain={[0, 100]} />
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
                  <Bar dataKey="coverage" name="Coverage (%)" fill="#000000" maxBarSize={28} />
                  <Bar dataKey="cloud" name="Cloud (%)" fill="#FF0000" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {savedJobs.length > 0 && (
              <div className="pt-3 border-t-2 border-black">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-black mb-2">
                  <Database className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>FIRESTORE SYNCED RUNS ({savedJobs.length})</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] font-mono text-[#4B5563]">
                  {savedJobs.slice(0, 3).map((j) => (
                    <div key={j.id} className="flex items-center justify-between">
                      <span className="font-bold text-black">{j.id}</span>
                      <span className="tabular-nums">
                        {j.processedObservationCount} TILES · COMPLETED
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
      <section className="border-2 border-black bg-white overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-white" aria-hidden="true" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white">
              OBSERVATION GRANULE METADATA ({observations.length} RECORDS)
            </h2>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase text-white border border-white px-1.5 py-0.5">
            SYNTHETIC DEMO CATALOG
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-xs font-mono font-bold text-black">LOADING OBSERVATIONS...</div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#4B5563]">
            No observations match current filters. Increase cloud coverage slider or reset band selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                <tr>
                  <th className="px-5 py-3">GRANULE ID</th>
                  <th className="px-5 py-3">MISSION</th>
                  <th className="px-5 py-3">ACQUIRED (UTC)</th>
                  <th className="px-5 py-3">SPECTRAL BAND</th>
                  <th className="px-5 py-3">CRS TRANSFORM</th>
                  <th className="px-5 py-3 text-right">RESAMPLING</th>
                  <th className="px-5 py-3 text-right">CLOUD</th>
                  <th className="px-5 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black font-mono text-[11px]">
                {observations.map((obs) => (
                  <tr key={obs.id} className="hover:bg-black hover:text-white transition-none group">
                    <td className="px-5 py-3 font-bold text-black group-hover:text-white whitespace-nowrap">
                      {obs.id}
                    </td>
                    <td className="px-5 py-3 font-sans font-black uppercase whitespace-nowrap">
                      {obs.missionName}
                    </td>
                    <td className="px-5 py-3 text-[#4B5563] group-hover:text-[#D1D5DB] whitespace-nowrap tabular-nums">
                      {obs.acquiredAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="px-5 py-3 font-bold whitespace-nowrap">{obs.spectralBand}</td>
                    <td className="px-5 py-3 text-[#4B5563] group-hover:text-[#D1D5DB] whitespace-nowrap">
                      {obs.crsSource} → {obs.crsTarget}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">
                      {obs.resolutionSourceM}m → {obs.resolutionTargetM}m
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-[#4B5563] group-hover:text-[#D1D5DB]" aria-hidden="true" />
                        {obs.cloudCoveragePct.toFixed(1)}%
                      </span>
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
        )}
      </section>
    </div>
  );
}
