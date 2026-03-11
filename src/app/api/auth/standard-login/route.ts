import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    candidate.cause?.code === 'ENOTFOUND' ||
    candidate.cause?.code === 'ECONNREFUSED' ||
    candidate.cause?.code === 'ETIMEDOUT'
  )
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username/Password required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    // Sign in with Supabase Auth using the username-derived email.
    const { error } = await supabase.auth.signInWithPassword({
      email: `${username}@werkudara.com`,
      password: password,
    })

    if (error) {
      console.error('Login Error:', error.message)

      if (isSupabaseDependencyFailure(error)) {
        return NextResponse.json(
          { error: 'Authentication service unavailable' },
          { status: 503 }
        )
      }

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Login Error:', error)

    if (isSupabaseDependencyFailure(error)) {
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
