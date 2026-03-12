import { getAuthProfileContext } from '@/utils/auth'
import { buildLegacyManualAvatarUpdate, buildManualAvatarUpdate, isMissingAvatarPreferenceColumnsError } from '@/lib/profile-avatar'
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
    let { error } = await supabase
        .from('profiles')
        .update(buildManualAvatarUpdate(avatarUrl))
        .eq('id', userId)

    if (error && isMissingAvatarPreferenceColumnsError(error)) {
      const fallback = await supabase
        .from('profiles')
        .update(buildLegacyManualAvatarUpdate(avatarUrl))
        .eq('id', userId)

      error = fallback.error
    }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update Avatar Error:', error)
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 })
  }
}
