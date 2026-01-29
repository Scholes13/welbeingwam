import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    // Fetch all active quest spots with category info
    const { data: spots, error: spotsError } = await supabase
      .from('quest_spots')
      .select(`
        id,
        name,
        description,
        location,
        radius,
        points,
        category_id,
        categories (
          name,
          icon_url,
          color
        )
      `)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (spotsError) {
      console.error('Error fetching spots:', spotsError)
      return NextResponse.json(
        { error: 'Failed to fetch spots' },
        { status: 500 }
      )
    }

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
      features: (spots || []).map(spot => {
        // Parse PostGIS geography point format: "POINT(lng lat)"
        const locationMatch = spot.location.match(/POINT\(([^ ]+) ([^ ]+)\)/)
        const lng = locationMatch ? parseFloat(locationMatch[1]) : 0
        const lat = locationMatch ? parseFloat(locationMatch[2]) : 0

        const category = Array.isArray(spot.categories) 
          ? spot.categories[0] 
          : spot.categories

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            id: spot.id,
            name: spot.name,
            description: spot.description,
            category_id: spot.category_id,
            category_name: category?.name || null,
            category_icon: category?.icon_url || null,
            category_color: category?.color || '#FC4C02',
            points: spot.points,
            radius: spot.radius,
            visited: visitedMap.has(spot.id),
            visited_at: visitedMap.get(spot.id) || null
          }
        }
      })
    }

    return NextResponse.json(geojson)
  } catch (error) {
    console.error('Error in spots API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
