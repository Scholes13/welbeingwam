import { createSupabaseAdminClient } from '@/lib/supabase/server'

interface MultiplierTier {
  days: number
  multiplier: number
}

export function getStreakMultiplier(currentStreak: number, tiers: MultiplierTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.days - a.days)
  for (const tier of sorted) {
    if (currentStreak >= tier.days) return tier.multiplier
  }
  return 1.0
}

export async function updateUserStreak(userId: string, dimensionId: string) {
  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Find active streak events for this dimension (or all dimensions)
  const { data: events } = await supabase
    .from('streak_events')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .or(`dimension_id.eq.${dimensionId},dimension_id.is.null`)

  if (!events?.length) return { multiplier: 1.0 }

  let bestMultiplier = 1.0

  for (const event of events) {
    // Get or create user streak
    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_event_id', event.id)
      .eq('dimension_id', dimensionId)
      .single()

    let currentStreak = 1
    let longestStreak = 1

    if (existing) {
      const lastDate = existing.last_completed_date
      if (lastDate === today) {
        // Already counted today
        currentStreak = existing.current_streak
        longestStreak = existing.longest_streak
      } else {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastDate === yesterdayStr) {
          currentStreak = existing.current_streak + 1
        } else {
          currentStreak = 1 // Reset
        }
        longestStreak = Math.max(existing.longest_streak, currentStreak)

        await supabase
          .from('user_streaks')
          .update({
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_completed_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      }
    } else {
      await supabase
        .from('user_streaks')
        .insert({
          user_id: userId,
          streak_event_id: event.id,
          dimension_id: dimensionId,
          current_streak: 1,
          longest_streak: 1,
          last_completed_date: today,
        })
    }

    const tiers = event.multiplier_tiers as MultiplierTier[]
    const multiplier = getStreakMultiplier(currentStreak, tiers)
    bestMultiplier = Math.max(bestMultiplier, multiplier)
  }

  return { multiplier: bestMultiplier }
}
