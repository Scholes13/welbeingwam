import { describe, expect, it } from 'vitest'

import { getStravaConnectionState, getStravaFeedback } from './strava'

describe('getStravaConnectionState', () => {
  it('marks profile as disconnected when athlete id is missing', () => {
    expect(getStravaConnectionState({ strava_athlete_id: null })).toEqual({
      isConnected: false,
      statusLabel: 'Belum terhubung',
      buttonLabel: 'Connect Strava',
      helperText: 'Hubungkan Strava untuk sync sport session otomatis ke physical points.',
    })
  })

  it('marks profile as connected when athlete id exists', () => {
    expect(
      getStravaConnectionState({
        strava_athlete_id: 12345,
        last_strava_sync_at: '2026-03-11T10:15:00.000Z',
      }),
    ).toEqual({
      isConnected: true,
      statusLabel: 'Terhubung',
      buttonLabel: 'Reconnect Strava',
      helperText: 'Sync sport session otomatis setiap cooldown aktif.',
      athleteLabel: 'Athlete ID 12345',
      lastSyncLabel: 'Terakhir sync 11 Mar 2026, 17:15',
    })
  })

  it('maps callback success to a profile banner', () => {
    expect(getStravaFeedback({ strava: 'connected' })).toEqual({
      tone: 'success',
      message: 'Akun Strava berhasil terhubung.',
    })
  })

  it('maps callback errors to a profile banner', () => {
    expect(getStravaFeedback({ error: 'strava_failed' })).toEqual({
      tone: 'error',
      message: 'Gagal menghubungkan Strava. Coba lagi beberapa saat lagi.',
    })
  })
})
