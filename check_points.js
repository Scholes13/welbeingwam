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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPoints() {
    fs.writeFileSync('check_points.log', '')

    // 1. Find the specific user (Pramuji)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%pramuji%')

    fs.appendFileSync('check_points.log', `Profiles Found: ${profiles.length}\n`)

    for (const user of profiles) {
        fs.appendFileSync('check_points.log', `\n========================================\n`)
        fs.appendFileSync('check_points.log', `USER: ${user.full_name} (ID: ${user.id})\n`)

        // 2. Check Point Adjustments
        const { data: adjustments } = await supabase.from('point_adjustments').select('*').eq('user_id', user.id)
        const totalAdj = adjustments.reduce((s, a) => s + a.points, 0)
        fs.appendFileSync('check_points.log', `\n[POINT ADJUSTMENTS] Total: ${totalAdj}\n`)
        adjustments.forEach(a => fs.appendFileSync('check_points.log', ` - ${a.points} pts | ${a.reason} | ${a.date || a.created_at}\n`))

        // 3. Check Attendance
        const { data: attendance } = await supabase.from('attendance').select('*, admin_activities(title, points)').eq('user_id', user.id)
        fs.appendFileSync('check_points.log', `\n[ATTENDANCE] Count: ${attendance.length}\n`)
        attendance.forEach(a => fs.appendFileSync('check_points.log', ` - Activity: ${a.admin_activities?.title} (${a.admin_activities?.points} pts) | Scanned: ${a.scanned_at}\n`))

        // 4. Check Notifications
        const { data: notifications } = await supabase.from('notifications').select('*').eq('user_id', user.id).limit(10)
        fs.appendFileSync('check_points.log', `\n[NOTIFICATIONS] Last 10:\n`)
        notifications.forEach(n => fs.appendFileSync('check_points.log', ` - ${n.title}: ${n.message} | ${n.created_at}\n`))
    }

    // 5. Check List of Activities (to see if Test/Walk/Baru exist)
    fs.appendFileSync('check_points.log', `\n========================================\n`)
    fs.appendFileSync('check_points.log', `ALL ACTIVITIES:\n`)
    const { data: activities } = await supabase.from('admin_activities').select('*')
    activities.forEach(a => fs.appendFileSync('check_points.log', ` - ${a.title} (${a.points} pts) | ID: ${a.id}\n`))
}

checkPoints()
