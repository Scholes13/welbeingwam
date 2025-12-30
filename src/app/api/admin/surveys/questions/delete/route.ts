import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
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

    // Delete Options manually (safe bet if cascade not perfect)
    await supabase.from('survey_options').delete().eq('question_id', id)
    
    // Delete Question
    const { error } = await supabase
        .from('survey_questions')
        .delete()
        .eq('id', id)

    if (error) {
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
