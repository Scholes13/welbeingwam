type NullableDateInput = string | Date | null | undefined

export const DEFAULT_STRAVA_SYNC_COOLDOWN_MINUTES = 15

export type StravaActivitySummary = {
  id: number
  name: string
  type: string
  sport_type?: string | null
  distance: number
  moving_time: number
  start_date: string
}

export type StravaActivityDetail = {
  calories?: number | null
  sport_type?: string | null
}

export type ExistingStravaActivity = {
  id?: string | number
  external_id?: string | null
  review_status?: string | null
  review_reason?: string | null
  proof_url?: string | null
  calories?: number | null
  has_calories?: boolean | null
  last_synced_at?: string | null
}

export type MergeStravaActivityInput = {
  summary: StravaActivitySummary
  detail: StravaActivityDetail
  existing: ExistingStravaActivity | null
  physicalDimensionId: string | null
  userId: string | number
  syncedAt?: string | null
  recordId?: string | number
}

function toDate(value: NullableDateInput): Date | null {
  if (!value) return null
  if (value instanceof Date) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function toPositiveInteger(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0) return null
  return numeric
}

function toCalories(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric)
    }
  }

  return 0
}

export function resolveStravaSyncCooldown(value: unknown): number {
  return toPositiveInteger(value) ?? DEFAULT_STRAVA_SYNC_COOLDOWN_MINUTES
}

export function shouldRunStravaSync(input: {
  lastSyncedAt: NullableDateInput
  now: NullableDateInput
  cooldownMinutes: number
}): boolean {
  const lastSyncedAt = toDate(input.lastSyncedAt)
  const now = toDate(input.now)
  const cooldownMinutes = Math.max(0, Math.floor(input.cooldownMinutes))

  if (!lastSyncedAt || !now) return true

  const elapsedMs = now.getTime() - lastSyncedAt.getTime()
  return elapsedMs >= cooldownMinutes * 60_000
}

export function shouldRefreshStravaToken(input: {
  expiresAt: number | null | undefined
  nowEpochSeconds?: number
  safetyWindowSeconds?: number
}): boolean {
  const expiresAt = Number(input.expiresAt ?? 0)
  const nowEpochSeconds = input.nowEpochSeconds ?? Math.floor(Date.now() / 1000)
  const safetyWindowSeconds = input.safetyWindowSeconds ?? 300

  return expiresAt < nowEpochSeconds + safetyWindowSeconds
}

export function getStravaActivitiesNeedingDetail(input: {
  summaries: StravaActivitySummary[]
  existingActivities: Array<Pick<ExistingStravaActivity, 'external_id' | 'has_calories' | 'last_synced_at'>>
}): StravaActivitySummary[] {
  const existingByExternalId = new Map(
    input.existingActivities
      .filter((activity) => activity.external_id)
      .map((activity) => [String(activity.external_id), activity])
  )

  return input.summaries.filter((summary) => {
    const existing = existingByExternalId.get(String(summary.id))
    return !existing || !existing.has_calories || !existing.last_synced_at
  })
}

export function mergeStravaActivity(input: MergeStravaActivityInput) {
  const calories = toCalories(input.detail.calories, input.existing?.calories)
  const sportType = input.summary.sport_type ?? input.detail.sport_type ?? input.summary.type

  return {
    id: input.existing?.id ?? input.recordId ?? input.summary.id,
    external_id: String(input.summary.id),
    user_id: input.userId,
    name: input.summary.name,
    distance: input.summary.distance,
    moving_time: input.summary.moving_time,
    type: input.summary.type,
    sport_type: sportType,
    start_date: input.summary.start_date,
    steps: 0,
    mode: 'sport' as const,
    calories,
    has_calories: calories > 0,
    activity_points: calories,
    proof_url: input.existing?.proof_url ?? null,
    review_status: input.existing?.review_status ?? 'approved',
    review_reason: input.existing?.review_reason ?? null,
    source: 'strava' as const,
    dimension_id: input.physicalDimensionId,
    last_synced_at: input.syncedAt ?? input.existing?.last_synced_at ?? null,
  }
}
