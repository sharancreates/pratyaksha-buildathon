import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
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
import { fetchAnomalies, runAnomalyDetection } from '../lib/api';
import {
  saveAnomalyReviewToFirestore,
  subscribeOwnerAnomalyReviews,
  type StoredAnomalyReviewDoc,
} from '../lib/firestoreStore';
import type { DetectedAnomaly, SpatialCluster } from '../shared/types';

export function AnomalyDetection() {
  const { municipality, user, selectedAnomalyId, setSelectedAnomalyId, pushToast } = useAppContext();

  const [anomalies, setAnomalies] = useState<DetectedAnomaly[]>([]);
  const [clusters, setClusters] = useState<SpatialCluster[]>([]);
  const [avgRisk, setAvgRisk] = useState(0);
  const [sensitivity, setSensitivity] = useState(0.42);
  const [epsKm, setEpsKm] = useState(12.5);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Officer Triage Review state
  const [reviews, setReviews] = useState<StoredAnomalyReviewDoc[]>([]);
  const [reviewStatus, setReviewStatus] = useState<'open' | 'investigating' | 'mitigated' | 'resolved'>('investigating');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAnomalies(municipality, sensitivity, epsKm);
      setAnomalies(res.anomalies);
      setClusters(res.clusters);
      setAvgRisk(res.summary.avgConsensusRisk);
      if (res.anomalies.length > 0) {
        const exists = res.anomalies.some((a) => a.id === selectedAnomalyId);
        if (!exists) setSelectedAnomalyId(res.anomalies[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality]);

  useEffect(() => {
    if (!user) {
      setReviews([]);
      return;
    }
    const unsub = subscribeOwnerAnomalyReviews(user.uid, setReviews);
    return () => unsub();
  }, [user]);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await runAnomalyDetection({
        municipalityId: municipality,
        sensitivity,
        epsKm,
      });
      setAnomalies(res.anomalies);
      setClusters(res.clusters);
      setAvgRisk(res.summary.avgConsensusRisk);
      if (res.anomalies[0]) setSelectedAnomalyId(res.anomalies[0].id);
      pushToast({
        title: 'ML Anomaly Detection Completed',
        description: `Detected ${res.summary.totalDetected} anomalies and ${res.clusters.length} DBSCAN spatial clusters.`,
        variant: 'success',
      });
    } finally {
      setScanning(false);
    }
  };

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (
        searchQuery.trim() &&
        !`${a.id} ${a.wardName} ${a.indicator} ${a.primaryModel}`
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [anomalies, severityFilter, searchQuery]);

  const activeAnomaly =
    anomalies.find((a) => a.id === selectedAnomalyId) ?? filteredAnomalies[0] ?? null;

  const contributionData = activeAnomaly
    ? [
        { model: 'Isolation Forest', pts: activeAnomaly.modelContributions.isolationForest },
        { model: 'Autoencoder MSE', pts: activeAnomaly.modelContributions.autoencoder },
        { model: 'Threshold Severity', pts: activeAnomaly.modelContributions.thresholdSeverity },
        { model: 'DBSCAN Spatial', pts: activeAnomaly.modelContributions.dbscanSpatial },
      ]
    : [];

  const handleSaveReview = async () => {
    if (!activeAnomaly) return;
    if (!user || !user.emailVerified) {
      pushToast({
        title: 'Triage recorded locally',
        description: `Marked ${activeAnomaly.id} as ${reviewStatus.toUpperCase()}. Sign in with Google to persist.`,
        variant: 'info',
      });
      return;
    }
    setSavingReview(true);
    try {
      await saveAnomalyReviewToFirestore({
        anomalyId: activeAnomaly.id,
        wardId: activeAnomaly.wardId,
        wardName: activeAnomaly.wardName,
        indicator: activeAnomaly.indicator,
        status: reviewStatus,
        notes: reviewNotes.trim() || `Assigned for ${reviewStatus} review.`,
      });
      setReviewNotes('');
      pushToast({
        title: 'Anomaly triage persisted to Firestore',
        description: `${activeAnomaly.id} saved with status ${reviewStatus.toUpperCase()}.`,
        variant: 'success',
      });
    } catch {
      pushToast({
        title: 'Could not save review',
        description: 'Verify your Google officer session and try again.',
        variant: 'error',
      });
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header & Model Controls */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          04
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            ISOLATION FOREST · AUTOENCODER MSE · DBSCAN SPATIAL · RISK CONSENSUS
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">ANOMALY</span>
            <br />
            CONSENSUS
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Explainable multi-model risk consensus across thermal, vegetation, atmospheric NO₂, and
            surface-water anomalies.
          </p>

          <button
            type="button"
            disabled={scanning}
            onClick={() => void handleRunScan()}
            className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {scanning ? 'RUNNING ML ENSEMBLE...' : 'EXECUTE PIPELINE'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 mt-6 border-t-2 border-black">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="ml-sens">
              SCORE CUTOFF: <span className="tabular-nums font-mono">{sensitivity.toFixed(2)}</span>
            </label>
            <input
              id="ml-sens"
              type="range"
              min={0.25}
              max={0.75}
              step={0.05}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-black mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="ml-eps">
              DBSCAN RADIUS: <span className="tabular-nums font-mono">{epsKm.toFixed(1)} KM</span>
            </label>
            <input
              id="ml-eps"
              type="range"
              min={5}
              max={22}
              step={0.5}
              value={epsKm}
              onChange={(e) => setEpsKm(Number(e.target.value))}
              className="w-full accent-black mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="ml-sev">
              SEVERITY FILTER
            </label>
            <select
              id="ml-sev"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full h-10 bg-white border-2 border-black px-3 text-xs font-bold uppercase text-black"
            >
              <option value="all">ALL SEVERITIES</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="moderate">MODERATE</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-black mb-2" htmlFor="ml-search">
              SEARCH ANOMALIES
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-3" aria-hidden="true" />
              <input
                id="ml-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="FILTER WARD / METRIC..."
                className="w-full h-10 bg-white border-2 border-black pl-9 pr-3 text-xs font-bold uppercase text-black placeholder:text-[#4B5563]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Anomaly List + Explainable Consensus Inspector */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table + DBSCAN Clusters */}
        <div className="xl:col-span-7 space-y-6">
          <div className="border-2 border-black bg-white overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
              <span className="text-xs font-black uppercase tracking-widest text-white">
                DETECTED ANOMALIES ({filteredAnomalies.length})
              </span>
              <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                MEAN CONSENSUS RISK: {avgRisk}/100
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-xs font-mono font-bold text-black">RUNNING ANOMALY SCAN...</div>
            ) : filteredAnomalies.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#4B5563]">
                No anomalies match current filter. Lower Isolation Forest cutoff and re-run.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                    <tr>
                      <th className="px-5 py-3">ID / WARD</th>
                      <th className="px-5 py-3">INDICATOR</th>
                      <th className="px-5 py-3 text-right">IF SCORE</th>
                      <th className="px-5 py-3 text-right">AE MSE</th>
                      <th className="px-5 py-3 text-right">CONSENSUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {filteredAnomalies.map((a) => {
                      const active = activeAnomaly?.id === a.id;
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAnomalyId(a.id)}
                          className={`cursor-pointer transition-none ${
                            active
                              ? 'bg-black text-white'
                              : 'hover:bg-[#E5E7EB] text-black'
                          }`}
                        >
                          <td className="px-5 py-3">
                            <div className="font-mono text-[11px] font-bold">{a.id}</div>
                            <div className="font-black uppercase tracking-tight">{a.wardName}</div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-bold">{a.indicator}</div>
                            <div className="font-mono text-[11px] opacity-70 tabular-nums">
                              {a.observedValue} {a.unit} (base {a.baselineValue})
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">
                            {a.isolationForestScore.toFixed(3)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums font-bold">
                            {a.autoencoderError.toFixed(3)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono tabular-nums">
                            <span
                              className={`font-black ${
                                a.severity === 'critical'
                                  ? 'text-[#FF0000]'
                                  : ''
                              }`}
                            >
                              {a.consensusRiskScore}/100
                            </span>
                            <div className="text-[10px] font-bold uppercase opacity-60">
                              {a.severity}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DBSCAN Geographic Clusters */}
          <div className="border-2 border-black bg-white p-6 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-2">
              DBSCAN GEOGRAPHIC RISK CLUSTERS ({clusters.length})
            </h2>
            {clusters.length === 0 ? (
              <p className="text-xs text-[#4B5563]">
                No multi-ward clusters formed at eps = {epsKm.toFixed(1)} km. Increase radius to aggregate adjacent hotspots.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clusters.map((c) => (
                  <div
                    key={c.clusterId}
                    className="border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-none group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black uppercase">{c.label}</span>
                      <span className="font-mono font-black text-[#FF0000] tabular-nums">
                        AVG {c.avgRiskScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
                      Centroid {c.centroid[1].toFixed(4)}°N, {c.centroid[0].toFixed(4)}°E · R {c.radiusKm} km
                    </div>
                    <div className="text-[11px] font-mono text-[#4B5563] group-hover:text-[#D1D5DB] truncate">
                      Members: {c.memberAnomalyIds.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Explainable Risk Inspector */}
        <div className="xl:col-span-5 border-2 border-black bg-white p-6 space-y-6">
          {activeAnomaly ? (
            <>
              <div className="border-b-2 border-black pb-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-black text-black">{activeAnomaly.id}</span>
                  <span
                    className={`font-black uppercase px-2 py-0.5 border ${
                      activeAnomaly.severity === 'critical'
                        ? 'border-[#FF0000] text-[#FF0000]'
                        : 'border-black text-black'
                    }`}
                  >
                    {activeAnomaly.severity} · RISK {activeAnomaly.consensusRiskScore}/100
                  </span>
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-black">
                  {activeAnomaly.wardName}
                </h2>
                <div className="text-xs font-mono text-[#4B5563] tabular-nums">
                  {activeAnomaly.coordinates[1].toFixed(4)}°N, {activeAnomaly.coordinates[0].toFixed(4)}°E ·
                  DETECTED {activeAnomaly.detectedAt.replace('T', ' ').slice(0, 16)} UTC
                </div>
              </div>

              {/* Raw Uncalibrated Scores */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="border-2 border-black p-3 bg-white">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
                    ISOLATION FOREST
                  </div>
                  <div className="mt-1 text-lg font-mono font-black tabular-nums">
                    {activeAnomaly.isolationForestScore.toFixed(3)}
                  </div>
                </div>
                <div className="border-2 border-black p-3 bg-white">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
                    AUTOENCODER MSE
                  </div>
                  <div className="mt-1 text-lg font-mono font-black tabular-nums">
                    {activeAnomaly.autoencoderError.toFixed(3)}
                  </div>
                </div>
                <div className="border-2 border-black p-3 bg-white">
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
                    DBSCAN CLUSTER
                  </div>
                  <div className="mt-1 text-lg font-mono font-black tabular-nums">
                    {activeAnomaly.dbscanClusterId ? `C-${activeAnomaly.dbscanClusterId}` : 'ISOLATED'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-black border-2 border-black p-3 bg-[#E5E7EB] font-bold">
                {activeAnomaly.scoreDisclaimer}
              </div>

              {/* Explainable Model Contribution Chart */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-black mb-3 border-b-2 border-black pb-1">
                  EXPLAINABLE MODEL RISK ATTRIBUTION (POINTS)
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionData} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
                      <XAxis type="number" stroke="#000000" fontSize={10} fontStyle="bold" domain={[0, 45]} />
                      <YAxis type="category" dataKey="model" stroke="#000000" fontSize={10} fontStyle="bold" width={120} />
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
                      <Bar dataKey="pts" name="Contribution (pts)" fill="#000000" maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Suggested Intervention */}
              <div className="border-2 border-black p-4 space-y-2 bg-white">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
                  <ShieldAlert className="w-4 h-4 text-black" aria-hidden="true" />
                  <span>SUGGESTED MUNICIPAL INTERVENTION</span>
                </div>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  {activeAnomaly.suggestedIntervention}
                </p>
                <div className="text-[11px] font-mono font-bold text-black pt-1">
                  LEAD DEPARTMENT: {activeAnomaly.department}
                </div>
              </div>

              {/* Officer Triage Form */}
              <div className="pt-4 border-t-2 border-black space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-black">
                  LOG OFFICER TRIAGE REVIEW
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="h-10 bg-white border-2 border-black px-3 text-xs font-black uppercase text-black"
                  >
                    <option value="open">OPEN</option>
                    <option value="investigating">INVESTIGATING</option>
                    <option value="mitigated">MITIGATED</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                  <button
                    type="button"
                    disabled={savingReview}
                    onClick={() => void handleSaveReview()}
                    className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50 text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    {savingReview ? 'SAVING...' : 'SAVE REVIEW'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="FIELD INSPECTION NOTE OR DISPATCH INSTRUCTION..."
                  className="w-full bg-white border-2 border-black p-3 text-xs font-bold uppercase text-black placeholder:text-[#4B5563]"
                />
                {reviews.length > 0 && (
                  <div className="text-[11px] font-mono font-bold text-black">
                    {reviews.length} PERSISTED REVIEWS SYNCED IN FIRESTORE.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[#4B5563] font-mono">
              SELECT AN ANOMALY TO VIEW EXPLAINABLE SCORING.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
