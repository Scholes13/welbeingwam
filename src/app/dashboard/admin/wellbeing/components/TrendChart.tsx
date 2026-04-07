import type { WellbeingOverviewPayload } from '../types'
import { buildSnapshotMetrics, formatAppliedRange, formatDateLabel } from '../utils'

type TrendChartProps = {
  payload: WellbeingOverviewPayload
}

const TONE_CLASS = {
  orange: 'from-[#FC4C02] to-orange-300',
  emerald: 'from-emerald-500 to-emerald-300',
  sky: 'from-sky-500 to-sky-300',
  amber: 'from-amber-500 to-amber-300',
} as const

export function TrendChart({ payload }: TrendChartProps) {
  const metrics = buildSnapshotMetrics(payload)
  const hasPriorWindow = Boolean(payload.meta.priorPeriodStart && payload.meta.priorPeriodEnd)

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">Momentum Snapshot</p>
      <h3 className="mt-2 text-xl font-bold text-white">Current Window vs Monitoring Context</h3>
      <p className="mt-2 text-sm text-gray-400">{formatAppliedRange(payload.meta)}</p>

      <div className="mt-5 space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{metric.label}</span>
              <span className="text-gray-400">{metric.value}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${TONE_CLASS[metric.tone]}`}
                style={{ width: `${Math.max(metric.value, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
        {hasPriorWindow
          ? `Prior comparison window: ${formatDateLabel(payload.meta.priorPeriodStart)} - ${formatDateLabel(payload.meta.priorPeriodEnd)}`
          : 'Prior comparison window is not available for this slice yet.'}
      </div>
    </section>
  )
}
