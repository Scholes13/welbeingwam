// Run this script to add is_reply column to notifications table
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    'https://ihrutobdomnagnwzwncy.supabase.co',
    'sb_secret_XD21xo3c9CiF7s8qEGeKcw_WzpywRDt'
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
