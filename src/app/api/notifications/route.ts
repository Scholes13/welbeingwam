import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = context.profileId

  const { searchParams } = new URL(request.url)
  const countOnly = searchParams.get('count_only') === 'true'

  const supabase = createSupabaseAdminClient()

  try {
      if (countOnly) {
          const { count, error } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('is_read', false)
          
          if (error) throw error
          return NextResponse.json({ count })
      } else {
          const { data, error } = await supabase
              .from('notifications')
              .select('id, message, is_read, created_at, sender_id, sender:profiles!sender_id(username, full_name, avatar_url)')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20)

          if (error) throw error
          return NextResponse.json({ notifications: data })
      }

  } catch (error) {
    console.error('Notifications Error:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
    const context = await getAuthProfileContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = context.profileId

    const { notificationId } = await request.json()

    const supabase = createSupabaseAdminClient()

    try {
        if (notificationId === 'all') {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', userId)
            if (error) throw error
        }

        return NextResponse.json({ success: true })
        
    } catch {
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
