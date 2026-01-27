import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'

export async function POST(request: Request) {
  try {
    const { title, description } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { data, error } = await supabase
        .from('surveys')
        .insert({ title, description })
        .select()
        .single()

    if (error) throw error

    return NextResponse.json({ success: true, survey: data })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : JSON.stringify(error) }, { status: 500 })
  }
}
