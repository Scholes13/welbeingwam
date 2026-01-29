import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getCurrentParticipant } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile
 * Returns participant profile with stats and badges
 */
export async function GET() {
  try {
    const participant = await getCurrentParticipant()

    if (!participant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get total spots count
    const { count: totalSpots } = await supabase
      .from('quest_spots')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null)

    // Get visited spots with details
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select(`
        id,
        spot_id,
        photo_url,
        points_earned,
        checked_in_at,
        quest_spots (
          id,
          name,
          description,
          points,
          categories (
            name,
            icon_url,
            color
          )
        )
      `)
      .eq('participant_id', participant.id)
      .order('checked_in_at', { ascending: false })

    if (visitsError) {
      console.error('Error fetching visits:', visitsError)
      return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 })
    }

    // Get earned badges with details
    const { data: earnedBadges, error: badgesError } = await supabase
      .from('participant_badges')
      .select(`
        id,
        earned_at,
        badges (
          id,
          name,
          description,
          icon_url,
          badge_type,
          bonus_points,
          categories (
            name,
            color
          )
        )
      `)
      .eq('participant_id', participant.id)
      .order('earned_at', { ascending: false })

    if (badgesError) {
      console.error('Error fetching badges:', badgesError)
      return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 })
    }

    const spotsVisited = visits?.length || 0
    const spotsRemaining = (totalSpots || 0) - spotsVisited

    return NextResponse.json({
      participant: {
        id: participant.id,
        code: participant.code,
        name: participant.name,
        profile_photo_url: participant.profile_photo_url,
        total_points: participant.total_points,
      },
      stats: {
        total_points: participant.total_points,
        spots_visited: spotsVisited,
        spots_remaining: spotsRemaining,
        total_spots: totalSpots || 0,
      },
      visits: visits?.map(v => {
        const spot = Array.isArray(v.quest_spots) ? v.quest_spots[0] : v.quest_spots
        const category = spot?.categories ? (Array.isArray(spot.categories) ? spot.categories[0] : spot.categories) : null
        return {
          id: v.id,
          spot_id: v.spot_id,
          spot_name: spot?.name,
          spot_description: spot?.description,
          category_name: category?.name,
          category_icon: category?.icon_url,
          category_color: category?.color,
          photo_url: v.photo_url,
          points_earned: v.points_earned,
          checked_in_at: v.checked_in_at,
        }
      }) || [],
      badges: earnedBadges?.map(b => {
        const badge = Array.isArray(b.badges) ? b.badges[0] : b.badges
        const category = badge?.categories ? (Array.isArray(badge.categories) ? badge.categories[0] : badge.categories) : null
        return {
          id: b.id,
          badge_id: badge?.id,
          name: badge?.name,
          description: badge?.description,
          icon_url: badge?.icon_url,
          badge_type: badge?.badge_type,
          bonus_points: badge?.bonus_points,
          category_name: category?.name,
          category_color: category?.color,
          earned_at: b.earned_at,
        }
      }) || [],
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
