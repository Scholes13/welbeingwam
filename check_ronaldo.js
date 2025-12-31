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

async function checkRonaldo() {
    fs.writeFileSync('check_ronaldo.log', '')

    // 1. Find User "Ronaldo"
    const { data: users } = await supabase.from('profiles').select('*').ilike('full_name', '%ronaldo%')

    console.log(`Found ${users.length} users matching 'ronaldo'`)
    fs.appendFileSync('check_ronaldo.log', `Users Found: ${JSON.stringify(users)}\n`)

    if (users.length === 0) return

    for (const user of users) {
        fs.appendFileSync('check_ronaldo.log', `\n--- Checking User: ${user.full_name} (${user.id}) ---\n`)

        // 2. Attendance
        const { data: att } = await supabase.from('attendance').select('*, admin_activities(title, points)').eq('user_id', user.id)
        fs.appendFileSync('check_ronaldo.log', `Attendance: ${JSON.stringify(att)}\n`)

        // 3. Adjustments
        const { data: adj } = await supabase.from('point_adjustments').select('*').eq('user_id', user.id)
        fs.appendFileSync('check_ronaldo.log', `Adjustments: ${JSON.stringify(adj)}\n`)

        // 4. Notifications
        const { data: notif } = await supabase.from('notifications').select('*').eq('user_id', user.id)
        fs.appendFileSync('check_ronaldo.log', `Notifications: ${JSON.stringify(notif)}\n`)
    }
}

checkRonaldo()
