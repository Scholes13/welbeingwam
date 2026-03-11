type StravaCallbackRedirectInput = {
  origin: string
  error?: string
  strava?: string
}

export function buildStravaCallbackRedirect(input: StravaCallbackRedirectInput): string {
  const url = new URL('/profile/settings', input.origin)

  if (input.error) {
    url.searchParams.set('error', input.error)
  }

  if (input.strava) {
    url.searchParams.set('strava', input.strava)
  }

  return url.toString()
}
