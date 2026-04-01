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

describe('POST /api/admin/users/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyAdminPermissionMock.mockResolvedValue({ authorized: true, userId: '-99' })
  })

  it('deletes the linked auth user by auth_user_id instead of the bigint profile id', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const deleteActivitiesEq = vi.fn().mockResolvedValue({ error: null })
    const deleteUserQuestsEq = vi.fn().mockResolvedValue({ error: null })
    const deleteProfilesEq = vi.fn().mockResolvedValue({ error: null })

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  username: 'Abilio',
                  auth_user_id: '706dabb3-a2b4-49ad-9832-975c9cea26ac',
                },
                error: null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: deleteProfilesEq,
          }),
        }
      }

      if (table === 'activities') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: deleteActivitiesEq,
          }),
        }
      }

      if (table === 'user_quests') {
        return {
          delete: vi.fn().mockReturnValue({
            eq: deleteUserQuestsEq,
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    createSupabaseAdminClientMock.mockReturnValue({
      from,
      auth: {
        admin: {
          deleteUser,
        },
      },
    } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/admin/users/delete', {
        method: 'POST',
        body: JSON.stringify({ id: -1767174261883 }),
      }),
    )

    expect(response.status).toBe(200)
    expect(deleteUser).toHaveBeenCalledWith('706dabb3-a2b4-49ad-9832-975c9cea26ac')
    expect(deleteProfilesEq).toHaveBeenCalledWith('id', -1767174261883)
  })
})
