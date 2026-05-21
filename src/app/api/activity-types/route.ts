import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Public list of active activity types, used by the Add Activity modal.
// Returns rows ordered for stable rendering. Admin edits in /api/admin/activity-types
// flow back through this endpoint automatically.
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('activity_types')
      .select('id, code, name, mode, dimension_id, points, requires_steps, requires_calories, is_active, sort_order')
      .eq('is_active', true)
      .order('mode', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch activity types:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({ types: data ?? [] })
  } catch (error) {
    console.error('activity-types GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
