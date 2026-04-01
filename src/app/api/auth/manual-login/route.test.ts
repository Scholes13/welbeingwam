import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server'
import { POST } from './route'

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient)
const createSupabaseServerClientMock = vi.mocked(createSupabaseServerClient)

describe('POST /api/auth/manual-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs access-code users into the canonical werkudara identity without reading profiles.password', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'token' }, user: { id: 'auth-id' } },
      error: null,
    })
    const select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: -1, username: 'Abilio' },
          error: null,
        }),
      }),
    })

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select,
      }),
    } as never)

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword,
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/manual-login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'CODE-8193' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(select).toHaveBeenCalledWith('id, username')
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'abilio@werkudara.com',
      password: 'werkudara88',
    })
  })

  it('returns 503 when Supabase auth is unreachable', async () => {
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: -1, username: 'Abilio' },
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    createSupabaseServerClientMock.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null, user: null },
          error: { name: 'AuthRetryableFetchError', message: 'fetch failed' },
        }),
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/auth/manual-login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'CODE-8193' }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication service unavailable',
    })
  })
})
