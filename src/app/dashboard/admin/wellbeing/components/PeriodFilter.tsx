'use client'

import { Loader2 } from 'lucide-react'
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-white/[0.04] p-1">
          {WELLBEING_PERIOD_OPTIONS.map((option) => {
            const isActive = option.value === value.period
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updatePeriod(option.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-[#FC4C02] text-white shadow-sm shadow-[#FC4C02]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {isLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Memuat data...
          </span>
        )}
      </div>

      {value.period === 'Custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-wider text-gray-500">Mulai</span>
            <input
              type="date"
              value={value.startDate}
              onChange={(event) => onChange({ ...value, startDate: event.target.value })}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#FC4C02]/50"
            />
          </label>
          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-wider text-gray-500">Selesai</span>
            <input
              type="date"
              value={value.endDate}
              onChange={(event) => onChange({ ...value, endDate: event.target.value })}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#FC4C02]/50"
            />
          </label>
          {value.startDate && value.endDate ? null : (
            <span className="self-center text-[11px] text-gray-500">
              Lengkapi dua tanggal untuk memuat data.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
