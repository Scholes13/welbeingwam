import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const senderId = cookieStore.get('strava_athlete_id')?.value

  if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { targetUserId, message } = await request.json()

  if (!targetUserId || !message) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
      const { error } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          sender_id: senderId,
          message: message,
          type: 'message',
          title: 'New Message'
      })

      if (error) throw error

      return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Message Error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
