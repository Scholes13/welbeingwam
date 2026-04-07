import type {
  WellbeingOverviewPayload,
  WellbeingPeriodKind,
  WellbeingUserDetailPayload,
} from '@/lib/wellbeing/types'

export type { WellbeingOverviewPayload, WellbeingPeriodKind, WellbeingUserDetailPayload }

export type WellbeingFilterState = {
  period: WellbeingPeriodKind
  startDate: string
  endDate: string
}

export type PeriodOption = {
  value: WellbeingPeriodKind
  label: string
}

export type SnapshotMetric = {
  label: string
  value: number
  tone: 'orange' | 'emerald' | 'sky' | 'amber'
}
