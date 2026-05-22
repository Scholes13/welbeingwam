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

describe('POST /api/admin/users/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyAdminPermissionMock.mockResolvedValue({ authorized: true })
  })

  it('clears coin transactions when resetting all user progress', async () => {
    const tableDeletes = new Map<string, ReturnType<typeof vi.fn>>()

    const from = vi.fn((table: string) => {
      const eq = vi.fn().mockResolvedValue({ error: null })
      tableDeletes.set(table, eq)
      return {
        delete: vi.fn().mockReturnValue({ eq }),
      }
    })

    createSupabaseAdminClientMock.mockReturnValue({ from } as never)

    const response = await POST(
      new Request('http://localhost:3000/api/admin/users/reset', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: 'user-1', type: 'all' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(tableDeletes.get('activities')).toHaveBeenCalledWith('user_id', 'user-1')
    expect(tableDeletes.get('user_quests')).toHaveBeenCalledWith('user_id', 'user-1')
    expect(tableDeletes.get('point_adjustments')).toHaveBeenCalledWith('user_id', 'user-1')
    expect(tableDeletes.get('user_rewards')).toHaveBeenCalledWith('user_id', 'user-1')
    expect(tableDeletes.get('coin_transactions')).toHaveBeenCalledWith('user_id', 'user-1')
  })
})
