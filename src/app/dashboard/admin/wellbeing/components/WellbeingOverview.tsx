'use client'

import { useState } from 'react'

import { AttentionPanel } from './AttentionPanel'
import { DimensionDistribution } from './DimensionDistribution'
import { KPICards } from './KPICards'
import { OperationalTables } from './OperationalTables'
import { PeriodFilter } from './PeriodFilter'
import { TrendChart } from './TrendChart'
import { UserDrilldown } from './UserDrilldown'
import { useWellbeingOverview } from '../hooks/useWellbeingOverview'
import type { WellbeingFilterState } from '../types'
import { DEFAULT_WELLBEING_FILTER, isCustomRangeComplete } from '../utils'

function OverviewLoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="animate-pulse rounded-2xl border border-white/10 bg-[#111111] p-6">
        <div className="h-5 w-44 rounded bg-white/10" />
        <div className="mt-4 h-24 rounded-2xl bg-white/5" />
      </div>
      <div className="animate-pulse rounded-2xl border border-white/10 bg-[#111111] p-6">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="mt-4 h-24 rounded-2xl bg-white/5" />
      </div>
    </div>
  )
}

export function WellbeingOverview() {
  const [filter, setFilter] = useState<WellbeingFilterState>(DEFAULT_WELLBEING_FILTER)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const { data, error, isLoading, isValidating } = useWellbeingOverview(filter)
  const isRangeReady = isCustomRangeComplete(filter)

  return (
    <div className="space-y-6">
      <PeriodFilter
        value={filter}
        onChange={setFilter}
        isLoading={isLoading || isValidating}
      />

      {!isRangeReady && (
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-5 text-sm text-gray-400">
          Pilih tanggal mulai dan selesai untuk memuat overview wellbeing custom.
        </div>
      )}

      {error && !data && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
          {error.message}
        </div>
      )}

      {isLoading && !data && isRangeReady && <OverviewLoadingState />}

      {data && (
        <>
          <KPICards payload={data} />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DimensionDistribution items={data.dimensionDistribution} />
            <AttentionPanel counts={data.attentionCounts} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <TrendChart payload={data} />
            <OperationalTables
              tables={data.operationalTables}
              selectedUserId={selectedUserId}
              onSelectUser={setSelectedUserId}
            />
          </div>
        </>
      )}

      <UserDrilldown userId={selectedUserId} filter={filter} />
    </div>
  )
}
