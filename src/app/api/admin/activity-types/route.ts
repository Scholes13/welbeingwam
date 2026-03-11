import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isMissingParentTypeColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  return 'code' in error && error.code === 'PGRST204'
}

async function isHierarchyEnabled(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<boolean> {
  const { error } = await supabase
    .from('activity_types')
    .select('parent_type_id')
    .limit(1)

  if (!error) return true
  if (isMissingParentTypeColumnError(error)) return false
  throw error
}

export async function GET() {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('activity_types')
      .select('*, dimension:dimensions(id, name, display_name)')
      .order('name', { ascending: true })

    if (error) throw error
    const hierarchyEnabled = await isHierarchyEnabled(supabase)
    return NextResponse.json({ types: data ?? [], hierarchyEnabled })
  } catch (error) {
    console.error('List activity types error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity types' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const description = body.description ? String(body.description).trim() : null
    const parentTypeId = body.parentTypeId ? String(body.parentTypeId).trim() : null
    const dimensionId = body.dimension_id ? String(body.dimension_id).trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Type name is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const hierarchyEnabled = await isHierarchyEnabled(supabase)

    if (parentTypeId && !hierarchyEnabled) {
      return NextResponse.json(
        { error: 'Activity type hierarchy is not ready. Please run migration 20260217000004_activity_type_hierarchy.sql first.' },
        { status: 400 },
      )
    }

    if (parentTypeId) {
      const { data: parentType, error: parentError } = await supabase
        .from('activity_types')
        .select('id')
        .eq('id', parentTypeId)
        .single()

      if (parentError || !parentType) {
        return NextResponse.json({ error: 'Parent type not found' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('activity_types')
      .insert(hierarchyEnabled ? {
        name,
        description,
        is_active: body.isActive ?? true,
        parent_type_id: parentTypeId,
        dimension_id: dimensionId,
      } : {
        name,
        description,
        is_active: body.isActive ?? true,
        dimension_id: dimensionId,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, type: data })
  } catch (error) {
    console.error('Create activity type error:', error)
    return NextResponse.json({ error: 'Failed to create activity type' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const id = String(body.id || '')
    if (!id) {
      return NextResponse.json({ error: 'Type ID is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim()
    if (typeof body.isActive === 'boolean') updates.is_active = body.isActive
    if ('dimension_id' in body) updates.dimension_id = body.dimension_id || null

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('activity_types')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update activity type error:', error)
    return NextResponse.json({ error: 'Failed to update activity type' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Type ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const hierarchyEnabled = await isHierarchyEnabled(supabase)

    if (hierarchyEnabled) {
      const { count: childCount, error: childCountError } = await supabase
        .from('activity_types')
        .select('*', { count: 'exact', head: true })
        .eq('parent_type_id', id)

      if (childCountError) throw childCountError
      if ((childCount ?? 0) > 0) {
        return NextResponse.json({ error: 'Type has subcategories. Delete subcategories first.' }, { status: 400 })
      }
    }

    const { count, error: countError } = await supabase
      .from('admin_activities')
      .select('*', { count: 'exact', head: true })
      .eq('type_id', id)

    if (countError) throw countError
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'Type is still used by activities' }, { status: 400 })
    }

    const { error } = await supabase
      .from('activity_types')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete activity type error:', error)
    return NextResponse.json({ error: 'Failed to delete activity type' }, { status: 500 })
  }
}
