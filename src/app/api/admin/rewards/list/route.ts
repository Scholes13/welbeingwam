import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  
  // 1. Check Admin Access
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
    const { data: rewards, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ rewards: rewards || [] })

  } catch (error) {
    console.error('List Rewards Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
