import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all settings
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      )
    }

    // Transform settings array into structured object
    const settingsMap = new Map(data?.map(s => [s.key, s.value]) || [])

    const settings = {
      base_checkin_points: parseInt(settingsMap.get('base_checkin_points') || '50'),
      photo_bonus_points: parseInt(settingsMap.get('photo_bonus_points') || '50'),
      category_streak_bonus: parseInt(settingsMap.get('category_streak_bonus') || '200'),
      speed_demon_bonus: parseInt(settingsMap.get('speed_demon_bonus') || '300'),
      features: {
        qr_checkin: settingsMap.get('feature_qr_checkin') === 'true',
        gps_checkin: settingsMap.get('feature_gps_checkin') === 'true',
        photo_checkin: settingsMap.get('feature_photo_checkin') === 'true',
        badges: settingsMap.get('feature_badges') === 'true',
        leaderboard: settingsMap.get('feature_leaderboard') === 'true',
        rewards: settingsMap.get('feature_rewards') === 'true',
        surveys: settingsMap.get('feature_surveys') === 'true',
        category_filter: settingsMap.get('feature_category_filter') === 'true'
      }
    }

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
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()

    // Update settings in database
    const updates = []

    if (body.base_checkin_points !== undefined) {
      updates.push({ key: 'base_checkin_points', value: body.base_checkin_points.toString() })
    }
    if (body.photo_bonus_points !== undefined) {
      updates.push({ key: 'photo_bonus_points', value: body.photo_bonus_points.toString() })
    }
    if (body.category_streak_bonus !== undefined) {
      updates.push({ key: 'category_streak_bonus', value: body.category_streak_bonus.toString() })
    }
    if (body.speed_demon_bonus !== undefined) {
      updates.push({ key: 'speed_demon_bonus', value: body.speed_demon_bonus.toString() })
    }

    if (body.features) {
      if (body.features.qr_checkin !== undefined) {
        updates.push({ key: 'feature_qr_checkin', value: body.features.qr_checkin.toString() })
      }
      if (body.features.gps_checkin !== undefined) {
        updates.push({ key: 'feature_gps_checkin', value: body.features.gps_checkin.toString() })
      }
      if (body.features.photo_checkin !== undefined) {
        updates.push({ key: 'feature_photo_checkin', value: body.features.photo_checkin.toString() })
      }
      if (body.features.badges !== undefined) {
        updates.push({ key: 'feature_badges', value: body.features.badges.toString() })
      }
      if (body.features.leaderboard !== undefined) {
        updates.push({ key: 'feature_leaderboard', value: body.features.leaderboard.toString() })
      }
      if (body.features.rewards !== undefined) {
        updates.push({ key: 'feature_rewards', value: body.features.rewards.toString() })
      }
      if (body.features.surveys !== undefined) {
        updates.push({ key: 'feature_surveys', value: body.features.surveys.toString() })
      }
      if (body.features.category_filter !== undefined) {
        updates.push({ key: 'feature_category_filter', value: body.features.category_filter.toString() })
      }
    }

    // Upsert all settings
    for (const update of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert(update, { onConflict: 'key' })

      if (error) {
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
