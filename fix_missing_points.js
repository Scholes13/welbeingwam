const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
const env = {}
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
        env[key.trim()] = value.trim()
    }
})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function fixPoints() {
    console.log('Starting Point Backfill...')
    fs.writeFileSync('fix_log.txt', '')
    let fixedCount = 0

    // 1. Fetch ALL attendance records joined with activity info
    const { data: attendanceList, error: attError } = await supabase
        .from('attendance')
        .select('*, admin_activities(title, points)')

    if (attError) {
        console.error('Attendance Fetch Error:', attError)
        return
    }

    console.log(`Found ${attendanceList.length} attendance records.`)

    for (const att of attendanceList) {
        const activity = att.admin_activities
        const points = Number(activity?.points)

        if (!activity || !points || points <= 0) continue

        const expectedReason = `Activity Attendance: ${activity.title}`

        // 2. Check if point adjustment exists
        const { data: existingAdj, error: adjError } = await supabase
            .from('point_adjustments')
            .select('*')
            .eq('user_id', att.user_id)
            .ilike('reason', expectedReason)

        if (adjError) {
            console.error('Adjustment Check Error:', adjError)
            continue
        }

        if (!existingAdj || existingAdj.length === 0) {
            console.log(`[FIX] Missing points for User ${att.user_id} - Activity: ${activity.title} (${points} pts)`)

            // 3. Insert Missing Points
            // Explicitly casting user_id to string if needed, but Supabase JS client handles numbers fine.
            const { error: insertError } = await supabase
                .from('point_adjustments')
                .insert({
                    user_id: att.user_id,
                    points: points,
                    reason: expectedReason
                })

            if (insertError) {
                fs.appendFileSync('fix_log.txt', `Insert Failed for ${att.user_id}: ${JSON.stringify(insertError)}\n`)
            } else {
                console.log(' -> Success!')
                fs.appendFileSync('fix_log.txt', `Success for ${att.user_id} - ${activity.title}\n`)
                fixedCount++
            }
        }
    }

    console.log(`\n-----------------------------------`)
    console.log(`Backfill Complete. Fixed ${fixedCount} records.`)
}

fixPoints()
