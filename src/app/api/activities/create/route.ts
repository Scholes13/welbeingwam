import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { convertActivityPoints, toSafeNumber } from '@/lib/points'
import { isDowngradeMode } from '@/lib/downgrade'
import { NextResponse } from 'next/server'

type CreateActivityPayload = {
  mode?: string
  steps?: number
  distance?: number
  calories?: number
  date?: string
  type?: string
  proof_url?: string | null
  moving_time?: number
  dimension_id?: string | null
  description?: string | null
}

async function getPhysicalDimensionId() {
  const supabase = createSupabaseAdminClient()
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

function buildActivityId(): number {
  return Number(`${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)
}

export async function POST(request: Request) {
  try {
    const { steps, distance, calories, date, type, mode, proof_url, moving_time, dimension_id, description } = (await request.json()) as CreateActivityPayload
    const context = await getAuthProfileContext()

    if (!context) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = context.profileId
    const normalizedMode = mode === 'sport' ? 'sport' : 'daily'
    const stepCount = Math.max(0, Math.floor(toSafeNumber(steps)))
    const distanceMeters = Math.max(0, toSafeNumber(distance))
    const calorieCount = Math.max(0, Math.floor(toSafeNumber(calories)))
	    const rawType = String(type || '').trim()
	    const activityType = rawType || 'Manual'
    const activityDate = String(date || '').trim()

    if (!activityDate) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const physicalDimensionId = await getPhysicalDimensionId()

    // Steps are required for daily activity ONLY when targeting the physical dimension
    // For other dimensions (emotional, social, financial, spiritual), steps are optional
    const isPhysicalDimension = !dimension_id || dimension_id === physicalDimensionId
    if (normalizedMode === 'daily' && isPhysicalDimension && stepCount <= 0) {
        return NextResponse.json({ error: 'Steps are required for physical daily activity' }, { status: 400 })
    }

    if (normalizedMode === 'sport') {
	        if (!rawType) {
	            return NextResponse.json({ error: 'Activity type is required for sport session' }, { status: 400 })
	        }

        if (!isDowngradeMode()) {
            if (calorieCount <= 0) {
                return NextResponse.json({ error: 'Calories are required for sport session' }, { status: 400 })
            }

            if (!proof_url) {
                return NextResponse.json({ error: 'Photo proof is required for sport session' }, { status: 400 })
            }
        } else {
            // In downgrade mode, photo proof is still required
            // Calories are required for Physical dimension activities (validated on client)
            if (!proof_url) {
                return NextResponse.json({ error: 'Photo proof is required' }, { status: 400 })
            }
        }
    }

    // Insert Activity
    const { error } = await supabase
        .from('activities')
        .insert({
            user_id: userId,
            name: normalizedMode === 'sport' ? `${activityType} Session` : 'Daily Activity',
            distance: distanceMeters,
            moving_time: normalizedMode === 'sport' ? Math.max(0, Math.floor(toSafeNumber(moving_time))) : 0,
            type: activityType,
            start_date: activityDate,
            steps: normalizedMode === 'daily' ? stepCount : 0,
            mode: normalizedMode,
            calories: normalizedMode === 'sport' ? calorieCount : 0,
            activity_points: normalizedMode === 'sport' ? convertActivityPoints(calorieCount) : 0,
            proof_url: normalizedMode === 'sport' ? proof_url : null,
            review_status: 'approved',
            review_reason: isDowngradeMode() && description ? description : null,
            source: 'manual',
            dimension_id: dimension_id || physicalDimensionId,
            id: buildActivityId()
        })

    if (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Create Activity Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
