import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { toSafeNumber, sumNumericField } from '@/lib/points'
import {
  buildCombinedActivities,
  type AttendanceItem,
  type Quest,
  type UserQuest,
} from '@/lib/gamification'
import {
  getStoredStravaAccessToken,
  getStoredStravaExpiresAt,
  getStoredStravaRefreshToken,
  hasStoredStravaConnection,
} from '@/lib/strava/sync'
import { isDowngradeMode } from '@/lib/downgrade'
import { NextResponse } from 'next/server'
import { supportsAvatarPreferences, type ProfileRow } from '@/lib/strava/types'
import { getPhysicalDimensionId, syncStravaActivities } from '@/lib/strava/activities'
import { calculateSyncPoints } from '@/lib/strava/points'

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

export async function GET() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId
  const downgradeActive = isDowngradeMode()

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
    const avatarPreferencesSupported = supportsAvatarPreferences(profile)

    // Skip Strava sync in downgrade mode, but still load all user data
    const profileUpdates = downgradeActive
      ? null
      : await syncStravaActivities({
          supabase,
          profile,
          userId,
          physicalDimensionId,
        })

  const responseProfile = {
      ...profile,
      manual_avatar_url: profile.manual_avatar_url ?? profile.avatar_url,
      strava_avatar_url: profile.strava_avatar_url ?? null,
      strava_avatar_preview_url:
        (profileUpdates?.strava_avatar_preview_url as string | null | undefined) ??
        profile.strava_avatar_url ??
        null,
      avatar_source: profile.avatar_source ?? 'manual',
      avatar_preferences_supported: avatarPreferencesSupported,
      strava_access_token: getStoredStravaAccessToken(profile),
      strava_refresh_token: getStoredStravaRefreshToken(profile),
      strava_expires_at: getStoredStravaExpiresAt(profile),
      is_strava_connected: hasStoredStravaConnection(profile),
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

    const { data: spentRewards } = await supabase.from('user_rewards').select('cost').eq('user_id', userId)
    const totalSpent = sumNumericField(spentRewards as { cost: number | null }[] | null | undefined, (row) => row.cost)

    const { data: coinTransactions } = await supabase.from('coin_transactions').select('amount').eq('user_id', userId)
    const coinTransactionTotal = sumNumericField(coinTransactions as { amount: number | null }[] | null | undefined, (row) => row.amount)

    const pointTotals = calculateSyncPoints({
      activities,
      quests,
      userQuests,
      adjustments: adjustments as { points: number | null; dimension_id?: string | null }[] | null | undefined,
      physicalDimensionId,
      totalSpent,
      coinTransactionTotal,
    })

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
      ...pointTotals,
    })
  } catch (error) {
    console.error('Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
