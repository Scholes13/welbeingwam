import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { authorized } = await verifyAdminPermission('manage_admins')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient()

  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, permissions, is_admin')
    .or('is_admin.eq.true,permissions.neq.[]')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }

  return NextResponse.json({ admins })
}

export async function POST(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_admins')
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const { targetUserId, permissions } = await request.json()

    if (!targetUserId || !Array.isArray(permissions)) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
            permissions: permissions,
            is_admin: true 
        })
        .eq('id', targetUserId)

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
