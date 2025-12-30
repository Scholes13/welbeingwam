import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessCode } = await request.json()

    if (!accessCode) {
        return NextResponse.json({ error: 'Access code required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find user by access code
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('access_code', accessCode)
        .single()

    if (error || !user) {
        return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Set Session Cookies
    // We use the same cookie names as Strava login, so the rest of the app works seamlessly
    const cookieStore = await cookies()
    cookieStore.set('strava_athlete_id', user.id, { httpOnly: true, secure: true })
    
    // We set a special flag cookie to know this is a manual user (skips Strava sync)
    cookieStore.set('is_manual_user', 'true', { httpOnly: true, secure: true })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Manual Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
