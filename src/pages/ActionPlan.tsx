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
      title: 'Exported Environment Action Plan PDF',
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
      <section className="bg-[#111D2E] border border-slate-800/90 rounded-lg px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400">
            AUTOMATED POLICY SYNTHESIS · SATELLITE + ML CONSENSUS + FORECASTING EVIDENCE
          </div>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">
            Municipal Environment Action Plan Generator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Convert detected hotspots, multi-model consensus risk, and 30-day forecasts into exportable municipal intervention plans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 whitespace-nowrap"
          >
            {generating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generating ? 'Synthesizing Plan...' : 'Generate New Report'}
          </button>
          <button
            type="button"
            disabled={!activePlan}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-500/15 border border-emerald-400/45 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            disabled={!activePlan}
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#0D1524] border border-slate-700 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-40 whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" />
            Export JSON
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Column: Report History + Cloud Persisted Plans */}
        <div className="xl:col-span-4 space-y-5">
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-100">
                Generated Report History ({reports.length})
              </span>
              <span className="text-[11px] font-mono text-slate-500">SESSION</span>
            </div>
            <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActivePlan(r)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    activePlan?.id === r.id ? 'bg-cyan-500/12' : 'hover:bg-[#0D1524]/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-cyan-300">{r.id}</span>
                    <span className="text-slate-400 tabular-nums">
                      Health {r.environmentalHealthOverview.healthIndex}/100
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-100 truncate">
                    {r.title}
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono text-slate-500">
                    {new Date(r.generatedAt).toLocaleString()} · {r.recommendations.length} actions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Firestore Cloud Archive */}
          <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Firestore Cloud Archive ({cloudPlans.length})</span>
              </div>
            </div>
            {!user ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in with Google from the top header to persist generated Environment Action Plans
                and track municipal approval status in Firestore.
              </p>
            ) : cloudPlans.length === 0 ? (
              <p className="text-xs text-slate-400">
                Click "Generate New Report" while signed in to save your first plan to Firestore.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {cloudPlans.map((cp) => (
                  <div
                    key={cp.id}
                    className="bg-[#0D1524] border border-slate-800 rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-cyan-300 truncate">{cp.id}</span>
                      <span
                        className={`uppercase font-semibold ${
                          cp.status === 'approved'
                            ? 'text-emerald-400'
                            : cp.status === 'archived'
                            ? 'text-slate-500'
                            : 'text-amber-400'
                        }`}
                      >
                        {cp.status}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-100">{cp.title}</div>
                    {cp.status !== 'archived' && (
                      <div className="flex items-center gap-2 pt-1">
                        {cp.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void handleCloudStatusUpdate(cp.id, 'approved')}
                            className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/35 text-[11px] text-emerald-300 hover:bg-emerald-500/25"
                          >
                            Approve Plan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCloudStatusUpdate(cp.id, 'archived')}
                          className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-700"
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
        <div className="xl:col-span-8 bg-[#111D2E] border border-slate-800/90 rounded-lg p-6 space-y-6">
          {loading || !activePlan ? (
            <div className="h-96 animate-pulse bg-[#0D1524] rounded-lg" />
          ) : (
            <>
              {/* Report Title Block */}
              <div className="border-b border-slate-800 pb-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5 text-cyan-400">
                    <FileText className="w-3.5 h-3.5" />
                    {activePlan.id}
                  </span>
                  <span className="text-amber-400">
                    DEMO MODE · GENERATED FROM APPLICATION DATA
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-100">
                  {activePlan.title}
                </h2>
                <div className="text-xs font-mono text-slate-400">
                  {activePlan.corporation} · Generated {new Date(activePlan.generatedAt).toUTCString()}
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-cyan-300">01. Executive Summary</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {activePlan.executiveSummary}
                </p>
              </div>

              {/* 2. Municipal Environmental Health Overview */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cyan-300">
                  02. Municipal Environmental Health Overview
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0D1524] border border-slate-800 rounded p-3">
                    <div className="text-[11px] text-slate-400">Health Index</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {activePlan.environmentalHealthOverview.healthIndex}/100
                    </div>
                  </div>
                  <div className="bg-[#0D1524] border border-slate-800 rounded p-3">
                    <div className="text-[11px] text-slate-400">Mean LST</div>
                    <div className="mt-1 text-lg font-mono font-bold text-amber-400 tabular-nums">
                      {activePlan.environmentalHealthOverview.avgLstCelsius} °C
                    </div>
                  </div>
                  <div className="bg-[#0D1524] border border-slate-800 rounded p-3">
                    <div className="text-[11px] text-slate-400">Mean NDVI / AQI</div>
                    <div className="mt-1 text-lg font-mono font-bold text-slate-100 tabular-nums">
                      {activePlan.environmentalHealthOverview.avgNdvi} · {activePlan.environmentalHealthOverview.avgAqi}
                    </div>
                  </div>
                  <div className="bg-[#0D1524] border border-slate-800 rounded p-3">
                    <div className="text-[11px] text-slate-400">Active Anomalies</div>
                    <div className="mt-1 text-lg font-mono font-bold text-red-400 tabular-nums">
                      {activePlan.environmentalHealthOverview.activeAnomalyCount} ({activePlan.environmentalHealthOverview.criticalAnomalyCount} crit)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Major Threats & 4. Geographic Hotspots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0D1524] border border-slate-800 rounded-md p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold text-cyan-300">03. Major Environmental Threats</h3>
                  {activePlan.majorThreats.map((t, i) => (
                    <div key={i} className="text-xs border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0">
                      <div className="font-medium text-slate-100">
                        <span className="font-mono text-red-400 mr-1.5">[{t.severity.toUpperCase()}]</span>
                        {t.title}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t.summary}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0D1524] border border-slate-800 rounded-md p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold text-cyan-300">04. Geographic Hotspots</h3>
                  {activePlan.geographicHotspots.map((h, i) => (
                    <div key={i} className="text-xs border-b border-slate-800/80 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-100">{h.wardName}</span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          Risk {h.riskScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 tabular-nums">
                        {h.coordinates[1].toFixed(4)}°N, {h.coordinates[0].toFixed(4)}°E · {h.metricDetail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Satellite Evidence & 6. ML Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0D1524] border border-slate-800 rounded-md p-4 space-y-2 text-xs">
                  <h3 className="font-semibold text-cyan-300">05. Satellite Evidence</h3>
                  <div className="text-slate-300">{activePlan.satelliteEvidence.missionsUsed.join(' · ')}</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Grid: {activePlan.satelliteEvidence.harmonizedGrid} · {activePlan.satelliteEvidence.observationCount} tiles
                  </div>
                  <p className="text-[11px] text-amber-300/90">{activePlan.satelliteEvidence.note}</p>
                </div>

                <div className="bg-[#0D1524] border border-slate-800 rounded-md p-4 space-y-2 text-xs">
                  <h3 className="font-semibold text-cyan-300">06. Machine Learning Findings</h3>
                  <div className="text-slate-300">{activePlan.mlFindings.topConsensusFinding}</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    {activePlan.mlFindings.anomaliesDetected} anomalies · {activePlan.mlFindings.spatialClustersFormed} DBSCAN clusters
                  </div>
                </div>
              </div>

              {/* 7. Environmental Forecasts */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-cyan-300">07. Environmental Forecasts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activePlan.environmentalForecasts.map((f, i) => (
                    <div key={i} className="bg-[#0D1524] border border-slate-800 rounded p-3 space-y-1">
                      <div className="text-xs font-medium text-slate-100">{f.indicator}</div>
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-amber-400 font-bold tabular-nums">{f.projectedChange}</span>
                        <span className="text-slate-500">{f.horizon}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{f.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Recommended Government Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cyan-300">
                  08. Priority Intervention Areas & Recommended Government Actions
                </h3>
                <div className="space-y-3">
                  {activePlan.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-[#0D1524] border border-slate-800 rounded-md p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-red-400 font-semibold">{rec.priority}</span>
                        <span className="text-cyan-300">{rec.suggestedDepartment}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-100">
                        {rec.category} — {rec.geographicLocation}{' '}
                        <span className="font-mono text-slate-400 font-normal">
                          ({rec.coordinates[1].toFixed(3)}°N, {rec.coordinates[0].toFixed(3)}°E)
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {rec.recommendedAction}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Evidence:</strong> {rec.supportingEvidence}
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                        <span>Timeline: {rec.suggestedTimeline}</span>
                        <span className="text-emerald-400">Metric: {rec.monitoringMetric}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9. Implementation Timeline */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cyan-300">
                  09. Suggested Implementation Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activePlan.implementationTimeline.map((phase, i) => (
                    <div key={i} className="bg-[#0D1524] border border-slate-800 rounded p-3.5 space-y-2">
                      <div className="text-[11px] font-mono text-cyan-400">{phase.window}</div>
                      <div className="text-xs font-semibold text-slate-100">{phase.phase}</div>
                      <ul className="space-y-1.5 text-[11px] text-slate-400">
                        {phase.milestones.map((m, j) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* 10. Monitoring & Evaluation Indicators */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-cyan-300">
                  10. Monitoring & Evaluation Indicators
                </h3>
                <div className="overflow-x-auto border border-slate-800 rounded-md">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0D1524] text-[11px] font-mono text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2 font-medium">Indicator</th>
                        <th className="px-3 py-2 font-medium text-right">Baseline</th>
                        <th className="px-3 py-2 font-medium text-right">12-Mo Target</th>
                        <th className="px-3 py-2 font-medium">Verification Satellite</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-[11px]">
                      {activePlan.monitoringIndicators.map((ind, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2.5 text-slate-200 font-medium">{ind.indicator}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-400 tabular-nums">
                            {ind.baseline}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                            {ind.target12Month}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-400">
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
