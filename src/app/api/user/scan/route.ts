import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const currentUserId = context.profileId

  const { accessCode } = await request.json()

  if (!accessCode) {
      return NextResponse.json({ error: 'Missing access code' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  try {
      // Find user by access_code
      const { data: targetUser, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('access_code', accessCode)
          .single()

      if (error || !targetUser) {
          return NextResponse.json({ error: 'User not found or invalid code' }, { status: 404 })
      }

      if (String(targetUser.id) === String(currentUserId)) {
          return NextResponse.json({ error: 'You cannot scan yourself' }, { status: 400 })
      }

      return NextResponse.json({ success: true, user: targetUser })

  } catch (error) {
    console.error('Scan Error:', error)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
