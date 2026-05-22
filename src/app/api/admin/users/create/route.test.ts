import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  it('updates the trigger-created profile linked by auth_user_id without replacing profiles.id', async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const upsert = vi.fn()
    const ilike = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          ilike,
        }),
        update,
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
    expect(update).toHaveBeenCalledTimes(1)
    expect(upsert).not.toHaveBeenCalled()

    const updatedProfile = update.mock.calls[0][0]
    expect(updatedProfile.auth_user_id).toBeUndefined()
    expect(updatedProfile.id).toBeUndefined()
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

  it('reuses an orphan auth user when canonical email already exists without a profile', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const insert = vi.fn().mockResolvedValue({ error: null })
    const ilike = vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const from = vi.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table ${table}`)

      return {
        select: vi.fn().mockReturnValue({ ilike }),
        update: vi.fn().mockReturnValue({ eq: updateEq }),
        insert,
      }
    })
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email address has already been registered' },
    })
    const listUsers = vi.fn().mockResolvedValue({
      data: {
        users: [
          {
            id: 'existing-auth-id',
            email: 'tyo@werkudara.com',
          },
        ],
      },
      error: null,
    })

    createSupabaseAdminClientMock.mockReturnValue({
      from,
      auth: {
        admin: {
          createUser,
          listUsers,
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    })

    const response = await POST(
      new Request('http://localhost:3000/api/admin/users/create', {
        method: 'POST',
        body: JSON.stringify({
          username: 'Tyo',
          password: 'werkudara88',
          fullName: 'Tyo',
          gender: 'male',
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(listUsers).toHaveBeenCalled()
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        auth_user_id: 'existing-auth-id',
        username: 'tyo',
        full_name: 'Tyo',
      }),
    )
  })

  it('keeps the auth signup trigger compatible with bigint profile ids', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260401002000_fix_auth_signup_trigger_bigint_profiles.sql'),
      'utf8',
    )

    expect(migration).toContain('CREATE SEQUENCE IF NOT EXISTS public.profiles_manual_id_seq')
    expect(migration).toContain("nextval('public.profiles_manual_id_seq'::regclass)")
    expect(migration).not.toContain('new.id, -- Valid if profiles.id is UUID')
  })

  it('uses the partial auth_user_id unique index when the auth signup trigger upserts profiles', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260401002100_fix_auth_signup_trigger_conflict_target.sql'),
      'utf8',
    )

    expect(migration).toContain('ON CONFLICT (auth_user_id) WHERE auth_user_id IS NOT NULL DO UPDATE SET')
    expect(migration).not.toContain('ON CONFLICT (auth_user_id) DO UPDATE SET')
  })
})
