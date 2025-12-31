const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envConfig = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConstraints() {
    // Try to insert a dummy record with non-existent reward_id
    const { error } = await supabase
        .from('user_rewards')
        .insert([{ user_id: 'random-id', reward_id: '00000000-0000-0000-0000-000000000000', cost: 100 }])

    console.log('Error:', error);
}

checkConstraints();
