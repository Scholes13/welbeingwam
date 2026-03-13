type BuildStravaAuthorizeUrlInput = {
  clientId: string
  requestUrl: string
  forwardedHost?: string | null
  forwardedProto?: string | null
}

export function buildStravaAuthorizeUrl(input: BuildStravaAuthorizeUrlInput): string {
  const url = new URL(input.requestUrl)
  const host = input.forwardedHost || url.host
  const proto = input.forwardedProto || url.protocol.replace(':', '')
  const origin = `${proto}://${host}`
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
