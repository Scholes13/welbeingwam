import { buildUseManualAvatarUpdate, buildUseStravaAvatarUpdate, isMissingAvatarPreferenceColumnsError } from '@/lib/profile-avatar'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getAuthProfileContext } from '@/utils/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { source } = await request.json()
  if (source !== 'manual' && source !== 'strava') {
    return NextResponse.json({ error: 'Invalid avatar source' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('manual_avatar_url, strava_avatar_url')
    .eq('id', context.profileId)
    .single()

  if (profileError && isMissingAvatarPreferenceColumnsError(profileError)) {
    return NextResponse.json(
      { error: 'Avatar preferences belum aktif di database. Jalankan migration terbaru dulu.' },
      { status: 409 },
    )
  }

  if (profileError || !profile) {
    console.error('Avatar Source Profile Error:', profileError)
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const update =
    source === 'strava'
      ? profile.strava_avatar_url
        ? buildUseStravaAvatarUpdate({ stravaAvatarUrl: profile.strava_avatar_url })
        : null
      : profile.manual_avatar_url
        ? buildUseManualAvatarUpdate({ manualAvatarUrl: profile.manual_avatar_url })
        : null

  if (!update) {
    return NextResponse.json({ error: `No ${source} avatar available` }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', context.profileId)

  if (error) {
    console.error('Avatar Source Update Error:', error)
    return NextResponse.json({ error: 'Failed to update avatar source' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
