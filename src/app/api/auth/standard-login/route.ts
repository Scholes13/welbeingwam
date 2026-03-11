import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username/Password required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Sign in with Supabase Auth (username@wam.local email pattern)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${username}@werkudara.com`,
      password: password,
    })

    if (error) {
      console.error('Login Error:', error.message)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
