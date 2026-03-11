import { describe, expect, it } from 'vitest'

import {
  getStravaActivitiesNeedingDetail,
  mergeStravaActivity,
  resolveStravaSyncCooldown,
  shouldRefreshStravaToken,
  shouldRunStravaSync,
} from './sync'

describe('resolveStravaSyncCooldown', () => {
  it('falls back to 15 minutes when the settings value is missing or invalid', () => {
    expect(resolveStravaSyncCooldown(null)).toBe(15)
    expect(resolveStravaSyncCooldown(undefined)).toBe(15)
    expect(resolveStravaSyncCooldown('')).toBe(15)
    expect(resolveStravaSyncCooldown('abc')).toBe(15)
    expect(resolveStravaSyncCooldown(0)).toBe(15)
  })

  it('uses the configured positive integer cooldown from settings', () => {
    expect(resolveStravaSyncCooldown('30')).toBe(30)
    expect(resolveStravaSyncCooldown(45)).toBe(45)
  })
})

describe('shouldRunStravaSync', () => {
  it('skips strava api calls when cooldown has not elapsed', () => {
    const shouldSync = shouldRunStravaSync({
      lastSyncedAt: '2026-03-11T10:00:00Z',
      now: '2026-03-11T10:10:00Z',
      cooldownMinutes: 15,
    })

    expect(shouldSync).toBe(false)
  })

  it('allows sync when no prior sync timestamp exists', () => {
    const shouldSync = shouldRunStravaSync({
      lastSyncedAt: null,
      now: '2026-03-11T10:10:00Z',
      cooldownMinutes: 15,
    })

    expect(shouldSync).toBe(true)
  })
})

describe('shouldRefreshStravaToken', () => {
  it('refreshes when the expiry timestamp is missing', () => {
    const shouldRefresh = shouldRefreshStravaToken({
      expiresAt: null,
      nowEpochSeconds: 1_710_153_700,
    })

    expect(shouldRefresh).toBe(true)
  })

  it('refreshes when the token expires within the 5 minute safety window', () => {
    const shouldRefresh = shouldRefreshStravaToken({
      expiresAt: 1_710_153_900,
      nowEpochSeconds: 1_710_153_700,
    })

    expect(shouldRefresh).toBe(true)
  })

  it('skips refresh when the token is still valid beyond the safety window', () => {
    const shouldRefresh = shouldRefreshStravaToken({
      expiresAt: 1_710_154_200,
      nowEpochSeconds: 1_710_153_700,
    })

    expect(shouldRefresh).toBe(false)
  })
})

describe('getStravaActivitiesNeedingDetail', () => {
  it('returns only new or incomplete activities for detail hydration', () => {
    const result = getStravaActivitiesNeedingDetail({
      summaries: [
        { id: 1, name: 'Lunch Ride', type: 'Ride', distance: 12000, moving_time: 1800, start_date: '2026-03-11T01:00:00Z' },
        { id: 2, name: 'Morning Run', type: 'Run', distance: 5000, moving_time: 1500, start_date: '2026-03-11T02:00:00Z' },
        { id: 3, name: 'Evening Swim', type: 'Swim', distance: 1000, moving_time: 2100, start_date: '2026-03-11T03:00:00Z' },
      ],
      existingActivities: [
        { external_id: '1', has_calories: true, last_synced_at: '2026-03-11T01:10:00Z' },
        { external_id: '2', has_calories: false, last_synced_at: '2026-03-11T02:10:00Z' },
      ],
    })

    expect(result.map((activity) => activity.id)).toEqual([2, 3])
  })
})

describe('mergeStravaActivity', () => {
  it('creates sport records with source=strava and calories as activity points', () => {
    const result = mergeStravaActivity({
      summary: {
        id: 1,
        name: 'Lunch Ride',
        type: 'Ride',
        distance: 12000,
        moving_time: 1800,
        start_date: '2026-03-11T01:00:00Z',
      },
      detail: {
        calories: 420,
      },
      existing: null,
      physicalDimensionId: 'dim-physical',
      userId: 'user-1',
      syncedAt: '2026-03-11T02:00:00Z',
    })

    expect(result.mode).toBe('sport')
    expect(result.source).toBe('strava')
    expect(result.activity_points).toBe(420)
    expect(result.calories).toBe(420)
    expect(result.steps).toBe(0)
    expect(result.dimension_id).toBe('dim-physical')
    expect(result.last_synced_at).toBe('2026-03-11T02:00:00Z')
  })

  it('stores history even when calories are missing', () => {
    const result = mergeStravaActivity({
      summary: {
        id: 2,
        name: 'Evening Hike',
        type: 'Hike',
        distance: 8000,
        moving_time: 3600,
        start_date: '2026-03-11T03:00:00Z',
      },
      detail: {},
      existing: null,
      physicalDimensionId: 'dim-physical',
      userId: 'user-1',
      syncedAt: '2026-03-11T03:30:00Z',
    })

    expect(result.mode).toBe('sport')
    expect(result.source).toBe('strava')
    expect(result.activity_points).toBe(0)
    expect(result.calories).toBe(0)
    expect(result.steps).toBe(0)
  })

  it('floors decimal calories from Strava detail instead of dropping them', () => {
    const result = mergeStravaActivity({
      summary: {
        id: 21,
        name: 'Tempo Run',
        type: 'Run',
        distance: 10000,
        moving_time: 2400,
        start_date: '2026-03-11T05:00:00Z',
      },
      detail: {
        calories: 420.9,
      },
      existing: null,
      physicalDimensionId: 'dim-physical',
      userId: 'user-1',
      syncedAt: '2026-03-11T05:30:00Z',
    })

    expect(result.calories).toBe(420)
    expect(result.activity_points).toBe(420)
  })

  it('preserves existing moderation fields when re-syncing a strava activity', () => {
    const result = mergeStravaActivity({
      summary: {
        id: 3,
        name: 'Evening Run',
        type: 'Run',
        distance: 5000,
        moving_time: 1500,
        start_date: '2026-03-11T12:00:00Z',
      },
      detail: {
        calories: 300,
      },
      existing: {
        review_status: 'voided',
        review_reason: 'manual admin review',
        proof_url: 'https://example.com/legacy-proof.jpg',
      },
      physicalDimensionId: 'dim-physical',
      userId: 'user-1',
      syncedAt: '2026-03-11T12:15:00Z',
    })

    expect(result.review_status).toBe('voided')
    expect(result.review_reason).toBe('manual admin review')
    expect(result.proof_url).toBe('https://example.com/legacy-proof.jpg')
    expect(result.activity_points).toBe(300)
  })

  it('keeps existing calories when summary is refreshed without a new detail payload', () => {
    const result = mergeStravaActivity({
      summary: {
        id: 4,
        name: 'Commute Ride',
        type: 'Ride',
        distance: 9000,
        moving_time: 1700,
        start_date: '2026-03-11T13:00:00Z',
      },
      detail: {},
      existing: {
        id: 44,
        external_id: '4',
        calories: 275,
        has_calories: true,
        last_synced_at: '2026-03-11T13:05:00Z',
      },
      physicalDimensionId: 'dim-physical',
      userId: 'user-1',
      syncedAt: '2026-03-11T13:15:00Z',
    })

    expect(result.id).toBe(44)
    expect(result.calories).toBe(275)
    expect(result.activity_points).toBe(275)
    expect(result.has_calories).toBe(true)
  })
})
