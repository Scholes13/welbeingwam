import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getParticipantId } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/tour/location
 * Update current participant's location
 */
export async function POST(request: NextRequest) {
  try {
    const participantId = await getParticipantId()
    if (!participantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { latitude, longitude } = await request.json()

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 })
    }

    // Upsert participant location
    const { error } = await supabase
      .from('participant_locations')
      .upsert({
        participant_id: participantId,
        location: `POINT(${longitude} ${latitude})`,
        last_seen: new Date().toISOString(),
        is_online: true
      }, {
        onConflict: 'participant_id'
      })

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/tour/location
 * Get all online participants with their locations
 */
export async function GET() {
  try {
    const participantId = await getParticipantId()
    if (!participantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_online_participants')

    if (error) {
      console.error('Error fetching online participants:', error)
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 })
    }

    return NextResponse.json({ participants: data || [] })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/tour/location
 * Mark participant as offline
 */
export async function DELETE() {
  try {
    const participantId = await getParticipantId()
    if (!participantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabase
      .from('participant_locations')
      .update({ is_online: false })
      .eq('participant_id', participantId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Offline error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
