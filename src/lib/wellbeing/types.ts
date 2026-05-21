export type WellbeingPeriodKind = '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'

export type DimensionScore = {
  dimensionId: string
  name: string
  displayName: string
  iconKey: string | null
  sortOrder: number
  index: number
  previousIndex: number
  delta: number
  activeUsers: number
  totalActivities: number
}

/** Monthly aggregated wellbeing index for the last 12 months (UTC month buckets). */
export type MonthlyTrendPoint = {
  /** YYYY-MM (e.g. "2026-04"). Always 12 entries, oldest first. */
  monthKey: string
  /** Localized short label (e.g. "Apr 26"). */
  monthLabel: string
  /** Per-dimension index keyed by `dimensions.name`. Missing keys default to 0. */
  byDimension: Record<string, number>
  /** Aggregate index across active users for that month. */
  overall: number
}

export type InsightSeverity = 'info' | 'warning' | 'success'

export type InsightItem = {
  id: string
  severity: InsightSeverity
  title: string
  body: string
  /** Optional dimension name reference for color-coded icon. */
  dimension?: string
}

export type RecommendationItem = {
  id: string
  title: string
  body: string
  /** Optional dimension name reference for color-coded icon. */
  dimension?: string
}

export type WellbeingOverviewPayload = {
  meta: {
    appliedPeriod: WellbeingPeriodKind
    periodStart: string | null
    periodEnd: string
    priorPeriodStart: string | null
    priorPeriodEnd: string | null
    warnings: string[]
  }
  kpis: {
    activeUsersPercent: number
    averageWellbeingIndex: number
    averageWellbeingIndexPrevious: number
    averageWellbeingIndexDelta: number
    quizCoveragePercent: number
    attendanceRatePercent: number
  }
  dimensionScores: DimensionScore[]
  monthlyTrend: MonthlyTrendPoint[]
  insights: InsightItem[]
  recommendations: RecommendationItem[]
  dimensionDistribution: {
    dimension: string
    userCount: number
    percentage: number
  }[]
  attentionCounts: {
    noRecentQuiz: number
    lowAttendance: number
    fallingSport: number
    inactive: number
  }
  operationalTables: {
    mostActive: UserSummary[]
    highestAttendance: UserSummary[]
    biggestDrop: UserSummary[]
  }
}

export type UserSummary = {
  userId: number
  username: string
  wellbeingIndex: number
  dominantDimension: string
  quizCount: number
  sportCount: number
  attendanceCount: number
  activityCount: number
  /** Wellbeing index from the prior period (only filled by `biggestDrop`). */
  previousIndex?: number
  /** Delta vs prior period: negative when current < previous (only filled by `biggestDrop`). */
  indexDelta?: number
}

export type WellbeingUserDetailPayload = {
  userId: number
  username: string
  filteredPeriod: {
    wellbeingIndex: number
    dominantDimension: string
    sourceContributions: {
      quiz: number
      sport: number
      attendance: number
      other: number
    }
  }
  supportingEvidence: {
    quizSubmissions: number
    sportActivities: number
    attendanceRatio: number
    flags: string[]
  }
  timeSeries: {
    date: string
    wellbeingIndex: number
  }[]
}
