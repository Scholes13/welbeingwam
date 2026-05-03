import {
  buildStravaAvatarSyncUpdate,
  isMissingAvatarPreferenceColumnsError,
  omitAvatarPreferenceFields,
} from '@/lib/profile-avatar'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  getStravaActivitiesNeedingDetail,
  hasStoredStravaConnection,
  mergeStravaActivity,
  resolveStravaSyncCooldown,
  shouldRunStravaSync,
  type ExistingStravaActivity,
  type StravaActivityDetail,
  type StravaActivitySummary,
} from '@/lib/strava/sync'
import { isMissingSettingsTableError } from '@/lib/settings'
import { refreshStravaAccessToken, fetchStravaJson } from '@/lib/strava/token'
import { supportsAvatarPreferences, type ProfileRow } from '@/lib/strava/types'

type StravaProfileResponse = {
  profile?: string | null
}

type ExistingStravaActivityRow = ExistingStravaActivity & {
  id: string | number
  external_id: string | null
}

export function buildStravaRecordId(stravaActivityId: number): number {
  return -Math.abs(Math.trunc(stravaActivityId))
}

export async function getPhysicalDimensionId(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from('dimensions')
    .select('id')
    .eq('name', 'physical')
    .maybeSingle()

  if (error) {
    console.error('Failed to resolve physical dimension:', error)
    return null
  }

  return (data?.id as string | undefined) ?? null
}

export async function getStravaSyncCooldownMinutes(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'strava_sync_cooldown_minutes')
    .maybeSingle()

  if (error) {
    if (isMissingSettingsTableError(error)) {
      console.warn('Settings table unavailable, using default Strava sync cooldown:', error)
    } else {
      console.error('Failed to read Strava sync cooldown:', error)
    }
  }

  return resolveStravaSyncCooldown((data as { value?: string | null } | null)?.value)
}

export async function syncStravaActivities(input: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  profile: ProfileRow
  userId: string | number
  physicalDimensionId: string | null
}): Promise<Partial<ProfileRow> | null> {
  const hasStrava = hasStoredStravaConnection(input.profile)
  if (!hasStrava) return null

  const nowIso = new Date().toISOString()
  const cooldownMinutes = await getStravaSyncCooldownMinutes(input.supabase)

  if (
    !shouldRunStravaSync({
      lastSyncedAt: input.profile.last_strava_sync_at,
      now: nowIso,
      cooldownMinutes,
    })
  ) {
    return null
  }

  const accessToken = await refreshStravaAccessToken(input)
  if (!accessToken) return null

  const [profileResult, summariesResult] = await Promise.allSettled([
    fetchStravaJson<StravaProfileResponse>('https://www.strava.com/api/v3/athlete', accessToken),
    fetchStravaJson<StravaActivitySummary[]>('https://www.strava.com/api/v3/athlete/activities?per_page=30', accessToken),
  ])

  if (summariesResult.status !== 'fulfilled') {
    console.error('Strava summary sync failed:', summariesResult.reason)
    return null
  }

  const stravaProfile = profileResult.status === 'fulfilled' ? profileResult.value : null
  const summaries = Array.isArray(summariesResult.value) ? summariesResult.value : []
  const externalIds = summaries.map((summary) => String(summary.id))

  let existingActivities: ExistingStravaActivityRow[] = []
  if (externalIds.length > 0) {
    const { data, error } = await input.supabase
      .from('activities')
      .select('id, external_id, review_status, review_reason, proof_url, calories, has_calories, last_synced_at')
      .eq('user_id', input.userId)
      .eq('source', 'strava')
      .in('external_id', externalIds)

    if (error) {
      console.error('Failed to load existing Strava activities:', error)
    } else {
      existingActivities = (data ?? []) as ExistingStravaActivityRow[]
    }
  }

  const detailCandidates = getStravaActivitiesNeedingDetail({
    summaries,
    existingActivities,
  })

  const detailResults = await Promise.all(
    detailCandidates.map(async (summary) => {
      try {
        const detail = await fetchStravaJson<StravaActivityDetail>(
          `https://www.strava.com/api/v3/activities/${summary.id}`,
          accessToken
        )

        return [String(summary.id), detail] as const
      } catch (error) {
        console.error(`Failed to hydrate Strava activity ${summary.id}:`, error)
        return [String(summary.id), {} as StravaActivityDetail] as const
      }
    })
  )

  const detailByExternalId = new Map(detailResults)
  const existingByExternalId = new Map(
    existingActivities
      .filter((activity) => activity.external_id)
      .map((activity) => [String(activity.external_id), activity])
  )

  const payloads = summaries.map((summary) => {
    const existing = existingByExternalId.get(String(summary.id)) ?? null
    const detail = detailByExternalId.get(String(summary.id)) ?? { calories: existing?.calories ?? null }

    return mergeStravaActivity({
      summary,
      detail,
      existing,
      physicalDimensionId: input.physicalDimensionId,
      userId: input.userId,
      syncedAt: nowIso,
      recordId: existing?.id ?? buildStravaRecordId(summary.id),
    })
  })

  let activitySyncSucceeded = true
  if (payloads.length > 0) {
    const { error } = await input.supabase.from('activities').upsert(payloads, { onConflict: 'id' })
    if (error) {
      console.error('Error saving Strava sport sessions:', error)
      activitySyncSucceeded = false
    }
  }

  const avatarPreferencesSupported = supportsAvatarPreferences(input.profile)
  const profileUpdates: Record<string, unknown> = activitySyncSucceeded
    ? {
        last_strava_sync_at: nowIso,
        updated_at: nowIso,
      }
    : {}

  if (stravaProfile?.profile && avatarPreferencesSupported && activitySyncSucceeded) {
    Object.assign(
      profileUpdates,
      buildStravaAvatarSyncUpdate({
        currentAvatarUrl: input.profile.avatar_url,
        stravaAvatarUrl: stravaProfile.profile,
        avatarSource: input.profile.avatar_source ?? 'manual',
      }),
    )
  }

  if (Object.keys(profileUpdates).length > 0) {
    let { error: profileError } = await input.supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', input.userId)

    if (profileError && isMissingAvatarPreferenceColumnsError(profileError)) {
      const fallback = await input.supabase
        .from('profiles')
        .update(omitAvatarPreferenceFields(profileUpdates))
        .eq('id', input.userId)

      profileError = fallback.error
    }

    if (profileError) {
      console.error('Failed to update Strava sync metadata on profile:', profileError)
    }
  }

  return {
    avatar_url: (profileUpdates.avatar_url as string | null | undefined) ?? input.profile.avatar_url,
    strava_avatar_url:
      (profileUpdates.strava_avatar_url as string | null | undefined) ?? input.profile.strava_avatar_url ?? null,
    strava_avatar_preview_url: stravaProfile?.profile ?? input.profile.strava_avatar_url ?? null,
    last_strava_sync_at: activitySyncSucceeded ? nowIso : input.profile.last_strava_sync_at ?? null,
  }
}
