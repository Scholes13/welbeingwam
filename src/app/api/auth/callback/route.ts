import {
  buildStravaAvatarSyncUpdate,
  isMissingAvatarPreferenceColumnsError,
  omitAvatarPreferenceFields,
} from '@/lib/profile-avatar'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { buildStravaProfileUpdate } from '@/lib/strava/sync'
import { resolveProfileIdFromAuthUser } from '@/utils/auth'
import { NextResponse } from 'next/server'

import { buildStravaCallbackRedirect } from './redirect'
import { getStravaCallbackErrorCode } from './errors'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(buildStravaCallbackRedirect({ origin, error: 'missing_code' }))
  }

  try {
    // 1. Exchange code for Strava tokens
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.errors) {
      throw new Error(`Strava token exchange failed: ${JSON.stringify(tokenData.errors)}`)
    }

    const { athlete, access_token, refresh_token, expires_at } = tokenData

    // 2. Get current logged-in user (must be authenticated first)
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/?error=not_logged_in`)
    }

    const profileId = await resolveProfileIdFromAuthUser({
      id: user.id,
      email: user.email,
    })

    if (profileId === null) {
      return NextResponse.redirect(buildStravaCallbackRedirect({ origin, error: 'profile_not_found' }))
    }

    // 3. Update profile with Strava data (Connect Strava to existing account)
    const adminClient = createSupabaseAdminClient()
    let currentProfile: { avatar_url?: string | null; avatar_source?: 'manual' | 'strava' | null } | null = null
    let supportsAvatarPreferences = true

    const currentProfileResult = await adminClient
      .from('profiles')
      .select('avatar_url, avatar_source')
      .eq('id', profileId)
      .single()

    if (currentProfileResult.error) {
      if (isMissingAvatarPreferenceColumnsError(currentProfileResult.error)) {
        supportsAvatarPreferences = false

        const legacyProfileResult = await adminClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', profileId)
          .single()

        if (legacyProfileResult.error) {
          console.error('Failed to load legacy profile avatar during Strava connect:', legacyProfileResult.error)
        } else {
          currentProfile = legacyProfileResult.data
        }
      } else {
        console.error('Failed to load profile avatar during Strava connect:', currentProfileResult.error)
      }
    } else {
      currentProfile = currentProfileResult.data
    }

    const profileUpdatePayload = {
      ...buildStravaProfileUpdate({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at,
      }),
      ...(athlete.profile && supportsAvatarPreferences
        ? buildStravaAvatarSyncUpdate({
            currentAvatarUrl: currentProfile?.avatar_url,
            stravaAvatarUrl: athlete.profile,
            avatarSource: (currentProfile?.avatar_source as 'manual' | 'strava' | null | undefined) ?? 'manual',
          })
        : {}),
      updated_at: new Date().toISOString(),
    }

    let { error: updateError } = await adminClient
      .from('profiles')
      .update(profileUpdatePayload)
      .eq('id', profileId)

    if (updateError && isMissingAvatarPreferenceColumnsError(updateError)) {
      const fallback = await adminClient
        .from('profiles')
        .update(omitAvatarPreferenceFields(profileUpdatePayload))
        .eq('id', profileId)

      updateError = fallback.error
    }

    if (updateError) {
      console.error('Strava Link Error:', updateError)
      throw new Error('Strava profile update failed')
    }

    return NextResponse.redirect(buildStravaCallbackRedirect({ origin, strava: 'connected' }))
  } catch (error) {
    console.error('Strava Connect Error:', error)
    return NextResponse.redirect(
      buildStravaCallbackRedirect({
        origin,
        error: getStravaCallbackErrorCode(error),
      }),
    )
  }
}
