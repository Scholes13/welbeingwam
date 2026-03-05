import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { authorized } = await verifyAdminPermission('manage_rewards')
  if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const { data: rewards, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ rewards: rewards || [] })

  } catch (error) {
    console.error('List Rewards Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
