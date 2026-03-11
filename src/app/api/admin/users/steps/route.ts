import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_users')
  if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const { targetUserId, steps, reason } = await request.json()
    
    if (!targetUserId || !steps || !reason) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const stepsInt = Number(steps)
    if (isNaN(stepsInt)) {
        return NextResponse.json({ error: 'Steps must be a number' }, { status: 400 })
    }

    // Handle Integer Overflow (split into chunks of 2B)
    const MAX_INT = 2000000000
    const chunks = []
    let remaining = stepsInt

    while (Math.abs(remaining) > 0) {
        let chunk = remaining
        if (chunk > MAX_INT) chunk = MAX_INT
        if (chunk < -MAX_INT) chunk = -MAX_INT
        
        chunks.push(chunk)
        remaining -= chunk
    }

    console.log(`[Admin] Splitting ${stepsInt} steps into ${chunks.length} chunks:`, chunks)

    // Insert Manual Activity for Steps (Loop through chunks)
    for (const [index, stepChunk] of chunks.entries()) {
        const { error: actError } = await supabase
            .from('activities')
            .insert({
                id: Date.now() + index,
                user_id: targetUserId,
                name: `Manual Adjustment: ${reason} ${chunks.length > 1 ? `(Part ${index + 1}/${chunks.length})` : ''}`,
                type: 'Manual',
                distance: 0,
                steps: stepChunk,
                start_date: new Date().toISOString(),
                moving_time: 0
            })

        if (actError) {
            console.error('Points Adjustment (Steps Activity) Error:', actError)
            throw actError
        }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Scan Error:', error)
    return NextResponse.json({ error: 'Failed to adjust steps', details: error }, { status: 500 })
  }
}
