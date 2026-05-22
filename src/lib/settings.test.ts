import { describe, expect, it } from 'vitest'

import { buildSettingsRows, parseSettingsRows } from './settings'

describe('parseSettingsRows', () => {
  it('parses numeric and boolean JSONB values into the app settings shape', () => {
    const settings = parseSettingsRows([
      { key: 'base_checkin_points', value: 75 },
      { key: 'photo_bonus_points', value: 15 },
      { key: 'category_streak_bonus', value: 240 },
      { key: 'speed_demon_bonus', value: 320 },
      { key: 'strava_sync_cooldown_minutes', value: 20 },
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
    ])

    expect(settings).toEqual({
      base_checkin_points: 75,
      photo_bonus_points: 15,
      category_streak_bonus: 240,
      speed_demon_bonus: 320,
      strava_sync_cooldown_minutes: 20,
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
    })
  })

  it('keeps defaults when rows are absent or invalid', () => {
    const settings = parseSettingsRows([
      { key: 'base_checkin_points', value: 'abc' },
      { key: 'strava_sync_cooldown_minutes', value: 0 },
      { key: 'feature_qr_checkin', value: 'nope' },
    ])

    expect(settings.base_checkin_points).toBe(50)
    expect(settings.strava_sync_cooldown_minutes).toBe(15)
    expect(settings.features.qr_checkin).toBe(true)
    expect(settings.features.gps_checkin).toBe(true)
    expect(settings.maintenance.enabled).toBe(false)
    expect(settings.maintenance.message).toBe('We are performing scheduled maintenance. Please check back soon.')
  })
})

describe('buildSettingsRows', () => {
  it('builds native JSON values instead of stringifying numbers and booleans', () => {
    const rows = buildSettingsRows({
      base_checkin_points: 90,
      photo_bonus_points: 30,
      category_streak_bonus: 210,
      speed_demon_bonus: 310,
      strava_sync_cooldown_minutes: 25,
      features: {
        qr_checkin: false,
        gps_checkin: true,
        photo_checkin: false,
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
    })

    expect(rows).toContainEqual({ key: 'base_checkin_points', value: 90 })
    expect(rows).toContainEqual({ key: 'strava_sync_cooldown_minutes', value: 25 })
    expect(rows).toContainEqual({ key: 'feature_qr_checkin', value: false })
    expect(rows).toContainEqual({ key: 'feature_rewards', value: true })
    expect(rows).toContainEqual({ key: 'maintenance_enabled', value: true })
    expect(rows).toContainEqual({ key: 'maintenance_message', value: 'Maintenance in progress' })
  })
})
