import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { parseAdminUpdateRewardInput } from '@/lib/rewards/schemas'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_rewards')
  if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const payload = await request.json()
    const parsedPayload = parseAdminUpdateRewardInput(payload)
    if (!parsedPayload.success) {
      return NextResponse.json({ error: 'Invalid reward payload' }, { status: 400 })
    }

    const { id, title, description, image_url, required_points, required_steps, max_claims, type, is_repeatable } = parsedPayload.data

    const updatePayload: {
      title: string
      description?: string
      image_url?: string | null
      required_points?: number
      required_steps?: number
      max_claims?: number
      type?: 'reveal' | 'progress' | 'mystery'
      is_repeatable?: boolean
    } = {
      title,
    }

    if (description !== undefined) updatePayload.description = description
    if (image_url !== undefined) updatePayload.image_url = image_url
    if (required_points !== undefined) updatePayload.required_points = required_points
    if (required_steps !== undefined) updatePayload.required_steps = required_steps
    if (max_claims !== undefined) updatePayload.max_claims = max_claims
    if (type !== undefined) updatePayload.type = type
    if (is_repeatable !== undefined) updatePayload.is_repeatable = is_repeatable

    const { data, error } = await supabase
      .from('rewards')
      .update(updatePayload)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, reward: data[0] })

  } catch (error) {
    console.error('Update Reward Error:', error)
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
  }
}
