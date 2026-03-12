import { describe, expect, it } from 'vitest'

import {
  buildDisconnectStravaAvatarUpdate,
  buildLegacyDisconnectUpdate,
  buildLegacyManualAvatarUpdate,
  buildManualAvatarUpdate,
  buildStravaAvatarSyncUpdate,
  buildUseManualAvatarUpdate,
  buildUseStravaAvatarUpdate,
  isMissingAvatarPreferenceColumnsError,
  omitAvatarPreferenceFields,
} from './profile-avatar'

describe('profile avatar helpers', () => {
  it('stores manual avatar as the primary app avatar', () => {
    expect(buildManualAvatarUpdate('https://example.com/manual.jpg')).toEqual({
      avatar_url: 'https://example.com/manual.jpg',
      manual_avatar_url: 'https://example.com/manual.jpg',
      avatar_source: 'manual',
    })
  })

  it('stores strava avatar separately without overwriting the app avatar by default', () => {
    expect(
      buildStravaAvatarSyncUpdate({
        currentAvatarUrl: 'https://example.com/current.jpg',
        stravaAvatarUrl: 'https://example.com/strava.jpg',
        avatarSource: 'manual',
      }),
    ).toEqual({
      strava_avatar_url: 'https://example.com/strava.jpg',
    })
  })

  it('refreshes the visible avatar when the user already chose strava as source', () => {
    expect(
      buildStravaAvatarSyncUpdate({
        currentAvatarUrl: 'https://example.com/current.jpg',
        stravaAvatarUrl: 'https://example.com/strava.jpg',
        avatarSource: 'strava',
      }),
    ).toEqual({
      strava_avatar_url: 'https://example.com/strava.jpg',
      avatar_url: 'https://example.com/strava.jpg',
    })
  })

  it('switches the visible avatar to the stored strava avatar on demand', () => {
    expect(
      buildUseStravaAvatarUpdate({
        stravaAvatarUrl: 'https://example.com/strava.jpg',
      }),
    ).toEqual({
      avatar_url: 'https://example.com/strava.jpg',
      avatar_source: 'strava',
    })
  })

  it('switches the visible avatar back to the stored manual avatar on demand', () => {
    expect(
      buildUseManualAvatarUpdate({
        manualAvatarUrl: 'https://example.com/manual.jpg',
      }),
    ).toEqual({
      avatar_url: 'https://example.com/manual.jpg',
      avatar_source: 'manual',
    })
  })

  it('restores the manual avatar when strava is disconnected from an active strava avatar', () => {
    expect(
      buildDisconnectStravaAvatarUpdate({
        avatarSource: 'strava',
        manualAvatarUrl: 'https://example.com/manual.jpg',
      }),
    ).toEqual({
      access_token: null,
      refresh_token: null,
      expires_at: null,
      last_strava_sync_at: null,
      strava_avatar_url: null,
      avatar_source: 'manual',
      avatar_url: 'https://example.com/manual.jpg',
    })
  })

  it('falls back to a legacy manual avatar update when avatar preference columns do not exist', () => {
    expect(buildLegacyManualAvatarUpdate('https://example.com/manual.jpg')).toEqual({
      avatar_url: 'https://example.com/manual.jpg',
    })
  })

  it('falls back to a legacy disconnect update when avatar preference columns do not exist', () => {
    expect(buildLegacyDisconnectUpdate()).toEqual({
      access_token: null,
      refresh_token: null,
      expires_at: null,
    })
  })

  it('removes avatar preference fields from profile updates for legacy schemas', () => {
    expect(
      omitAvatarPreferenceFields({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_at: 123,
        avatar_source: 'manual',
        manual_avatar_url: 'https://example.com/manual.jpg',
        strava_avatar_url: 'https://example.com/strava.jpg',
        last_strava_sync_at: '2026-03-12T01:00:00Z',
        updated_at: '2026-03-12T01:00:00Z',
      }),
    ).toEqual({
      access_token: 'token',
      refresh_token: 'refresh',
      expires_at: 123,
      updated_at: '2026-03-12T01:00:00Z',
    })
  })

  it('detects missing avatar preference columns from postgres errors', () => {
    expect(
      isMissingAvatarPreferenceColumnsError({
        code: '42703',
        message: 'column profiles.manual_avatar_url does not exist',
      }),
    ).toBe(true)
    expect(
      isMissingAvatarPreferenceColumnsError({
        code: '42703',
        message: 'column profiles.last_strava_sync_at does not exist',
      }),
    ).toBe(true)
    expect(
      isMissingAvatarPreferenceColumnsError({
        code: 'PGRST204',
        message: "Could not find the 'avatar_source' column of 'profiles' in the schema cache",
      }),
    ).toBe(true)
  })
})
