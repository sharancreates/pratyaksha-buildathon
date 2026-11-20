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
    <div className="space-y-8">
      {/* Header Toolbar */}
      <section className="hero-compact border-2 border-black bg-white relative overflow-hidden flex flex-col justify-between">
        <span
          aria-hidden="true"
          className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none"
        >
          07
        </span>

        <div className="relative z-10">
          <div className="text-[11px] font-mono font-bold tracking-wider text-[#4B5563] uppercase mb-3">
            POLICY SYNTHESIS · SATELLITE + ML CONSENSUS + FORECAST EVIDENCE
          </div>

          <h1 className="display mb-4 text-black">
            <span className="outline">ACTION</span>
            <br />
            PLAN
          </h1>

          <p className="lead mb-6 text-[#4B5563]">
            Convert detected hotspots, multi-model consensus risk, and 30-day forecasts into
            exportable municipal intervention plans.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerate()}
              className="button-sm bg-black text-white hover:bg-white hover:text-black disabled:opacity-50"
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
              className="button-sm disabled:opacity-40"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              EXPORT PDF
            </button>
            <button
              type="button"
              disabled={!activePlan}
              onClick={handleExportJson}
              className="button-sm disabled:opacity-40"
            >
              <FileJson className="w-4 h-4 mr-2" aria-hidden="true" />
              EXPORT JSON
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Report History + Cloud Persisted Plans */}
        <div className="xl:col-span-4 space-y-6">
          <div className="border-2 border-black bg-white overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-black flex items-center justify-between bg-black text-white">
              <span className="text-xs font-black uppercase tracking-widest text-white">
                REPORT HISTORY ({reports.length})
              </span>
              <span className="text-[10px] font-mono font-bold text-white uppercase border border-white px-1.5 py-0.5">
                SESSION
              </span>
            </div>
            <div className="divide-y-2 divide-black max-h-80 overflow-y-auto">
              {reports.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActivePlan(r)}
                  className={`w-full text-left px-6 py-4 transition-none group ${
                    activePlan?.id === r.id
                      ? 'bg-black text-white'
                      : 'hover:bg-[#E5E7EB] text-black'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold">{r.id}</span>
                    <span className="tabular-nums font-bold">
                      HEALTH {r.environmentalHealthOverview.healthIndex}/100
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-black uppercase tracking-tight truncate">
                    {r.title}
                  </div>
                  <div className="mt-1 text-[10px] font-mono opacity-70">
                    {new Date(r.generatedAt).toLocaleString()} · {r.recommendations.length} ACTIONS
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Firestore Cloud Archive */}
          <div className="border-2 border-black bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-black">
                <Cloud className="w-4 h-4 text-black" aria-hidden="true" />
                <span>FIRESTORE CLOUD ARCHIVE ({cloudPlans.length})</span>
              </div>
            </div>
            {!user ? (
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Sign in with Google from the top header to persist generated Environment Action Plans
                and track municipal approval status in Firestore.
              </p>
            ) : cloudPlans.length === 0 ? (
              <p className="text-xs text-[#4B5563]">
                Click "Generate New Report" while signed in to save your first plan to Firestore.
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {cloudPlans.map((cp) => (
                  <div
                    key={cp.id}
                    className="border-2 border-black p-4 space-y-2 bg-white"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-black truncate">{cp.id}</span>
                      <span
                        className={`uppercase font-black px-1.5 py-0.5 border text-[10px] ${
                          cp.status === 'approved'
                            ? 'border-black bg-black text-white'
                            : cp.status === 'archived'
                            ? 'border-black text-[#4B5563]'
                            : 'border-[#FF0000] text-[#FF0000]'
                        }`}
                      >
                        {cp.status}
                      </span>
                    </div>
                    <div className="text-xs font-black uppercase tracking-tight">{cp.title}</div>
                    {cp.status !== 'archived' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-black/20">
                        {cp.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void handleCloudStatusUpdate(cp.id, 'approved')}
                            className="button-sm !py-1 !px-2.5 text-[10px]"
                          >
                            APPROVE
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleCloudStatusUpdate(cp.id, 'archived')}
                          className="button-sm !py-1 !px-2.5 text-[10px] border-black text-[#4B5563]"
                        >
                          ARCHIVE
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
        <div className="xl:col-span-8 border-2 border-black bg-white p-8 space-y-8">
          {loading || !activePlan ? (
            <div className="h-96 border-2 border-black bg-[#E5E7EB] animate-pulse" />
          ) : (
            <>
              {/* Report Title Block */}
              <div className="border-b-2 border-black pb-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono font-bold text-black">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-black" aria-hidden="true" />
                    {activePlan.id}
                  </span>
                  <span className="text-[#FF0000]">
                    DEMO MODE · SATELLITE EVIDENCE ENGINE
                  </span>
                </div>
                <h2 className="display-sub mb-1 text-black">
                  {activePlan.title}
                </h2>
                <div className="text-xs font-mono font-bold text-[#4B5563] uppercase">
                  {activePlan.corporation} · GENERATED {new Date(activePlan.generatedAt).toUTCString()}
                </div>
              </div>

              {/* 1. Executive Summary */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  01. EXECUTIVE SUMMARY
                </h3>
                <p className="lead !max-w-none text-black leading-relaxed">
                  {activePlan.executiveSummary}
                </p>
              </div>

              {/* 2. Municipal Environmental Health Overview */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  02. MUNICIPAL ENVIRONMENTAL HEALTH OVERVIEW
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-none group">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                      HEALTH INDEX
                    </div>
                    <div className="mt-1 text-2xl font-black tabular-nums">
                      {activePlan.environmentalHealthOverview.healthIndex}/100
                    </div>
                  </div>
                  <div className="border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-none group">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                      MEAN LST
                    </div>
                    <div className="mt-1 text-2xl font-black tabular-nums">
                      {activePlan.environmentalHealthOverview.avgLstCelsius} °C
                    </div>
                  </div>
                  <div className="border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-none group">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                      NDVI · AQI
                    </div>
                    <div className="mt-1 text-2xl font-black tabular-nums">
                      {activePlan.environmentalHealthOverview.avgNdvi} · {activePlan.environmentalHealthOverview.avgAqi}
                    </div>
                  </div>
                  <div className="border-2 border-black p-4 bg-white hover:bg-black hover:text-white transition-none group">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] group-hover:text-[#D1D5DB]">
                      ANOMALIES
                    </div>
                    <div className="mt-1 text-2xl font-black text-[#FF0000] tabular-nums">
                      {activePlan.environmentalHealthOverview.activeAnomalyCount} ({activePlan.environmentalHealthOverview.criticalAnomalyCount} CRIT)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Major Threats & 4. Geographic Hotspots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-black p-5 space-y-3 bg-white">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                    03. MAJOR ENVIRONMENTAL THREATS
                  </h3>
                  {activePlan.majorThreats.map((t, i) => (
                    <div key={i} className="border-b-2 border-black/20 pb-3 last:border-b-0 last:pb-0">
                      <div className="text-xs font-black uppercase">
                        <span className="font-mono text-[#FF0000] mr-2">[{t.severity.toUpperCase()}]</span>
                        {t.title}
                      </div>
                      <p className="text-[11px] text-[#4B5563] mt-1 leading-snug">{t.summary}</p>
                    </div>
                  ))}
                </div>

                <div className="border-2 border-black p-5 space-y-3 bg-white">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                    04. GEOGRAPHIC HOTSPOTS
                  </h3>
                  {activePlan.geographicHotspots.map((h, i) => (
                    <div key={i} className="border-b-2 border-black/20 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black uppercase">{h.wardName}</span>
                        <span className="font-mono text-[#FF0000] font-black tabular-nums">
                          RISK {h.riskScore}/100
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#4B5563] mt-1 tabular-nums">
                        {h.coordinates[1].toFixed(4)}°N, {h.coordinates[0].toFixed(4)}°E · {h.metricDetail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Satellite Evidence & 6. ML Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-black p-5 space-y-2 text-xs bg-white">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                    05. SATELLITE EVIDENCE
                  </h3>
                  <div className="font-bold text-black uppercase">{activePlan.satelliteEvidence.missionsUsed.join(' · ')}</div>
                  <div className="font-mono text-[11px] text-[#4B5563]">
                    GRID: {activePlan.satelliteEvidence.harmonizedGrid} · {activePlan.satelliteEvidence.observationCount} TILES
                  </div>
                  <p className="text-[11px] text-[#4B5563] pt-1">{activePlan.satelliteEvidence.note}</p>
                </div>

                <div className="border-2 border-black p-5 space-y-2 text-xs bg-white">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                    06. MACHINE LEARNING FINDINGS
                  </h3>
                  <div className="font-bold text-black">{activePlan.mlFindings.topConsensusFinding}</div>
                  <div className="font-mono text-[11px] text-[#4B5563]">
                    {activePlan.mlFindings.anomaliesDetected} ANOMALIES · {activePlan.mlFindings.spatialClustersFormed} DBSCAN CLUSTERS
                  </div>
                </div>
              </div>

              {/* 7. Environmental Forecasts */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  07. ENVIRONMENTAL FORECASTS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activePlan.environmentalForecasts.map((f, i) => (
                    <div key={i} className="border-2 border-black p-4 space-y-1.5 bg-white hover:bg-black hover:text-white transition-none group">
                      <div className="text-xs font-black uppercase">{f.indicator}</div>
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="font-black text-[#FF0000] tabular-nums">{f.projectedChange}</span>
                        <span className="text-[#4B5563] group-hover:text-[#D1D5DB] font-bold uppercase">{f.horizon}</span>
                      </div>
                      <p className="text-[11px] text-[#4B5563] group-hover:text-[#D1D5DB] leading-snug">{f.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Recommended Government Actions */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  08. PRIORITY INTERVENTION AREAS & RECOMMENDED ACTIONS
                </h3>
                <div className="space-y-4">
                  {activePlan.recommendations.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="border-2 border-black p-6 space-y-3 bg-white relative overflow-hidden"
                    >
                      <span
                        aria-hidden="true"
                        className="index absolute right-4 top-2 text-[#E5E7EB] pointer-events-none select-none opacity-40"
                      >
                        0{idx + 1}
                      </span>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono relative z-10">
                        <span className="font-black uppercase px-2 py-0.5 border border-[#FF0000] text-[#FF0000]">
                          {rec.priority}
                        </span>
                        <span className="font-bold text-black uppercase">{rec.suggestedDepartment}</span>
                      </div>
                      <div className="text-sm font-black uppercase tracking-tight relative z-10">
                        {rec.category} — {rec.geographicLocation}{' '}
                        <span className="font-mono text-xs font-normal text-[#4B5563]">
                          ({rec.coordinates[1].toFixed(3)}°N, {rec.coordinates[0].toFixed(3)}°E)
                        </span>
                      </div>
                      <p className="text-xs text-black leading-relaxed relative z-10">
                        {rec.recommendedAction}
                      </p>
                      <div className="text-[11px] text-[#4B5563] relative z-10">
                        <strong className="text-black uppercase">Evidence:</strong> {rec.supportingEvidence}
                      </div>
                      <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#4B5563] relative z-10 font-bold">
                        <span>TIMELINE: {rec.suggestedTimeline}</span>
                        <span className="text-black">METRIC: {rec.monitoringMetric}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9. Implementation Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  09. SUGGESTED IMPLEMENTATION TIMELINE
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activePlan.implementationTimeline.map((phase, i) => (
                    <div key={i} className="border-2 border-black p-5 space-y-3 bg-white">
                      <div className="text-[11px] font-mono font-black uppercase text-black">{phase.window}</div>
                      <div className="text-xs font-black uppercase tracking-tight">{phase.phase}</div>
                      <ul className="space-y-2 text-[11px] text-[#4B5563]">
                        {phase.milestones.map((m, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" aria-hidden="true" />
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
                <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black pb-1">
                  10. MONITORING & EVALUATION INDICATORS
                </h3>
                <div className="overflow-x-auto border-2 border-black">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#E5E7EB] text-[10px] font-mono font-black uppercase text-black border-b-2 border-black">
                      <tr>
                        <th className="px-4 py-3">INDICATOR</th>
                        <th className="px-4 py-3 text-right">BASELINE</th>
                        <th className="px-4 py-3 text-right">12-MO TARGET</th>
                        <th className="px-4 py-3">VERIFICATION SATELLITE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black text-[11px] font-mono">
                      {activePlan.monitoringIndicators.map((ind, idx) => (
                        <tr key={idx} className="hover:bg-black hover:text-white transition-none group">
                          <td className="px-4 py-3 font-sans font-black uppercase">{ind.indicator}</td>
                          <td className="px-4 py-3 text-right text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums">
                            {ind.baseline}
                          </td>
                          <td className="px-4 py-3 text-right font-black tabular-nums">
                            {ind.target12Month}
                          </td>
                          <td className="px-4 py-3 text-[#4B5563] group-hover:text-[#D1D5DB]">
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
