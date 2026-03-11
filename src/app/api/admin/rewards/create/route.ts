import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { parseAdminCreateRewardInput } from '@/lib/rewards/schemas'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_rewards')
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const payload = await request.json()
    const parsedPayload = parseAdminCreateRewardInput(payload)
    if (!parsedPayload.success) {
      return NextResponse.json({ error: 'Invalid reward payload' }, { status: 400 })
    }

    const { title, description, image_url, required_points, required_steps, max_claims, type, is_repeatable } = parsedPayload.data

    const { data, error } = await supabase
      .from('rewards')
      .insert([{
        title,
        description,
        image_url,
        required_points,
        required_steps,
        max_claims,
        type,
        is_repeatable,
      }])
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, reward: data[0] })

  } catch (error) {
    console.error('Create Reward Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
