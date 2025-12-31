import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Debug log helper
function debugLog(message: string) {
    const logFile = path.resolve(process.cwd(), 'scan_debug.log')
    const timestamp = new Date().toISOString()
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`)
    console.log(`[SCAN_DEBUG] ${message}`)
}

export async function POST(request: Request) {
    try {
        const { activity_id, access_code } = await request.json()
        debugLog(`Received: activity_id=${activity_id}, access_code=${access_code}`)

        if (!activity_id || !access_code) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        }

        // Check keys
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) {
            debugLog('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing!')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey
        )

        // 1. Find User by Access Code
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('access_code', access_code)
            .single()

        if (userError || !user) {
            debugLog(`User not found for access_code: ${access_code}. Error: ${JSON.stringify(userError)}`)
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        debugLog(`Found user: ${user.full_name} (ID: ${user.id}, Type: ${typeof user.id})`)

        // 2. Insert Attendance
        const { error: attendanceError } = await supabase
            .from('attendance')
            .insert({
                activity_id,
                user_id: user.id
            })

        if (attendanceError) {
            if (attendanceError.code === '23505') { // Unique violation
                debugLog(`Duplicate scan for user ${user.id}`)
                return NextResponse.json({ 
                    success: false, 
                    message: `User ${user.full_name} already scanned!`,
                    user 
                })
            }
            debugLog(`Attendance insert error: ${JSON.stringify(attendanceError)}`)
            throw attendanceError
        }
        debugLog(`Attendance inserted for user ${user.id}`)

        // 3. Get Activity Points
        const { data: activity, error: activityError } = await supabase
            .from('admin_activities')
            .select('points, title')
            .eq('id', activity_id)
            .single()

        if (activityError) {
            debugLog(`Activity fetch error: ${JSON.stringify(activityError)}`)
        }

        debugLog(`Activity: ${activity?.title}, Points: ${activity?.points}, Type: ${typeof activity?.points}`)

        const activityPoints = Number(activity?.points) || 0

        if (activityPoints > 0) {
            debugLog(`Attempting to insert ${activityPoints} points for user ${user.id}...`)
            
            // CRITICAL: Insert Points
            const { data: adjData, error: adjError } = await supabase
                .from('point_adjustments')
                .insert({
                    user_id: user.id,
                    points: activityPoints,
                    reason: `Activity Attendance: ${activity?.title}`
                })
                .select()

            debugLog(`Point Insert Result: data=${JSON.stringify(adjData)}, error=${JSON.stringify(adjError)}`)

            // Check BOTH error AND data
            if (adjError) {
                debugLog(`Point insert FAILED: ${JSON.stringify(adjError)}`)
                // Don't send notification if points failed!
            } else if (!adjData || adjData.length === 0) {
                debugLog(`Point insert returned EMPTY DATA - possible RLS issue!`)
                // Don't send notification if data is empty
            } else {
                debugLog(`Points inserted successfully: ${JSON.stringify(adjData)}`)
                
                // 4. Send Notification ONLY if points actually inserted
                const { error: notifError } = await supabase.from('notifications').insert({
                    user_id: user.id,
                    title: 'Activity Points Awarded',
                    message: `You earned ${activityPoints} points for attending ${activity?.title}!`,
                    is_read: false
                })

                if (notifError) {
                    debugLog(`Notification insert error: ${JSON.stringify(notifError)}`)
                } else {
                    debugLog(`Notification sent successfully`)
                }
            }
        } else {
            debugLog(`Activity has no points or points <= 0`)
        }

        return NextResponse.json({ 
            success: true, 
            message: `Scanned: ${user.full_name}`,
            user 
        })

    } catch (error) {
        debugLog(`Catch Error: ${JSON.stringify(error)}`)
        console.error('Scan Error:', error)
        return NextResponse.json({ error: 'Server Error' }, { status: 500 })
    }
}
