import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type AttendanceProfile = {
    id: number
    username: string | null
    full_name: string | null
    instagram_username: string | null
    avatar_url: string | null
}

type ActivityAttendanceRow = {
    user_id: number
    scanned_at: string | null
    scan_in_at: string | null
    scan_out_at: string | null
    state: string | null
    final_points: number | null
    is_penalized: boolean | null
    user: AttendanceProfile | AttendanceProfile[] | null
}

type ProfileRow = {
    id: number
    username: string | null
    full_name: string | null
    instagram_username: string | null
    avatar_url: string | null
}

function normalizeAttendanceProfile(user: AttendanceProfile | AttendanceProfile[] | null): AttendanceProfile | null {
    if (!user) return null
    return Array.isArray(user) ? (user[0] ?? null) : user
}

export async function GET(request: Request) {
    const { authorized } = await verifyAdminPermission('manage_activities')
    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Activity ID required' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        const { data: activity, error: actError } = await supabase
            .from('admin_activities')
            .select('*, activity_type:activity_types(id, name)')
            .eq('id', id)
            .single()

        if (actError || !activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
        }

        const { data: attendeesRaw, error: attError } = await supabase
            .from('attendance')
            .select(`
                user_id,
                scanned_at,
                scan_in_at,
                scan_out_at,
                state,
                final_points,
                is_penalized,
                user:profiles (
                    id,
                    username,
                    full_name,
                    instagram_username,
                    avatar_url
                )
            `)
            .eq('activity_id', id)
            .order('scanned_at', { ascending: false })

        if (attError) throw attError

        const typedAttendance = (attendeesRaw ?? []) as ActivityAttendanceRow[]

        const completedRows = typedAttendance.filter((att) =>
            att.state === 'completed' || att.state === 'completed_penalty' || Boolean(att.scan_out_at)
        )
        const inProgressRows = typedAttendance.filter((att) => att.state === 'in_progress' && !att.scan_out_at)

        const completedIds = new Set<string>()
        const inProgressIds = new Set<string>()

        const attendees = completedRows.map((att) => {
            const user = normalizeAttendanceProfile(att.user)
            if (att.user_id) completedIds.add(String(att.user_id))
            return {
                user_id: att.user_id,
                joined_at: att.scan_out_at || att.scanned_at,
                scan_in_at: att.scan_in_at,
                scan_out_at: att.scan_out_at,
                points: typeof att.final_points === 'number' ? att.final_points : activity.points,
                is_penalized: Boolean(att.is_penalized),
                status: att.state,
                username: user?.username || 'Unknown',
                full_name: user?.full_name || 'Unknown User',
                instagram: user?.instagram_username,
                avatar_url: user?.avatar_url
            }
        })

        inProgressRows.forEach((att) => {
            if (att.user_id) inProgressIds.add(String(att.user_id))
        })

        const { data: allUsers, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, instagram_username, avatar_url')
            .order('full_name', { ascending: true })

        if (userError) throw userError

        const typedUsers = (allUsers ?? []) as ProfileRow[]

        const pending = typedUsers
            .filter(u => !completedIds.has(String(u.id)))
            .map(u => ({
                user_id: u.id,
                status: inProgressIds.has(String(u.id)) ? 'in_progress' : 'not_started',
                username: u.username || 'Unknown',
                full_name: u.full_name || 'Unknown User',
                instagram: u.instagram_username,
                avatar_url: u.avatar_url
            }))

        return NextResponse.json({
            activity,
            stats: {
                total_users: typedUsers.length,
                attended: attendees.length,
                in_progress: inProgressIds.size,
                pending: pending.length,
                attendance_rate: typedUsers.length > 0 
                    ? Math.round((attendees.length / typedUsers.length) * 100) 
                    : 0
            },
            attendees,
            pending
        })

    } catch (error) {
        console.error('Activity Detail Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
