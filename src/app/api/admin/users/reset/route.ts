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
    // 1. Verify Admin Status (Strict check)
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

    if (profile?.username !== 'admin_wam') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { targetUserId, type } = await request.json()
    
    if (!targetUserId || !type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 2. Perform Reset
    if (type === 'steps' || type === 'all') {
        // Delete all activities for this user (resets step count)
        const { error: stepsError } = await supabase
            .from('activities')
            .delete()
            .eq('user_id', targetUserId)
        
        if (stepsError) throw stepsError
    }

    if (type === 'quests' || type === 'all') {
        // Delete all refined quests (resets quest status and points)
        const { error: questError } = await supabase
            .from('user_quests')
            .delete()
            .eq('user_id', targetUserId)
        
        if (questError) throw questError
        
        // Also reset manual point adjustments if 'all' or specific type if needed
        // Assuming 'quests' implies points from quests. 
        // We might want to clear 'point_adjustments' too if 'all'.
        if (type === 'all') {
             const { error: adjError } = await supabase
                .from('point_adjustments')
                .delete()
                .eq('user_id', targetUserId)
             if (adjError) throw adjError
        }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Reset Error:', error)
    return NextResponse.json({ error: 'Failed to reset points', details: error }, { status: 500 })
  }
}
