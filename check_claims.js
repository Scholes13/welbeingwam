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

async function checkClaims() {
    const { data: user } = await supabase.from('profiles').select('id, username').eq('username', 'admin_wam').single();
    if (!user) return console.log('User admin_wam not found');
    console.log('User ID:', user.id);

    const { data: claims } = await supabase.from('user_rewards').select('*, reward:rewards(title, required_points)').eq('user_id', user.id);
    console.log('Claims:', JSON.stringify(claims, null, 2));
    const totalSpent = claims?.reduce((sum, c) => sum + (c.cost || 0), 0) || 0;
    console.log('Total Spent:', totalSpent);

    const { data: adjustments } = await supabase.from('point_adjustments').select('*').eq('user_id', user.id);
    const totalAdj = adjustments?.reduce((sum, a) => sum + (a.points || 0), 0) || 0;
    console.log('Total Manual Adjustments:', totalAdj);

    const { data: activities } = await supabase.from('activities').select('steps').eq('user_id', user.id);
    const totalSteps = activities?.reduce((sum, a) => sum + (a.steps || 0), 0) || 0;
    console.log('Total Steps:', totalSteps);

    const calculatedTotal = totalSteps + totalAdj; // Assuming quest points are 0 for admin usually
    console.log('Calculated Total Points (Steps + Adj):', calculatedTotal);
    console.log('Calculated Available Coins:', calculatedTotal - totalSpent);
}

checkClaims();
