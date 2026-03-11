import { NextResponse } from 'next/server'
import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const userId = String(context.profileId)
    const today = new Date().toISOString().split('T')[0]

    // Get active streak events
    const { data: events } = await supabase
      .from('streak_events')
      .select('*, dimension:dimensions(id, name, display_name)')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)

    // Get user's streaks for active events
    const eventIds = (events || []).map(e => e.id)
    let userStreaks: any[] = []

    if (eventIds.length > 0) {
      const { data } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .in('streak_event_id', eventIds)

      userStreaks = data || []
    }

    // Build a map of dimension_id -> { current_streak, multiplier, event_title }
    const streakMap: Record<string, { current_streak: number; multiplier: number; event_title: string }> = {}

    for (const event of events || []) {
      const tiers = (event.multiplier_tiers || []) as { days: number; multiplier: number }[]
      const sortedTiers = [...tiers].sort((a, b) => b.days - a.days)

      // Find user streak for this event (may have multiple dimensions)
      const relatedStreaks = userStreaks.filter(s => s.streak_event_id === event.id)

      for (const streak of relatedStreaks) {
        let multiplier = 1.0
        for (const tier of sortedTiers) {
          if (streak.current_streak >= tier.days) {
            multiplier = tier.multiplier
            break
          }
        }

        const dimId = streak.dimension_id
        if (!streakMap[dimId] || streakMap[dimId].current_streak < streak.current_streak) {
          streakMap[dimId] = {
            current_streak: streak.current_streak,
            multiplier,
            event_title: event.title,
          }
        }
      }
    }

    return NextResponse.json({ streaks: streakMap, events: events || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
