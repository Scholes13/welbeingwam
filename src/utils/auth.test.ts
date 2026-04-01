import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClientMock, createSupabaseServerClientMock } = vi.hoisted(() => ({
  createSupabaseAdminClientMock: vi.fn(),
  createSupabaseServerClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
  createSupabaseServerClient: createSupabaseServerClientMock,
}))

import { resolveProfileIdFromAuthUser } from './auth'

describe('resolveProfileIdFromAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefers profiles.auth_user_id over username-derived fallback', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: -1767174261883 },
      error: null,
    })
    const ilike = vi.fn()

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
          ilike,
        }),
      }),
    })

    const result = await resolveProfileIdFromAuthUser({
      id: '706dabb3-a2b4-49ad-9832-975c9cea26ac',
      email: 'abilio@werkudara.com',
    })

    expect(result).toBe(-1767174261883)
    expect(maybeSingle).toHaveBeenCalled()
    expect(ilike).not.toHaveBeenCalled()
  })

  it('resolves by auth_user_id even when auth email is missing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: -1767174261883 },
      error: null,
    })
    const ilike = vi.fn()

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
          ilike,
        }),
      }),
    })

    const result = await resolveProfileIdFromAuthUser({
      id: '706dabb3-a2b4-49ad-9832-975c9cea26ac',
      email: null,
    })

    expect(result).toBe(-1767174261883)
    expect(maybeSingle).toHaveBeenCalled()
    expect(ilike).not.toHaveBeenCalled()
  })
})
