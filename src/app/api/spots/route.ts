import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getParticipantId } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

interface SpotFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    id: string
    name: string
    description: string | null
    category_id: string | null
    category_name: string | null
    category_icon: string | null
    category_color: string
    points: number
    radius: number
    visited: boolean
    visited_at: string | null
  }
}

interface SpotsGeoJSON {
  type: 'FeatureCollection'
  features: SpotFeature[]
}

interface SpotWithCoords {
  id: string
  name: string
  description: string | null
  lng: number
  lat: number
  radius: number
  points: number
  category_id: string | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
}

/**
 * GET /api/spots
 * Returns all active quest spots as GeoJSON with participant's visited status
 */
export async function GET() {
  try {
    const participantId = await getParticipantId()

    if (!participantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Use RPC function to get spots with coordinates extracted from PostGIS
    const { data: spots, error: spotsError } = await supabase
      .rpc('get_active_spots_with_coordinates')

    if (spotsError) {
      console.error('RPC error:', spotsError)
      // RPC doesn't exist, return error with instructions
      return NextResponse.json(
        { 
          error: 'Database function not found. Please run the migration to create get_active_spots_with_coordinates function.',
          details: spotsError.message 
        },
        { status: 500 }
      )
    }

    return buildGeoJSONResponse(supabase, participantId, spots || [])
  } catch (error) {
    console.error('Error in spots API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function buildGeoJSONResponse(
  supabase: SupabaseClient,
  participantId: string,
  spots: SpotWithCoords[]
) {
  // Fetch participant's visits
  const { data: visits, error: visitsError } = await supabase
    .from('visits')
    .select('spot_id, checked_in_at')
    .eq('participant_id', participantId)

  if (visitsError) {
    console.error('Error fetching visits:', visitsError)
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    )
  }

  // Create a map of visited spots
  const visitedMap = new Map(
    visits?.map(v => [v.spot_id, v.checked_in_at]) || []
  )

  // Transform to GeoJSON
  const geojson: SpotsGeoJSON = {
    type: 'FeatureCollection',
    features: spots.map(spot => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [spot.lng, spot.lat]
      },
      properties: {
        id: spot.id,
        name: spot.name,
        description: spot.description,
        category_id: spot.category_id,
        category_name: spot.category_name,
        category_icon: spot.category_icon,
        category_color: spot.category_color || '#FC4C02',
        points: spot.points,
        radius: spot.radius,
        visited: visitedMap.has(spot.id),
        visited_at: visitedMap.get(spot.id) || null
      }
    }))
  }

  return NextResponse.json(geojson)
}
