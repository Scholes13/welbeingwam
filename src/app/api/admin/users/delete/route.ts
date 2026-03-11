import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_users')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Prevent deleting the super admin itself
    const { data: targetUser } = await supabase.from('profiles').select('username').eq('id', id).single()
    if (targetUser?.username === 'admin_wam') {
        return NextResponse.json({ error: 'Cannot delete Super Admin' }, { status: 403 })
    }

    // Also delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) console.error('Auth delete error:', authError)

    // Manual Cascade: Delete related data
    await supabase.from('activities').delete().eq('user_id', id)
    await supabase.from('user_quests').delete().eq('user_id', id)

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
