import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { WellbeingOverviewPayload } from '../types'
import { InfoTooltip } from './InfoTooltip'

type KPICardsProps = {
  payload: WellbeingOverviewPayload
}

type KpiKey = 'activeUsersPercent' | 'averageWellbeingIndex' | 'quizCoveragePercent' | 'attendanceRatePercent'

type KpiItem = {
  key: KpiKey
  label: string
  tone: string
  suffix: string
  showDelta?: boolean
  tooltip: string
}

const KPI_ITEMS: KpiItem[] = [
  {
    key: 'averageWellbeingIndex',
    label: 'Average Index',
    tone: 'text-emerald-300',
    suffix: '',
    showDelta: true,
    tooltip: 'Rata-rata indeks wellbeing dari karyawan aktif (kombinasi quiz, sport, dan attendance). Delta dibandingkan dengan periode sebelumnya.',
  },
  {
    key: 'activeUsersPercent',
    label: 'Active Users',
    tone: 'text-[#FC4C02]',
    suffix: '%',
    tooltip: '% karyawan yang punya minimal satu aktivitas (quiz / sport / attendance / kegiatan dimensi) di periode ini.',
  },
  {
    key: 'quizCoveragePercent',
    label: 'Quiz Coverage',
    tone: 'text-sky-300',
    suffix: '%',
    tooltip: '% karyawan yang sudah submit minimal satu survei di periode ini. Coverage rendah membuat skor wellbeing kurang akurat.',
  },
  {
    key: 'attendanceRatePercent',
    label: 'Attendance Rate',
    tone: 'text-amber-300',
    suffix: '%',
    tooltip: 'Rasio total check-in attendance dibanding peluang ideal (10 event per karyawan).',
  },
]

function DeltaPill({ delta, hasBaseline }: { delta: number; hasBaseline: boolean }) {
  if (!hasBaseline) {
    return <span className="text-[10px] uppercase tracking-wider text-gray-600">No baseline</span>
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
        <Minus className="h-3 w-3" /> Stabil
      </span>
    )
  }
  const isUp = delta > 0
  const Icon = isUp ? TrendingUp : TrendingDown
  const cls = isUp ? 'text-emerald-400' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}{delta}
    </span>
  )
}

export function KPICards({ payload }: KPICardsProps) {
  const hasBaseline = payload.meta.priorPeriodStart != null
  const overallDelta = payload.kpis.averageWellbeingIndexDelta

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] xl:grid-cols-4">
        {KPI_ITEMS.map((item) => (
          <div key={item.key} className="bg-[#0c0c0c] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-gray-500">{item.label}</span>
                <InfoTooltip text={item.tooltip} />
              </div>
              {item.showDelta && <DeltaPill delta={overallDelta} hasBaseline={hasBaseline} />}
            </div>
            <div className={`mt-2 text-3xl font-bold tracking-tight ${item.tone}`}>
              {payload.kpis[item.key]}
              {item.suffix}
            </div>
          </div>
        ))}
      </div>

      {payload.meta.warnings.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-400/80">
          <span className="mt-0.5 inline-block h-1 w-1 rounded-full bg-amber-400" />
          <ul className="space-y-1">
            {payload.meta.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
