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

async function fundAdmin() {
    try {
        // 1. Find Admin
        const { data: user, error: uError } = await supabase.from('profiles').select('id, username').eq('username', 'admin_wam').single();

        if (uError || !user) {
            console.error('Admin not found!', uError);
            return;
        }

        console.log('Found Admin:', user.username, user.id);

        // 2. Add Adjustment
        const { error: adjError } = await supabase.from('point_adjustments').insert({
            user_id: user.id,
            points: 10000,
            reason: 'Super Admin Trial Fund'
        });

        if (adjError) throw adjError;

        console.log('Successfully added 10,000 coins to admin_wam!');

    } catch (e) {
        console.error('Fund Error:', e);
    }
}

fundAdmin();
