import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  FileJson,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { fetchReports, generateActionPlanReport } from '../lib/api';
import {
  saveActionPlanToFirestore,
  subscribeOwnerActionPlans,
  updateActionPlanStatus,
  type StoredActionPlanDoc,
} from '../lib/firestoreStore';
import { exportActionPlanJson, exportActionPlanPdf } from '../lib/pdfExport';
import type { EnvironmentActionPlan } from '../shared/types';

export function ActionPlan() {
  const { municipality, user, pushToast } = useAppContext();

  const [reports, setReports] = useState<EnvironmentActionPlan[]>([]);
  const [activePlan, setActivePlan] = useState<EnvironmentActionPlan | null>(null);
  const [cloudPlans, setCloudPlans] = useState<StoredActionPlanDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      setReports(res.reports);
      const cityMatch = res.reports.find((r) => r.municipalityId === municipality);
      if (cityMatch) {
        setActivePlan(cityMatch);
      } else {
        const freshly = await generateActionPlanReport(municipality);
        setReports((prev) => [freshly, ...prev]);
        setActivePlan(freshly);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipality]);

  useEffect(() => {
    if (!user) {
      setCloudPlans([]);
      return;
    }
    const unsub = subscribeOwnerActionPlans(user.uid, setCloudPlans);
    return () => unsub();
  }, [user]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const plan = await generateActionPlanReport(municipality);
      setReports((prev) => [plan, ...prev]);
      setActivePlan(plan);

      if (user && user.emailVerified) {
        void saveActionPlanToFirestore(plan);
      }

      pushToast({
        title: `Generated ${plan.municipalityName} Environment Action Plan`,
        description: `Compiled ${plan.recommendations.length} prioritized municipal actions from live satellite & ML findings.`,
        variant: 'success',
      });
    } catch {
      pushToast({
        title: 'Report generation failed',
        description: 'Could not synthesize municipal action plan.',
        variant: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = () => {
    if (!activePlan) return;
    exportActionPlanPdf(activePlan);
    pushToast({
      title: 'Exported Action Plan PDF',
      description: `${activePlan.id} downloaded as formatted municipal policy brief.`,
      variant: 'success',
    });
  };

  const handleExportJson = () => {
    if (!activePlan) return;
    exportActionPlanJson(activePlan);
    pushToast({
      title: 'Exported Action Plan JSON',
      description: `${activePlan.id} saved with full telemetry schema.`,
      variant: 'info',
    });
  };

  const handleCloudStatusUpdate = async (
    planId: string,
    status: 'approved' | 'archived'
  ) => {
    try {
      await updateActionPlanStatus(planId, status);
      pushToast({
        title: `Plan status updated to ${status.toUpperCase()}`,
        description: 'Persisted in Firestore.',
        variant: 'success',
      });
    } catch {
      pushToast({
        title: 'Status update failed',
        description: 'Archived plans are locked against further edits.',
        variant: 'warning',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <section className="tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] relative overflow-hidden flex flex-col justify-between">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--canvas)] text-[var(--ink)] text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" aria-hidden="true" />
            <span>MUNICIPAL POLICY SYNTHESIS</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)]">SATELLITE + ML CONSENSUS + FORECAST</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--ink)] mb-3">
            Environment Action Plan
          </h1>

          <p className="text-[var(--text-muted)] text-sm sm:text-base max-w-xl font-normal leading-relaxed mb-6">
            Convert detected hotspots, multi-model consensus risk, and 30-day forecasts into
            exportable municipal intervention plans.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerate()}
              className="button-signal rounded-full px-5 py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              {generating ? 'SYNTHESIZING PLAN...' : 'GENERATE NEW REPORT'}
            </button>
            <button
              type="button"
              disabled={!activePlan}
              onClick={handleExportPdf}
              className="rounded-full px-4 py-2.5 text-xs font-semibold bg-[var(--canvas)] hover:bg-[#E5E5EA] text-[var(--ink)] transition-colors border border-black/[0.08] disabled:opacity-40"
            >
              <Download className="w-4 h-4 mr-2 inline" aria-hidden="true" />
              Export PDF
            </button>
            <button
              type="button"
              disabled={!activePlan}
              onClick={handleExportJson}
              className="rounded-full px-4 py-2.5 text-xs font-semibold bg-[var(--canvas)] hover:bg-[#E5E5EA] text-[var(--ink)] transition-colors border border-black/[0.08] disabled:opacity-40"
            >
              <FileJson className="w-4 h-4 mr-2 inline" aria-hidden="true" />
              Export JSON
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Report History + Cloud Persisted Plans */}
        <div className="xl:col-span-4 space-y-6">
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] mb-2">
              <span className="text-sm font-bold tracking-tight text-[var(--ink)]">
                REPORT HISTORY ({reports.length})
              </span>
              <span className="text-[10px] font-semibold text-[var(--blue)] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Session
              </span>
            </div>
            <div className="divide-y divide-black/[0.06] max-h-80 overflow-y-auto">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActivePlan(r)}
                  className={`w-full text-left py-3 px-3 rounded-2xl transition-colors ${
                    activePlan?.id === r.id
                      ? 'bg-[var(--canvas)] font-semibold'
                      : 'hover:bg-[var(--canvas)] text-[var(--ink)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-semibold text-[var(--blue)]">{r.id}</span>
                    <span className="tabular-nums font-semibold text-[var(--ink)]">
                      Health {r.environmentalHealthOverview.healthIndex}/100
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-[var(--ink)] truncate">
                    {r.title}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {new Date(r.generatedAt).toLocaleString()} · {r.recommendations.length} actions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Firestore Cloud Archive */}
          <div className="tile rounded-3xl bg-white p-6 shadow-sm border border-black/[0.04] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-[var(--ink)]">
                <Cloud className="w-4 h-4 text-[var(--blue)]" aria-hidden="true" />
                <span>FIRESTORE CLOUD ARCHIVE ({cloudPlans.length})</span>
              </div>
            </div>
            {!user ? (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Sign in with Google from the top header to persist generated Environment Action Plans
                and track municipal approval status in Firestore.
              </p>
            ) : cloudPlans.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Click "Generate New Report" while signed in to save your first plan to Firestore.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {cloudPlans.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-semibold text-[var(--ink)] truncate">{cp.id}</span>
                      <span
                        className={`uppercase font-bold px-2 py-0.5 rounded-full text-[10px] ${
                          cp.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cp.status === 'archived'
                            ? 'bg-gray-100 text-[var(--text-muted)]'
                            : 'bg-rose-50 text-[var(--critical)] border border-rose-200'
                        }`}
                      >
                        {cp.status}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[var(--ink)]">{cp.title}</div>
                    {cp.status !== 'archived' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-black/[0.06]">
                        {cp.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void handleCloudStatusUpdate(cp.id, 'approved')}
                            className="button-sm !py-1 !px-3 text-[10px] rounded-full"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCloudStatusUpdate(cp.id, 'archived')}
                          className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] bg-white rounded-full border border-black/[0.08]"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Policy Report Preview */}
        <div className="xl:col-span-8 tile rounded-3xl bg-white p-8 shadow-sm border border-black/[0.04] space-y-8">
          {loading || !activePlan ? (
            <div className="h-96 rounded-3xl bg-white/60 animate-pulse border border-black/[0.04]" />
          ) : (
            <>
              {/* Report Title Block */}
              <div className="border-b border-black/[0.06] pb-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--blue)]">
                    <FileText className="w-4 h-4" aria-hidden="true" />
                    {activePlan.id}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--blue)] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    Satellite Evidence Engine
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
                  {activePlan.title}
                </h2>
                <div className="text-xs text-[var(--text-muted)]">
                  {activePlan.corporation} · Generated {new Date(activePlan.generatedAt).toUTCString()}
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  01. EXECUTIVE SUMMARY
                </h3>
                <p className="text-sm text-[var(--ink)] leading-relaxed font-normal">
                  {activePlan.executiveSummary}
                </p>
              </div>

              {/* 2. Municipal Environmental Health Overview */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  02. MUNICIPAL ENVIRONMENTAL HEALTH OVERVIEW
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      HEALTH INDEX
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                      {activePlan.environmentalHealthOverview.healthIndex}/100
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      MEAN LST
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                      {activePlan.environmentalHealthOverview.avgLstCelsius} °C
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      NDVI · AQI
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--ink)] tabular-nums">
                      {activePlan.environmentalHealthOverview.avgNdvi} · {activePlan.environmentalHealthOverview.avgAqi}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] transition-all hover:scale-[1.02]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      ANOMALIES
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[var(--critical)] tabular-nums">
                      {activePlan.environmentalHealthOverview.activeAnomalyCount} ({activePlan.environmentalHealthOverview.criticalAnomalyCount} crit)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Major Threats & 4. Geographic Hotspots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                    03. MAJOR ENVIRONMENTAL THREATS
                  </h3>
                  {activePlan.majorThreats.map((t, i) => (
                    <div key={i} className="border-b border-black/[0.06] pb-3 last:border-b-0 last:pb-0">
                      <div className="text-xs font-bold text-[var(--ink)]">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-[var(--critical)] mr-2">
                          {t.severity}
                        </span>
                        {t.title}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1 leading-snug">{t.summary}</p>
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                    04. GEOGRAPHIC HOTSPOTS
                  </h3>
                  {activePlan.geographicHotspots.map((h, i) => (
                    <div key={i} className="border-b border-black/[0.06] pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--ink)]">{h.wardName}</span>
                        <span className="text-xs font-bold text-[var(--critical)] tabular-nums">
                          Risk {h.riskScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">
                        {h.coordinates[1].toFixed(4)}°N, {h.coordinates[0].toFixed(4)}°E · {h.metricDetail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Satellite Evidence & 6. ML Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-2 text-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                    05. SATELLITE EVIDENCE
                  </h3>
                  <div className="font-bold text-[var(--ink)]">{activePlan.satelliteEvidence.missionsUsed.join(' · ')}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Grid: {activePlan.satelliteEvidence.harmonizedGrid} · {activePlan.satelliteEvidence.observationCount} tiles
                  </div>
                  <p className="text-xs text-[var(--text-muted)] pt-1">{activePlan.satelliteEvidence.note}</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-2 text-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                    06. MACHINE LEARNING FINDINGS
                  </h3>
                  <div className="font-bold text-[var(--ink)]">{activePlan.mlFindings.topConsensusFinding}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {activePlan.mlFindings.anomaliesDetected} anomalies · {activePlan.mlFindings.spatialClustersFormed} DBSCAN clusters
                  </div>
                </div>
              </div>

              {/* 7. Environmental Forecasts */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  07. ENVIRONMENTAL FORECASTS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activePlan.environmentalForecasts.map((f, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-1.5 transition-all hover:scale-[1.02]">
                      <div className="text-xs font-bold text-[var(--ink)]">{f.indicator}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--critical)] tabular-nums">{f.projectedChange}</span>
                        <span className="text-xs text-[var(--text-muted)] font-medium uppercase">{f.horizon}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-snug">{f.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Recommended Government Actions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  08. PRIORITY INTERVENTION AREAS & RECOMMENDED ACTIONS
                </h3>
                <div className="space-y-4">
                  {activePlan.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-6 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-3 relative overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-[var(--critical)] border border-rose-200">
                          {rec.priority}
                        </span>
                        <span className="font-semibold text-[var(--ink)]">{rec.suggestedDepartment}</span>
                      </div>
                      <div className="text-sm font-bold text-[var(--ink)] relative z-10">
                        {rec.category} — {rec.geographicLocation}{' '}
                        <span className="font-normal text-xs text-[var(--text-muted)]">
                          ({rec.coordinates[1].toFixed(3)}°N, {rec.coordinates[0].toFixed(3)}°E)
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink)] leading-relaxed relative z-10 font-normal">
                        {rec.recommendedAction}
                      </p>
                      <div className="text-xs text-[var(--text-muted)] relative z-10">
                        <strong className="text-[var(--ink)] font-semibold">Evidence:</strong> {rec.supportingEvidence}
                      </div>
                      <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)] relative z-10">
                        <span>Timeline: {rec.suggestedTimeline}</span>
                        <span className="text-[var(--ink)] font-semibold">Metric: {rec.monitoringMetric}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9. Implementation Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  09. SUGGESTED IMPLEMENTATION TIMELINE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activePlan.implementationTimeline.map((phase, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[var(--canvas)] border border-black/[0.04] space-y-3">
                      <div className="text-xs font-mono font-bold text-[var(--blue)] uppercase">{phase.window}</div>
                      <div className="text-xs font-bold text-[var(--ink)]">{phase.phase}</div>
                      <ul className="space-y-2 text-xs text-[var(--text-muted)]">
                        {phase.milestones.map((m, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" aria-hidden="true" />
                            <span className="leading-snug">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10. Monitoring & Evaluation Indicators */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-black/[0.06] pb-1">
                  10. MONITORING & EVALUATION INDICATORS
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-black/[0.04]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--canvas)] text-[11px] font-semibold text-[var(--text-muted)] border-b border-black/[0.06]">
                      <tr>
                        <th className="px-4 py-3">INDICATOR</th>
                        <th className="px-4 py-3 text-right">BASELINE</th>
                        <th className="px-4 py-3 text-right">12-MO TARGET</th>
                        <th className="px-4 py-3">VERIFICATION SATELLITE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] text-xs">
                      {activePlan.monitoringIndicators.map((ind, idx) => (
                        <tr key={idx} className="hover:bg-[var(--canvas)] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[var(--ink)]">{ind.indicator}</td>
                          <td className="px-4 py-3 text-right text-[var(--text-muted)] tabular-nums">
                            {ind.baseline}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[var(--ink)] tabular-nums">
                            {ind.target12Month}
                          </td>
                          <td className="px-4 py-3 text-[var(--text-muted)]">
                            {ind.verificationSource}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
