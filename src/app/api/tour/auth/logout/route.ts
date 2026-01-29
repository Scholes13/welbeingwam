import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear participant session cookie
    cookieStore.delete('participant_id')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: { code: 'LOGOUT_FAILED', message: 'Failed to logout' } },
      { status: 500 }
    )
  }
}
