
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

async function resetClaim() {
    // Quest ID for 'Add Your Instagram Username'
    // I'll search for it again to be safe
    const { data: quests } = await supabase
        .from('quests')
        .select('id')
        .ilike('title', '%Instagram%')
        .single()

    if (!quests) {
        console.log('Quest not found')
        return
    }

    const questId = quests.id
    console.log('Quest ID:', questId)

    // Delete ALL claims for this quest (for testing purposes, assuming single user or dev env)
    // Or I can list them first.
    const { data: claims } = await supabase
        .from('user_quests')
        .select('*')
        .eq('quest_id', questId)

    console.log(`Found ${claims.length} claims. Deleting...`)

    const { error } = await supabase
        .from('user_quests')
        .delete()
        .eq('quest_id', questId)

    if (error) {
        console.error('Delete failed:', error)
    } else {
        console.log('Reset successful! Claims deleted.')
    }
}

resetClaim()
