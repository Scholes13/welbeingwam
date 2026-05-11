import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyAdminPermissionMock, createSupabaseAdminClientMock } = vi.hoisted(() => ({
  verifyAdminPermissionMock: vi.fn(),
  createSupabaseAdminClientMock: vi.fn(),
}))

vi.mock('@/utils/auth', () => ({
  verifyAdminPermission: verifyAdminPermissionMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}))

import { POST } from './route'

describe('POST /api/admin/users/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyAdminPermissionMock.mockResolvedValue({ authorized: true, userId: '-99' })
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('creates a bigint profile row linked by auth_user_id instead of writing the auth UUID into profiles.id', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const ilike = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike,
        }),
        upsert,
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: {
              user: { id: '706dabb3-a2b4-49ad-9832-975c9cea26ac' },
            },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    })

    const response = await POST(
      new Request('http://localhost:3000/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          username: 'Abilio',
          password: 'werkudara88',
          fullName: 'Abilio',
          gender: 'male',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledTimes(1)

    const insertedProfile = upsert.mock.calls[0][0]
    expect(insertedProfile.auth_user_id).toBe('706dabb3-a2b4-49ad-9832-975c9cea26ac')
    expect(insertedProfile.id).not.toBe('706dabb3-a2b4-49ad-9832-975c9cea26ac')
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'auth_user_id' })
  })

  it('rejects usernames that collide after canonical lowercasing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: -1767174261883 },
      error: null,
    })
    const createUser = vi.fn()

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      }),
      auth: {
        admin: {
          createUser,
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    })

    const response = await POST(
      new Request('http://localhost:3000/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          username: 'abilio',
          password: 'werkudara88',
          fullName: 'Abilio',
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Username already taken',
    })
    expect(createUser).not.toHaveBeenCalled()
  })
})
