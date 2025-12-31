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

async function checkProfileSchema() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) console.error(error);
    else console.log('Profile Keys:', Object.keys(data[0] || {}));
}

checkProfileSchema();
