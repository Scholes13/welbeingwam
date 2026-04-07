'use client'

import type { WellbeingFilterState, WellbeingPeriodKind } from '../types'
import { WELLBEING_PERIOD_OPTIONS } from '../utils'

type PeriodFilterProps = {
  isLoading?: boolean
  value: WellbeingFilterState
  onChange: (nextValue: WellbeingFilterState) => void
}

export function PeriodFilter({ isLoading = false, value, onChange }: PeriodFilterProps) {
  const updatePeriod = (period: WellbeingPeriodKind) => {
    if (period === value.period) return

    onChange({
      period,
      startDate: period === 'Custom' ? value.startDate : '',
      endDate: period === 'Custom' ? value.endDate : '',
    })
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111111] p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FC4C02]">Global Period</p>
          <h2 className="mt-2 text-xl font-bold text-white">Wellbeing Window</h2>
          <p className="mt-1 text-sm text-gray-400">
            Semua widget overview mengikuti periode ini. Default monitoring tetap 30D.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {WELLBEING_PERIOD_OPTIONS.map((option) => {
            const isActive = option.value === value.period

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updatePeriod(option.value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-[#FC4C02] text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {value.period === 'Custom' && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-2 text-sm text-gray-300">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Start Date</span>
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => onChange({ ...value, startDate: event.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-white outline-none transition-colors focus:border-[#FC4C02]"
            />
          </label>

          <label className="space-y-2 text-sm text-gray-300">
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">End Date</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => onChange({ ...value, endDate: event.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-white outline-none transition-colors focus:border-[#FC4C02]"
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
            {value.startDate && value.endDate
              ? 'Custom range aktif dan dashboard akan refresh otomatis.'
              : 'Lengkapi dua tanggal untuk mulai memuat overview custom.'}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.16em]">
          Dashboard Overview First
        </span>
        <span>{isLoading ? 'Refreshing wellbeing data...' : 'Click a user from the operational tables to open drilldown.'}</span>
      </div>
    </section>
  )
}
