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
      .select('id, username, password, auth_user_id')
      .eq('access_code', accessCode)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Account requires password migration' }, { status: 503 })
    }

    const supabase = await createSupabaseServerClient()
    const candidateEmails = new Set<string>()

    if (user.auth_user_id) {
      const { data: authUserLookup, error: authUserError } = await adminClient.auth.admin.getUserById(user.auth_user_id)
      if (!authUserError && authUserLookup.user?.email) {
        candidateEmails.add(authUserLookup.user.email)
      }
    }

    candidateEmails.add(`${user.username}@werkudara.com`)
    candidateEmails.add(`${user.username}@wam.local`)

    for (const email of candidateEmails) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: user.password,
      })

      if (!signInError) {
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ error: 'Login failed' }, { status: 401 })

  } catch (error) {
    console.error('Manual Login Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
