export type ProfileRow = {
  id: string | number
  full_name: string | null
  avatar_url: string | null
  manual_avatar_url?: string | null
  strava_avatar_url?: string | null
  avatar_source?: 'manual' | 'strava' | null
  strava_access_token?: string | null
  strava_refresh_token?: string | null
  strava_expires_at?: number | null
  strava_athlete_id?: number | null
  access_token?: string | null
  refresh_token?: string | null
  expires_at?: number | null
  last_strava_sync_at?: string | null
  [key: string]: unknown
}

export function supportsAvatarPreferences(profile: ProfileRow): boolean {
  return (
    Object.prototype.hasOwnProperty.call(profile, 'manual_avatar_url') &&
    Object.prototype.hasOwnProperty.call(profile, 'strava_avatar_url') &&
    Object.prototype.hasOwnProperty.call(profile, 'avatar_source')
  )
}
