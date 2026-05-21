import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        user_id,
        name,
        type,
        start_date,
        calories,
        distance,
        activity_points,
        has_calories,
        proof_url,
        proof_urls,
        review_status,
        review_reason,
        source,
        profile:profiles(full_name, username, avatar_url)
      `)
      .eq('mode', 'sport')
      .order('start_date', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch sport sessions error:', error)
      return NextResponse.json({ error: 'Failed to fetch sport sessions' }, { status: 500 })
    }

    const sessions = (data ?? []).map((session) => {
      const profile = Array.isArray(session.profile) ? (session.profile[0] ?? null) : session.profile
      return {
        ...session,
        profile,
      }
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Sport sessions route error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
