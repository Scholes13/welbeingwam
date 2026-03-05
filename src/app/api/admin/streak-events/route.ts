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

    const { data: streakEvents, error } = await supabase
      .from('streak_events')
      .select('*, dimension:dimensions(id, name, display_name, icon)')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ streakEvents })
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

    const { title, description, dimension_id, multiplier_tiers, start_date, end_date, is_active } = body

    if (!title || !start_date || !end_date) {
      return NextResponse.json({ error: 'Title, start_date, and end_date are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('streak_events')
      .insert({
        title,
        description: description || null,
        dimension_id: dimension_id || null,
        multiplier_tiers: multiplier_tiers || [
          { days: 3, multiplier: 1.25 },
          { days: 7, multiplier: 1.5 },
          { days: 14, multiplier: 1.75 },
          { days: 30, multiplier: 2.0 },
        ],
        start_date,
        end_date,
        is_active: is_active ?? false,
      })
      .select('*, dimension:dimensions(id, name, display_name, icon)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ streakEvent: data })
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

    if (!id) return NextResponse.json({ error: 'Streak event ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('streak_events')
      .update(updates)
      .eq('id', id)
      .select('*, dimension:dimensions(id, name, display_name, icon)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ streakEvent: data })
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

    if (!id) return NextResponse.json({ error: 'Streak event ID required' }, { status: 400 })

    const { error } = await supabase
      .from('streak_events')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
