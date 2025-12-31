import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('strava_athlete_id')?.value

  if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { avatarUrl } = await request.json()

  if (!avatarUrl) {
      return NextResponse.json({ error: 'Missing avatarUrl' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update Avatar Error:', error)
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 })
  }
}
