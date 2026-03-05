import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: templates, error } = await supabase
      .from('quest_templates')
      .select('*, dimension:dimensions(id, name, display_name, icon), activity_type:activity_types(id, name)')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await req.json()

    const { title, description, dimension_id, points, verification_type, requires_photo, recurrence, trigger_type, linked_activity_type_id } = body

    if (!title || !points) {
      return NextResponse.json({ error: 'Title and points are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('quest_templates')
      .insert({
        title,
        description: description || null,
        dimension_id: dimension_id || null,
        points,
        verification_type: verification_type || 'none',
        requires_photo: requires_photo || false,
        recurrence: recurrence || 'daily',
        trigger_type: trigger_type || 'scheduled',
        linked_activity_type_id: linked_activity_type_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const body = await req.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('quest_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { authorized } = await verifyAdminPermission('manage_content')
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 })

    const { error } = await supabase
      .from('quest_templates')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
