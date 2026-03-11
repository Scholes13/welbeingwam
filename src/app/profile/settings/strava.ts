type StravaProfileMeta = {
  strava_athlete_id?: number | null
  last_strava_sync_at?: string | null
}

type StravaConnectionState = {
  isConnected: boolean
  statusLabel: string
  buttonLabel: string
  helperText: string
  athleteLabel?: string
  lastSyncLabel?: string
}

type StravaFeedback = {
  tone: 'success' | 'error'
  message: string
} | null

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatLastSync(lastSyncAt: string): string {
  const date = new Date(lastSyncAt)

  if (Number.isNaN(date.getTime())) {
    return 'Terakhir sync tidak tersedia'
  }

  return `Terakhir sync ${DATE_FORMATTER.format(date)}, ${TIME_FORMATTER.format(date)}`
}

export function getStravaConnectionState(
  profile: StravaProfileMeta,
): StravaConnectionState {
  if (!profile.strava_athlete_id) {
    return {
      isConnected: false,
      statusLabel: 'Belum terhubung',
      buttonLabel: 'Connect Strava',
      helperText:
        'Hubungkan Strava untuk sync sport session otomatis ke physical points.',
    }
  }

  return {
    isConnected: true,
    statusLabel: 'Terhubung',
    buttonLabel: 'Reconnect Strava',
    helperText: 'Sync sport session otomatis setiap cooldown aktif.',
    athleteLabel: `Athlete ID ${profile.strava_athlete_id}`,
    lastSyncLabel: profile.last_strava_sync_at
      ? formatLastSync(profile.last_strava_sync_at)
      : 'Belum pernah sync',
  }
}

export function getStravaFeedback(input: {
  error?: string | null
  strava?: string | null
}): StravaFeedback {
  if (input.strava === 'connected') {
    return {
      tone: 'success',
      message: 'Akun Strava berhasil terhubung.',
    }
  }

  switch (input.error) {
    case 'missing_code':
      return {
        tone: 'error',
        message: 'Kode otorisasi Strava tidak ditemukan. Coba hubungkan ulang.',
      }
    case 'profile_not_found':
      return {
        tone: 'error',
        message: 'Profil user tidak ditemukan saat menghubungkan Strava.',
      }
    case 'strava_failed':
      return {
        tone: 'error',
        message: 'Gagal menghubungkan Strava. Coba lagi beberapa saat lagi.',
      }
    default:
      return null
  }
}
