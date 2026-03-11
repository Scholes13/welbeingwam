import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockState = vi.hoisted(() => ({
  authLookup: { data: null as { id: number } | null, error: null as unknown },
  usernameRows: [] as Array<{ id: number }>,
  usernameError: null as unknown,
  calls: [] as Array<[string, string, unknown]>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from() {
      const query = {
        select() {
          return query
        },
        eq(column: string, value: unknown) {
          mockState.calls.push(['eq', column, value])
          return {
            single: async () => mockState.authLookup,
          }
        },
        ilike(column: string, value: unknown) {
          mockState.calls.push(['ilike', column, value])
          return {
            limit: async () => ({
              data: mockState.usernameRows,
              error: mockState.usernameError,
            }),
          }
        },
      }

      return query
    },
  }),
  createSupabaseServerClient: vi.fn(),
}))

import { resolveProfileIdFromAuthUser } from './auth'

describe('resolveProfileIdFromAuthUser', () => {
  beforeEach(() => {
    mockState.authLookup = { data: null, error: null }
    mockState.usernameRows = []
    mockState.usernameError = null
    mockState.calls = []
  })

  it('returns numeric IDs without querying profiles', async () => {
    const result = await resolveProfileIdFromAuthUser({
      id: '12345',
      email: 'ignored@werkudara.com',
    })

    expect(result).toBe(12345)
    expect(mockState.calls).toEqual([])
  })

  it('prefers auth_user_id lookup before falling back to username-derived matching', async () => {
    mockState.authLookup = { data: { id: 42 }, error: null }

    const result = await resolveProfileIdFromAuthUser({
      id: 'auth-user-123',
      email: 'alice@werkudara.com',
    })

    expect(result).toBe(42)
    expect(mockState.calls).toContainEqual(['eq', 'auth_user_id', 'auth-user-123'])
  })

  it('falls back to username matching when no canonical auth mapping exists', async () => {
    mockState.usernameRows = [{ id: 7 }]

    const result = await resolveProfileIdFromAuthUser({
      id: 'not-a-number',
      email: 'alice@werkudara.com',
    })

    expect(result).toBe(7)
    expect(mockState.calls).toContainEqual(['ilike', 'username', 'alice'])
  })

  it('returns null instead of binding arbitrarily when username fallback matches multiple profiles', async () => {
    mockState.usernameRows = [{ id: 7 }, { id: 8 }]

    const result = await resolveProfileIdFromAuthUser({
      id: 'not-a-number',
      email: 'alice@werkudara.com',
    })

    expect(result).toBeNull()
  })

  it('returns null when neither canonical auth mapping nor username fallback resolves a profile', async () => {
    const result = await resolveProfileIdFromAuthUser({
      id: 'missing-auth-user',
      email: 'missing@werkudara.com',
    })

    expect(result).toBeNull()
  })
})
