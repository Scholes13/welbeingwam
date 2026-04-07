export type WellbeingPeriodKind = '7D' | '30D' | '90D' | 'Custom' | 'Lifetime'

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
    quizCoveragePercent: number
    attendanceRatePercent: number
  }
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
