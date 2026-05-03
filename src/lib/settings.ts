export type AppSettings = {
  base_checkin_points: number
  photo_bonus_points: number
  category_streak_bonus: number
  speed_demon_bonus: number
  strava_sync_cooldown_minutes: number
  features: {
    qr_checkin: boolean
    gps_checkin: boolean
    photo_checkin: boolean
    badges: boolean
    leaderboard: boolean
    rewards: boolean
    surveys: boolean
    category_filter: boolean
  }
}

export type SettingsRow = {
  key: string
  value: unknown
}

export const DEFAULT_SETTINGS: AppSettings = {
  base_checkin_points: 50,
  photo_bonus_points: 50,
  category_streak_bonus: 200,
  speed_demon_bonus: 300,
  strava_sync_cooldown_minutes: 15,
  features: {
    qr_checkin: true,
    gps_checkin: true,
    photo_checkin: true,
    badges: true,
    leaderboard: true,
    rewards: true,
    surveys: true,
    category_filter: true,
  },
}

function parseInteger(value: unknown, fallback: number, minimum = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric < minimum) {
    return fallback
  }

  return numeric
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }

  return fallback
}

export function parseSettingsRows(rows: SettingsRow[] | null | undefined): AppSettings {
  const settingsMap = new Map(rows?.map((row) => [row.key, row.value]) ?? [])

  return {
    base_checkin_points: parseInteger(settingsMap.get('base_checkin_points'), DEFAULT_SETTINGS.base_checkin_points),
    photo_bonus_points: parseInteger(settingsMap.get('photo_bonus_points'), DEFAULT_SETTINGS.photo_bonus_points),
    category_streak_bonus: parseInteger(
      settingsMap.get('category_streak_bonus'),
      DEFAULT_SETTINGS.category_streak_bonus,
    ),
    speed_demon_bonus: parseInteger(settingsMap.get('speed_demon_bonus'), DEFAULT_SETTINGS.speed_demon_bonus),
    strava_sync_cooldown_minutes: parseInteger(
      settingsMap.get('strava_sync_cooldown_minutes'),
      DEFAULT_SETTINGS.strava_sync_cooldown_minutes,
      1,
    ),
    features: {
      qr_checkin: parseBoolean(settingsMap.get('feature_qr_checkin'), DEFAULT_SETTINGS.features.qr_checkin),
      gps_checkin: parseBoolean(settingsMap.get('feature_gps_checkin'), DEFAULT_SETTINGS.features.gps_checkin),
      photo_checkin: parseBoolean(
        settingsMap.get('feature_photo_checkin'),
        DEFAULT_SETTINGS.features.photo_checkin,
      ),
      badges: parseBoolean(settingsMap.get('feature_badges'), DEFAULT_SETTINGS.features.badges),
      leaderboard: parseBoolean(settingsMap.get('feature_leaderboard'), DEFAULT_SETTINGS.features.leaderboard),
      rewards: parseBoolean(settingsMap.get('feature_rewards'), DEFAULT_SETTINGS.features.rewards),
      surveys: parseBoolean(settingsMap.get('feature_surveys'), DEFAULT_SETTINGS.features.surveys),
      category_filter: parseBoolean(
        settingsMap.get('feature_category_filter'),
        DEFAULT_SETTINGS.features.category_filter,
      ),
    },
  }
}

export function buildSettingsRows(settings: AppSettings): SettingsRow[] {
  return [
    { key: 'base_checkin_points', value: settings.base_checkin_points },
    { key: 'photo_bonus_points', value: settings.photo_bonus_points },
    { key: 'category_streak_bonus', value: settings.category_streak_bonus },
    { key: 'speed_demon_bonus', value: settings.speed_demon_bonus },
    { key: 'strava_sync_cooldown_minutes', value: settings.strava_sync_cooldown_minutes },
    { key: 'feature_qr_checkin', value: settings.features.qr_checkin },
    { key: 'feature_gps_checkin', value: settings.features.gps_checkin },
    { key: 'feature_photo_checkin', value: settings.features.photo_checkin },
    { key: 'feature_badges', value: settings.features.badges },
    { key: 'feature_leaderboard', value: settings.features.leaderboard },
    { key: 'feature_rewards', value: settings.features.rewards },
    { key: 'feature_surveys', value: settings.features.surveys },
    { key: 'feature_category_filter', value: settings.features.category_filter },
  ]
}

export function isMissingSettingsTableError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === 'PGRST205'
}
