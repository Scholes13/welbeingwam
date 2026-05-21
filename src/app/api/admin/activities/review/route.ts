import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAuthProfileContext } from '@/utils/auth'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// GET — Fetch activities needing HR review (approved but 0 points, manual source)
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Check if user is admin
    const { data: participant } = await supabase
      .from('participants')
      .select('is_admin')
      .eq('id', context.profileId)
      .maybeSingle()

    if (!participant?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch recent manual activities for HR to review & potentially reject
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        user_id,
        name,
        type,
        start_date,
        calories,
        distance,
        moving_time,
        activity_points,
        review_status,
        review_reason,
        proof_url,
        proof_urls,
        source,
        dimension_id,
        created_at,
        mode
      `)
      .eq('source', 'manual')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Failed to fetch review activities:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    // Split: active (approved, can be rejected) vs already rejected
    const needsPoints = (activities || []).filter(
      (a) => a.review_status === 'approved',
    )
    const processed = (activities || []).filter(
      (a) => a.review_status === 'rejected',
    )

    // Fetch user profiles for display
    const allActivities = [...needsPoints, ...processed]
    const userIds = [...new Set(allActivities.map((a) => a.user_id))]
    const { data: profiles } = userIds.length
      ? await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

    // Fetch dimensions for display
    const { data: dimensions } = await supabase.from('dimensions').select('id, name, display_name')
    const dimensionMap = new Map((dimensions || []).map((d) => [d.id, d]))

    const enrich = (list: typeof allActivities) =>
      list.map((a) => ({
        ...a,
        user: profileMap.get(a.user_id) || { full_name: 'Unknown', avatar_url: null },
        dimension: a.dimension_id ? dimensionMap.get(a.dimension_id) || null : null,
      }))

    return NextResponse.json({
      needs_points: enrich(needsPoints),
      processed: enrich(processed),
    })
  } catch (error) {
    console.error('Review GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — Assign points or reject an activity
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    // Check admin
    const { data: participant } = await supabase
      .from('participants')
      .select('is_admin')
      .eq('id', context.profileId)
      .maybeSingle()

    if (!participant?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { activity_id, action, points, reason: rawReason } = body as {
      activity_id: string | number
      action: 'assign_points' | 'reject'
      points?: number
      reason?: string
    }

    if (!activity_id || !action) {
      return NextResponse.json({ error: 'activity_id and action are required' }, { status: 400 })
    }

    // Validate points: must be a positive integer with an upper bound
    if (action === 'assign_points') {
      const numPoints = Number(points)
      if (points === undefined || points === null || !Number.isInteger(numPoints) || numPoints <= 0) {
        return NextResponse.json({ error: 'Points must be a positive integer' }, { status: 400 })
      }
      if (numPoints > 10000) {
        return NextResponse.json({ error: 'Points must not exceed 10000' }, { status: 400 })
      }
    }

    // Trim and length-limit reason
    const reason = typeof rawReason === 'string' ? rawReason.trim().slice(0, 500) : undefined

    // Fetch the activity BEFORE mutation to verify it exists and is eligible
    const { data: activityBefore, error: fetchError } = await supabase
      .from('activities')
      .select('id, user_id, name, dimension_id, review_status, source')
      .eq('id', activity_id)
      .maybeSingle()

    if (fetchError) {
      console.error('Failed to fetch activity before mutation:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    if (!activityBefore) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (action === 'reject' && activityBefore.review_status === 'rejected') {
      return NextResponse.json({ error: 'Activity is already rejected' }, { status: 400 })
    }

    if (action === 'assign_points') {
      const finalPoints = Math.max(0, Math.floor(Number(points)))

      // Update activity with assigned points
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          activity_points: finalPoints,
          review_reason: reason || null,
        })
        .eq('id', activity_id)

      if (updateError) {
        console.error('Failed to update activity:', updateError)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
      }

      // Create point_adjustment for tracking
      const { error: pointAdjError } = await supabase.from('point_adjustments').insert({
        participant_id: activityBefore.user_id,
        points: finalPoints,
        reason: `HR Assigned: ${activityBefore.name}${reason ? ` — ${reason}` : ''}`,
      })

      if (pointAdjError) {
        console.error('Failed to insert point_adjustment for activity', activity_id, pointAdjError)
      }

      // Notify user
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: activityBefore.user_id,
        title: 'Poin Diberikan ✅',
        body: `Kegiatan "${activityBefore.name}" mendapat ${finalPoints} poin!`,
        type: 'point_award',
      })

      if (notifError) {
        console.error('Failed to insert notification for activity', activity_id, notifError)
      }
    }

    if (action === 'reject') {
      // Mark as rejected
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          review_status: 'rejected',
          review_reason: reason || null,
          activity_points: 0,
        })
        .eq('id', activity_id)

      if (updateError) {
        console.error('Failed to reject activity:', updateError)
        return NextResponse.json({ error: 'Failed to reject' }, { status: 500 })
      }

      // Notify user
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: activityBefore.user_id,
        title: 'Kegiatan Ditolak ❌',
        body: `Kegiatan "${activityBefore.name}" ditolak.${reason ? ` Alasan: ${reason}` : ''}`,
        type: 'system',
      })

      if (notifError) {
        console.error('Failed to insert rejection notification for activity', activity_id, notifError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
