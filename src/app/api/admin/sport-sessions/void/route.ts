import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyAdminPermission } from '@/utils/auth'
import { NextResponse } from 'next/server'

type VoidSportSessionBody = {
  id?: string | number
  reason?: string
}

export async function POST(request: Request) {
  const { authorized } = await verifyAdminPermission('manage_activities')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = (await request.json()) as VoidSportSessionBody
    const id = body.id
    const reason = body.reason?.trim()

    if (!id || !reason) {
      return NextResponse.json({ error: 'Session id and reason are required' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: session, error: lookupError } = await supabase
      .from('activities')
      .select('id, mode')
      .eq('id', id)
      .single()

    if (lookupError || !session) {
      return NextResponse.json({ error: 'Sport session not found' }, { status: 404 })
    }

    if (session.mode !== 'sport') {
      return NextResponse.json({ error: 'Only sport sessions can be voided here' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('activities')
      .update({
        review_status: 'voided',
        review_reason: reason,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Void sport session error:', updateError)
      return NextResponse.json({ error: 'Failed to void sport session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Void sport session route error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
