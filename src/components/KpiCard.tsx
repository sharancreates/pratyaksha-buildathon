import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { KpiCardMetric } from '../shared/types';

export function KpiCard({ metric }: { metric: KpiCardMetric }) {
  const isCritical = metric.status === 'critical';
  const isWarning = metric.status === 'warning' || metric.status === 'elevated';

  const statusLabel =
    metric.status === 'critical'
      ? 'CRITICAL'
      : metric.status === 'warning'
      ? 'ELEVATED'
      : 'NOMINAL';

  const sparkData = metric.sparkline.map((v, i) => ({ i, v }));

  return (
    <div
      tabIndex={0}
      className="tile tile-interactive group relative flex flex-col justify-between gap-3 p-5 rounded-3xl bg-white border border-black/[0.04] shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgb(0_0_0/0.08)]"
    >
      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--ink)] leading-tight transition-colors">
          {metric.label}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
            isCritical
              ? 'border-rose-200 bg-rose-50 text-[var(--critical)]'
              : isWarning
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 relative z-10 my-1">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-3xl font-bold tracking-tight text-[var(--ink)] tabular-nums">
            {metric.formattedValue}
          </span>
          <span className="text-xs font-medium text-[var(--text-muted)] truncate">
            {metric.unit}
          </span>
        </div>

        <div className="w-20 h-9 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isCritical ? '#FF3B30' : '#007AFF'}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-3 border-t border-black/[0.06] relative z-10">
        <span
          className={`inline-flex items-center gap-1 font-semibold ${
            isCritical
              ? 'text-[var(--critical)]'
              : isWarning
              ? 'text-amber-700'
              : 'text-[var(--ink)]'
          }`}
        >
          {metric.trend === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          ) : metric.trend === 'down' ? (
            <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="tabular-nums">{metric.deltaLabel}</span>
        </span>
        <span className="text-[var(--text-muted)] tabular-nums font-normal text-[10px]">
          Prev {metric.previousValue}
        </span>
      </div>
    </div>
  );
}
