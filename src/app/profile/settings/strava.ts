type StravaProfileMeta = {
  strava_athlete_id?: number | null
  is_strava_connected?: boolean | null
  last_strava_sync_at?: string | null
}

type StravaAvatarMeta = {
  is_strava_connected?: boolean | null
  avatar_preferences_supported?: boolean | null
  strava_avatar_url?: string | null
  strava_avatar_preview_url?: string | null
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

type StravaAvatarState = {
  imageUrl: string | null
  canUseStravaAvatar: boolean
  helperText?: string
}

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
  const isConnected = Boolean(profile.is_strava_connected) || Boolean(profile.strava_athlete_id)

  if (!isConnected) {
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
    athleteLabel: profile.strava_athlete_id ? `Athlete ID ${profile.strava_athlete_id}` : undefined,
    lastSyncLabel: profile.last_strava_sync_at
      ? formatLastSync(profile.last_strava_sync_at)
      : 'Belum pernah sync',
  }
}

export function getStravaAvatarState(profile: StravaAvatarMeta): StravaAvatarState {
  const imageUrl = profile.strava_avatar_url ?? profile.strava_avatar_preview_url ?? null

  if (!imageUrl) {
    return {
      imageUrl: null,
      canUseStravaAvatar: false,
    }
  }

  if (!profile.avatar_preferences_supported) {
    return {
      imageUrl,
      canUseStravaAvatar: false,
      helperText:
        'Foto Strava sudah terdeteksi, tetapi pilih avatar Strava butuh migration database terbaru.',
    }
  }

  return {
    imageUrl,
    canUseStravaAvatar: true,
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

  if (input.strava === 'disconnected') {
    return {
      tone: 'success',
      message: 'Akun Strava berhasil dilepas.',
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
    case 'token_exchange_failed':
      return {
        tone: 'error',
        message: 'Strava menolak proses connect. Periksa callback URL app Strava lalu coba lagi.',
      }
    case 'profile_update_failed':
      return {
        tone: 'error',
        message: 'Strava sudah authorize, tetapi data profil gagal disimpan. Cek log server.',
      }
    default:
      return null
  }
}
