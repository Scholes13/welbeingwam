import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/quest-spots
 * List all quest spots with visit counts
 */
export async function GET() {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data: spots, error } = await supabase
      .from('quest_spots')
      .select(`
        *,
        category:categories(id, name, icon_url, color),
        visits(count)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform data to include visit count
    const spotsWithCounts = spots?.map(spot => ({
      ...spot,
      visit_count: spot.visits?.[0]?.count || 0,
      // Extract lat/lng from PostGIS geography
      latitude: null, // Will be extracted in detail endpoint
      longitude: null
    }))

    return NextResponse.json({ spots: spotsWithCounts })
  } catch (error) {
    console.error('List quest spots error:', error)
    return NextResponse.json({ error: 'Failed to list quest spots' }, { status: 500 })
  }
}

/**
 * POST /api/admin/quest-spots
 * Create a new quest spot
 */
export async function POST(request: Request) {
  const admin = await verifyAdmin()
  
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { name, description, latitude, longitude, radius, points, category_id } = body

    // Validate required fields
    if (!name || latitude === undefined || longitude === undefined || !radius || !points) {
      return NextResponse.json(
        { error: 'Missing required fields: name, latitude, longitude, radius, points' },
        { status: 400 }
      )
    }

    // Validate radius bounds (20-500m)
    if (radius < 20 || radius > 500) {
      return NextResponse.json(
        { error: 'Radius must be between 20 and 500 meters' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // Create PostGIS point using ST_SetSRID and ST_MakePoint
    const { data, error } = await supabase.rpc('create_quest_spot', {
      p_name: name,
      p_description: description || null,
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius: radius,
      p_points: points,
      p_category_id: category_id || null
    })

    if (error) {
      // If RPC doesn't exist, use raw SQL insert
      const { data: spot, error: insertError } = await supabase
        .from('quest_spots')
        .insert({
          name,
          description: description || null,
          location: `SRID=4326;POINT(${longitude} ${latitude})`,
          radius,
          points,
          category_id: category_id || null
        })
        .select()
        .single()

      if (insertError) throw insertError
      return NextResponse.json({ success: true, spot })
    }

    return NextResponse.json({ success: true, spot: data })
  } catch (error) {
    console.error('Create quest spot error:', error)
    return NextResponse.json({ error: 'Failed to create quest spot' }, { status: 500 })
  }
}
