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
        title: 'Triage recorded locally (Sign in for cloud sync)',
        description: `Marked ${activeAnomaly.id} as ${reviewStatus.toUpperCase()}. Sign in with Google to persist to Firestore.`,
        variant: 'info',
      });
      return;
    }
    setSavingReview(true);
    try {
      await saveAnomalyReviewToFirestore({
        municipalityId: municipality,
        anomalyId: activeAnomaly.id,
        indicator: activeAnomaly.indicator,
        severity: activeAnomaly.severity,
        status: reviewStatus,
        assignedDepartment: activeAnomaly.department,
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
        description: 'Verify your verified Google officer session and try again.',
        variant: 'error',
      });
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Model Controls */}
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400">
              ISOLATION FOREST · DBSCAN SPATIAL · AUTOENCODER MSE · MULTI-MODEL CONSENSUS
            </div>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">
              AI Environmental Anomaly Detection
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Explainable multi-model risk consensus across thermal, vegetation, atmospheric NO₂, and surface-water anomalies.
            </p>
          </div>
          <button
            type="button"
            disabled={scanning}
            onClick={() => void handleRunScan()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
          >
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {scanning ? 'Running ML Ensemble...' : 'Execute Detection Pipeline'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1" htmlFor="ml-sens">
              Isolation Forest Score Cutoff: <span className="text-cyan-300 tabular-nums">{sensitivity.toFixed(2)}</span>
            </label>
            <input
              id="ml-sens"
              type="range"
              min={0.25}
              max={0.75}
              step={0.05}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1" htmlFor="ml-eps">
              DBSCAN Spatial Radius (eps): <span className="text-cyan-300 tabular-nums">{epsKm.toFixed(1)} km</span>
            </label>
            <input
              id="ml-eps"
              type="range"
              min={5}
              max={22}
              step={0.5}
              value={epsKm}
              onChange={(e) => setEpsKm(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1" htmlFor="ml-sev">
              Severity Filter
            </label>
            <select
              id="ml-sev"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1" htmlFor="ml-search">
              Search Ward / Indicator
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                id="ml-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter anomalies..."
                className="w-full h-9 bg-[#0D1524] border border-slate-700 rounded-md pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Anomaly List + Explainable Consensus Inspector */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Table + DBSCAN Clusters */}
        <div className="xl:col-span-7 space-y-5">
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">
                Detected Anomalies ({filteredAnomalies.length})
              </span>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                Mean Consensus Risk: {avgRisk}/100
              </span>
            </div>

            {loading ? (
              <div className="p-6 text-xs font-mono text-slate-400">Running anomaly scan...</div>
            ) : filteredAnomalies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No anomalies match your current threshold or filter. Lower the Isolation Forest cutoff and re-run detection.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">ID / Ward</th>
                      <th className="px-4 py-2.5 font-medium">Indicator</th>
                      <th className="px-4 py-2.5 font-medium text-right">IF Score</th>
                      <th className="px-4 py-2.5 font-medium text-right">AE MSE</th>
                      <th className="px-4 py-2.5 font-medium text-right">Consensus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredAnomalies.map((a) => {
                      const active = activeAnomaly?.id === a.id;
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAnomalyId(a.id)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-cyan-500/12' : 'hover:bg-[#0D1524]/70'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono text-[11px] text-cyan-300">{a.id}</div>
                            <div className="font-medium text-slate-100">{a.wardName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-200">{a.indicator}</div>
                            <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                              {a.observedValue} {a.unit} (base {a.baselineValue})
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                            {a.isolationForestScore.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                            {a.autoencoderError.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            <span
                              className={`font-bold ${
                                a.severity === 'critical'
                                  ? 'text-red-400'
                                  : a.severity === 'high'
                                  ? 'text-amber-400'
                                  : 'text-cyan-300'
                              }`}
                            >
                              {a.consensusRiskScore}/100
                            </span>
                            <div className="text-[10px] uppercase text-slate-500">{a.severity}</div>
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
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              DBSCAN Geographic Risk Clusters ({clusters.length})
            </h2>
            {clusters.length === 0 ? (
              <p className="text-xs text-slate-400">
                No multi-ward clusters formed at eps = {epsKm.toFixed(1)} km. Increase spatial radius to aggregate adjacent hotspots.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clusters.map((c) => (
                  <div key={c.clusterId} className="bg-[#0D1524] border border-slate-800 rounded-md p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-100">{c.label}</span>
                      <span className="font-mono text-amber-400 font-bold tabular-nums">
                        Avg {c.avgRiskScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                      Centroid {c.centroid[1].toFixed(4)}°N, {c.centroid[0].toFixed(4)}°E · Radius {c.radiusKm} km
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Members: {c.memberAnomalyIds.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Explainable Risk Inspector */}
        <div className="xl:col-span-5 bg-[#111D2E] border border-slate-800/90 rounded-lg p-5 space-y-5">
          {activeAnomaly ? (
            <>
              <div className="border-b border-slate-800 pb-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300">{activeAnomaly.id}</span>
                  <span
                    className={`font-semibold uppercase ${
                      activeAnomaly.severity === 'critical'
                        ? 'text-red-400'
                        : activeAnomaly.severity === 'high'
                        ? 'text-amber-400'
                        : 'text-cyan-300'
                    }`}
                  >
                    {activeAnomaly.severity} · Consensus {activeAnomaly.consensusRiskScore}/100
                  </span>
                </div>
                <h2 className="text-base font-semibold text-slate-100">
                  {activeAnomaly.wardName}
                </h2>
                <div className="text-xs font-mono text-slate-400 tabular-nums">
                  {activeAnomaly.coordinates[1].toFixed(4)}°N, {activeAnomaly.coordinates[0].toFixed(4)}°E ·
                  Detected {activeAnomaly.detectedAt.replace('T', ' ').slice(0, 16)} UTC
                </div>
              </div>

              {/* Raw Uncalibrated Scores */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#0D1524] border border-slate-800 rounded p-2.5">
                  <div className="text-[10px] text-slate-400">Isolation Forest</div>
                  <div className="mt-1 text-base font-mono font-bold text-slate-100 tabular-nums">
                    {activeAnomaly.isolationForestScore.toFixed(3)}
                  </div>
                </div>
                <div className="bg-[#0D1524] border border-slate-800 rounded p-2.5">
                  <div className="text-[10px] text-slate-400">Autoencoder MSE</div>
                  <div className="mt-1 text-base font-mono font-bold text-slate-100 tabular-nums">
                    {activeAnomaly.autoencoderError.toFixed(3)}
                  </div>
                </div>
                <div className="bg-[#0D1524] border border-slate-800 rounded p-2.5">
                  <div className="text-[10px] text-slate-400">DBSCAN Cluster</div>
                  <div className="mt-1 text-base font-mono font-bold text-cyan-300 tabular-nums">
                    {activeAnomaly.dbscanClusterId ? `C-${activeAnomaly.dbscanClusterId}` : 'Isolated'}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-3 py-2">
                {activeAnomaly.scoreDisclaimer}
              </div>

              {/* Explainable Model Contribution Chart */}
              <div>
                <h3 className="text-xs font-semibold text-slate-200 mb-2">
                  Explainable Multi-Model Risk Attribution (Points)
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionData} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
                      <XAxis type="number" stroke="#94A3B8" fontSize={11} domain={[0, 45]} />
                      <YAxis type="category" dataKey="model" stroke="#CBD5E1" fontSize={11} width={118} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0D1524',
                          borderColor: '#334155',
                          fontSize: '12px',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar dataKey="pts" name="Contribution (pts)" fill="#22D3EE" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Suggested Intervention */}
              <div className="bg-[#0D1524] border border-slate-800 rounded-md p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Suggested Municipal Intervention</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeAnomaly.suggestedIntervention}
                </p>
                <div className="text-[11px] font-mono text-slate-400 pt-1">
                  Lead Department: {activeAnomaly.department}
                </div>
              </div>

              {/* Officer Triage Form */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">
                  Log Officer Triage Review
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="h-9 bg-[#0D1524] border border-slate-700 rounded-md px-2.5 text-xs text-slate-100"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    type="button"
                    disabled={savingReview}
                    onClick={() => void handleSaveReview()}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-xs font-medium text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingReview ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Field inspection note or municipal dispatch instruction..."
                  className="w-full bg-[#0D1524] border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500"
                />
                {reviews.length > 0 && (
                  <div className="text-[11px] font-mono text-emerald-400">
                    {reviews.length} persisted officer review(s) synced in Firestore.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-400">Select an anomaly to view explainable scoring.</div>
          )}
        </div>
      </section>
    </div>
  );
}
