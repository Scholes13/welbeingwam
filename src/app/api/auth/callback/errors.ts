export function getStravaCallbackErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('Strava token exchange failed')) {
    return 'token_exchange_failed'
  }

  if (message.includes('Strava profile update failed')) {
    return 'profile_update_failed'
  }

  return 'strava_failed'
}
