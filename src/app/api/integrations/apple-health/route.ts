import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sync_key, data } = body
    
    // data structure expected:
    // {
    //   date: "2024-12-30",
    //   steps: 1234,
    //   distance: 1.5 (km) or meters? Let's assume meters from shortcut
    // }

    if (!sync_key || !data) {
        return NextResponse.json({ error: 'Missing key or data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Validate Sync Key & Get User
    const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('sync_key', sync_key)
        .single()

    if (userError || !user) {
        return NextResponse.json({ error: 'Invalid Sync Key' }, { status: 401 })
    }

    // 2. Insert/Update Activity
    // We treat this as a daily summary. Type = 'Apple Health'
    const { error: actError } = await supabase
        .from('activities')
        .upsert({
            user_id: user.id,
            name: 'Apple Health Sync', // Standard name
            distance: data.distance_meters || 0,
            moving_time: 0,
            type: 'Apple Health',
            start_date: data.date, // YYYY-MM-DD
            steps: data.steps || 0,
            id: new Date(data.date).getTime() + 999 // deterministic ID based on date
        })

    if (actError) {
        console.error('Save Error:', actError)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Apple Health Sync Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
