import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getParticipantId } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

interface CheckInRequest {
  spot_id: string
  latitude: number
  longitude: number
  photo?: string // base64 encoded image
}

interface Badge {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  badge_type: string
  bonus_points: number
}

interface CheckInResponse {
  success: boolean
  visit_id?: string
  points_earned?: number
  badges_earned?: Badge[]
  error?: {
    code: 'OUT_OF_RANGE' | 'ALREADY_VISITED' | 'SESSION_INACTIVE' | 'SPOT_NOT_FOUND' | 'LOCATION_REQUIRED' | 'INVALID_REQUEST'
    distance_meters?: number
    required_radius?: number
    message: string
    visited_at?: string
  }
}

/**
 * POST /api/checkin
 * Check-in at a quest spot with GPS validation
 */
export async function POST(request: Request): Promise<NextResponse<CheckInResponse>> {
  try {
    const participantId = await getParticipantId()

    if (!participantId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Unauthorized'
          }
        },
        { status: 401 }
      )
    }

    const body: CheckInRequest = await request.json()

    // Validate request
    if (!body.spot_id || body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LOCATION_REQUIRED',
            message: 'GPS location is required for check-in'
          }
        },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Handle photo upload if provided
    let photoUrl: string | null = null
    if (body.photo) {
      try {
        // Extract base64 data
        const base64Data = body.photo.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Generate unique filename
        const filename = `${participantId}/${Date.now()}.jpg`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('checkin-photos')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: false
          })

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          // Continue without photo if upload fails
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('checkin-photos')
            .getPublicUrl(uploadData.path)
          
          photoUrl = urlData.publicUrl
        }
      } catch (photoError) {
        console.error('Error processing photo:', photoError)
        // Continue without photo if processing fails
      }
    }

    // Call check_in_spot database function
    const { data, error } = await supabase.rpc('check_in_spot', {
      p_participant_id: participantId,
      p_spot_id: body.spot_id,
      p_latitude: body.latitude,
      p_longitude: body.longitude,
      p_photo_url: photoUrl
    })

    if (error) {
      console.error('Check-in error:', error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Failed to process check-in'
          }
        },
        { status: 500 }
      )
    }

    // Parse response from database function
    const result = data as any

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            distance_meters: result.error.distance_meters,
            required_radius: result.error.required_radius,
            visited_at: result.error.visited_at
          }
        },
        { status: 400 }
      )
    }

    // Fetch any badges earned (the trigger should have awarded them)
    // We'll check for badges earned in the last few seconds
    const { data: recentBadges } = await supabase
      .from('participant_badges')
      .select(`
        badge_id,
        earned_at,
        badges (
          id,
          name,
          description,
          icon_url,
          badge_type,
          bonus_points
        )
      `)
      .eq('participant_id', participantId)
      .gte('earned_at', new Date(Date.now() - 5000).toISOString())

    const badgesEarned: Badge[] = (recentBadges || [])
      .map(pb => {
        const badge = Array.isArray(pb.badges) ? pb.badges[0] : pb.badges
        return badge ? {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon_url: badge.icon_url,
          badge_type: badge.badge_type,
          bonus_points: badge.bonus_points
        } : null
      })
      .filter((b): b is Badge => b !== null)

    return NextResponse.json({
      success: true,
      visit_id: result.visit_id,
      points_earned: result.points_earned,
      badges_earned: badgesEarned
    })

  } catch (error) {
    console.error('Unexpected error in check-in:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Internal server error'
        }
      },
      { status: 500 }
    )
  }
}
