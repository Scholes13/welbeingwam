
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
    // 1. Verify Admin Status
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

    if (profile?.username !== 'admin_wam') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { targetUserId, points, reason } = await request.json()
    
    if (!targetUserId || !points || !reason) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. Insert Adjustment
    const { error: adjError } = await supabase
        .from('point_adjustments')
        .insert({
            user_id: targetUserId,
            points: points,
            reason: reason,
            admin_id: userId
        })

    if (adjError) {
        console.error('Adjustment Insert Error:', adjError)
        throw adjError
    }

    // 3. Create Notification
    const type = points > 0 ? 'success' : 'warning'
    const title = points > 0 ? 'Points Received!' : 'Points Deducted'
    const message = points > 0 
        ? `You received ${points} points! Reason: ${reason}`
        : `You lost ${Math.abs(points)} points. Reason: ${reason}`

    const { error: notifError } = await supabase
        .from('notifications')
        .insert({
            user_id: targetUserId,
            title,
            message,
            type,
            is_read: false
        })

    if (notifError) {
         console.error('Notification Insert Error:', notifError)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Point Adjustment Error (Catch):', error)
    return NextResponse.json({ error: 'Failed to adjust points', details: error }, { status: 500 })
  }
}
