import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  // 1. Check Admin Access
  const sessionId = cookieStore.get('strava_athlete_id')?.value
  const accessCode = cookieStore.get('manual_access_code')?.value

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let isAdmin = false
  if (accessCode) {
      const { data: adminUser } = await supabase.from('profiles').select('username').eq('access_code', accessCode).single()
      if (adminUser?.username === 'admin_wam') isAdmin = true
  } 
  if (!isAdmin && sessionId) {
      const { data: adminUser } = await supabase.from('profiles').select('username').eq('id', sessionId).single()
      if (adminUser?.username === 'admin_wam') isAdmin = true
  }

  if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, title, description, image_url, required_points, max_claims, type } = await request.json()

    if (!id || !title) {
        return NextResponse.json({ error: 'ID and Title are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rewards')
      .update({
        title,
        description,
        image_url,
        required_points: parseInt(required_points) || 0,
        max_claims: parseInt(max_claims) || 0,
        type: type || 'reveal'
      })
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, reward: data[0] })

  } catch (error) {
    console.error('Update Reward Error:', error)
    return NextResponse.json({ error: 'Failed to update reward' }, { status: 500 })
  }
}
