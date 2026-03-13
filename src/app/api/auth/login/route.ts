import { NextResponse } from 'next/server'

import { buildStravaAuthorizeUrl } from './authorize'

export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: 'Missing STRAVA_CLIENT_ID' }, { status: 500 })
  }

  return NextResponse.redirect(
    buildStravaAuthorizeUrl({
      clientId,
      requestUrl: request.url,
      forwardedHost: request.headers.get('x-forwarded-host') || request.headers.get('host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
    }),
  )
}
