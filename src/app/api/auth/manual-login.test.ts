import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  accessCodeLookup: {
    data: { id: 'profile-1', username: 'alice', password: 'secret123', auth_user_id: 'auth-user-1' },
    error: null as unknown,
  },
  authUserLookup: {
    data: { user: { email: 'alice.canonical@example.com' } },
    error: null as unknown,
  },
}))
const signInWithPassword = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: async () => mockState.authUserLookup,
      },
    },
    from() {
      const query = {
        select() {
          return query
        },
        eq() {
          return {
            single: async () => mockState.accessCodeLookup,
          }
        },
      }

      return query
    },
  }),
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithPassword,
    },
  }),
}))

import { POST } from './manual-login/route'

describe('POST /api/auth/manual-login', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    mockState.accessCodeLookup = {
      data: { id: 'profile-1', username: 'alice', password: 'secret123', auth_user_id: 'auth-user-1' },
      error: null,
    }
    mockState.authUserLookup = {
      data: { user: { email: 'alice.canonical@example.com' } },
      error: null,
    }
  })

  it('uses the canonical auth email when auth_user_id is linked', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const response = await POST(
      new Request('http://localhost/api/auth/manual-login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'CODE-1234' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(200)
    expect(signInWithPassword).toHaveBeenCalledTimes(1)
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'alice.canonical@example.com',
      password: 'secret123',
    })
  })

  it('falls back to the legacy auth domain when canonical auth email sign-in fails', async () => {
    signInWithPassword
      .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid login credentials' } })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Invalid login credentials' } })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })

    const response = await POST(
      new Request('http://localhost/api/auth/manual-login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'CODE-1234' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(200)
    expect(signInWithPassword).toHaveBeenNthCalledWith(1, {
      email: 'alice.canonical@example.com',
      password: 'secret123',
    })
    expect(signInWithPassword).toHaveBeenNthCalledWith(2, {
      email: 'alice@werkudara.com',
      password: 'secret123',
    })
    expect(signInWithPassword).toHaveBeenNthCalledWith(3, {
      email: 'alice@wam.local',
      password: 'secret123',
    })
  })

  it('supports legacy manual accounts without auth_user_id as long as a password still exists', async () => {
    mockState.accessCodeLookup = {
      data: { id: 'profile-1', username: 'alice', password: 'secret123', auth_user_id: null },
      error: null,
    }
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const response = await POST(
      new Request('http://localhost/api/auth/manual-login', {
        method: 'POST',
        body: JSON.stringify({ accessCode: 'CODE-1234' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(200)
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'alice@werkudara.com',
      password: 'secret123',
    })
  })
})
