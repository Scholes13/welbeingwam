'use client'

import { useState } from 'react'

import { AttentionPanel } from './AttentionPanel'
import { DimensionDistribution } from './DimensionDistribution'
import { DimensionScoreCards } from './DimensionScoreCards'
import { InsightsPanel } from './InsightsPanel'
import { KPICards } from './KPICards'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { OperationalTables } from './OperationalTables'
import { PeriodFilter } from './PeriodFilter'
import { RecommendationsPanel } from './RecommendationsPanel'
import { UserDrilldown } from './UserDrilldown'
import { useWellbeingOverview } from '../hooks/useWellbeingOverview'
import type { WellbeingFilterState } from '../types'
import { DEFAULT_WELLBEING_FILTER, formatAppliedRange, isCustomRangeComplete } from '../utils'

function OverviewLoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid animate-pulse grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#0c0c0c] p-5">
            <div className="h-3 w-24 rounded bg-white/[0.06]" />
            <div className="mt-4 h-7 w-16 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="grid animate-pulse grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#0c0c0c] p-4">
            <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
            <div className="mt-3 h-3 w-20 rounded bg-white/[0.06]" />
            <div className="mt-2 h-6 w-12 rounded bg-white/[0.06]" />
          </div>
        ))}
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Wellbeing Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? formatAppliedRange(data.meta) : 'Monitor wellbeing index dan dimensi dominan.'}
          </p>
        </div>
        <PeriodFilter
          value={filter}
          onChange={setFilter}
          isLoading={isLoading || isValidating}
        />
      </div>

      {!isRangeReady && (
        <p className="text-sm text-gray-500">Pilih tanggal mulai dan selesai untuk memuat overview custom.</p>
      )}

      {error && !data && (
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4 text-sm text-red-200">
          {error.message}
        </div>
      )}

      {isLoading && !data && isRangeReady && <OverviewLoadingState />}

      {data && (
        <>
          <KPICards payload={data} />

          <DimensionScoreCards
            scores={data.dimensionScores}
            hasPriorPeriod={data.meta.priorPeriodStart != null}
          />

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <MonthlyTrendChart trend={data.monthlyTrend} dimensions={data.dimensionScores} />
            <DimensionDistribution items={data.dimensionDistribution} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <InsightsPanel insights={data.insights} />
            <RecommendationsPanel recommendations={data.recommendations} />
          </div>

          <AttentionPanel counts={data.attentionCounts} />

          <OperationalTables
            tables={data.operationalTables}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />
        </>
      )}

      <UserDrilldown userId={selectedUserId} filter={filter} />
    </div>
  )
}
