import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { getCanonicalAuthEmail } from '../../../../lib/utils'
import { NextResponse } from 'next/server'

const DEFAULT_CANONICAL_RESET_PASSWORD = 'werkudara88'

function isSupabaseDependencyFailure(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as {
    name?: string
    message?: string
    cause?: { code?: string }
  }

  return (
    candidate.name === 'AuthRetryableFetchError' ||
    candidate.message === 'fetch failed' ||
    candidate.message === 'Invalid API key' ||
    candidate.cause?.code === 'ENOTFOUND' ||
    candidate.cause?.code === 'ECONNREFUSED' ||
    candidate.cause?.code === 'ETIMEDOUT'
  )
}

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
      .select('id, username')
      .eq('access_code', accessCode)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
    }

    // Sign in via Supabase Auth using the found user's credentials
    const supabase = await createSupabaseServerClient()
    const resetPassword =
      process.env.AUTH_CANONICAL_RESET_PASSWORD ?? DEFAULT_CANONICAL_RESET_PASSWORD
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: getCanonicalAuthEmail(user.username),
      password: resetPassword,
    })

    if (signInError) {
      console.error('Manual Login Auth Error:', signInError.message)

      if (isSupabaseDependencyFailure(signInError)) {
        return NextResponse.json(
          { error: 'Authentication service unavailable' },
          { status: 503 },
        )
      }

      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Manual Login Error:', error)

    if (isSupabaseDependencyFailure(error)) {
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 },
      )
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
