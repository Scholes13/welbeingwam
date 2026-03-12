import { describe, expect, it } from 'vitest'

import {
  getStravaAvatarState,
  getStravaConnectionState,
  getStravaFeedback,
} from './strava'

describe('getStravaConnectionState', () => {
  it('marks profile as disconnected when athlete id is missing', () => {
    expect(getStravaConnectionState({ strava_athlete_id: null, is_strava_connected: false })).toEqual({
      isConnected: false,
      statusLabel: 'Belum terhubung',
      buttonLabel: 'Connect Strava',
      helperText: 'Hubungkan Strava untuk sync sport session otomatis ke physical points.',
    })
  })

  it('marks profile as connected when legacy token connection exists without athlete id', () => {
    expect(
      getStravaConnectionState({
        strava_athlete_id: null,
        is_strava_connected: true,
        last_strava_sync_at: '2026-03-11T10:15:00.000Z',
      }),
    ).toEqual({
      isConnected: true,
      statusLabel: 'Terhubung',
      buttonLabel: 'Reconnect Strava',
      helperText: 'Sync sport session otomatis setiap cooldown aktif.',
      lastSyncLabel: 'Terakhir sync 11 Mar 2026, 17:15',
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

  it('maps manual disconnect success to a profile banner', () => {
    expect(getStravaFeedback({ strava: 'disconnected' })).toEqual({
      tone: 'success',
      message: 'Akun Strava berhasil dilepas.',
    })
  })

  it('maps callback errors to a profile banner', () => {
    expect(getStravaFeedback({ error: 'strava_failed' })).toEqual({
      tone: 'error',
      message: 'Gagal menghubungkan Strava. Coba lagi beberapa saat lagi.',
    })
  })

  it('shows a clearer message when token exchange fails', () => {
    expect(getStravaFeedback({ error: 'token_exchange_failed' })).toEqual({
      tone: 'error',
      message: 'Strava menolak proses connect. Periksa callback URL app Strava lalu coba lagi.',
    })
  })

  it('shows a clearer message when profile update fails', () => {
    expect(getStravaFeedback({ error: 'profile_update_failed' })).toEqual({
      tone: 'error',
      message: 'Strava sudah authorize, tetapi data profil gagal disimpan. Cek log server.',
    })
  })
})

describe('getStravaAvatarState', () => {
  it('shows a live Strava preview even when avatar preferences are not supported yet', () => {
    expect(
      getStravaAvatarState({
        is_strava_connected: true,
        avatar_preferences_supported: false,
        strava_avatar_url: null,
        strava_avatar_preview_url: 'https://example.com/strava.jpg',
      }),
    ).toEqual({
      imageUrl: 'https://example.com/strava.jpg',
      canUseStravaAvatar: false,
      helperText:
        'Foto Strava sudah terdeteksi, tetapi pilih avatar Strava butuh migration database terbaru.',
    })
  })

  it('enables the Strava avatar selector when the stored avatar is available', () => {
    expect(
      getStravaAvatarState({
        is_strava_connected: true,
        avatar_preferences_supported: true,
        strava_avatar_url: 'https://example.com/strava.jpg',
        strava_avatar_preview_url: 'https://example.com/strava-preview.jpg',
      }),
    ).toEqual({
      imageUrl: 'https://example.com/strava.jpg',
      canUseStravaAvatar: true,
      helperText: undefined,
    })
  })
})
