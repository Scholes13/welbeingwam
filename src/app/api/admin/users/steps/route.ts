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

    // 2. Insert Manual Activity for Steps (Loop through chunks)
    for (const [index, stepChunk] of chunks.entries()) {
        const { error: actError } = await supabase
            .from('activities')
            .insert({
                id: Date.now() + index, // Ensure unique ID per chunk
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
