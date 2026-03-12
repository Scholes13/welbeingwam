import {
  buildDisconnectStravaAvatarUpdate,
  buildLegacyDisconnectUpdate,
  isMissingAvatarPreferenceColumnsError,
} from '@/lib/profile-avatar'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAuthProfileContext } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const context = await getAuthProfileContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_source, manual_avatar_url')
      .eq('id', context.profileId)
      .single()

    let updatePayload: Record<string, unknown> = buildDisconnectStravaAvatarUpdate({
      avatarSource: (profile?.avatar_source as 'manual' | 'strava' | null | undefined) ?? 'manual',
      manualAvatarUrl: profile?.manual_avatar_url,
    })

    if (profileError && isMissingAvatarPreferenceColumnsError(profileError)) {
      updatePayload = buildLegacyDisconnectUpdate()
    }

    let { error } = await supabase
      .from('profiles')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.profileId)

    if (error && isMissingAvatarPreferenceColumnsError(error)) {
      const fallback = await supabase
        .from('profiles')
        .update({
          ...buildLegacyDisconnectUpdate(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.profileId)

      error = fallback.error
    }

    if (error) {
      console.error('Strava Disconnect Error:', error)
      return NextResponse.json({ error: 'Failed to disconnect Strava' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Strava Disconnect Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
