import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { questId } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !questId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if already claimed
    const { data: existing } = await supabase
        .from('user_quests')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('quest_id', questId)
        .single()
    
    if (existing) {
         return NextResponse.json({ error: 'Already claimed' }, { status: 400 })
    }

    // Claim Quest
    const { error } = await supabase
        .from('user_quests')
        .insert({
            user_id: currentUserId,
            quest_id: questId,
            status: 'approved'
        })

    if (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
