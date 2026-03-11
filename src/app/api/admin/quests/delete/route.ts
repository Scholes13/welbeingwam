import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient()

  try {
    // 1. Check Admin Access (Support both Manual Code and Standard Login)
    const { authorized } = await verifyAdminPermission('admin')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Manual Cascade: Delete usages of this quest in user_quests
    await supabase.from('user_quests').delete().eq('quest_id', id)

    const { error } = await supabase
      .from('quests')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
