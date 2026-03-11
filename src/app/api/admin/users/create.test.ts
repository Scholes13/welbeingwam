import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  verified: { authorized: true },
  existingUser: null as { id: string } | null,
  createdAuthUser: { user: { id: 'auth-user-1' } },
  createUserCalls: [] as Array<Record<string, unknown>>,
  insertedProfiles: [] as Array<Record<string, unknown>>,
}))

const dateNowSpy = vi.spyOn(Date, 'now')

vi.mock('@/utils/auth', () => ({
  verifyAdminPermission: vi.fn(async () => mockState.verified),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        createUser: async (payload: Record<string, unknown>) => {
          mockState.createUserCalls.push(payload)
          return { data: mockState.createdAuthUser, error: null }
        },
        deleteUser: async () => ({ data: null, error: null }),
      },
    },
    from(tableName: string) {
      if (tableName !== 'profiles') {
        throw new Error(`Unexpected table ${tableName}`)
      }

      const selectQuery = {
        eq() {
          return {
            single: async () => ({
              data: mockState.existingUser,
              error: null,
            }),
          }
        },
      }

      return {
        select() {
          return selectQuery
        },
        insert(payload: Record<string, unknown>) {
          mockState.insertedProfiles.push(payload)
          return { error: null }
        },
      }
    },
  }),
}))

import { POST } from './create/route'

describe('POST /api/admin/users/create', () => {
  beforeEach(() => {
    dateNowSpy.mockReturnValue(1767175000000)
    mockState.verified = { authorized: true }
    mockState.existingUser = null
    mockState.createdAuthUser = { user: { id: 'auth-user-1' } }
    mockState.createUserCalls = []
    mockState.insertedProfiles = []
  })

  it('creates auth credentials and stores auth_user_id for the linked manual profile', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          username: 'alice',
          password: 'secret123',
          fullName: 'Alice',
          gender: 'female',
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    )

    expect(response.status).toBe(200)
    expect(mockState.createUserCalls[0]).toMatchObject({
      email: 'alice@werkudara.com',
      password: 'secret123',
    })
    expect(mockState.insertedProfiles).toHaveLength(1)
    expect(mockState.insertedProfiles[0]).toMatchObject({
      id: -1767175000000,
      auth_user_id: 'auth-user-1',
      username: 'alice',
      full_name: 'Alice',
      is_manual: true,
      password: 'secret123',
    })
  })
})
