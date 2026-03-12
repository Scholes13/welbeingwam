type BuildStravaAuthorizeUrlInput = {
  clientId: string
  requestUrl: string
}

export function buildStravaAuthorizeUrl(input: BuildStravaAuthorizeUrlInput): string {
  const origin = new URL(input.requestUrl).origin
  const redirectUri = `${origin}/api/auth/callback`

  const query = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all',
    approval_prompt: 'auto',
  })

  return `https://www.strava.com/oauth/authorize?${query.toString()}`
}
