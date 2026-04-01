import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { POST } from './route'

const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient)

describe('POST /api/auth/standard-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Supabase rejects invalid credentials', async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/standard-login', {
        method: 'POST',
        body: JSON.stringify({ username: 'Pramuji', password: 'wrong-pass' }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid credentials',
    })
  })

  it('normalizes username casing before deriving the canonical werkudara email', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'token' }, user: { id: 'auth-id' } },
      error: null,
    })

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword,
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/standard-login', {
        method: 'POST',
        body: JSON.stringify({ username: 'Abilio', password: 'werkudara88' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'abilio@werkudara.com',
      password: 'werkudara88',
    })
  })

  it('returns 503 when Supabase auth is unreachable', async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: {
            name: 'AuthRetryableFetchError',
            message: 'fetch failed',
            cause: {
              code: 'ENOTFOUND',
              hostname: 'ihrutobdomnagnwzwncy.supabase.co',
            },
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/standard-login', {
        method: 'POST',
        body: JSON.stringify({ username: 'Pramuji', password: 'werkudara88' }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication service unavailable',
    })
  })

  it('returns 503 when Supabase project keys are invalid for the configured URL', async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: {
            message: 'Invalid API key',
          },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/standard-login', {
        method: 'POST',
        body: JSON.stringify({ username: 'Pramuji', password: 'werkudara88' }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication service unavailable',
    })
  })
})
