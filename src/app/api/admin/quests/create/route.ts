import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { title, description, points } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !title || !points) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify Admin
    const { data: adminUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single()

    if (adminUser?.username !== 'admin_wam') {
         return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 })
    }

    // Create Quest
    const { error } = await supabase
        .from('quests')
        .insert({
            title,
            description,
            points,
            is_active: true
        })

    if (error) {
        return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
