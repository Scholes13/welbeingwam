import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('strava_access_token')?.value
  const athleteId = cookieStore.get('strava_athlete_id')?.value

  if (!athleteId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const isManual = cookieStore.get('is_manual_user')?.value === 'true'
    
    // 0. Get Supabase Client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // === MANUAL USER FLOW ===
    if (isManual || (!accessToken && athleteId)) {
        // Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', athleteId)
            .single()

        // Fetch Activities
        const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', athleteId)
            .eq('user_id', athleteId)
            .order('start_date', { ascending: false })

        // Fetch Attendance (Manual User)
         const { data: attendance } = await supabase
            .from('attendance')
            .select(`
                scanned_at,
                activity:admin_activities(id, title, points, activity_date)
            `)
            .eq('user_id', athleteId)
        
        // Merge Manual Activities + Attendance
        const attendanceActivities = attendance?.map((att: any) => ({
            id: `att-${att.activity.id}-${new Date(att.scanned_at).getTime()}`,
            user_id: athleteId,
            name: att.activity.title,
            distance: 0,
            moving_time: 0,
            type: 'Event',
            start_date: att.scanned_at,
            steps: att.activity.points
        })) || []

        const allActivities = [...(activities || []), ...attendanceActivities]
            .filter((a: any) => !a.name.startsWith('Manual Adjustment:'))
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )

        // Fetch Quests
        const { data: quests } = await supabase.from('quests').select('*').eq('is_active', true)
        const { data: userQuests } = await supabase.from('user_quests').select('*').eq('user_id', athleteId)

        // Fetch Surveys
        const { data: surveys } = await supabase.from('surveys').select('*').eq('is_active', true)

        // Fetch Point Adjustments
        const { data: adjustments } = await supabase.from('point_adjustments').select('points').eq('user_id', athleteId)

        // Calculate Totals for Manual User
        const totalSteps = activities?.reduce((acc, curr) => acc + (curr.steps || 0), 0) || 0
        
        let totalQuestPoints = 0
        userQuests?.forEach((uq: any) => {
            const quest = quests?.find(q => q.id === uq.quest_id)
            if (quest && uq.status === 'approved') {
                totalQuestPoints += quest.points
            }
        })

        const totalAdjustments = adjustments?.reduce((sum, adj) => sum + adj.points, 0) || 0
        const totalPoints = totalSteps + totalQuestPoints + totalAdjustments

        return NextResponse.json({
            profile: {
                ...profile,
                firstname: profile?.full_name?.split(' ')[0] || 'User',
                lastname: profile?.full_name?.split(' ').slice(1).join(' ') || '',
                profile: profile?.avatar_url
            },
            activities: allActivities || [],
            quests: quests || [],
            userQuests: userQuests || [],
            surveys: surveys || [],
            totalPoints
        })
    }
    
    // === STRAVA USER FLOW ===
    if (!accessToken) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 0.5 Check if token is expired, if so REFRESH it
    // We need to fetch the user's stored refresh token and credentials first
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', athleteId)
        .single()
    
    let currentAccessToken = accessToken

    if (userProfile) {
        // Simple expiration check (if expires in < 5 mins)
        // Note: timestamp in seconds. Date.now() is ms.
        const isExpired = userProfile.expires_at < (Date.now() / 1000) + 300
        
        if (isExpired && userProfile.refresh_token) {
            console.log('Token expired, refreshing...')
            const clientId = userProfile.strava_client_id || process.env.STRAVA_CLIENT_ID
            const clientSecret = userProfile.strava_client_secret || process.env.STRAVA_CLIENT_SECRET
            
            const refreshRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: userProfile.refresh_token
                })
            })
            
            const newTokens = await refreshRes.json()
            
            if (newTokens.access_token) {
                currentAccessToken = newTokens.access_token
                // Update DB
                await supabase.from('profiles').update({
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token,
                    expires_at: newTokens.expires_at
                }).eq('id', athleteId)
                
                // Note: We can't easily update the HttpOnly cookie here for the *browser* 
                // since this might be a server-side fetch, but we use the new token for THIS request.
            }
        }
    }

    // 1. Fetch from Strava using valid token
    const [profileRes, activitiesRes] = await Promise.all([
      fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${currentAccessToken}` },
      }),
      fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
        headers: { Authorization: `Bearer ${currentAccessToken}` },
      }),
    ])

    if (!profileRes.ok || !activitiesRes.ok) {
        throw new Error('Failed to fetch from Strava')
    }

    const profileData = await profileRes.json()
    const activitiesData = await activitiesRes.json()

    // 2. Sync to Supabase
    // We use service role to allow writing to these tables which usually might be protected
    // 2. Sync to Supabase
    // We use service role to allow writing to these tables which usually might be protected
    // const supabase = createClient(...) // ALREADY CREATED ABOVE

    // Update Profile
    await supabase.from('profiles').upsert({
      id: profileData.id,
      username: profileData.username,
      full_name: `${profileData.firstname} ${profileData.lastname}`,
      avatar_url: profileData.profile,
      updated_at: new Date().toISOString(),
    })

    // Update Activities
    if (Array.isArray(activitiesData)) {
      const dbActivities = activitiesData.map((a: any) => {
        // Calculate steps: (average_cadence * 2) * (moving_time / 60)
        // Strava reports cadence in "rpm" (one leg), so * 2 for both legs.
        const cadence = a.average_cadence || 0
        const minutes = a.moving_time / 60
        const estimatedSteps = Math.round(cadence * 2 * minutes)

        return {
            id: a.id,
            user_id: profileData.id,
            name: a.name,
            distance: a.distance,
            moving_time: a.moving_time,
            type: a.type,
            start_date: a.start_date,
            steps: estimatedSteps // New Field
        }
      })

      const { error: actError } = await supabase
        .from('activities')
        .upsert(dbActivities)
      
      if (actError) console.error('Error saving activities:', actError)
    }

    // Fetch Quests
    const { data: quests } = await supabase.from('quests').select('*').eq('is_active', true)
    const { data: userQuests } = await supabase.from('user_quests').select('*').eq('user_id', profileData.id)

    // Fetch Surveys
    const { data: surveys } = await supabase.from('surveys').select('*').eq('is_active', true)

    // Fetch Attendance (Admin Activities attended)
    const { data: attendance } = await supabase
        .from('attendance')
        .select(`
            scanned_at,
            activity:admin_activities(id, title, points, activity_date)
        `)
        .eq('user_id', profileData.id)

    // Fetch Point Adjustments
    const { data: adjustments } = await supabase.from('point_adjustments').select('points').eq('user_id', profileData.id)

    // Setup Activities Array
    let allActivities: any[] = []

    // 1. Strava/Manual Activities
    if (Array.isArray(activitiesData)) {
            // ... (existing Strava mapping logic, see below for re-integration)
    }
    
    // We need to re-map activitiesData here because we want to combine them before returning
    // Note: We are doing this slightly inefficiently by mapping twice (once for DB upsert, once for return)
    // but cleaner to separate concerns.
    
    // However, for recent activities list, let's just use the `activitiesData` returned from Strava + mapped attendance.
    
    const stravaActivities = Array.isArray(activitiesData) ? activitiesData.map((a: any) => {
         const cadence = a.average_cadence || 0
         const minutes = a.moving_time / 60
         const estimatedSteps = Math.round(cadence * 2 * minutes)
         return {
            id: a.id,
            user_id: profileData.id,
            name: a.name,
            distance: a.distance,
            moving_time: a.moving_time,
            type: a.type,
            start_date: a.start_date,
            steps: estimatedSteps
        }
    }) : []

    // 2. Attendance Activities
    const attendanceActivities = attendance?.map((att: any) => ({
        id: `att-${att.activity.id}-${new Date(att.scanned_at).getTime()}`, // Unique ID for key
        user_id: profileData.id,
        name: att.activity.title,
        distance: 0,
        moving_time: 0,
        type: 'Event',
        start_date: att.scanned_at, // Use scan time as activity time
        steps: att.activity.points // Showing points as "steps" for consistency in UI
    })) || []

    allActivities = [...stravaActivities, ...attendanceActivities]
        .filter(a => !a.name.startsWith('Manual Adjustment:')) // Filter out admin adjustments from UI
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    )

    // Calculate Totals based on allActivities? 
    // Wait, totalSteps should ONLY be physical steps.
    // Total Points handles the event points via `adjustments` (since attendance inserts into point_adjustments).
    // So we don't need to change total points calculation logic much, just ensure we don't double count if we changed logic.
    // My previous logic used `activitiesData` for steps and `adjustments` for points.
    // `attendance` inserts into `point_adjustments`.
    // So `totalAdjustments` ALREADY includes `attendance` points.
    // So `totalSteps` should ONLY count physical steps (stravaActivities).
    
    // Calculate Totals
    let totalSteps = 0
    stravaActivities.forEach((a: any) => {
         totalSteps += (a.steps || 0)
    })

    let totalQuestPoints = 0
    userQuests?.forEach((uq: any) => {
        // Need to find the quest details to get points. 
        // We fetched all active quests into `quests`.
        const quest = quests?.find(q => q.id === uq.quest_id)
        if (quest && uq.status === 'approved') {
            totalQuestPoints += quest.points
        }
    })

    const totalAdjustments = adjustments?.reduce((sum, adj) => sum + adj.points, 0) || 0

    const totalPoints = totalSteps + totalQuestPoints + totalAdjustments

    return NextResponse.json({
        profile: {
            ...profileData,
            instagram_username: userProfile?.instagram_username,
            access_code: userProfile?.access_code
        },
        activities: allActivities,
        quests: quests || [],
        userQuests: userQuests || [],
        surveys: surveys || [],
        totalPoints // Returning calculated total points
    })

  } catch (error) {
    console.error('Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
