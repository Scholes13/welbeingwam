import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { calculateAvailableCoins, calculateTotalEarnedPoints, convertStepsToPoints, sumNumericField, toSafeNumber } from '@/lib/points'
import {
  buildCombinedActivities,
  sumApprovedQuestPoints,
  type AttendanceItem,
  type Quest,
  type UserQuest,
} from '@/lib/gamification'
import {
  getStravaActivitiesNeedingDetail,
  mergeStravaActivity,
  resolveStravaSyncCooldown,
  shouldRefreshStravaToken,
  shouldRunStravaSync,
  type ExistingStravaActivity,
  type StravaActivityDetail,
  type StravaActivitySummary,
} from '@/lib/strava/sync'
import { NextResponse } from 'next/server'

type ProfileRow = {
  id: string | number
  full_name: string | null
  avatar_url: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_expires_at: number | null
  strava_athlete_id: number | null
  last_strava_sync_at?: string | null
  [key: string]: unknown
}

type StravaTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

type StravaProfileResponse = {
  profile?: string | null
}

type ExistingStravaActivityRow = ExistingStravaActivity & {
  id: string | number
  external_id: string | null
}

type ActivityRow = {
  id: string | number
  user_id: string | number
  name: string | null
  distance: number | null
  moving_time: number | null
  type: string | null
  start_date: string
  steps: number | null
  mode?: string | null
  calories?: number | null
  activity_points?: number | null
  review_status?: string | null
  proof_url?: string | null
  source?: string | null
  dimension_id?: string | null
}

type AttendanceRow = {
  scanned_at: string
  scan_out_at: string | null
  final_points: number | null
  state: string | null
  activity:
    | {
        id: string
        title: string
        points: number | null
        activity_date: string
      }
    | {
        id: string
        title: string
        points: number | null
        activity_date: string
      }[]
    | null
}

type AttendanceActivity = {
  id: string
  title: string
  points: number | null
  activity_date: string
}

type QuestRow = {
  id: string
  points: number | null
  dimension?: {
    id?: string
    name?: string | null
  } | null
}

type UserQuestRow = {
  quest_id: string
  status: string | null
}

function extractAttendanceActivity(row: AttendanceRow): AttendanceActivity | null {
  if (!row.activity) return null
  if (Array.isArray(row.activity)) return row.activity[0] ?? null
  return row.activity
}

function buildStravaRecordId(stravaActivityId: number): number {
  return -Math.abs(Math.trunc(stravaActivityId))
}

async function getPhysicalDimensionId(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from('dimensions')
    .select('id')
    .eq('name', 'physical')
    .maybeSingle()

  if (error) {
    console.error('Failed to resolve physical dimension:', error)
    return null
  }

  return (data?.id as string | undefined) ?? null
}

async function getStravaSyncCooldownMinutes(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'strava_sync_cooldown_minutes')
    .maybeSingle()

  if (error) {
    console.error('Failed to read Strava sync cooldown:', error)
  }

  return resolveStravaSyncCooldown((data as { value?: string | null } | null)?.value)
}

async function refreshStravaAccessToken(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  profile: ProfileRow
  userId: string | number
}): Promise<string | null> {
  const currentAccessToken = input.profile.strava_access_token
  if (!currentAccessToken) return null

  if (
    !shouldRefreshStravaToken({
      expiresAt: input.profile.strava_expires_at,
    }) ||
    !input.profile.strava_refresh_token
  ) {
    return currentAccessToken
  }

  const refreshRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: input.profile.strava_refresh_token,
    }),
  })

  if (!refreshRes.ok) {
    console.error('Failed to refresh Strava token:', refreshRes.status, refreshRes.statusText)
    return currentAccessToken
  }

  const newTokens = (await refreshRes.json()) as StravaTokenResponse
  if (!newTokens.access_token) return currentAccessToken

  const { error } = await input.supabase
    .from('profiles')
    .update({
      strava_access_token: newTokens.access_token,
      strava_refresh_token: newTokens.refresh_token,
      strava_expires_at: newTokens.expires_at,
    })
    .eq('id', input.userId)

  if (error) {
    console.error('Failed to persist refreshed Strava tokens:', error)
  }

  return newTokens.access_token
}

async function fetchStravaJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Strava request failed for ${url}: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

async function syncStravaActivities(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  profile: ProfileRow
  userId: string | number
  physicalDimensionId: string | null
}): Promise<Partial<ProfileRow> | null> {
  const hasStrava = Boolean(input.profile.strava_access_token) && Boolean(input.profile.strava_athlete_id)
  if (!hasStrava) return null

  const nowIso = new Date().toISOString()
  const cooldownMinutes = await getStravaSyncCooldownMinutes(input.supabase)

  if (
    !shouldRunStravaSync({
      lastSyncedAt: input.profile.last_strava_sync_at,
      now: nowIso,
      cooldownMinutes,
    })
  ) {
    return null
  }

  const accessToken = await refreshStravaAccessToken(input)
  if (!accessToken) return null

  const [profileResult, summariesResult] = await Promise.allSettled([
    fetchStravaJson<StravaProfileResponse>('https://www.strava.com/api/v3/athlete', accessToken),
    fetchStravaJson<StravaActivitySummary[]>('https://www.strava.com/api/v3/athlete/activities?per_page=30', accessToken),
  ])

  if (summariesResult.status !== 'fulfilled') {
    console.error('Strava summary sync failed:', summariesResult.reason)
    return null
  }

  const stravaProfile = profileResult.status === 'fulfilled' ? profileResult.value : null
  const summaries = Array.isArray(summariesResult.value) ? summariesResult.value : []
  const externalIds = summaries.map((summary) => String(summary.id))

  let existingActivities: ExistingStravaActivityRow[] = []
  if (externalIds.length > 0) {
    const { data, error } = await input.supabase
      .from('activities')
      .select('id, external_id, review_status, review_reason, proof_url, calories, has_calories, last_synced_at')
      .eq('user_id', input.userId)
      .eq('source', 'strava')
      .in('external_id', externalIds)

    if (error) {
      console.error('Failed to load existing Strava activities:', error)
    } else {
      existingActivities = (data ?? []) as ExistingStravaActivityRow[]
    }
  }

  const detailCandidates = getStravaActivitiesNeedingDetail({
    summaries,
    existingActivities,
  })

  const detailResults = await Promise.all(
    detailCandidates.map(async (summary) => {
      try {
        const detail = await fetchStravaJson<StravaActivityDetail>(
          `https://www.strava.com/api/v3/activities/${summary.id}`,
          accessToken
        )

        return [String(summary.id), detail] as const
      } catch (error) {
        console.error(`Failed to hydrate Strava activity ${summary.id}:`, error)
        return [String(summary.id), {} as StravaActivityDetail] as const
      }
    })
  )

  const detailByExternalId = new Map(detailResults)
  const existingByExternalId = new Map(
    existingActivities
      .filter((activity) => activity.external_id)
      .map((activity) => [String(activity.external_id), activity])
  )

  const payloads = summaries.map((summary) => {
    const existing = existingByExternalId.get(String(summary.id)) ?? null
    const detail = detailByExternalId.get(String(summary.id)) ?? { calories: existing?.calories ?? null }

    return mergeStravaActivity({
      summary,
      detail,
      existing,
      physicalDimensionId: input.physicalDimensionId,
      userId: input.userId,
      syncedAt: nowIso,
      recordId: existing?.id ?? buildStravaRecordId(summary.id),
    })
  })

  if (payloads.length > 0) {
    const { error } = await input.supabase.from('activities').upsert(payloads, { onConflict: 'id' })
    if (error) {
      console.error('Error saving Strava sport sessions:', error)
      return null
    }
  }

  const profileUpdates: Record<string, unknown> = {
    last_strava_sync_at: nowIso,
    updated_at: nowIso,
  }

  if (stravaProfile?.profile) {
    profileUpdates.avatar_url = stravaProfile.profile
  }

  const { error: profileError } = await input.supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', input.userId)

  if (profileError) {
    console.error('Failed to update Strava sync metadata on profile:', profileError)
  }

  return {
    avatar_url: (profileUpdates.avatar_url as string | null | undefined) ?? input.profile.avatar_url,
    last_strava_sync_at: nowIso,
  }
}

export async function GET() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId

  try {
    const supabase = createSupabaseAdminClient()
    const physicalDimensionId = await getPhysicalDimensionId(supabase)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const profile = profileData as ProfileRow | null
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profileUpdates = await syncStravaActivities({
      supabase,
      profile,
      userId,
      physicalDimensionId,
    })

    const responseProfile = {
      ...profile,
      ...profileUpdates,
    }

    const { data: activityData } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })

    const { data: attendanceData } = await supabase
      .from('attendance')
      .select(`
            scanned_at,
            scan_out_at,
            final_points,
            state,
            activity:admin_activities(id, title, points, activity_date)
        `)
      .eq('user_id', userId)

    const activities = ((activityData ?? []) as ActivityRow[]).map((activity) => ({
      id: activity.id,
      user_id: activity.user_id,
      name: activity.name ?? 'Activity',
      distance: toSafeNumber(activity.distance),
      moving_time: toSafeNumber(activity.moving_time),
      type: activity.type ?? 'Unknown',
      start_date: activity.start_date,
      steps: toSafeNumber(activity.steps),
      mode: activity.mode ?? 'daily',
      calories: toSafeNumber(activity.calories),
      activity_points: toSafeNumber(activity.activity_points),
      review_status: activity.review_status ?? 'approved',
      proof_url: activity.proof_url ?? null,
      source: activity.source ?? 'manual',
      dimension_id: activity.dimension_id ?? null,
    }))

    const attendance = ((attendanceData ?? []) as AttendanceRow[])
      .map((row) => ({ row, activity: extractAttendanceActivity(row) }))
      .filter((item): item is { row: AttendanceRow; activity: AttendanceActivity } => Boolean(item.activity))
      .filter((item) => item.row.state === 'completed' || item.row.state === 'completed_penalty' || Boolean(item.row.scan_out_at))
      .map((item): AttendanceItem => ({
        scanned_at: item.row.scan_out_at || item.row.scanned_at,
        activity: {
          id: item.activity.id,
          title: item.activity.title,
          points: item.row.final_points ?? item.activity.points,
        },
      }))

    const allActivities = buildCombinedActivities({
      userId,
      activities,
      attendance,
    })

    const { data: questsData } = await supabase.from('quests').select('*, dimension:dimensions(id, name, display_name, icon)').eq('is_active', true)
    const { data: userQuestsData } = await supabase.from('user_quests').select('*').eq('user_id', userId)
    const { data: surveys } = await supabase.from('surveys').select('*').eq('is_active', true)
    const { data: adjustments } = await supabase.from('point_adjustments').select('points, dimension_id').eq('user_id', userId)

    const quests: Quest[] = ((questsData ?? []) as QuestRow[]).map((quest) => ({
      id: quest.id,
      points: toSafeNumber(quest.points),
      dimension: quest.dimension
        ? {
            id: quest.dimension.id,
            name: quest.dimension.name ?? null,
          }
        : null,
    }))

    const userQuests: UserQuest[] = ((userQuestsData ?? []) as UserQuestRow[]).map((userQuest) => ({
      quest_id: userQuest.quest_id,
      status: userQuest.status,
    }))

    const totalSteps = sumNumericField(activities, (activity) => activity.steps)
    const totalActivityPoints = sumNumericField(
      activities.filter((activity) => activity.review_status !== 'voided' && activity.review_status !== 'rejected'),
      (activity) => activity.activity_points
    )
    const stepPoints = convertStepsToPoints(totalSteps)
    const totalQuestPoints = sumApprovedQuestPoints(userQuests, quests)
    const totalAdjustments = sumNumericField(adjustments as { points: number | null }[] | null | undefined, (row) => row.points)
    const approvedQuestIds = new Set(userQuests.filter((userQuest) => userQuest.status === 'approved').map((userQuest) => userQuest.quest_id))
    const physicalQuestPoints = sumNumericField(
      quests.filter((quest) => approvedQuestIds.has(quest.id) && quest.dimension?.name === 'physical'),
      (quest) => quest.points
    )
    const physicalAdjustmentPoints = sumNumericField(
      (adjustments as { points: number | null; dimension_id?: string | null }[] | null | undefined)?.filter(
        (row) => row.dimension_id && row.dimension_id === physicalDimensionId
      ),
      (row) => row.points
    )

    const totalPoints = calculateTotalEarnedPoints({
      totalSteps,
      totalActivityPoints,
      questPoints: totalQuestPoints,
      adjustmentPoints: totalAdjustments,
    })

    const { data: spentRewards } = await supabase.from('user_rewards').select('cost').eq('user_id', userId)
    const totalSpent = sumNumericField(spentRewards as { cost: number | null }[] | null | undefined, (row) => row.cost)

    const { data: coinTransactions } = await supabase.from('coin_transactions').select('amount').eq('user_id', userId)
    const coinTransactionTotal = sumNumericField(coinTransactions as { amount: number | null }[] | null | undefined, (row) => row.amount)

    const availableCoins = calculateAvailableCoins({ totalEarned: totalPoints, totalSpent }) + coinTransactionTotal

    return NextResponse.json({
      profile: {
        ...responseProfile,
        firstname: responseProfile.full_name?.split(' ')[0] ?? 'User',
        lastname: responseProfile.full_name?.split(' ').slice(1).join(' ') ?? '',
        profile: responseProfile.avatar_url,
      },
      activities: allActivities,
      quests: questsData ?? [],
      userQuests: userQuestsData ?? [],
      surveys: surveys ?? [],
      totalPoints,
      stepPoints,
      sportPoints: totalActivityPoints,
      totalPhysicalPoints: stepPoints + totalActivityPoints + physicalQuestPoints + physicalAdjustmentPoints,
      coins: availableCoins,
    })
  } catch (error) {
    console.error('Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
