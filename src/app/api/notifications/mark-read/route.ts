
import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = context.profileId

  const supabase = createSupabaseAdminClient()

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
