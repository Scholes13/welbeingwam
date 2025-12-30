import { supabase } from '@/lib/supabase/client'

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!

interface StravaActivity {
    id: number
    name: string
    distance: number
    moving_time: number
    type: string
    start_date: string
    map: {
        summary_polyline: string
    }
}

export async function refreshStravaToken(refreshToken: string) {
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to refresh Strava token')
    }

    return response.json()
}

export async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!response.ok) {
        throw new Error('Failed to fetch activities')
    }

    return response.json()
}
