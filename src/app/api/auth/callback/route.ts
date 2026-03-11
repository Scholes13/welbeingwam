import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { resolveProfileIdFromAuthUser } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?error=missing_code`)
  }

  try {
    // 1. Exchange code for Strava tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.errors) {
      throw new Error(JSON.stringify(tokenData))
    }

    const { athlete, access_token, refresh_token, expires_at } = tokenData

    // 2. Get current logged-in user (must be authenticated first)
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/?error=not_logged_in`)
    }

    const profileId = await resolveProfileIdFromAuthUser({
      id: user.id,
      email: user.email,
    })

    if (profileId === null) {
      return NextResponse.redirect(`${origin}/dashboard?error=profile_not_found`)
    }

    // 3. Update profile with Strava data (Connect Strava to existing account)
    const adminClient = createSupabaseAdminClient()
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        strava_athlete_id: athlete.id,
        strava_access_token: access_token,
        strava_refresh_token: refresh_token,
        strava_expires_at: expires_at,
        avatar_url: athlete.profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)

    if (updateError) {
      console.error('Strava Link Error:', updateError)
      throw updateError
    }

    return NextResponse.redirect(`${origin}/dashboard?strava=connected`)
  } catch (error) {
    console.error('Strava Connect Error:', error)
    return NextResponse.redirect(`${origin}/dashboard?error=strava_failed`)
  }
}
