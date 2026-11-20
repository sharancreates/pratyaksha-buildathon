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
    <div className="space-y-6">
      {/* Hero Header & Model Controls */}
      <section className="tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--canvas)] text-[var(--ink)] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" aria-hidden="true" />
            <span>EXPLAINABLE CONSENSUS ENGINE</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">MULTI-MODEL PIPELINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] mb-3">
            AI Anomaly Consensus
          </h1>

          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6">
            Explainable multi-model risk consensus across thermal, vegetation, atmospheric NO₂, and
            surface-water anomalies.
          </p>

          <button
            type="button"
            disabled={scanning}
            onClick={() => void handleRunScan()}
            className="button-signal rounded-full px-5 py-2.5 text-xs font-semibold disabled:opacity-50"
          >
            {scanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="w-4 h-4 mr-2" aria-hidden="true" />
            )}
            {scanning ? 'RUNNING ML ENSEMBLE...' : 'EXECUTE PIPELINE'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 mt-6 border-t border-black/[0.06]">
          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="ml-sens">
              SCORE CUTOFF: <span className="tabular-nums font-mono text-[var(--blue)]">{sensitivity.toFixed(2)}</span>
            </label>
            <input
              id="ml-sens"
              type="range"
              min={0.25}
              max={0.75}
              step={0.05}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full accent-[var(--blue)] mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="ml-eps">
              DBSCAN RADIUS: <span className="tabular-nums font-mono text-[var(--blue)]">{epsKm.toFixed(1)} KM</span>
            </label>
            <input
              id="ml-eps"
              type="range"
              min={5}
              max={22}
              step={0.5}
              value={epsKm}
              onChange={(e) => setEpsKm(Number(e.target.value))}
              className="w-full accent-[var(--blue)] mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="ml-sev">
              SEVERITY FILTER
            </label>
            <select
              id="ml-sev"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--ink)] mb-2" htmlFor="ml-search">
              SEARCH ANOMALIES
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-3" aria-hidden="true" />
              <input
                id="ml-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter ward / metric..."
                className="w-full h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl pl-9 pr-3 text-xs font-medium text-[var(--ink)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Anomaly List + Explainable Consensus Inspector */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Table + DBSCAN Clusters */}
        <div className="xl:col-span-7 space-y-6">
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
              <span className="text-sm font-bold tracking-tight text-[var(--ink)]">
                DETECTED ANOMALIES ({filteredAnomalies.length})
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
                Mean Risk: {avgRisk}/100
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-xs font-medium text-[var(--text-muted)]">Running anomaly scan...</div>
            ) : filteredAnomalies.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No anomalies match current filter. Lower Isolation Forest cutoff and re-run.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                    <tr>
                      <th className="py-2.5 px-3">ID / WARD</th>
                      <th className="py-2.5 px-3">INDICATOR</th>
                      <th className="py-2.5 px-3 text-right">IF SCORE</th>
                      <th className="py-2.5 px-3 text-right">AE MSE</th>
                      <th className="py-2.5 px-3 text-right">CONSENSUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] text-[12px]">
                    {filteredAnomalies.map((a) => {
                      const active = activeAnomaly?.id === a.id;
                      return (
                        <tr
                          key={a.id}
                          onClick={() => setSelectedAnomalyId(a.id)}
                          className={`cursor-pointer transition-colors ${
                            active
                              ? 'bg-[var(--canvas)] font-semibold'
                              : 'hover:bg-[var(--canvas)]'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-xs text-[var(--blue)] font-semibold">{a.id}</div>
                            <div className="font-bold text-[var(--ink)]">{a.wardName}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[var(--ink)]">{a.indicator}</div>
                            <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {a.observedValue} {a.unit} (base {a.baselineValue})
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-muted)]">
                            {a.isolationForestScore.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-muted)]">
                            {a.autoencoderError.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            <span
                              className={`text-xs font-bold ${
                                a.severity === 'critical'
                                  ? 'text-[var(--critical)]'
                                  : 'text-[var(--ink)]'
                              }`}
                            >
                              {a.consensusRiskScore}/100
                            </span>
                            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">
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
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-4">
            <h2 className="text-sm font-bold tracking-tight text-[var(--ink)] border-b border-black/[0.06] pb-2">
              DBSCAN GEOGRAPHIC RISK CLUSTERS ({clusters.length})
            </h2>
            {clusters.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No multi-ward clusters formed at eps = {epsKm.toFixed(1)} km. Increase radius to aggregate adjacent hotspots.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clusters.map((c) => (
                  <div
                    key={c.clusterId}
                    className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02] group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--ink)]">{c.label}</span>
                      <span className="font-mono font-bold text-[var(--critical)] tabular-nums">
                        Avg {c.avgRiskScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      Centroid {c.centroid[1].toFixed(4)}°N, {c.centroid[0].toFixed(4)}°E · R {c.radiusKm} km
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      Members: {c.memberAnomalyIds.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Explainable Risk Inspector */}
        <div className="xl:col-span-5 tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-6">
          {activeAnomaly ? (
            <>
              <div className="border-b border-black/[0.06] pb-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-[var(--blue)]">{activeAnomaly.id}</span>
                  <span
                    className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full border ${
                      activeAnomaly.severity === 'critical'
                        ? 'border-rose-200 bg-rose-50 text-[var(--critical)]'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {activeAnomaly.severity} · Risk {activeAnomaly.consensusRiskScore}/100
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                  {activeAnomaly.wardName}
                </h2>
                <div className="text-xs text-[var(--text-muted)] tabular-nums">
                  {activeAnomaly.coordinates[1].toFixed(4)}°N, {activeAnomaly.coordinates[0].toFixed(4)}°E ·
                  Detected {activeAnomaly.detectedAt.replace('T', ' ').slice(0, 16)} UTC
                </div>
              </div>

              {/* Raw Uncalibrated Scores Bento Cards */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    ISOLATION FOREST
                  </div>
                  <div className="mt-1 text-lg font-mono font-bold text-[var(--ink)] tabular-nums">
                    {activeAnomaly.isolationForestScore.toFixed(3)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    AUTOENCODER MSE
                  </div>
                  <div className="mt-1 text-lg font-mono font-bold text-[var(--ink)] tabular-nums">
                    {activeAnomaly.autoencoderError.toFixed(3)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--canvas)] border border-black/[0.04]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    DBSCAN CLUSTER
                  </div>
                  <div className="mt-1 text-lg font-mono font-bold text-[var(--ink)] tabular-nums">
                    {activeAnomaly.dbscanClusterId ? `C-${activeAnomaly.dbscanClusterId}` : 'ISOLATED'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)] p-3.5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] leading-relaxed">
                {activeAnomaly.scoreDisclaimer}
              </div>

              {/* Explainable Model Contribution Chart */}
              <div>
                <h3 className="text-xs font-bold tracking-tight text-[var(--ink)] mb-3 border-b border-black/[0.06] pb-1">
                  EXPLAINABLE MODEL RISK ATTRIBUTION (POINTS)
                </h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionData} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
                      <XAxis type="number" stroke="#8E8E93" fontSize={10} domain={[0, 45]} />
                      <YAxis type="category" dataKey="model" stroke="#1D1D1F" fontSize={11} width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderColor: 'rgba(0, 0, 0, 0.08)',
                          borderRadius: '1rem',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="pts" name="Contribution (pts)" fill="#007AFF" radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Suggested Intervention */}
              <div className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
                  <ShieldAlert className="w-4 h-4 text-[var(--blue)]" aria-hidden="true" />
                  <span>SUGGESTED MUNICIPAL INTERVENTION</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {activeAnomaly.suggestedIntervention}
                </p>
                <div className="text-[11px] font-semibold text-[var(--ink)] pt-1">
                  Lead Department: {activeAnomaly.department}
                </div>
              </div>

              {/* Officer Triage Form */}
              <div className="pt-4 border-t border-black/[0.06] space-y-3">
                <div className="text-xs font-bold tracking-tight text-[var(--ink)]">
                  LOG OFFICER TRIAGE REVIEW
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="h-10 bg-[var(--canvas)] border border-black/[0.08] rounded-xl px-3 text-xs font-semibold text-[var(--ink)] cursor-pointer"
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
                    className="button-sm rounded-full disabled:opacity-50 text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    {savingReview ? 'SAVING...' : 'SAVE REVIEW'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Field inspection note or dispatch instruction..."
                  className="w-full bg-[var(--canvas)] border border-black/[0.08] rounded-xl p-3 text-xs font-medium text-[var(--ink)] placeholder:text-[var(--text-muted)]"
                />
                {reviews.length > 0 && (
                  <div className="text-xs text-[var(--text-muted)]">
                    {reviews.length} persisted reviews synced in Firestore.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--text-muted)] font-mono">
              SELECT AN ANOMALY TO VIEW EXPLAINABLE SCORING.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
