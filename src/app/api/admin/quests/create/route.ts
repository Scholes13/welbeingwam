import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'

export async function POST(request: Request) {
  try {
    const { title, description, points, expires_at, verification_type } = await request.json()
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
    const { authorized } = await verifyAdminPermission(supabase, currentUserId, 'manage_content')

    if (!authorized) {
         return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 })
    }

    // Create Quest
    const { error } = await supabase
        .from('quests')
        .insert({
            title,
            description,
            points,
            is_active: true,
            expires_at: expires_at || null,
            verification_type: verification_type || 'none'
        })

    if (error) {
        return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
