import { Activity, Heart, Users, Wallet, Sparkles, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'
import type { DimensionScore } from '@/lib/wellbeing/types'
import { InfoTooltip } from './InfoTooltip'

type DimensionScoreCardsProps = {
  scores: DimensionScore[]
  hasPriorPeriod: boolean
}

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  heart: Heart,
  users: Users,
  banknote: Wallet,
  wallet: Wallet,
  sparkles: Sparkles,
}

const TONE_MAP: Record<string, { fg: string; bg: string; bar: string }> = {
  physical:  { fg: 'text-orange-300',  bg: 'bg-orange-500/10',  bar: 'bg-orange-500' },
  emotional: { fg: 'text-rose-300',    bg: 'bg-rose-500/10',    bar: 'bg-rose-500' },
  social:    { fg: 'text-sky-300',     bg: 'bg-sky-500/10',     bar: 'bg-sky-500' },
  financial: { fg: 'text-emerald-300', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
  spiritual: { fg: 'text-amber-300',   bg: 'bg-amber-500/10',   bar: 'bg-amber-500' },
}

const FALLBACK_TONE = { fg: 'text-gray-300', bg: 'bg-white/5', bar: 'bg-white/30' }

function getTone(name: string) {
  return TONE_MAP[name] ?? FALLBACK_TONE
}

function getIcon(iconKey: string | null): LucideIcon {
  if (!iconKey) return Activity
  return ICON_MAP[iconKey] ?? Activity
}

function DeltaInline({ delta, hasPriorPeriod }: { delta: number; hasPriorPeriod: boolean }) {
  if (!hasPriorPeriod) return null
  if (delta === 0) {
    return <span className="text-[11px] text-gray-500">stabil</span>
  }
  const isUp = delta > 0
  const Icon = isUp ? TrendingUp : TrendingDown
  const cls = isUp ? 'text-emerald-400' : 'text-red-400'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" />
      {isUp ? '+' : ''}{delta}
    </span>
  )
}

export function DimensionScoreCards({ scores, hasPriorPeriod }: DimensionScoreCardsProps) {
  if (scores.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-white">Partisipasi per Dimensi</h3>
          <InfoTooltip text="Persentase karyawan yang punya minimal satu kegiatan di dimensi tersebut dalam periode aktif. Delta = perbandingan vs periode sebelumnya." />
        </div>
        <p className="text-[11px] text-gray-500">% karyawan aktif di dimensi ini</p>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-5">
        {scores.map((score) => {
          const tone = getTone(score.name)
          const Icon = getIcon(score.iconKey)
          return (
            <div key={score.dimensionId} className="bg-[#0c0c0c] p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.bg}`}>
                  <Icon className={`h-4 w-4 ${tone.fg}`} />
                </div>
                <DeltaInline delta={score.delta} hasPriorPeriod={hasPriorPeriod} />
              </div>

              <p className="mt-3 text-[11px] uppercase tracking-wider text-gray-500">{score.displayName}</p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black tabular-nums text-white">{score.index}%</span>
                <span className="text-[11px] text-gray-600">karyawan</span>
              </p>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className={`h-full ${tone.bar}`}
                  style={{ width: `${Math.min(100, Math.max(0, score.index))}%` }}
                />
              </div>

              <div className="mt-2 text-[10px] text-gray-600">
                {score.activeUsers} aktif · {score.totalActivities} kegiatan
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
