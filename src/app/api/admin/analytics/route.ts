import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Get tour analytics data
 */
export async function GET() {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get total participants (non-admin)
    const { count: totalParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)

    // Get total check-ins
    const { count: totalCheckIns } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })

    // Get total active spots
    const { count: totalSpots } = await supabase
      .from('quest_spots')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null)

    // Get top spots by visit count
    const { data: topSpots } = await supabase
      .from('quest_spots')
      .select(`
        id,
        name,
        points,
        category:categories(name, color),
        visits(count)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Transform top spots with visit counts
    const spotsWithCounts = topSpots?.map(spot => ({
      id: spot.id,
      name: spot.name,
      points: spot.points,
      category: spot.category,
      visit_count: spot.visits?.[0]?.count || 0
    })).sort((a, b) => b.visit_count - a.visit_count) || []

    // Get recent check-ins
    const { data: recentCheckIns } = await supabase
      .from('visits')
      .select(`
        id,
        points_earned,
        checked_in_at,
        participant:participants(id, name, profile_photo_url),
        spot:quest_spots(id, name)
      `)
      .order('checked_in_at', { ascending: false })
      .limit(10)

    // Get top participants by points
    const { data: topParticipants } = await supabase
      .from('participants')
      .select(`
        id,
        name,
        profile_photo_url,
        total_points,
        visits(count),
        participant_badges(count)
      `)
      .eq('is_admin', false)
      .order('total_points', { ascending: false })
      .limit(10)

    const participantsWithStats = topParticipants?.map(p => ({
      id: p.id,
      name: p.name,
      profile_photo_url: p.profile_photo_url,
      total_points: p.total_points,
      spots_visited: p.visits?.[0]?.count || 0,
      badge_count: p.participant_badges?.[0]?.count || 0
    })) || []

    return NextResponse.json({
      summary: {
        total_participants: totalParticipants || 0,
        total_check_ins: totalCheckIns || 0,
        total_spots: totalSpots || 0
      },
      top_spots: spotsWithCounts,
      recent_check_ins: recentCheckIns || [],
      top_participants: participantsWithStats
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
