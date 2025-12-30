import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, password, fullName } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !username || !password) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify Admin (Strict check)
    const { data: adminUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single()

    if (adminUser?.username !== 'admin_wam') {
         return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 })
    }

    // 2. Check if username exists
    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single()
    
    if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // 3. Create User
    // Generate a pseudo-random ID (Negative to avoid Strava collisions)
    const newId = -Math.abs(Date.now() + Math.floor(Math.random() * 1000))

    const { error } = await supabase
        .from('profiles')
        .insert({
            id: newId,
            username: username,
            full_name: fullName || username,
            password: password, // Plain text as requested
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            is_manual: true,
            access_code: `CODE-${Math.floor(Math.random() * 9000) + 1000}` // Generate random access code
        })

    if (error) {
        console.error('Create User Error:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create User Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
