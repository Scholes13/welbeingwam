import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { steps, distance, date, type } = await request.json()
    const context = await getAuthProfileContext()

    if (!context) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = context.profileId

    const supabase = createSupabaseAdminClient()

    // Insert Activity
    const { error } = await supabase
        .from('activities')
        .insert({
            user_id: userId,
            name: 'Manual Entry',
            distance: distance, // in meters
            moving_time: 0, // Manual entries often don't track time accurately
            type: type || 'Manual',
            start_date: date,
            steps: steps,
            id: Date.now() // Simple unique ID generation
        })

    if (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create Activity Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
