import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/participants/[id]
 * Get participant details with visit history and badges
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get participant details
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .single()

    if (participantError) throw participantError

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    // Get visit history with spot details
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select(`
        id,
        points_earned,
        photo_url,
        checked_in_at,
        spot:quest_spots(
          id,
          name,
          description,
          points,
          category:categories(name, color)
        )
      `)
      .eq('participant_id', id)
      .order('checked_in_at', { ascending: false })

    if (visitsError) throw visitsError

    // Get earned badges
    const { data: earnedBadges, error: badgesError } = await supabase
      .from('participant_badges')
      .select(`
        id,
        earned_at,
        badge:badges(
          id,
          name,
          description,
          icon_url,
          badge_type,
          bonus_points
        )
      `)
      .eq('participant_id', id)
      .order('earned_at', { ascending: false })

    if (badgesError) throw badgesError

    // Calculate stats
    const totalSpots = visits?.length || 0
    const totalPoints = participant.total_points
    const totalBadges = earnedBadges?.length || 0

    return NextResponse.json({
      participant: {
        ...participant,
        stats: {
          total_spots: totalSpots,
          total_points: totalPoints,
          total_badges: totalBadges
        }
      },
      visits: visits || [],
      badges: earnedBadges || []
    })
  } catch (error) {
    console.error('Get participant error:', error)
    return NextResponse.json({ error: 'Failed to get participant details' }, { status: 500 })
  }
}
