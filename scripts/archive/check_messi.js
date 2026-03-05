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

async function checkMessi() {
    fs.writeFileSync('check_messi.log', '')

    // 1. Find User "Messi"
    const { data: users } = await supabase.from('profiles').select('*').ilike('full_name', '%messi%')

    console.log(`Found ${users.length} users matching 'messi'`)
    fs.appendFileSync('check_messi.log', `Users Found: ${JSON.stringify(users, null, 2)}\n`)

    if (users.length === 0) return

    for (const user of users) {
        fs.appendFileSync('check_messi.log', `\n--- Checking User: ${user.full_name} (${user.id}) ---\n`)

        // 2. Attendance
        const { data: att } = await supabase.from('attendance').select('*, admin_activities(title, points)').eq('user_id', user.id)
        fs.appendFileSync('check_messi.log', `Attendance: ${JSON.stringify(att, null, 2)}\n`)

        // 3. Adjustments
        const { data: adj } = await supabase.from('point_adjustments').select('*').eq('user_id', user.id)
        fs.appendFileSync('check_messi.log', `Adjustments: ${JSON.stringify(adj, null, 2)}\n`)

        // 4. Notifications
        const { data: notif } = await supabase.from('notifications').select('*').eq('user_id', user.id)
        fs.appendFileSync('check_messi.log', `Notifications: ${JSON.stringify(notif, null, 2)}\n`)
    }

    console.log('Done. Check check_messi.log')
}

checkMessi()
