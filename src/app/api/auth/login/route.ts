import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/callback`
  const scope = 'activity:read_all'

  if (!clientId) {
    return NextResponse.json({ error: 'Missing STRAVA_CLIENT_ID' }, { status: 500 })
  }

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    approval_prompt: 'auto',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${query.toString()}`)
}
