import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  
  // Clear the cookies
  cookieStore.delete('strava_access_token')
  cookieStore.delete('strava_athlete_id')
  
  const url = new URL('/', request.url)
  return NextResponse.redirect(url)
}
