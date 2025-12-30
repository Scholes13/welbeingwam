
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('strava_athlete_id')?.value

  if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', userId) // Security check

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Mark Read Error:', error)
    return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 })
  }
}
