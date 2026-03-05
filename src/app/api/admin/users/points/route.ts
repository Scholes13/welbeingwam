import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { authorized, userId } = await verifyAdminPermission('manage_points')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const { targetUserId, points, reason } = await request.json()
    
    if (!targetUserId || !points || !reason) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert Adjustment
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

    // Create Notification
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
