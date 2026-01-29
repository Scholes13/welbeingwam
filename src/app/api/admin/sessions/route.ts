import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// Helper to check if user is admin
async function checkAdmin() {
  const cookieStore = await cookies()
  const participantId = cookieStore.get('participant_id')?.value

  if (!participantId) {
    return { isAdmin: false, participantId: null }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: participant } = await supabase
    .from('participants')
    .select('is_admin')
    .eq('id', participantId)
    .single()

  return {
    isAdmin: participant?.is_admin || false,
    participantId
  }
}

// GET - List all tour sessions
export async function GET() {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: sessions, error } = await supabase
      .from('tour_sessions')
      .select('*')
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Error fetching sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new tour session
export async function POST(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, start_time, end_time, is_active } = body

    // Validation
    if (!name || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: name, start_time, end_time' },
        { status: 400 }
      )
    }

    // Validate that end_time is after start_time
    const startDate = new Date(start_time)
    const endDate = new Date(end_time)

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: session, error } = await supabase
      .from('tour_sessions')
      .insert({
        name,
        start_time,
        end_time,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update tour session
export async function PUT(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, start_time, end_time, is_active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Validate that end_time is after start_time if both are provided
    if (start_time && end_time) {
      const startDate = new Date(start_time)
      const endDate = new Date(end_time)

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End time must be after start time' },
          { status: 400 }
        )
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build update object with only provided fields
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (start_time !== undefined) updates.start_time = start_time
    if (end_time !== undefined) updates.end_time = end_time
    if (is_active !== undefined) updates.is_active = is_active

    const { data: session, error } = await supabase
      .from('tour_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete tour session
export async function DELETE(request: Request) {
  try {
    const { isAdmin } = await checkAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase
      .from('tour_sessions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting session:', error)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
