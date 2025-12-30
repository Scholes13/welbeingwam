import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  try {
    // 1. Exchange code for tokens
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

    // 2. Upsert user to Supabase (using Service Role for full access)
    // Note: client side client can't write to profiles typically without auth.users, 
    // so we use service role here since we are in a trusted API route.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: athlete.id,
      username: athlete.username,
      full_name: `${athlete.firstname} ${athlete.lastname}`,
      avatar_url: athlete.profile,
      access_token,
      refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    })

    if (upsertError) {
        console.error('Supabase Upsert Error:', upsertError)
        throw upsertError
    }

    // 3. Set Cookie
    const cookieStore = await cookies()
    cookieStore.set('strava_athlete_id', athlete.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    
    // Also store access token in cookie for easier client-side fetching if needed, 
    // though safer to fetch via server action or API. 
    // For now we'll put it in cookie to match previous logic simply.
    cookieStore.set('strava_access_token', access_token, {
        httpOnly: true, // Changing to httpOnly for security, we'll pass it to client via page props or API if needed
        secure: process.env.NODE_ENV === 'production',
        maxAge: expires_at - Math.floor(Date.now() / 1000), 
        path: '/',
    })

    return NextResponse.redirect(`${origin}/dashboard`)
  } catch (error) {
    console.error('Auth Error:', error)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }
}
