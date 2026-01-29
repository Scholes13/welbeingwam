import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch active session
    const { data, error } = await supabase
      .from('tour_sessions')
      .select('*')
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is acceptable
      console.error('Error fetching session:', error)
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: data || null })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
