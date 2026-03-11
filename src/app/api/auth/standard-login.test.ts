import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithPassword = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      signInWithPassword,
    },
  }),
}))

import { POST } from './standard-login/route'

describe('POST /api/auth/standard-login', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
  })

  it('uses the canonical werkudara.com synthetic email namespace', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const response = await POST(
      new Request('http://localhost/api/auth/standard-login', {
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'secret123' }),
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
