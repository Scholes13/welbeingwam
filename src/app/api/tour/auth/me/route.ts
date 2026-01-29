import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const participantId = cookieStore.get('participant_id')?.value

    if (!participantId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not logged in' } },
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: participant, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single()

    if (error || !participant) {
      // Clear invalid cookie
      cookieStore.delete('participant_id')
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid session' } },
        { status: 401 }
      )
    }

    return NextResponse.json({
      participant: {
        id: participant.id,
        code: participant.code,
        name: participant.name,
        profile_photo_url: participant.profile_photo_url,
        total_points: participant.total_points,
        is_admin: participant.is_admin
      }
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
