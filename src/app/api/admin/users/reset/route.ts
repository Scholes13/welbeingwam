import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_users')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const { targetUserId, type } = await request.json()
    
    if (!targetUserId || !type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Perform Reset
    if (type === 'steps' || type === 'all') {
        const { error: stepsError } = await supabase
            .from('activities')
            .delete()
            .eq('user_id', targetUserId)
        
        if (stepsError) throw stepsError
    }

    if (type === 'quests' || type === 'all') {
        const { error: questError } = await supabase
            .from('user_quests')
            .delete()
            .eq('user_id', targetUserId)
        
        if (questError) throw questError
        
        if (type === 'all') {
             const { error: adjError } = await supabase
                .from('point_adjustments')
                .delete()
                .eq('user_id', targetUserId)
             if (adjError) throw adjError
        }
    }

    if (type === 'rewards' || type === 'all') {
         const { error: rewardError } = await supabase
            .from('user_rewards')
            .delete()
            .eq('user_id', targetUserId)
         if (rewardError) throw rewardError
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Reset Error:', error)
    return NextResponse.json({ error: 'Failed to reset points', details: error }, { status: 500 })
  }
}
