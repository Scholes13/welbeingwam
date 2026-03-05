import { verifyAdminPermission } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { activity_id, access_code } = await request.json()
        console.log(`[SCAN] Received: activity_id=${activity_id}, access_code=${access_code}`)

        if (!activity_id || !access_code) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const supabase = createSupabaseAdminClient()

        // 1. Find User by Access Code
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('access_code', access_code)
            .single()

        if (userError || !user) {
            console.log(`[SCAN] User not found for access_code: ${access_code}`)
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        console.log(`[SCAN] Found user: ${user.full_name} (ID: ${user.id})`)

        // 2. Insert Attendance
        const { error: attendanceError } = await supabase
            .from('attendance')
            .insert({
                activity_id,
                user_id: user.id
            })

        if (attendanceError) {
            if (attendanceError.code === '23505') {
                return NextResponse.json({ 
                    success: false, 
                    message: `User ${user.full_name} already scanned!`,
                    user 
                })
            }
            console.error(`[SCAN] Attendance error: ${JSON.stringify(attendanceError)}`)
            throw attendanceError
        }
        console.log(`[SCAN] Attendance inserted for user ${user.id}`)

        // 3. Get Activity Points
        const { data: activity } = await supabase
            .from('admin_activities')
            .select('points, title')
            .eq('id', activity_id)
            .single()

        const activityPoints = Number(activity?.points) || 0
        console.log(`[SCAN] Activity: ${activity?.title}, Points: ${activityPoints}`)

        if (activityPoints > 0) {
            // 4. Insert Points
            const { data: adjData, error: adjError } = await supabase
                .from('point_adjustments')
                .insert({
                    user_id: user.id,
                    points: activityPoints,
                    reason: `Activity Attendance: ${activity?.title}`
                })
                .select()

            console.log(`[SCAN] Point insert result: data=${JSON.stringify(adjData)}, error=${JSON.stringify(adjError)}`)

            if (!adjError && adjData && adjData.length > 0) {
                // 5. Send Notification ONLY if points actually inserted
                await supabase.from('notifications').insert({
                    user_id: user.id,
                    title: 'Activity Points Awarded',
                    message: `You earned ${activityPoints} points for attending ${activity?.title}!`,
                    is_read: false
                })
                console.log(`[SCAN] Notification sent`)
            } else {
                console.error(`[SCAN] Point insert FAILED or empty data`)
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Scanned: ${user.full_name}`,
            user 
        })

    } catch (error) {
        console.error('[SCAN] Error:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
