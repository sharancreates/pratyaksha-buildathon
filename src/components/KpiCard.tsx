import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { KpiCardMetric } from '../shared/types';

export function KpiCard({ metric }: { metric: KpiCardMetric }) {
  const statusColor =
    metric.status === 'critical'
      ? '#EF4444'
      : metric.status === 'warning'
      ? '#F59E0B'
      : metric.status === 'elevated'
      ? '#22D3EE'
      : '#22C55E';

  const statusTextClass =
    metric.status === 'critical'
      ? 'text-red-400'
      : metric.status === 'warning'
      ? 'text-amber-400'
      : metric.status === 'elevated'
      ? 'text-cyan-400'
      : 'text-emerald-400';

  const statusLabel =
    metric.status === 'critical'
      ? 'Critical'
      : metric.status === 'warning'
      ? 'Elevated'
      : 'Nominal';

  const sparkData = metric.sparkline.map((v, i) => ({ i, v }));

  return (
    <div className="bg-[#111D2E] border border-slate-800/90 rounded-lg p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-400 leading-snug">
          {metric.label}
        </span>
        <span className={`text-[11px] font-mono font-semibold shrink-0 ${statusTextClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-2xl font-mono font-bold tracking-tight text-slate-100 tabular-nums">
            {metric.formattedValue}
          </span>
          <span className="text-xs font-mono text-slate-400 truncate">
            {metric.unit}
          </span>
        </div>

        <div className="w-20 h-9 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={statusColor}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-slate-800/80">
        <span
          className={`inline-flex items-center gap-1 ${
            metric.isPositiveTrend ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {metric.trend === 'up' ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : metric.trend === 'down' ? (
            <ArrowDownRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
          <span className="tabular-nums">{metric.deltaLabel}</span>
        </span>
        <span className="text-slate-500 tabular-nums">
          Prev {metric.previousValue}
        </span>
      </div>
    </div>
  );
}
