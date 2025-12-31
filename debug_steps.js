
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const targetUserId = 'USER_ID_PLACEHOLDER'; // Will need to find a valid user ID first

    // 1. Get a user
    const { data: users, error: userError } = await supabase.from('profiles').select('id, username').limit(1);
    if (userError || !users.length) {
        console.error('Failed to get user:', userError);
        return;
    }

    const user = users[0];
    console.log(`Testing with user: ${user.username} (${user.id})`);

    // 2. Try inserting negative steps
    const payload = {
        user_id: user.id,
        name: `Debug Manual Adjustment: Check Negative`,
        type: 'Manual',
        distance: 0,
        steps: -100,
        start_date: new Date().toISOString(),
        moving_time: 0,
        elapsed_time: 0,
        total_elevation_gain: 0
    };

    const { error } = await supabase.from('activities').insert(payload);

    if (error) {
        console.error('Insert Failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('Insert Success!');
    }
}

testInsert();
