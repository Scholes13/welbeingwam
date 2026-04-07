import type { WellbeingOverviewPayload } from '@/lib/wellbeing/types'

import type { SnapshotMetric, WellbeingFilterState, PeriodOption } from './types'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export const WELLBEING_PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '90D', label: '90D' },
  { value: 'Custom', label: 'Custom' },
  { value: 'Lifetime', label: 'Lifetime' },
]

export const DEFAULT_WELLBEING_FILTER: WellbeingFilterState = {
  period: '30D',
  startDate: '',
  endDate: '',
}

export function isCustomRangeComplete(filter: WellbeingFilterState): boolean {
  if (filter.period !== 'Custom') return true
  return filter.startDate.trim().length > 0 && filter.endDate.trim().length > 0
}

export function buildWellbeingQuery(filter: WellbeingFilterState): string | null {
  if (!isCustomRangeComplete(filter)) return null

  const params = new URLSearchParams()
  params.set('period', filter.period)

  if (filter.period === 'Custom') {
    params.set('startDate', filter.startDate)
    params.set('endDate', filter.endDate)
  }

  return params.toString()
}

export function buildWellbeingPath(basePath: string, filter: WellbeingFilterState): string | null {
  const query = buildWellbeingQuery(filter)
  return query ? `${basePath}?${query}` : null
}

export function formatDimensionLabel(value: string): string {
  if (!value || value === 'unknown') return 'Unknown'

  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function formatDateLabel(value: string | null): string {
  if (!value) return 'All time'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return dateFormatter.format(parsed)
}

export function formatAppliedRange(meta: WellbeingOverviewPayload['meta']): string {
  if (!meta.periodStart) {
    return `Lifetime until ${formatDateLabel(meta.periodEnd)}`
  }

  return `${formatDateLabel(meta.periodStart)} - ${formatDateLabel(meta.periodEnd)}`
}

export function buildSnapshotMetrics(payload: WellbeingOverviewPayload): SnapshotMetric[] {
  return [
    {
      label: 'Active Users',
      value: payload.kpis.activeUsersPercent,
      tone: 'orange',
    },
    {
      label: 'Average Index',
      value: payload.kpis.averageWellbeingIndex,
      tone: 'emerald',
    },
    {
      label: 'Quiz Coverage',
      value: payload.kpis.quizCoveragePercent,
      tone: 'sky',
    },
    {
      label: 'Attendance Rate',
      value: payload.kpis.attendanceRatePercent,
      tone: 'amber',
    },
  ]
}
