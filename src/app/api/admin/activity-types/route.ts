import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'
import { NextResponse } from 'next/server'

const ALLOWED_FIELDS = new Set(['name', 'points', 'is_active', 'sort_order'])

type PatchPayload = {
  id?: string
  name?: string
  points?: number
  is_active?: boolean
  sort_order?: number
}

// ---------------------------------------------------------------------------
// GET — full catalog (active + inactive) for admin CMS view
// ---------------------------------------------------------------------------
export async function GET() {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('activity_types')
      .select(`
        id, code, name, mode, dimension_id, points,
        requires_steps, requires_calories, is_active, sort_order,
        dimension:dimensions(id, name, display_name)
      `)
      .order('mode', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Admin activity-types GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    const types = (data ?? []).map((row) => ({
      ...row,
      dimension: Array.isArray(row.dimension) ? (row.dimension[0] ?? null) : row.dimension,
    }))

    return NextResponse.json({ types })
  } catch (error) {
    console.error('Admin activity-types GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — update name / points / is_active / sort_order for a single row.
// `code`, `mode`, `dimension_id`, `requires_steps`, `requires_calories`
// are intentionally not editable to keep historical activities consistent.
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as PatchPayload
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.has(key)) continue
      if (value === undefined) continue
      updates[key] = value
    }

    if (typeof updates.name === 'string') {
      const trimmed = (updates.name as string).trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      if (trimmed.length > 200) {
        return NextResponse.json({ error: 'Name too long' }, { status: 400 })
      }
      updates.name = trimmed
    }

    if (updates.points !== undefined) {
      const points = Number(updates.points)
      if (!Number.isInteger(points) || points < 0 || points > 10000) {
        return NextResponse.json({ error: 'Points must be an integer 0-10000' }, { status: 400 })
      }
      updates.points = points
    }

    if (updates.sort_order !== undefined) {
      const order = Number(updates.sort_order)
      if (!Number.isInteger(order)) {
        return NextResponse.json({ error: 'sort_order must be an integer' }, { status: 400 })
      }
      updates.sort_order = order
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('activity_types')
      .update(updates)
      .eq('id', body.id)
      .select('id, code, name, mode, dimension_id, points, requires_steps, requires_calories, is_active, sort_order')
      .maybeSingle()

    if (error) {
      console.error('Admin activity-types PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Activity type not found' }, { status: 404 })
    }

    return NextResponse.json({ type: data })
  } catch (error) {
    console.error('Admin activity-types PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
