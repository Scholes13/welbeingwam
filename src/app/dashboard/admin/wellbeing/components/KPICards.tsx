import type { WellbeingOverviewPayload } from '../types'
import { formatAppliedRange } from '../utils'

type KPICardsProps = {
  payload: WellbeingOverviewPayload
}

const KPI_ITEMS = [
  {
    key: 'activeUsersPercent',
    label: 'Active Users',
    tone: 'text-[#FC4C02]',
    suffix: '%',
  },
  {
    key: 'averageWellbeingIndex',
    label: 'Average Wellbeing Index',
    tone: 'text-emerald-300',
    suffix: '',
  },
  {
    key: 'quizCoveragePercent',
    label: 'Quiz Coverage',
    tone: 'text-sky-300',
    suffix: '%',
  },
  {
    key: 'attendanceRatePercent',
    label: 'Attendance Rate',
    tone: 'text-amber-300',
    suffix: '%',
  },
] as const

export function KPICards({ payload }: KPICardsProps) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KPI_ITEMS.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white/10 bg-[#111111] p-5"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500">{item.label}</div>
            <div className={`mt-3 text-3xl font-bold ${item.tone}`}>
              {payload.kpis[item.key]}
              {item.suffix}
            </div>
            <p className="mt-2 text-sm text-gray-400">{formatAppliedRange(payload.meta)}</p>
          </div>
        ))}
      </div>

      {payload.meta.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">Data Caveats</div>
          <ul className="mt-2 space-y-2">
            {payload.meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
