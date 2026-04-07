import { createSupabaseAdminClient } from '@/lib/supabase/server'

import { calculateWellbeingIndex } from './calculator'
import { resolveDominantDimension } from './dimension-mapper'
import { parseWellbeingPeriod } from './period-filter'
import { normalizeCoverageScore, normalizeCountScore } from './source-normalizer'
import type { WellbeingOverviewPayload, WellbeingUserDetailPayload } from './types'

// TODO(v2): only add reward or quest signals after they have explicit dimension mapping and a validated wellbeing use case.

type UserMetric = {
  userId: number
  username: string
  wellbeingIndex: number
  quizCount: number
  sportCount: number
  attendanceCount: number
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

  if (!profiles || profiles.length === 0) {
    return buildEmptyOverview(period, warnings)
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

    const isActive = quizCount > 0 || sportCount > 0 || attendanceCount > 0
    const dominantDimension = resolveMetricDominantDimension({
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
      quizCoveragePercent,
      attendanceRatePercent,
    },
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
        })),
      highestAttendance: [...userMetrics]
        .sort((left, right) => right.attendanceCount - left.attendanceCount)
        .slice(0, 10)
        .map((user) => ({
          userId: user.userId,
          username: user.username,
          wellbeingIndex: user.wellbeingIndex,
          dominantDimension: user.dominantDimension,
        })),
      biggestDrop: [],
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

  const dominantDimension = resolveMetricDominantDimension({
    quizScore,
    sportScore,
    attendanceScore,
  })

  const flags: string[] = []
  if (quizCount === 0) flags.push('No quiz submissions in period')
  if (attendanceCount < 3) flags.push('Low attendance')
  if (sportCount === 0) flags.push('No sport activity')

  return {
    userId: profile.id,
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

function resolveMetricDominantDimension(input: {
  quizScore: number
  sportScore: number
  attendanceScore: number
}): string {
  return resolveDominantDimension({
    quizDimensions: input.quizScore > 0 ? { mental: input.quizScore } : {},
    activityDimensions: input.sportScore > 0 ? { physical: input.sportScore } : {},
    attendanceDimensions: input.attendanceScore > 0 ? { social: input.attendanceScore } : {},
  }).dimension
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

function buildEmptyOverview(period: ReturnType<typeof parseWellbeingPeriod>, warnings: string[]): WellbeingOverviewPayload {
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
      quizCoveragePercent: 0,
      attendanceRatePercent: 0,
    },
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
