export type AvatarSource = 'manual' | 'strava'

type SchemaErrorLike = {
  code?: string
  message?: string
}

const AVATAR_PREFERENCE_KEYS = new Set([
  'avatar_source',
  'manual_avatar_url',
  'strava_avatar_url',
  'last_strava_sync_at',
])

export function buildManualAvatarUpdate(avatarUrl: string) {
  return {
    avatar_url: avatarUrl,
    manual_avatar_url: avatarUrl,
    avatar_source: 'manual' as const,
  }
}

export function buildLegacyManualAvatarUpdate(avatarUrl: string) {
  return {
    avatar_url: avatarUrl,
  }
}

export function buildStravaAvatarSyncUpdate(input: {
  currentAvatarUrl?: string | null
  stravaAvatarUrl: string
  avatarSource?: AvatarSource | null
}) {
  if (input.avatarSource === 'strava') {
    return {
      strava_avatar_url: input.stravaAvatarUrl,
      avatar_url: input.stravaAvatarUrl,
    }
  }

  return {
    strava_avatar_url: input.stravaAvatarUrl,
  }
}

export function buildUseStravaAvatarUpdate(input: {
  stravaAvatarUrl: string
}) {
  return {
    avatar_url: input.stravaAvatarUrl,
    avatar_source: 'strava' as const,
  }
}

export function buildUseManualAvatarUpdate(input: {
  manualAvatarUrl: string
}) {
  return {
    avatar_url: input.manualAvatarUrl,
    avatar_source: 'manual' as const,
  }
}

export function buildDisconnectStravaAvatarUpdate(input: {
  avatarSource?: AvatarSource | null
  manualAvatarUrl?: string | null
}) {
  const update = {
    access_token: null,
    refresh_token: null,
    expires_at: null,
    last_strava_sync_at: null,
    strava_avatar_url: null,
    avatar_source: 'manual' as const,
  }

  if (input.avatarSource === 'strava' && input.manualAvatarUrl) {
    return {
      ...update,
      avatar_url: input.manualAvatarUrl,
    }
  }

  return update
}

export function buildLegacyDisconnectUpdate() {
  return {
    access_token: null,
    refresh_token: null,
    expires_at: null,
  }
}

export function omitAvatarPreferenceFields<T extends Record<string, unknown>>(update: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(update).filter(([key]) => !AVATAR_PREFERENCE_KEYS.has(key)),
  ) as Partial<T>
}

export function isMissingAvatarPreferenceColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as SchemaErrorLike
  const isMissingColumnCode = candidate.code === '42703' || candidate.code === 'PGRST204'
  if (!isMissingColumnCode) return false

  return Boolean(
    candidate.message?.includes('avatar_') ||
    candidate.message?.includes('avatar_source') ||
    candidate.message?.includes('manual_avatar_url') ||
    candidate.message?.includes('strava_avatar_url') ||
    candidate.message?.includes('last_strava_sync_at'),
  )
}
