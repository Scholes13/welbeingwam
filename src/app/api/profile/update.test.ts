import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  profileContext: {
    authUser: { id: 'auth-user-1' },
    profileId: 42,
  },
  updatePayloads: [] as Array<Record<string, unknown>>,
  authPasswordUpdates: [] as Array<{ id: string; password: string }>,
}))

vi.mock('@/utils/auth', () => ({
  getAuthProfileContext: vi.fn(async () => mockState.profileContext),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: async (id: string, payload: { password: string }) => {
          mockState.authPasswordUpdates.push({ id, password: payload.password })
          return { data: null, error: null }
        },
      },
    },
    from() {
      return {
        update(payload: Record<string, unknown>) {
          mockState.updatePayloads.push(payload)
          return {
            eq: async () => ({ data: null, error: null }),
          }
        },
      }
    },
  }),
}))

import { POST } from './update/route'

describe('POST /api/profile/update', () => {
  beforeEach(() => {
    mockState.profileContext = {
      authUser: { id: 'auth-user-1' },
      profileId: 42,
    }
    mockState.updatePayloads = []
    mockState.authPasswordUpdates = []
  })

  it('updates the auth password and keeps the manual-login password in sync on the profile row', async () => {
    const response = await POST(
      new Request('http://localhost/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ password: 'new-secret', instagram: '@alice' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(200)
    expect(mockState.authPasswordUpdates).toEqual([{ id: 'auth-user-1', password: 'new-secret' }])
    expect(mockState.updatePayloads).toHaveLength(1)
    expect(mockState.updatePayloads[0]).toMatchObject({
      password: 'new-secret',
      instagram_username: 'alice',
    })
  })
})
