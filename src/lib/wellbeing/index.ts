import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { parseWellbeingPeriod } from './period-filter'
import { calculateWellbeingIndex } from './calculator'
import { resolveDominantDimension } from './dimension-mapper'
import { normalizeCoverageScore, normalizeCountScore } from './source-normalizer'
import type { WellbeingOverviewPayload, WellbeingUserDetailPayload } from './types'

// TODO(v2): only add reward or quest signals after they have explicit dimension mapping and a validated wellbeing use case.

export async function buildWellbeingOverview(searchParams: URLSearchParams): Promise<WellbeingOverviewPayload> {
  const period = parseWellbeingPeriod(searchParams)
  const supabase = createSupabaseAdminClient()
  const warnings: string[] = []

  // Calculate prior period for trend comparison
  let priorStart: Date | null = null
  let priorEnd: Date | null = null
  if (period.start) {
    const periodDays = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))
    priorEnd = new Date(period.start)
    priorEnd.setDate(priorEnd.getDate() - 1)
    priorStart = new Date(priorEnd)
    priorStart.setDate(priorStart.getDate() - periodDays + 1)
  }

  // Fetch all active profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .order('id')

  if (!profiles || profiles.length === 0) {
    return buildEmptyOverview(period, warnings)
  }

  const userIds = profiles.map(p => p.id)

  // Fetch quiz submissions in period
  const quizQuery = supabase
    .from('survey_submissions')
    .select('user_id, created_at')
    .in('user_id', userIds)

  if (period.start) {
    quizQuery.gte('created_at', period.start.toISOString())
  }
  quizQuery.lte('created_at', period.end.toISOString())

  const { data: quizSubmissions } = await quizQuery

  // Fetch sport activities (exclude voided/rejected)
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

  // Fetch attendance records
  const attendanceQuery = supabase
    .from('attendance')
    .select('user_id, scan_in_at, state')
    .in('user_id', userIds)

  if (period.start) {
    attendanceQuery.gte('scan_in_at', period.start.toISOString())
  }
  attendanceQuery.lte('scan_in_at', period.end.toISOString())

  const { data: attendanceRecords } = await attendanceQuery

  // Aggregate per-user metrics
  const userMetrics = profiles.map(profile => {
    const quizCount = quizSubmissions?.filter(q => q.user_id === profile.id).length ?? 0
    const sportCount = sportActivities?.filter(s => s.user_id === profile.id).length ?? 0
    const attendanceCount = attendanceRecords?.filter(a => a.user_id === profile.id && a.state === 'present').length ?? 0

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

    return {
      userId: profile.id,
      username: profile.username,
      wellbeingIndex,
      quizCount,
      sportCount,
      attendanceCount,
      isActive,
    }
  })

  const activeUsers = userMetrics.filter(u => u.isActive)
  const activeUsersPercent = profiles.length > 0 ? Math.round((activeUsers.length / profiles.length) * 100) : 0
  const averageWellbeingIndex = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, u) => sum + u.wellbeingIndex, 0) / activeUsers.length)
    : 0

  const usersWithQuiz = userMetrics.filter(u => u.quizCount > 0).length
  const quizCoveragePercent = profiles.length > 0 ? Math.round((usersWithQuiz / profiles.length) * 100) : 0

  const totalAttendanceOpportunities = profiles.length * 10
  const totalAttendance = userMetrics.reduce((sum, u) => sum + u.attendanceCount, 0)
  const attendanceRatePercent = totalAttendanceOpportunities > 0
    ? Math.round((totalAttendance / totalAttendanceOpportunities) * 100)
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
    dimensionDistribution: [
      { dimension: 'physical', userCount: 0, percentage: 0 },
      { dimension: 'mental', userCount: 0, percentage: 0 },
      { dimension: 'social', userCount: 0, percentage: 0 },
    ],
    attentionCounts: {
      noRecentQuiz: profiles.length - usersWithQuiz,
      lowAttendance: userMetrics.filter(u => u.attendanceCount < 3).length,
      fallingSport: 0,
      inactive: profiles.length - activeUsers.length,
    },
    operationalTables: {
      mostActive: activeUsers
        .sort((a, b) => b.wellbeingIndex - a.wellbeingIndex)
        .slice(0, 10)
        .map(u => ({
          userId: u.userId,
          username: u.username,
          wellbeingIndex: u.wellbeingIndex,
          dominantDimension: 'unknown',
        })),
      highestAttendance: userMetrics
        .sort((a, b) => b.attendanceCount - a.attendanceCount)
        .slice(0, 10)
        .map(u => ({
          userId: u.userId,
          username: u.username,
          wellbeingIndex: u.wellbeingIndex,
          dominantDimension: 'unknown',
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('User not found')
  }

  // Fetch quiz submissions
  const quizQuery = supabase
    .from('survey_submissions')
    .select('created_at')
    .eq('user_id', userId)

  if (period.start) {
    quizQuery.gte('created_at', period.start.toISOString())
  }
  quizQuery.lte('created_at', period.end.toISOString())

  const { data: quizSubmissions } = await quizQuery

  // Fetch sport activities
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

  // Fetch attendance
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
  const attendanceCount = attendanceRecords?.filter(a => a.state === 'present').length ?? 0

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

  const flags: string[] = []
  if (quizCount === 0) flags.push('No quiz submissions in period')
  if (attendanceCount < 3) flags.push('Low attendance')
  if (sportCount === 0) flags.push('No sport activity')

  return {
    userId: profile.id,
    username: profile.username,
    filteredPeriod: {
      wellbeingIndex,
      dominantDimension: 'unknown',
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
