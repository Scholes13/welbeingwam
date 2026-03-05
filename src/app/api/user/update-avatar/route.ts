import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = context.profileId

  const { avatarUrl } = await request.json()

  if (!avatarUrl) {
      return NextResponse.json({ error: 'Missing avatarUrl' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update Avatar Error:', error)
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 })
  }
}
