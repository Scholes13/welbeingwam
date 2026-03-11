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

async function checkTable() {
    console.log('Checking notifications table...');
    const { data, error } = await supabase.from('notifications').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
        if (error.code === '42P01') console.log('Table does not exist.');
    } else {
        console.log('Table exists!');
        console.log('Sample Data:', data);
        // Get columns implicitly by looking at data or error on invalid column
    }
}
checkTable();
