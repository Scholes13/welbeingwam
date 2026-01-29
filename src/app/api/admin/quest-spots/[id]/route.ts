import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/quest-spots/[id]
 * Get a single quest spot with details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get spot with extracted coordinates
    const { data: spot, error } = await supabase
      .from('quest_spots')
      .select(`
        *,
        category:categories(id, name, icon_url, color)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error

    if (!spot) {
      return NextResponse.json({ error: 'Quest spot not found' }, { status: 404 })
    }

    // Extract lat/lng from PostGIS geography using ST_X and ST_Y
    const { data: coords } = await supabase.rpc('get_spot_coordinates', {
      spot_id: id
    })

    const spotWithCoords = {
      ...spot,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null
    }

    return NextResponse.json({ spot: spotWithCoords })
  } catch (error) {
    console.error('Get quest spot error:', error)
    return NextResponse.json({ error: 'Failed to get quest spot' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/quest-spots/[id]
 * Update a quest spot (preserves visit history)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { name, description, latitude, longitude, radius, points, category_id, is_active } = body

    // Validate radius bounds if provided
    if (radius !== undefined && (radius < 20 || radius > 500)) {
      return NextResponse.json(
        { error: 'Radius must be between 20 and 500 meters' },
        { status: 400 }
      )
    }

    // Validate coordinates if provided
    if (latitude !== undefined && longitude !== undefined) {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (radius !== undefined) updates.radius = radius
    if (points !== undefined) updates.points = points
    if (category_id !== undefined) updates.category_id = category_id
    if (is_active !== undefined) updates.is_active = is_active

    // Update location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      updates.location = `SRID=4326;POINT(${longitude} ${latitude})`
    }

    const { data, error } = await supabase
      .from('quest_spots')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Quest spot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, spot: data })
  } catch (error) {
    console.error('Update quest spot error:', error)
    return NextResponse.json({ error: 'Failed to update quest spot' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/quest-spots/[id]
 * Soft delete a quest spot (preserves visit history)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Soft delete by setting deleted_at timestamp
    const { data, error } = await supabase
      .from('quest_spots')
      .update({ 
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Quest spot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete quest spot error:', error)
    return NextResponse.json({ error: 'Failed to delete quest spot' }, { status: 500 })
  }
}
