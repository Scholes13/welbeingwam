import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  buildStravaProfileUpdate,
  getStoredStravaAccessToken,
  getStoredStravaExpiresAt,
  getStoredStravaRefreshToken,
  shouldRefreshStravaToken,
} from '@/lib/strava/sync'
import type { ProfileRow } from '@/lib/strava/types'

export type StravaTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_at?: number
}

export async function refreshStravaAccessToken(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  profile: ProfileRow
  userId: string | number
}): Promise<string | null> {
  const currentAccessToken = getStoredStravaAccessToken(input.profile)
  if (!currentAccessToken) return null

  if (
    !shouldRefreshStravaToken({
      expiresAt: getStoredStravaExpiresAt(input.profile),
    }) ||
    !getStoredStravaRefreshToken(input.profile)
  ) {
    return currentAccessToken
  }

  const refreshRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: getStoredStravaRefreshToken(input.profile),
    }),
  })

  if (!refreshRes.ok) {
    console.error('Failed to refresh Strava token:', refreshRes.status, refreshRes.statusText)
    return currentAccessToken
  }

  const newTokens = (await refreshRes.json()) as StravaTokenResponse
  if (!newTokens.access_token) return currentAccessToken

  const { error } = await input.supabase
    .from('profiles')
    .update(
      buildStravaProfileUpdate({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: newTokens.expires_at,
      }),
    )
    .eq('id', input.userId)

  if (error) {
    console.error('Failed to persist refreshed Strava tokens:', error)
  }

  return newTokens.access_token
}

export async function fetchStravaJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Strava request failed for ${url}: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}
