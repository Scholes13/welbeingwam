
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkQuests() {
    const { data: quests, error } = await supabase
        .from('quests')
        .select('id, title, verification_type')

    if (error) {
        console.error('Error fetching quests:', error)
        return
    }

    console.log('Quests:', JSON.stringify(quests, null, 2))
}

checkQuests()
