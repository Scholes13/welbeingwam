import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Verify Admin
    const { authorized } = await verifyAdminPermission(supabase, currentUserId, 'manage_users')

    if (!authorized) {
         return NextResponse.json({ error: 'Unauthorized: Insufficient permissions' }, { status: 403 })
    }

    // 2. Fetch all users
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
