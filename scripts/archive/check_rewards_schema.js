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

async function checkSchema() {
    const { data: rewards, error: rError } = await supabase
        .from('rewards')
        .select('*')
        .limit(1)

    if (rError) console.error('Rewards Error:', rError)
    else console.log('Rewards Columns:', Object.keys(rewards[0] || {}))

    const { data: userRewards, error: urError } = await supabase
        .from('user_rewards')
        .select('*')
        .limit(1)

    if (urError) console.error('User Rewards Error:', urError)
    else console.log('User Rewards Columns:', Object.keys(userRewards[0] || {}))
}

checkSchema()
