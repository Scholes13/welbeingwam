import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  // 1. Check Admin Access (Support both Manual Code and Standard Login)
  const accessCode = cookieStore.get('manual_access_code')?.value
  const sessionId = cookieStore.get('strava_athlete_id')?.value

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
    const { title, description, image_url, required_points, required_steps, max_claims } = await request.json()

    if (!title || !description) {
        return NextResponse.json({ error: 'Title and Description are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('rewards')
      .insert([{
        title,
        description,
        image_url,
        required_points: parseInt(required_points) || 0,
        required_steps: parseInt(required_steps) || 0,
        max_claims: parseInt(max_claims) || 0 // 0 means unlimited
      }])
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, reward: data[0] })

  } catch (error) {
    console.error('Create Reward Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
