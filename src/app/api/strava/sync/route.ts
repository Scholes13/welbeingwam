import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { calculateAvailableCoins, calculateTotalEarnedPoints, sumNumericField, toSafeNumber } from '@/lib/points'
import {
  buildCombinedActivities,
  sumApprovedQuestPoints,
  type ActivityItem,
  type AttendanceItem,
  type Quest,
  type UserQuest,
} from '@/lib/gamification'
import { NextResponse } from 'next/server'

type ProfileRow = {
  id: string | number
  full_name: string | null
  avatar_url: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_expires_at: number | null
  strava_athlete_id: number | null
  [key: string]: unknown
}

type StravaTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

type StravaProfileResponse = {
  profile?: string
}

type StravaActivityResponse = {
  id: number
  name: string
  distance: number
  moving_time: number
  type: string
  start_date: string
  average_cadence?: number
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

function extractAttendanceActivity(row: AttendanceRow): AttendanceActivity | null {
  if (!row.activity) return null
  if (Array.isArray(row.activity)) return row.activity[0] ?? null
  return row.activity
}

type QuestRow = {
  id: string
  points: number | null
}

type UserQuestRow = {
  quest_id: string
  status: string | null
}

export async function GET() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId

  try {
    const supabase = createSupabaseAdminClient()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const profile = profileData as ProfileRow | null
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const hasStrava = Boolean(profile.strava_access_token) && Boolean(profile.strava_athlete_id)

    if (hasStrava) {
      let currentAccessToken = profile.strava_access_token as string
      const expiresAt = profile.strava_expires_at ?? 0
      const isExpired = expiresAt < Date.now() / 1000 + 300

      if (isExpired && profile.strava_refresh_token) {
        const refreshRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: profile.strava_refresh_token,
          }),
        })

        const newTokens = (await refreshRes.json()) as StravaTokenResponse
        if (newTokens.access_token) {
          currentAccessToken = newTokens.access_token
          await supabase
            .from('profiles')
            .update({
              strava_access_token: newTokens.access_token,
              strava_refresh_token: newTokens.refresh_token,
              strava_expires_at: newTokens.expires_at,
            })
            .eq('id', userId)
        }
      }

      const [profileRes, activitiesRes] = await Promise.all([
        fetch('https://www.strava.com/api/v3/athlete', {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        }),
        fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        }),
      ])

      if (profileRes.ok && activitiesRes.ok) {
        const stravaProfile = (await profileRes.json()) as StravaProfileResponse
        const rawActivities = (await activitiesRes.json()) as unknown

        await supabase
          .from('profiles')
          .update({
            avatar_url: stravaProfile.profile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (Array.isArray(rawActivities)) {
          const activities = rawActivities as StravaActivityResponse[]
          const dbActivities: ActivityItem[] = activities.map((activity) => {
            const cadence = activity.average_cadence ?? 0
            const minutes = activity.moving_time / 60
            const estimatedSteps = Math.round(cadence * 2 * minutes)

            return {
              id: activity.id,
              user_id: userId,
              name: activity.name,
              distance: activity.distance,
              moving_time: activity.moving_time,
              type: activity.type,
              start_date: activity.start_date,
              steps: estimatedSteps,
            }
          })

          const { error: actError } = await supabase.from('activities').upsert(dbActivities)
          if (actError) console.error('Error saving activities:', actError)
        }
      }
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
    const { data: adjustments } = await supabase.from('point_adjustments').select('points').eq('user_id', userId)

    const quests: Quest[] = ((questsData ?? []) as QuestRow[]).map((quest) => ({
      id: quest.id,
      points: toSafeNumber(quest.points),
    }))

    const userQuests: UserQuest[] = ((userQuestsData ?? []) as UserQuestRow[]).map((userQuest) => ({
      quest_id: userQuest.quest_id,
      status: userQuest.status,
    }))

    const totalSteps = sumNumericField(activities, (activity) => activity.steps)
    const totalQuestPoints = sumApprovedQuestPoints(userQuests, quests)
    const totalAdjustments = sumNumericField(adjustments as { points: number | null }[] | null | undefined, (row) => row.points)

    const totalPoints = calculateTotalEarnedPoints({
      totalSteps,
      questPoints: totalQuestPoints,
      adjustmentPoints: totalAdjustments,
    })

    const { data: spentRewards } = await supabase
      .from('user_rewards')
      .select('cost')
      .eq('user_id', userId)
      .eq('claim_status', 'active')
    const totalSpent = sumNumericField(spentRewards as { cost: number | null }[] | null | undefined, (row) => row.cost)

    const { data: coinTransactions } = await supabase.from('coin_transactions').select('amount').eq('user_id', userId)
    const coinTransactionTotal = sumNumericField(coinTransactions as { amount: number | null }[] | null | undefined, (row) => row.amount)

    const availableCoins = calculateAvailableCoins({ totalEarned: totalPoints, totalSpent }) + coinTransactionTotal

    return NextResponse.json({
      profile: {
        ...profile,
        firstname: profile.full_name?.split(' ')[0] ?? 'User',
        lastname: profile.full_name?.split(' ').slice(1).join(' ') ?? '',
        profile: profile.avatar_url,
      },
      activities: allActivities,
      quests: questsData ?? [],
      userQuests: userQuestsData ?? [],
      surveys: surveys ?? [],
      totalPoints,
      coins: availableCoins,
    })
  } catch (error) {
    console.error('Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
