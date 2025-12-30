import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Check Admin Access (Support both Manual Code and Standard Login)
    const accessCode = cookieStore.get('manual_access_code')?.value
    const sessionId = cookieStore.get('strava_athlete_id')?.value

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

    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    // Prevent deleting the super admin itself
    const { data: targetUser } = await supabase.from('profiles').select('username').eq('id', id).single()
    if (targetUser?.username === 'admin_wam') {
        return NextResponse.json({ error: 'Cannot delete Super Admin' }, { status: 403 })
    }

    // Manual Cascade: Delete related data
    await supabase.from('activities').delete().eq('user_id', id)
    await supabase.from('user_quests').delete().eq('user_id', id)

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
