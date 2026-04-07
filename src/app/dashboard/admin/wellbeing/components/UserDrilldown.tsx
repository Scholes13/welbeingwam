'use client'

import { useWellbeingUser } from '../hooks/useWellbeingUser'
import type { WellbeingFilterState } from '../types'
import { formatDimensionLabel, isCustomRangeComplete } from '../utils'

type UserDrilldownProps = {
  filter: WellbeingFilterState
  userId: number | null
}

const CONTRIBUTION_ROWS = [
  { key: 'quiz', label: 'Quiz', tone: 'bg-sky-400' },
  { key: 'sport', label: 'Sport', tone: 'bg-[#FC4C02]' },
  { key: 'attendance', label: 'Attendance', tone: 'bg-emerald-400' },
  { key: 'other', label: 'Other', tone: 'bg-amber-400' },
] as const

export function UserDrilldown({ filter, userId }: UserDrilldownProps) {
  const isRangeReady = isCustomRangeComplete(filter)
  const { data, error, isLoading } = useWellbeingUser(userId, filter)

  if (!userId) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">User Drilldown</p>
        <h3 className="mt-2 text-xl font-bold text-white">Select a User from the Tables</h3>
        <p className="mt-3 text-sm text-gray-400">
          Klik user dari Most Active, Highest Attendance, atau Biggest Drop untuk melihat kontribusi quiz, sport, attendance, dan flag pendukungnya.
        </p>
      </section>
    )
  }

  if (!isRangeReady) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-sm text-gray-400">
        Lengkapi custom start dan end date untuk memuat user drilldown.
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
        {error.message}
      </section>
    )
  }

  if (isLoading && !data) {
    return (
      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="h-20 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
      </section>
    )
  }

  if (!data) return null

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">User Drilldown</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{data.username}</h3>
          <p className="mt-1 text-sm text-gray-400">
            Dominant dimension: {formatDimensionLabel(data.filteredPeriod.dominantDimension)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Wellbeing Index</div>
          <div className="mt-2 text-3xl font-bold text-[#FC4C02]">{data.filteredPeriod.wellbeingIndex}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-bold text-white">Source Contributions</div>
          <div className="mt-4 space-y-4">
            {CONTRIBUTION_ROWS.map((row) => {
              const value = data.filteredPeriod.sourceContributions[row.key]

              return (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{row.label}</span>
                    <span className="font-semibold text-white">{value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${row.tone}`}
                      style={{ width: `${Math.max(value, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-bold text-white">Supporting Evidence</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Quiz Submissions</div>
              <div className="mt-2 text-2xl font-bold text-sky-300">{data.supportingEvidence.quizSubmissions}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Sport Activities</div>
              <div className="mt-2 text-2xl font-bold text-[#FC4C02]">{data.supportingEvidence.sportActivities}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Attendance Ratio</div>
              <div className="mt-2 text-2xl font-bold text-emerald-300">
                {Math.round(data.supportingEvidence.attendanceRatio * 100)}%
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">Flags</div>
            {data.supportingEvidence.flags.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No warning flags for this user in the selected period.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {data.supportingEvidence.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-sm font-bold text-white">Timeline</div>
        {data.timeSeries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            Time-series trend will appear here once the backend starts returning historical wellbeing points.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.timeSeries.map((entry) => (
              <div key={`${entry.date}-${entry.wellbeingIndex}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{entry.date}</div>
                <div className="mt-2 text-2xl font-bold text-white">{entry.wellbeingIndex}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
