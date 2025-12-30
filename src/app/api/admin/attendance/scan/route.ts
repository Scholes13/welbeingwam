
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { activity_id, access_code } = await request.json()

        if (!activity_id || !access_code) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Find User by Access Code
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('access_code', access_code)
            .single()

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // 2. Insert Attendance
        // Using "ignoreDuplicates" implicitly via ON CONFLICT if helpful, 
        // but Supabase returns error on unique constraint by default which we can catch.
        const { error: insertError } = await supabase
            .from('attendance')
            .insert({
                activity_id,
                user_id: user.id
            })

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation
                return NextResponse.json({ 
                    success: false, 
                    message: `User ${user.full_name} already scanned!`,
                    user 
                })
            }
            throw insertError
        }

        // 3. Award Points if Activity has points
        const { data: activity } = await supabase
            .from('admin_activities')
            .select('points, title')
            .eq('id', activity_id)
            .single()

        if (activity && activity.points > 0) {
            await supabase.from('point_adjustments').insert({
                user_id: user.id,
                points: activity.points,
                reason: `Activity Attendance: ${activity.title}`,
                date: new Date().toISOString()
            })
        }

        return NextResponse.json({ 
            success: true, 
            message: `Scanned: ${user.full_name}`,
            user 
        })

    } catch (error) {
        console.error('Scan Error:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
