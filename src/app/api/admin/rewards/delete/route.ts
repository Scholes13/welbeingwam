import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // 1. Check Admin Access
    
  const supabase = createSupabaseAdminClient()

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // No need for manual cascade as DB handles user_rewards cascade
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete Reward Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
