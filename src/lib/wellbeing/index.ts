import { createSupabaseAdminClient } from '@/lib/supabase/server'

import { calculateWellbeingIndex } from './calculator'
import { resolveDominantDimension, resolveDominantDimensionFromActivities } from './dimension-mapper'
import { parseWellbeingPeriod } from './period-filter'
import { normalizeCoverageScore, normalizeCountScore } from './source-normalizer'
import type {
  DimensionScore,
  InsightItem,
  MonthlyTrendPoint,
  RecommendationItem,
  WellbeingOverviewPayload,
  WellbeingUserDetailPayload,
} from './types'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

// TODO(v2): only add reward or quest signals after they have explicit dimension mapping and a validated wellbeing use case.

type UserMetric = {
  userId: number
  username: string
  wellbeingIndex: number
  quizCount: number
  sportCount: number
  attendanceCount: number
  activityCount: number
  isActive: boolean
  dominantDimension: string
}

export async function buildWellbeingOverview(searchParams: URLSearchParams): Promise<WellbeingOverviewPayload> {
  const period = parseWellbeingPeriod(searchParams)
  const supabase = createSupabaseAdminClient()
  const warnings: string[] = []

  let priorStart: Date | null = null
  let priorEnd: Date | null = null
  if (period.start) {
    const periodDays = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))
    priorEnd = new Date(period.start)
    priorEnd.setDate(priorEnd.getDate() - 1)
    priorStart = new Date(priorEnd)
    priorStart.setDate(priorStart.getDate() - periodDays + 1)
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .order('id')

  // Active dimensions catalog (used for per-dimension scoring)
  const { data: dimensionRows } = await supabase
    .from('dimensions')
    .select('id, name, display_name, icon, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const dimensions = dimensionRows ?? []

  if (!profiles || profiles.length === 0) {
    return buildEmptyOverview(period, warnings, dimensions)
  }

  const userIds = profiles.map((profile) => profile.id)

  const quizQuery = supabase
    .from('survey_submissions')
    .select('user_id, created_at')
    .in('user_id', userIds)

  if (period.start) {
    quizQuery.gte('created_at', period.start.toISOString())
  }
  quizQuery.lte('created_at', period.end.toISOString())

  const { data: quizSubmissions } = await quizQuery

  const sportQuery = supabase
    .from('activities')
    .select('user_id, created_at, mode')
    .in('user_id', userIds)
    .eq('mode', 'sport')
    .not('review_status', 'in', '(voided,rejected)')

  if (period.start) {
    sportQuery.gte('created_at', period.start.toISOString())
  }
  sportQuery.lte('created_at', period.end.toISOString())

  const { data: sportActivities } = await sportQuery

  // Fetch ALL activities with dimension_id for dimension distribution
  const allActivitiesQuery = supabase
    .from('activities')
    .select('user_id, created_at, dimension_id, dimension:dimensions(name)')
    .in('user_id', userIds)
    .not('review_status', 'in', '(voided,rejected)')

  if (period.start) {
    allActivitiesQuery.gte('created_at', period.start.toISOString())
  }
  allActivitiesQuery.lte('created_at', period.end.toISOString())

  const { data: allActivities } = await allActivitiesQuery

  const attendanceQuery = supabase
    .from('attendance')
    .select('user_id, scan_in_at, state')
    .in('user_id', userIds)

  if (period.start) {
    attendanceQuery.gte('scan_in_at', period.start.toISOString())
  }
  attendanceQuery.lte('scan_in_at', period.end.toISOString())

  const { data: attendanceRecords } = await attendanceQuery

  const userMetrics: UserMetric[] = profiles.map((profile) => {
    const quizCount = quizSubmissions?.filter((submission) => submission.user_id === profile.id).length ?? 0
    const sportCount = sportActivities?.filter((activity) => activity.user_id === profile.id).length ?? 0
    const attendanceCount = attendanceRecords?.filter((record) => record.user_id === profile.id && record.state === 'present').length ?? 0

    // Count activities per dimension for this user
    const userActivities = allActivities?.filter((a) => a.user_id === profile.id) ?? []
    const activityDimensions: Record<string, number> = {}
    for (const act of userActivities) {
      const dimName = (act.dimension as { name?: string } | null)?.name || 'physical'
      activityDimensions[dimName] = (activityDimensions[dimName] ?? 0) + 1
    }

    const quizScore = normalizeCountScore({ count: quizCount, target: 4 })
    const sportScore = normalizeCountScore({ count: sportCount, target: 8 })
    const attendanceScore = normalizeCountScore({ count: attendanceCount, target: 10 })
    const otherScore = 0

    const wellbeingIndex = calculateWellbeingIndex({
      quizScore,
      sportScore,
      attendanceScore,
      otherScore,
    })

    const isActive = quizCount > 0 || sportCount > 0 || attendanceCount > 0 || userActivities.length > 0
    // Use actual dimension data from activities for dominant dimension
    const dominantDimension = resolveDominantDimensionFromActivities(activityDimensions, {
      quizScore,
      sportScore,
      attendanceScore,
    })

    return {
      userId: profile.id,
      username: profile.username,
      wellbeingIndex,
      quizCount,
      sportCount,
      attendanceCount,
      activityCount: userActivities.length,
      isActive,
      dominantDimension,
    }
  })

  const activeUsers = userMetrics.filter((user) => user.isActive)
  const activeUsersPercent = profiles.length > 0 ? Math.round((activeUsers.length / profiles.length) * 100) : 0
  const averageWellbeingIndex = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, user) => sum + user.wellbeingIndex, 0) / activeUsers.length)
    : 0

  const usersWithQuiz = userMetrics.filter((user) => user.quizCount > 0).length
  const quizCoveragePercent = profiles.length > 0 ? normalizeCoverageScore(usersWithQuiz / profiles.length) : 0

  const totalAttendanceOpportunities = profiles.length * 10
  const totalAttendance = userMetrics.reduce((sum, user) => sum + user.attendanceCount, 0)
  const attendanceRatePercent = totalAttendanceOpportunities > 0
    ? normalizeCoverageScore(totalAttendance / totalAttendanceOpportunities)
    : 0

  if (quizCoveragePercent < 30) {
    warnings.push('Quiz coverage is sparse; wellbeing scores may have limited confidence')
  }

  // ---- Dimension scores (current vs prior period) ----------------------
  // Metric = % partisipasi karyawan: berapa persen dari total user yang punya
  // minimal satu aktivitas di dimensi tersebut di periode aktif.
  const totalProfiles = profiles.length

  const computeDimensionScores = (
    activityRows: Array<{ user_id: number; dimension_id: string | null }>,
  ) => {
    const totals: Record<string, number> = {}
    const userSets: Record<string, Set<number>> = {}

    for (const dim of dimensions) {
      totals[dim.id] = 0
      userSets[dim.id] = new Set()
    }

    for (const row of activityRows) {
      if (!row.dimension_id) continue
      const userSet = userSets[row.dimension_id]
      if (!userSet) continue
      userSet.add(row.user_id)
      totals[row.dimension_id] = (totals[row.dimension_id] ?? 0) + 1
    }

    return dimensions.map((dim) => {
      const userSet = userSets[dim.id]
      const activeForDim = userSet.size
      const index = totalProfiles > 0
        ? Math.round((activeForDim / totalProfiles) * 100)
        : 0
      return {
        dimensionId: dim.id,
        name: dim.name,
        displayName: dim.display_name,
        iconKey: dim.icon ?? null,
        sortOrder: dim.sort_order,
        index,
        activeUsers: activeForDim,
        totalActivities: totals[dim.id] ?? 0,
      }
    })
  }

  const currentDimensionStats = computeDimensionScores(
    (allActivities ?? []).map((row) => ({
      user_id: row.user_id as number,
      dimension_id: (row.dimension_id ?? null) as string | null,
    })),
  )

  let priorActivities: Array<{ user_id: number; dimension_id: string | null }> = []
  if (priorStart && priorEnd) {
    const { data: priorAll } = await supabase
      .from('activities')
      .select('user_id, dimension_id')
      .in('user_id', userIds)
      .not('review_status', 'in', '(voided,rejected)')
      .gte('created_at', priorStart.toISOString())
      .lte('created_at', priorEnd.toISOString())

    priorActivities = (priorAll ?? []).map((row) => ({
      user_id: row.user_id as number,
      dimension_id: (row.dimension_id ?? null) as string | null,
    }))
  }
  const priorDimensionStats = computeDimensionScores(priorActivities)
  const priorIndexById = new Map(priorDimensionStats.map((s) => [s.dimensionId, s.index]))

  const dimensionScores = currentDimensionStats.map((stat) => {
    const previousIndex = priorIndexById.get(stat.dimensionId) ?? 0
    return {
      ...stat,
      previousIndex,
      delta: stat.index - previousIndex,
    }
  })

  // ---- Biggest Drop: compare current vs prior period --------------------
  const priorIndexByUser = new Map<number, number>()
  if (priorStart && priorEnd) {
    const [priorQuiz, priorSport, priorAttendance] = await Promise.all([
      supabase
        .from('survey_submissions')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .gte('created_at', priorStart.toISOString())
        .lte('created_at', priorEnd.toISOString()),
      supabase
        .from('activities')
        .select('user_id, created_at, mode')
        .in('user_id', userIds)
        .eq('mode', 'sport')
        .not('review_status', 'in', '(voided,rejected)')
        .gte('created_at', priorStart.toISOString())
        .lte('created_at', priorEnd.toISOString()),
      supabase
        .from('attendance')
        .select('user_id, scan_in_at, state')
        .in('user_id', userIds)
        .gte('scan_in_at', priorStart.toISOString())
        .lte('scan_in_at', priorEnd.toISOString()),
    ])

    for (const profile of profiles) {
      const priorQuizCount = priorQuiz.data?.filter((s) => s.user_id === profile.id).length ?? 0
      const priorSportCount = priorSport.data?.filter((a) => a.user_id === profile.id).length ?? 0
      const priorAttendanceCount = priorAttendance.data?.filter((r) => r.user_id === profile.id && r.state === 'present').length ?? 0

      const priorIndex = calculateWellbeingIndex({
        quizScore: normalizeCountScore({ count: priorQuizCount, target: 4 }),
        sportScore: normalizeCountScore({ count: priorSportCount, target: 8 }),
        attendanceScore: normalizeCountScore({ count: priorAttendanceCount, target: 10 }),
        otherScore: 0,
      })

      priorIndexByUser.set(profile.id, priorIndex)
    }
  }

  const biggestDropRows = priorIndexByUser.size === 0
    ? []
    : userMetrics
        .map((user) => {
          const previous = priorIndexByUser.get(user.userId) ?? 0
          const delta = previous - user.wellbeingIndex
          return { user, previous, delta }
        })
        .filter((row) => row.previous > 0 && row.delta > 0)
        .sort((left, right) => right.delta - left.delta)
        .slice(0, 10)
        .map(({ user, previous, delta }) => ({
          userId: user.userId,
          username: user.username,
          wellbeingIndex: user.wellbeingIndex,
          previousIndex: previous,
          indexDelta: -delta,
          dominantDimension: user.dominantDimension,
          quizCount: user.quizCount,
          sportCount: user.sportCount,
          attendanceCount: user.attendanceCount,
          activityCount: user.activityCount,
        }))

  // Average wellbeing index for the prior period (used for KPI delta).
  let averageWellbeingIndexPrevious = 0
  if (priorIndexByUser.size > 0) {
    const priorActives = Array.from(priorIndexByUser.values()).filter((idx) => idx > 0)
    averageWellbeingIndexPrevious = priorActives.length > 0
      ? Math.round(priorActives.reduce((sum, idx) => sum + idx, 0) / priorActives.length)
      : 0
  }
  const averageWellbeingIndexDelta = averageWellbeingIndex - averageWellbeingIndexPrevious

  const monthlyTrend = await buildMonthlyTrend({
    supabase,
    userIds,
    dimensions,
    referenceDate: period.end,
  })

  const insights = buildInsights({
    dimensionScores,
    quizCoveragePercent,
    attendanceRatePercent,
    averageWellbeingIndexDelta,
    hasPriorPeriod: priorStart != null,
  })

  const recommendations = buildRecommendations({
    dimensionScores,
    attentionCounts: {
      noRecentQuiz: profiles.length - usersWithQuiz,
      lowAttendance: userMetrics.filter((user) => user.attendanceCount < 3).length,
      inactive: profiles.length - activeUsers.length,
    },
  })

  return {
    meta: {
      appliedPeriod: period.kind,
      periodStart: period.start?.toISOString() ?? null,
      periodEnd: period.end.toISOString(),
      priorPeriodStart: priorStart?.toISOString() ?? null,
      priorPeriodEnd: priorEnd?.toISOString() ?? null,
      warnings,
    },
    kpis: {
      activeUsersPercent,
      averageWellbeingIndex,
      averageWellbeingIndexPrevious,
      averageWellbeingIndexDelta,
      quizCoveragePercent,
      attendanceRatePercent,
    },
    dimensionScores,
    monthlyTrend,
    insights,
    recommendations,
    dimensionDistribution: computeDimensionDistribution(userMetrics, profiles.length),
    attentionCounts: {
      noRecentQuiz: profiles.length - usersWithQuiz,
      lowAttendance: userMetrics.filter((user) => user.attendanceCount < 3).length,
      fallingSport: 0,
      inactive: profiles.length - activeUsers.length,
    },
    operationalTables: {
      mostActive: [...activeUsers]
        .sort((left, right) => right.wellbeingIndex - left.wellbeingIndex)
        .slice(0, 10)
        .map((user) => ({
          userId: user.userId,
          username: user.username,
          wellbeingIndex: user.wellbeingIndex,
          dominantDimension: user.dominantDimension,
          quizCount: user.quizCount,
          sportCount: user.sportCount,
          attendanceCount: user.attendanceCount,
          activityCount: user.activityCount,
        })),
      highestAttendance: [...userMetrics]
        .filter((user) => user.attendanceCount > 0)
        .sort((left, right) => right.attendanceCount - left.attendanceCount)
        .slice(0, 10)
        .map((user) => ({
          userId: user.userId,
          username: user.username,
          wellbeingIndex: user.wellbeingIndex,
          dominantDimension: user.dominantDimension,
          quizCount: user.quizCount,
          sportCount: user.sportCount,
          attendanceCount: user.attendanceCount,
          activityCount: user.activityCount,
        })),
      biggestDrop: biggestDropRows,
    },
  }
}

export async function buildWellbeingUserDetail(input: {
  userId: string
  searchParams: URLSearchParams
}): Promise<WellbeingUserDetailPayload> {
  const period = parseWellbeingPeriod(input.searchParams)
  const supabase = createSupabaseAdminClient()
  const userId = Number(input.userId)

  if (Number.isNaN(userId)) {
    throw new Error('Invalid user id')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('User not found')
  }

  const quizQuery = supabase
    .from('survey_submissions')
    .select('created_at')
    .eq('user_id', userId)

  if (period.start) {
    quizQuery.gte('created_at', period.start.toISOString())
  }
  quizQuery.lte('created_at', period.end.toISOString())

  const { data: quizSubmissions } = await quizQuery

  const sportQuery = supabase
    .from('activities')
    .select('created_at')
    .eq('user_id', userId)
    .eq('mode', 'sport')
    .not('review_status', 'in', '(voided,rejected)')

  if (period.start) {
    sportQuery.gte('created_at', period.start.toISOString())
  }
  sportQuery.lte('created_at', period.end.toISOString())

  const { data: sportActivities } = await sportQuery

  const attendanceQuery = supabase
    .from('attendance')
    .select('scan_in_at, state')
    .eq('user_id', userId)

  if (period.start) {
    attendanceQuery.gte('scan_in_at', period.start.toISOString())
  }
  attendanceQuery.lte('scan_in_at', period.end.toISOString())

  const { data: attendanceRecords } = await attendanceQuery

  const quizCount = quizSubmissions?.length ?? 0
  const sportCount = sportActivities?.length ?? 0
  const attendanceCount = attendanceRecords?.filter((record) => record.state === 'present').length ?? 0

  const quizScore = normalizeCountScore({ count: quizCount, target: 4 })
  const sportScore = normalizeCountScore({ count: sportCount, target: 8 })
  const attendanceScore = normalizeCountScore({ count: attendanceCount, target: 10 })
  const otherScore = 0

  const wellbeingIndex = calculateWellbeingIndex({
    quizScore,
    sportScore,
    attendanceScore,
    otherScore,
  })

  const dominantDimension = resolveDominantDimensionFromActivities({}, {
    quizScore,
    sportScore,
    attendanceScore,
  })

  const flags: string[] = []
  if (quizCount === 0) flags.push('no_quiz')
  if (sportCount === 0) flags.push('no_sport')
  if (attendanceCount < 3) flags.push('low_attendance')

  return {
    userId,
    username: profile.username,
    filteredPeriod: {
      wellbeingIndex,
      dominantDimension,
      sourceContributions: {
        quiz: quizScore,
        sport: sportScore,
        attendance: attendanceScore,
        other: otherScore,
      },
    },
    supportingEvidence: {
      quizSubmissions: quizCount,
      sportActivities: sportCount,
      attendanceRatio: attendanceCount / 10,
      flags,
    },
    timeSeries: [],
  }
}

function computeDimensionDistribution(
  userMetrics: UserMetric[],
  totalUsers: number,
): Array<{ dimension: string; userCount: number; percentage: number }> {
  const counts = new Map<string, number>()

  for (const user of userMetrics) {
    if (!user.isActive || user.dominantDimension === 'unknown') continue
    counts.set(user.dominantDimension, (counts.get(user.dominantDimension) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([dimension, userCount]) => ({
      dimension,
      userCount,
      percentage: totalUsers > 0 ? Math.round((userCount / totalUsers) * 100) : 0,
    }))
    .sort((left, right) => right.userCount - left.userCount)
}

function buildEmptyOverview(
  period: ReturnType<typeof parseWellbeingPeriod>,
  warnings: string[],
  dimensions: Array<{ id: string; name: string; display_name: string; icon: string | null; sort_order: number }> = [],
): WellbeingOverviewPayload {
  return {
    meta: {
      appliedPeriod: period.kind,
      periodStart: period.start?.toISOString() ?? null,
      periodEnd: period.end.toISOString(),
      priorPeriodStart: null,
      priorPeriodEnd: null,
      warnings: [...warnings, 'No user data available'],
    },
    kpis: {
      activeUsersPercent: 0,
      averageWellbeingIndex: 0,
      averageWellbeingIndexPrevious: 0,
      averageWellbeingIndexDelta: 0,
      quizCoveragePercent: 0,
      attendanceRatePercent: 0,
    },
    dimensionScores: dimensions.map((dim) => ({
      dimensionId: dim.id,
      name: dim.name,
      displayName: dim.display_name,
      iconKey: dim.icon ?? null,
      sortOrder: dim.sort_order,
      index: 0,
      previousIndex: 0,
      delta: 0,
      activeUsers: 0,
      totalActivities: 0,
    })),
    monthlyTrend: buildEmptyMonthlyTrend(dimensions, new Date()),
    insights: [],
    recommendations: [],
    dimensionDistribution: [],
    attentionCounts: {
      noRecentQuiz: 0,
      lowAttendance: 0,
      fallingSport: 0,
      inactive: 0,
    },
    operationalTables: {
      mostActive: [],
      highestAttendance: [],
      biggestDrop: [],
    },
  }
}

// ---------------------------------------------------------------------------
// Monthly trend (last 12 months) — per-dimension aggregate
// ---------------------------------------------------------------------------

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' })

function buildEmptyMonthlyTrend(
  dimensions: Array<{ id: string; name: string }>,
  reference: Date,
): MonthlyTrendPoint[] {
  return enumerateMonths(reference).map((bucket) => ({
    monthKey: bucket.key,
    monthLabel: bucket.label,
    overall: 0,
    byDimension: dimensions.reduce<Record<string, number>>((acc, dim) => {
      acc[dim.name] = 0
      return acc
    }, {}),
  }))
}

function enumerateMonths(reference: Date): Array<{ key: string; label: string; start: Date; end: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = []
  const ref = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1))
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1))
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.push({
      key,
      label: MONTH_LABEL_FORMATTER.format(start),
      start,
      end,
    })
  }
  return buckets
}

async function buildMonthlyTrend(input: {
  supabase: SupabaseAdminClient
  userIds: number[]
  dimensions: Array<{ id: string; name: string }>
  referenceDate: Date
}): Promise<MonthlyTrendPoint[]> {
  if (input.userIds.length === 0 || input.dimensions.length === 0) {
    return buildEmptyMonthlyTrend(input.dimensions, input.referenceDate)
  }

  const buckets = enumerateMonths(input.referenceDate)
  const earliestStart = buckets[0].start
  const latestEnd = buckets[buckets.length - 1].end
  const totalUsers = input.userIds.length

  const { data: rows } = await input.supabase
    .from('activities')
    .select('user_id, created_at, dimension_id')
    .in('user_id', input.userIds)
    .not('review_status', 'in', '(voided,rejected)')
    .gte('created_at', earliestStart.toISOString())
    .lt('created_at', latestEnd.toISOString())

  const dimensionIdToName = new Map(input.dimensions.map((d) => [d.id, d.name]))

  // monthKey -> dimensionName -> Set<userId> (each user counted once per dim per month)
  const buffer = new Map<string, Map<string, Set<number>>>()
  for (const bucket of buckets) {
    const dimMap = new Map<string, Set<number>>()
    for (const dim of input.dimensions) {
      dimMap.set(dim.name, new Set())
    }
    buffer.set(bucket.key, dimMap)
  }

  for (const row of rows ?? []) {
    if (!row.dimension_id) continue
    const dimName = dimensionIdToName.get(row.dimension_id as string)
    if (!dimName) continue
    const created = new Date(row.created_at as string)
    if (Number.isNaN(created.getTime())) continue
    const key = `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`
    const dimMap = buffer.get(key)
    if (!dimMap) continue
    const userSet = dimMap.get(dimName)
    if (!userSet) continue
    userSet.add(row.user_id as number)
  }

  return buckets.map((bucket) => {
    const dimMap = buffer.get(bucket.key)
    const byDimension: Record<string, number> = {}
    let overallSum = 0
    let overallCount = 0

    for (const dim of input.dimensions) {
      const userSet = dimMap?.get(dim.name)
      const participants = userSet?.size ?? 0
      const percent = totalUsers > 0
        ? Math.round((participants / totalUsers) * 100)
        : 0
      byDimension[dim.name] = percent
      overallSum += percent
      overallCount += 1
    }

    return {
      monthKey: bucket.key,
      monthLabel: bucket.label,
      byDimension,
      overall: overallCount > 0 ? Math.round(overallSum / overallCount) : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Insights & Recommendations engine
// Deterministic, content-free of secrets, easy to extend with more rules.
// ---------------------------------------------------------------------------

function buildInsights(input: {
  dimensionScores: DimensionScore[]
  quizCoveragePercent: number
  attendanceRatePercent: number
  averageWellbeingIndexDelta: number
  hasPriorPeriod: boolean
}): InsightItem[] {
  const insights: InsightItem[] = []

  // 1. Lowest dimension (only when we have any data at all)
  const ranked = [...input.dimensionScores].sort((left, right) => left.index - right.index)
  const lowest = ranked[0]
  if (lowest && lowest.index < 30) {
    insights.push({
      id: `insight.lowest-dimension.${lowest.name}`,
      severity: 'warning',
      title: `${lowest.displayName}: hanya ${lowest.index}% karyawan aktif`,
      body: 'Pertimbangkan kampanye atau program intervensi untuk dimensi ini.',
      dimension: lowest.name,
    })
  }

  // 2. Strongest gainer / loser dimension vs prior period
  if (input.hasPriorPeriod) {
    const gainers = input.dimensionScores.filter((d) => d.delta > 0)
    const losers = input.dimensionScores.filter((d) => d.delta < 0)

    if (gainers.length > 0) {
      const top = gainers.sort((a, b) => b.delta - a.delta)[0]
      insights.push({
        id: `insight.dimension-gain.${top.name}`,
        severity: 'success',
        title: `${top.displayName} naik +${top.delta}% partisipasi`,
        body: 'Pertahankan momentum dengan menjaga program yang berjalan saat ini.',
        dimension: top.name,
      })
    }

    if (losers.length > 0) {
      const worst = losers.sort((a, b) => a.delta - b.delta)[0]
      insights.push({
        id: `insight.dimension-drop.${worst.name}`,
        severity: 'warning',
        title: `${worst.displayName} turun ${worst.delta}% partisipasi`,
        body: 'Cek apakah ada penurunan jadwal kegiatan atau partisipasi user di dimensi ini.',
        dimension: worst.name,
      })
    }
  }

  // 3. Quiz coverage rendah
  if (input.quizCoveragePercent < 30) {
    insights.push({
      id: 'insight.quiz-coverage-low',
      severity: 'warning',
      title: `Quiz coverage hanya ${input.quizCoveragePercent}%`,
      body: 'Confidence skor wellbeing menurun. Dorong partisipasi survei untuk dapat insight yang akurat.',
    })
  }

  // 4. Attendance rate rendah
  if (input.attendanceRatePercent < 40) {
    insights.push({
      id: 'insight.attendance-low',
      severity: 'info',
      title: `Attendance rate ${input.attendanceRatePercent}%`,
      body: 'Banyak event terlewat. Tinjau jadwal atau notifikasi reminder.',
    })
  }

  // 5. Overall improvement
  if (input.hasPriorPeriod && input.averageWellbeingIndexDelta >= 5) {
    insights.push({
      id: 'insight.overall-up',
      severity: 'success',
      title: `Indeks wellbeing keseluruhan naik +${input.averageWellbeingIndexDelta}`,
      body: 'Tren positif. Rangkum penyebab utama untuk dijadikan playbook.',
    })
  }

  return insights.slice(0, 5)
}

function buildRecommendations(input: {
  dimensionScores: DimensionScore[]
  attentionCounts: { noRecentQuiz: number; lowAttendance: number; inactive: number }
}): RecommendationItem[] {
  const recommendations: RecommendationItem[] = []

  const ranked = [...input.dimensionScores].sort((left, right) => left.index - right.index)
  const lowest = ranked[0]
  if (lowest && lowest.index < 40) {
    recommendations.push({
      id: `recommendation.literacy.${lowest.name}`,
      title: `Buat program intensif ${lowest.displayName}`,
      body: `Hanya ${lowest.index}% karyawan aktif di ${lowest.displayName}. Susun konten edukasi dan kegiatan rutin minggu ini.`,
      dimension: lowest.name,
    })
  }

  if (input.attentionCounts.inactive > 0) {
    recommendations.push({
      id: 'recommendation.reactivate-inactive',
      title: 'Kirim pengingat ke pengguna inaktif',
      body: `Terdapat ${input.attentionCounts.inactive} karyawan tanpa aktivitas pada periode ini. Dorong kembali keterlibatan mereka.`,
    })
  }

  if (input.attentionCounts.noRecentQuiz > 0) {
    recommendations.push({
      id: 'recommendation.quiz-followup',
      title: 'Ingatkan pengguna untuk mengisi survei',
      body: `${input.attentionCounts.noRecentQuiz} karyawan belum mengisi survei. Survei diperlukan untuk akurasi indeks.`,
    })
  }

  if (input.attentionCounts.lowAttendance > 0) {
    recommendations.push({
      id: 'recommendation.social-engagement',
      title: 'Buat Social Wellbeing Challenge',
      body: 'Tingkatkan koneksi antar karyawan melalui tantangan kolaboratif ringan.',
      dimension: 'social',
    })
  }

  // Always-on default if nothing was triggered
  if (recommendations.length === 0) {
    recommendations.push({
      id: 'recommendation.maintain-momentum',
      title: 'Pertahankan momentum',
      body: 'Tidak ada anomali signifikan terdeteksi. Lanjutkan program yang sudah berjalan dan monitor periode berikutnya.',
    })
  }

  return recommendations.slice(0, 4)
}
