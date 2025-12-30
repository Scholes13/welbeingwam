import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
        return NextResponse.json({ error: 'Username/Password required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find user by username
    const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

    if (error || !user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check Password (Plain text for MVP as requested "user password akan di set oleh super admin")
    if (user.password !== password) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Set Session Cookies
    const cookieStore = await cookies()
    cookieStore.set('strava_athlete_id', user.id, { httpOnly: true, secure: true }) // Reuse existing cookie logic
    cookieStore.set('is_manual_user', 'true', { httpOnly: true, secure: true })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
