import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { title, description, points, expires_at, verification_type, dimension_id } = await request.json()
    if (!title || !points) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { error } = await supabase
        .from('quests')
        .insert({
            title,
            description,
            points,
            is_active: true,
            expires_at: expires_at || null,
            verification_type: verification_type || 'none',
            dimension_id: dimension_id || null
        })

    if (error) {
        return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
