import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminPermission } from '@/utils/auth'
import { buildSettingsRows, DEFAULT_SETTINGS, isMissingSettingsTableError, parseSettingsRows, type AppSettings } from '../../../lib/settings'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

function parseCooldownValue(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null
  }

  return numeric
}

const POINT_KEYS = ['base_checkin_points', 'photo_bonus_points', 'category_streak_bonus', 'speed_demon_bonus'] as const

type ValidationSuccess = { valid: true; data: Partial<AppSettings> }
type ValidationFailure = { valid: false; error: string }

function validateSettingsPayload(
  body: unknown,
): ValidationSuccess | ValidationFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const raw = body as Record<string, unknown>
  const data: Partial<AppSettings> = {}

  for (const key of POINT_KEYS) {
    if (key in raw) {
      const v = raw[key]
      const n = typeof v === 'number' ? v : Number(v)
      if (!Number.isInteger(n) || n <= 0) {
        return { valid: false, error: `${key} must be a positive integer` }
      }
      data[key] = n
    }
  }

  if ('strava_sync_cooldown_minutes' in raw) {
    data.strava_sync_cooldown_minutes = raw.strava_sync_cooldown_minutes as number
  }

  if ('features' in raw) {
    const f = raw.features
    if (f === null || typeof f !== 'object' || Array.isArray(f)) {
      return { valid: false, error: 'features must be an object with boolean values' }
    }
    const featuresObj = f as Record<string, unknown>
    const validatedFeatures: Record<string, boolean> = {}
    for (const [fk, fv] of Object.entries(featuresObj)) {
      if (typeof fv !== 'boolean') {
        return { valid: false, error: `features.${fk} must be a boolean` }
      }
      validatedFeatures[fk] = fv
    }
    data.features = validatedFeatures as AppSettings['features']
  }

  if ('maintenance' in raw) {
    const maintenance = raw.maintenance
    if (maintenance === null || typeof maintenance !== 'object' || Array.isArray(maintenance)) {
      return { valid: false, error: 'maintenance must be an object' }
    }

    const maintenanceObj = maintenance as Record<string, unknown>
    const validatedMaintenance: Partial<AppSettings['maintenance']> = {}

    if ('enabled' in maintenanceObj) {
      if (typeof maintenanceObj.enabled !== 'boolean') {
        return { valid: false, error: 'maintenance.enabled must be a boolean' }
      }
      validatedMaintenance.enabled = maintenanceObj.enabled
    }

    if ('message' in maintenanceObj) {
      if (typeof maintenanceObj.message !== 'string') {
        return { valid: false, error: 'maintenance.message must be a string' }
      }
      if (maintenanceObj.message.length > 500) {
        return { valid: false, error: 'maintenance.message must be 500 characters or fewer' }
      }
      validatedMaintenance.message = maintenanceObj.message.trim() || DEFAULT_SETTINGS.maintenance.message
    }

    data.maintenance = {
      ...DEFAULT_SETTINGS.maintenance,
      ...validatedMaintenance,
    }
  }

  return { valid: true, data }
}

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('settings')
      .select('key, value')

    if (error) {
      if (isMissingSettingsTableError(error)) {
        console.error('Settings table is unavailable:', error)
        return NextResponse.json(
          {
            error: 'Settings store unavailable',
            degraded: true,
            settings: DEFAULT_SETTINGS,
          },
          { status: 503 },
        )
      }

      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    const settings = parseSettingsRows(data ?? [])

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const { authorized } = await verifyAdminPermission('*')
  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const rawBody = await request.json()

    const validation = validateSettingsPayload(rawBody)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const body = validation.data

    const updates = buildSettingsRows({
      ...DEFAULT_SETTINGS,
      ...body,
      strava_sync_cooldown_minutes:
        body.strava_sync_cooldown_minutes !== undefined
          ? parseCooldownValue(body.strava_sync_cooldown_minutes) ?? DEFAULT_SETTINGS.strava_sync_cooldown_minutes
          : DEFAULT_SETTINGS.strava_sync_cooldown_minutes,
      features: {
        ...DEFAULT_SETTINGS.features,
        ...(body.features ?? {}),
      },
      maintenance: {
        ...DEFAULT_SETTINGS.maintenance,
        ...(body.maintenance ?? {}),
      },
    })

    if (body.strava_sync_cooldown_minutes !== undefined) {
      const cooldownMinutes = parseCooldownValue(body.strava_sync_cooldown_minutes)
      if (cooldownMinutes === null) {
        return NextResponse.json(
          { error: `strava_sync_cooldown_minutes must be a positive integer. Default is ${DEFAULT_SETTINGS.strava_sync_cooldown_minutes}.` },
          { status: 400 }
        )
      }
    }

    const requestedKeys = new Set<string>([
      ...(body.base_checkin_points !== undefined ? ['base_checkin_points'] : []),
      ...(body.photo_bonus_points !== undefined ? ['photo_bonus_points'] : []),
      ...(body.category_streak_bonus !== undefined ? ['category_streak_bonus'] : []),
      ...(body.speed_demon_bonus !== undefined ? ['speed_demon_bonus'] : []),
      ...(body.strava_sync_cooldown_minutes !== undefined ? ['strava_sync_cooldown_minutes'] : []),
      ...(body.features?.qr_checkin !== undefined ? ['feature_qr_checkin'] : []),
      ...(body.features?.gps_checkin !== undefined ? ['feature_gps_checkin'] : []),
      ...(body.features?.photo_checkin !== undefined ? ['feature_photo_checkin'] : []),
      ...(body.features?.badges !== undefined ? ['feature_badges'] : []),
      ...(body.features?.leaderboard !== undefined ? ['feature_leaderboard'] : []),
      ...(body.features?.rewards !== undefined ? ['feature_rewards'] : []),
      ...(body.features?.surveys !== undefined ? ['feature_surveys'] : []),
      ...(body.features?.category_filter !== undefined ? ['feature_category_filter'] : []),
      ...(body.maintenance?.enabled !== undefined ? ['maintenance_enabled'] : []),
      ...(body.maintenance?.message !== undefined ? ['maintenance_message'] : []),
    ])

    for (const update of updates.filter((row) => requestedKeys.has(row.key))) {
      const { error } = await supabase
        .from('settings')
        .upsert(update, { onConflict: 'key' })

      if (error) {
        if (isMissingSettingsTableError(error)) {
          console.error('Settings table is unavailable:', error)
          return NextResponse.json(
            { error: 'Settings store unavailable' },
            { status: 503 }
          )
        }

        console.error('Error updating setting:', update.key, error)
        return NextResponse.json(
          { error: `Failed to update setting: ${update.key}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
