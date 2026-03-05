// Run this script to add is_reply column to notifications table
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey
)

async function migrate() {
    // Test if column exists by trying to select it
    const { data, error } = await supabase
        .from('notifications')
        .select('is_reply')
        .limit(1)

    if (error && error.message.includes('is_reply')) {
        console.log('Column is_reply does not exist. Please run this SQL in Supabase Dashboard:')
        console.log('')
        console.log('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT FALSE;')
        console.log('')
    } else {
        console.log('✅ Column is_reply already exists or table is accessible!')
        console.log('Data:', data)
    }
}

migrate()
