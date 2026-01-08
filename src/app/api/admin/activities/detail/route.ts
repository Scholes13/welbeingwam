import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Activity ID required' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Fetch Activity Details
        const { data: activity, error: actError } = await supabase
            .from('admin_activities')
            .select('*')
            .eq('id', id)
            .single()

        if (actError || !activity) {
            return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
        }

        // 2. Fetch Attendees (Users who have a record in 'attendance' table)
        // We join with profiles to get names
        const { data: attendeesRaw, error: attError } = await supabase
            .from('attendance')
            .select(`
                user_id,
                scanned_at,
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

        // Process attendees
        const attendeeIds = new Set<string>()
        const attendees = attendeesRaw.map((att: any) => {
            if (att.user_id) attendeeIds.add(att.user_id)
            return {
                user_id: att.user_id,
                joined_at: att.scanned_at,
                username: att.user?.username || 'Unknown',
                full_name: att.user?.full_name || 'Unknown User',
                instagram: att.user?.instagram_username,
                avatar_url: att.user?.avatar_url
            }
        })

        // 3. Fetch All Users to calculate Pending
        // Fetch minimal fields for performance
        const { data: allUsers, error: userError } = await supabase
            .from('profiles')
            .select('id, username, full_name, instagram_username, avatar_url')
            .order('full_name', { ascending: true })

        if (userError) throw userError

        // Filter for Pending (Users NOT in attendeeIds)
        const pending = allUsers
            .filter(u => !attendeeIds.has(u.id))
            .map(u => ({
                user_id: u.id,
                username: u.username || 'Unknown',
                full_name: u.full_name || 'Unknown User',
                instagram: u.instagram_username,
                avatar_url: u.avatar_url
            }))

        return NextResponse.json({
            activity,
            stats: {
                total_users: allUsers.length,
                attended: attendees.length,
                pending: pending.length,
                attendance_rate: allUsers.length > 0 
                    ? Math.round((attendees.length / allUsers.length) * 100) 
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
