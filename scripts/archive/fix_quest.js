
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, val] = line.split('=')
        if (key && val) acc[key.trim()] = val.trim()
        return acc
    }, {})

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixQuest() {
    // 1. Find the quest
    const { data: quests, error: fetchError } = await supabase
        .from('quests')
        .select('*')
        .ilike('title', '%Instagram%')

    if (fetchError) {
        console.error('Error fetching quests:', fetchError)
        return
    }

    console.log('Found quests:', quests)

    if (quests.length === 0) {
        console.log('No Instagram quest found.')
        return
    }

    const quest = quests[0]
    console.log(`Updating quest "${quest.title}" (ID: ${quest.id}) from '${quest.verification_type}' to 'instagram_username'`)

    // 2. Update it
    const { error: updateError } = await supabase
        .from('quests')
        .update({ verification_type: 'instagram_username' })
        .eq('id', quest.id)

    if (updateError) {
        console.error('Update failed:', updateError)
    } else {
        console.log('Update successful!')
    }
}

fixQuest()
