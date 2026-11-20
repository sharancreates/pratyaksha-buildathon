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
      className="card group relative flex flex-col justify-between gap-4 p-5 bg-white border-t-2 border-black cursor-pointer select-none"
    >
      {/* Decorative quiet index number */}
      <span
        aria-hidden="true"
        className="index-md absolute right-2 bottom-1 text-[#E5E7EB] group-hover:text-[#374151] pointer-events-none select-none"
      >
        {metric.id.slice(-2).toUpperCase()}
      </span>

      <div className="flex items-start justify-between gap-2 relative z-10">
        <span className="text-[11px] font-black uppercase tracking-wider text-black group-hover:text-white leading-tight">
          {metric.label}
        </span>
        <span
          className={`text-[10px] font-mono font-black uppercase px-1.5 py-0.5 border ${
            isCritical
              ? 'border-[#FF0000] text-[#FF0000] bg-white group-hover:bg-[#FF0000] group-hover:text-white'
              : isWarning
              ? 'border-black text-black bg-white group-hover:bg-white group-hover:text-black'
              : 'border-black text-black bg-white group-hover:bg-white group-hover:text-black'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 relative z-10">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-3xl font-black tracking-tight text-black group-hover:text-white tabular-nums">
            {metric.formattedValue}
          </span>
          <span className="text-xs font-mono font-bold text-[#4B5563] group-hover:text-[#D1D5DB] truncate">
            {metric.unit}
          </span>
        </div>

        <div className="w-20 h-9 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isCritical ? '#FF0000' : '#000000'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono pt-3 border-t border-black/20 group-hover:border-white/20 relative z-10">
        <span
          className={`inline-flex items-center gap-1 font-bold ${
            isCritical
              ? 'text-[#FF0000] group-hover:text-[#FF0000]'
              : 'text-black group-hover:text-white'
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
        <span className="text-[#4B5563] group-hover:text-[#D1D5DB] tabular-nums font-medium">
          PREV {metric.previousValue}
        </span>
      </div>
    </div>
  );
}
