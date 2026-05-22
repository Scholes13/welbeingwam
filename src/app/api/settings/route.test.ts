import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createClientMock, verifyAdminPermissionMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  verifyAdminPermissionMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}))

vi.mock('@/utils/auth', () => ({
  verifyAdminPermission: verifyAdminPermissionMock,
}))

import { GET, PUT } from './route'

describe('settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    verifyAdminPermissionMock.mockResolvedValue({ authorized: true })
  })

  it('GET parses native JSONB rows into the settings payload', async () => {
    const select = vi.fn().mockResolvedValue({
      data: [
        { key: 'base_checkin_points', value: 80 },
        { key: 'photo_bonus_points', value: 20 },
        { key: 'category_streak_bonus', value: 250 },
        { key: 'speed_demon_bonus', value: 325 },
        { key: 'strava_sync_cooldown_minutes', value: 30 },
        { key: 'feature_qr_checkin', value: true },
        { key: 'feature_gps_checkin', value: false },
        { key: 'feature_photo_checkin', value: true },
        { key: 'feature_badges', value: true },
        { key: 'feature_leaderboard', value: false },
        { key: 'feature_rewards', value: true },
        { key: 'feature_surveys', value: false },
        { key: 'feature_category_filter', value: true },
        { key: 'maintenance_enabled', value: true },
        { key: 'maintenance_message', value: 'Maintenance in progress' },
      ],
      error: null,
    })
    const from = vi.fn().mockReturnValue({ select })
    createClientMock.mockReturnValue({ from })

    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      settings: {
        base_checkin_points: 80,
        photo_bonus_points: 20,
        category_streak_bonus: 250,
        speed_demon_bonus: 325,
        strava_sync_cooldown_minutes: 30,
        features: {
          qr_checkin: true,
          gps_checkin: false,
          photo_checkin: true,
          badges: true,
          leaderboard: false,
          rewards: true,
          surveys: false,
          category_filter: true,
        },
        maintenance: {
          enabled: true,
          message: 'Maintenance in progress',
        },
      },
    })
  })

  it('GET returns a degraded error when the settings table is unavailable', async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.settings' in the schema cache",
      },
    })
    const from = vi.fn().mockReturnValue({ select })
    createClientMock.mockReturnValue({ from })

    const response = await GET()

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Settings store unavailable',
      degraded: true,
    })
  })

  it('PUT returns 400 for invalid strava_sync_cooldown_minutes (negative number)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    createClientMock.mockReturnValue({ from })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          strava_sync_cooldown_minutes: -5,
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('strava_sync_cooldown_minutes'),
    })
  })

  it('PUT returns 403 when not authorized', async () => {
    verifyAdminPermissionMock.mockResolvedValue({ authorized: false })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ base_checkin_points: 100 }),
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Forbidden',
    })
  })

  it('PUT returns 400 for non-integer base_checkin_points', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    createClientMock.mockReturnValue({ from })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          base_checkin_points: 3.14,
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('base_checkin_points'),
    })
  })

  it('PUT upserts native number and boolean values', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    createClientMock.mockReturnValue({ from })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          base_checkin_points: 90,
          strava_sync_cooldown_minutes: 25,
          features: {
            qr_checkin: false,
            rewards: true,
          },
          maintenance: {
            enabled: true,
            message: 'Maintenance in progress',
          },
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith({ key: 'base_checkin_points', value: 90 }, { onConflict: 'key' })
    expect(upsert).toHaveBeenCalledWith({ key: 'strava_sync_cooldown_minutes', value: 25 }, { onConflict: 'key' })
    expect(upsert).toHaveBeenCalledWith({ key: 'feature_qr_checkin', value: false }, { onConflict: 'key' })
    expect(upsert).toHaveBeenCalledWith({ key: 'feature_rewards', value: true }, { onConflict: 'key' })
    expect(upsert).toHaveBeenCalledWith({ key: 'maintenance_enabled', value: true }, { onConflict: 'key' })
    expect(upsert).toHaveBeenCalledWith({ key: 'maintenance_message', value: 'Maintenance in progress' }, { onConflict: 'key' })
  })

  it('PUT returns 400 for invalid maintenance payload', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    createClientMock.mockReturnValue({ from })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          maintenance: {
            enabled: 'yes',
          },
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'maintenance.enabled must be a boolean',
    })
  })

  it('PUT returns 400 when maintenance message is too long', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    createClientMock.mockReturnValue({ from })

    const response = await PUT(
      new Request('http://localhost:3000/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          maintenance: {
            message: 'x'.repeat(501),
          },
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'maintenance.message must be 500 characters or fewer',
    })
  })
})
