import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessCode } = await request.json()

    if (!accessCode) {
      return NextResponse.json({ error: 'Access code required' }, { status: 400 })
    }

    const adminClient = createSupabaseAdminClient()

    // Find user by access code (using admin client to bypass RLS)
    const { data: user, error } = await adminClient
      .from('profiles')
      .select('id, username, password')
      .eq('access_code', accessCode)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Sign in via Supabase Auth using the found user's credentials
    const supabase = await createSupabaseServerClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${user.username}@wam.local`,
      password: user.password || 'Welcome123!',
    })

    if (signInError) {
      console.error('Manual Login Auth Error:', signInError.message)
      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Manual Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
