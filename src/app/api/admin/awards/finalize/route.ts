import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { authorized } = await verifyAdminPermission('*')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await req.json().catch(() => ({}))
    const period = body.period // e.g. '2026-03'

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: 'Invalid period format (YYYY-MM)' }, { status: 400 })
    }

    // Check if already finalized
    const { data: existing } = await supabase
      .from('monthly_awards')
      .select('id')
      .eq('period', period)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This period is already finalized' }, { status: 400 })
    }

    // Get all dimensions
    const { data: dimensions } = await supabase
      .from('dimensions')
      .select('*')
      .eq('is_active', true)

    if (!dimensions) return NextResponse.json({ error: 'No dimensions found' }, { status: 500 })

    const [year, month] = period.split('-').map(Number)
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

    // Get quest points per user per dimension for this period
    const { data: questClaims } = await supabase
      .from('user_quests')
      .select('user_id, quest:quests(points, dimension_id)')
      .eq('status', 'approved')
      .gte('completed_at', startOfMonth)
      .lte('completed_at', endOfMonth)

    // Get point adjustments per user per dimension
    const { data: adjustments } = await supabase
      .from('point_adjustments')
      .select('user_id, points, dimension_id')
      .not('dimension_id', 'is', null)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    // Calculate totals per user per dimension
    const scores: Record<string, Record<string, number>> = {} // userId -> dimensionId -> points

    for (const claim of questClaims || []) {
      const quest = claim.quest as any
      if (!quest?.dimension_id) continue
      const uid = String(claim.user_id)
      if (!scores[uid]) scores[uid] = {}
      scores[uid][quest.dimension_id] = (scores[uid][quest.dimension_id] || 0) + (quest.points || 0)
    }

    for (const adj of adjustments || []) {
      if (!adj.dimension_id) continue
      const uid = String(adj.user_id)
      if (!scores[uid]) scores[uid] = {}
      scores[uid][adj.dimension_id] = (scores[uid][adj.dimension_id] || 0) + adj.points
    }

    // Find winner per dimension
    const awards = []

    for (const dim of dimensions) {
      let topUserId: string | null = null
      let topPoints = 0

      for (const [userId, dimScores] of Object.entries(scores)) {
        const pts = dimScores[dim.id] || 0
        if (pts > topPoints) {
          topPoints = pts
          topUserId = userId
        }
      }

      if (topUserId && topPoints > 0) {
        awards.push({
          user_id: topUserId,
          dimension_id: dim.id,
          period,
          award_title: dim.award_title,
          points_earned: topPoints,
        })
      }
    }

    if (awards.length > 0) {
      const { error } = await supabase.from('monthly_awards').insert(awards)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Send notifications to winners
      for (const award of awards) {
        try {
          await supabase.from('notifications').insert({
            user_id: award.user_id,
            title: `🏆 ${award.award_title}`,
            message: `Selamat! Kamu meraih ${award.award_title} untuk periode ${period} dengan ${award.points_earned} poin!`,
            type: 'award',
          })
        } catch {
          // Non-fatal: notification insert failure shouldn't block awards
        }
      }
    }

    return NextResponse.json({ awards, count: awards.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unauthorized' }, { status: 403 })
  }
}
