import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateQuestsFromTemplates } from '@/lib/quest-templates'

type CreateActivityBody = {
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    points?: number
    typeId?: string
    isPublished?: boolean
    scheduleMode?: 'one_time' | 'weekly'
    recurringWeeks?: number
}

type UpdateActivityBody = {
    id?: string
    title?: string
    date?: string
    startTime?: string
    endTime?: string
    points?: number
    typeId?: string
    isPublished?: boolean
}

type ActivityAttendanceStateRow = {
    user_id: number
    state: string | null
}

type ActivityListRow = {
    attendance?: ActivityAttendanceStateRow[] | null
    [key: string]: unknown
}

function toIsoDate(value: Date): string {
    return value.toISOString().split('T')[0]
}

function getDateTime(date: string, time: string): Date {
    return new Date(`${date}T${time}:00.000Z`)
}

function buildActivityWindow(date: string, startTime: string, endTime: string): { startAt: Date; endAt: Date } {
    const startAt = getDateTime(date, startTime)
    const endAt = getDateTime(date, endTime)

    if (endAt.getTime() <= startAt.getTime()) {
        const fixedEndAt = new Date(startAt)
        fixedEndAt.setUTCHours(fixedEndAt.getUTCHours() + 2)
        return { startAt, endAt: fixedEndAt }
    }

    return { startAt, endAt }
}

function normalizeTime(value: string | undefined, fallback: string): string {
    if (!value || value.trim().length === 0) return fallback
    return value.length === 5 ? value : value.slice(0, 5)
}

async function resolveTypeId(supabase: ReturnType<typeof createSupabaseAdminClient>, typeId?: string): Promise<string> {
    if (typeId) return typeId

    const { data: internalType, error } = await supabase
        .from('activity_types')
        .select('id')
        .eq('name', 'Internal Activity')
        .single()

    if (error || !internalType?.id) {
        throw new Error('Default activity type not found')
    }

    const { data: childTypes } = await supabase
        .from('activity_types')
        .select('id')
        .eq('parent_type_id', internalType.id)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1)

    if (childTypes && childTypes.length > 0) {
        return String(childTypes[0].id)
    }

    return internalType.id as string
}

export async function GET(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_activities')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const supabase = createSupabaseAdminClient()
        const { searchParams } = new URL(request.url)
        const typeId = searchParams.get('typeId')
        const publishStatus = searchParams.get('status')

        let query = supabase
            .from('admin_activities')
            .select(`
                *,
                activity_type:activity_types(id, name),
                attendance(user_id, state)
            `)
            .order('start_at', { ascending: false })

        if (typeId) query = query.eq('type_id', typeId)
        if (publishStatus === 'published') query = query.eq('is_published', true)
        if (publishStatus === 'unpublished') query = query.eq('is_published', false)

        const { data: activities, error } = await query
        if (error) throw error

        const formatted = (activities ?? []).map((activity: ActivityListRow) => {
            const rows: ActivityAttendanceStateRow[] = Array.isArray(activity.attendance) ? activity.attendance : []
            const inProgressCount = rows.filter((row) => row.state === 'in_progress').length
            const completedCount = rows.filter((row) => row.state === 'completed' || row.state === 'completed_penalty').length

            return {
                ...activity,
                attendance_count: rows.length,
                in_progress_count: inProgressCount,
                completed_count: completedCount,
                attendance: undefined,
            }
        })

        return NextResponse.json(formatted)
    } catch (error) {
        console.error('Fetch Activities Error:', error)
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_activities')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = (await request.json()) as CreateActivityBody
        const title = body.title?.trim()
        const date = body.date
        const scheduleMode = body.scheduleMode ?? 'one_time'
        const recurringWeeks = Math.min(Math.max(body.recurringWeeks ?? 1, 1), 12)

        if (!title || !date) {
            return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
        }

        const startTime = normalizeTime(body.startTime, '19:00')
        const endTime = normalizeTime(body.endTime, '21:00')

        const supabase = createSupabaseAdminClient()
        const typeId = await resolveTypeId(supabase, body.typeId)
        const totalInstances = scheduleMode === 'weekly' ? recurringWeeks : 1
        const seriesKey = scheduleMode === 'weekly' ? `series-${Date.now()}` : null
        const baseDate = new Date(`${date}T00:00:00.000Z`)

        const rows = Array.from({ length: totalInstances }).map((_, index) => {
            const instanceDate = new Date(baseDate)
            if (scheduleMode === 'weekly') {
                instanceDate.setUTCDate(instanceDate.getUTCDate() + index * 7)
            }

            const instanceDateString = toIsoDate(instanceDate)
            const { startAt, endAt } = buildActivityWindow(instanceDateString, startTime, endTime)

            return {
                title,
                activity_date: instanceDateString,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                points: Number(body.points) || 0,
                type_id: typeId,
                is_published: body.isPublished ?? true,
                series_key: seriesKey,
            }
        })

        const { data, error } = await supabase
            .from('admin_activities')
            .insert(rows)
            .select('*')

        if (error) throw error

        // Trigger activity-linked quest generation (non-blocking)
        if (typeId) {
            generateQuestsFromTemplates('activity_linked', typeId).catch(() => {})
        }

        return NextResponse.json({ success: true, activities: data ?? [] })
    } catch (error) {
        console.error('Create Activity Error:', error)
        return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_activities')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = (await request.json()) as UpdateActivityBody
        if (!body.id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
        }

        const updates: Record<string, unknown> = {}

        if (typeof body.title === 'string') updates.title = body.title.trim()
        if (typeof body.points === 'number') updates.points = Math.max(0, body.points)
        if (typeof body.isPublished === 'boolean') updates.is_published = body.isPublished
        if (body.typeId) updates.type_id = body.typeId

        const hasDateOrTime = Boolean(body.date || body.startTime || body.endTime)
        if (hasDateOrTime) {
            const supabase = createSupabaseAdminClient()
            const { data: existing, error: existingError } = await supabase
                .from('admin_activities')
                .select('activity_date, start_at, end_at')
                .eq('id', body.id)
                .single()

            if (existingError || !existing) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
            }

            const date = body.date || existing.activity_date
            const existingStart = String(existing.start_at).slice(11, 16)
            const existingEnd = String(existing.end_at).slice(11, 16)
            const startTime = normalizeTime(body.startTime, existingStart || '19:00')
            const endTime = normalizeTime(body.endTime, existingEnd || '21:00')
            const { startAt, endAt } = buildActivityWindow(date, startTime, endTime)

            updates.activity_date = date
            updates.start_at = startAt.toISOString()
            updates.end_at = endAt.toISOString()

            const { error: updateError } = await supabase
                .from('admin_activities')
                .update(updates)
                .eq('id', body.id)

            if (updateError) throw updateError
            return NextResponse.json({ success: true })
        }

        const supabase = createSupabaseAdminClient()
        const { error } = await supabase
            .from('admin_activities')
            .update(updates)
            .eq('id', body.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Update Activity Error:', error)
        return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_activities')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()
        await supabase.from('attendance').delete().eq('activity_id', id)
        await supabase.from('point_adjustments').delete().ilike('reason', `%${id}%`)

        const { error } = await supabase
            .from('admin_activities')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete Activity Error:', error)
        return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 })
    }
}
