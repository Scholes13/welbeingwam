import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createActivityScanToken } from '@/lib/activity-scan-token'
import { NextResponse } from 'next/server'

const TOKEN_TTL_SECONDS = 45

function getTokenSecret(): string | null {
  return process.env.ACTIVITY_QR_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null
}

export async function GET(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    const secret = getTokenSecret()
    if (!secret) {
      return NextResponse.json({ error: 'Activity QR secret is not configured' }, { status: 500 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: activity, error } = await supabase
      .from('admin_activities')
      .select('id, title, is_published')
      .eq('id', activityId)
      .single()

    if (error || !activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const token = createActivityScanToken({
      activityId,
      secret,
      expiresInSeconds: TOKEN_TTL_SECONDS,
    })

    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString()

    return NextResponse.json({
      success: true,
      activity: {
        id: activity.id,
        title: activity.title,
        is_published: activity.is_published,
      },
      token,
      expiresAt,
      ttlSeconds: TOKEN_TTL_SECONDS,
      qrValue: `ACT:${token}`,
    })
  } catch (error) {
    console.error('Get activity token error:', error)
    return NextResponse.json({ error: 'Failed to generate scan token' }, { status: 500 })
  }
}
