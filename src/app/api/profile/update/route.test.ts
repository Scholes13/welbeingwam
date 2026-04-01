import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getAuthProfileContextMock, createSupabaseAdminClientMock } = vi.hoisted(() => ({
  getAuthProfileContextMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
}))

vi.mock('@/utils/auth', () => ({
  getAuthProfileContext: getAuthProfileContextMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}))

import { POST } from './route'

describe('POST /api/profile/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAuthProfileContextMock.mockResolvedValue({
      authUser: { id: '706dabb3-a2b4-49ad-9832-975c9cea26ac', email: 'abilio@werkudara.com' },
      profileId: -1767174261883,
    })
  })

  it('updates auth password without persisting plaintext password on profiles', async () => {
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: { id: 'auth-id' } }, error: null })
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ update })

    createSupabaseAdminClientMock.mockReturnValue({
      from,
      auth: {
        admin: {
          updateUserById,
        },
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ password: 'werkudara88', instagram: '@abilio' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(updateUserById).toHaveBeenCalledWith('706dabb3-a2b4-49ad-9832-975c9cea26ac', {
      password: 'werkudara88',
    })

    const updatePayload = update.mock.calls[0][0]
    expect(updatePayload.password).toBeUndefined()
    expect(updatePayload.instagram_username).toBe('abilio')
  })

  it('returns 500 and skips profile update when auth password update fails', async () => {
    const updateUserById = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'fetch failed' },
    })
    const update = vi.fn()
    const from = vi.fn().mockReturnValue({ update })

    createSupabaseAdminClientMock.mockReturnValue({
      from,
      auth: {
        admin: {
          updateUserById,
        },
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/profile/update', {
        method: 'POST',
        body: JSON.stringify({ password: 'werkudara88' }),
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'Failed to update password',
    })
    expect(update).not.toHaveBeenCalled()
  })
})
