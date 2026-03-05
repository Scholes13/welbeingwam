const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        if (!fs.existsSync(envPath)) {
            console.warn('.env.local not found at ' + envPath);
            return;
        }
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                process.env[key] = value;
            }
        });
    } catch (e) {
        console.error('Error loading .env.local', e);
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

console.log(`Connecting to Supabase at: ${supabaseUrl?.substring(0, 15)}...`);
console.log(`Using Service Key: ${supabaseServiceKey?.substring(0, 5)}...`);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function convertEconomy() {
    console.log('Starting 1:10 Economy Conversion...');

    // 1. Convert Point Adjustments
    console.log('Fetching Point Adjustments...');
    const { data: adjustments, error: adjError, count: adjCount } = await supabase
        .from('point_adjustments')
        .select('id, points', { count: 'exact' });

    if (adjError) {
        console.error('Error fetching adjustments:', adjError);
    } else {
        console.log(`Found ${adjustments.length} adjustments.`);
        let updated = 0;
        for (const adj of adjustments) {
            if (adj.points !== 0) {
                const newPoints = Math.floor(adj.points / 10);
                if (newPoints !== adj.points) {
                    const { error } = await supabase
                        .from('point_adjustments')
                        .update({ points: newPoints })
                        .eq('id', adj.id);
                    if (error) console.error(`Failed to update adjustment ${adj.id}:`, error);
                    else updated++;
                }
            }
            if (updated % 10 === 0 && updated > 0) process.stdout.write('.');
        }
        console.log(`\nUpdated ${updated} adjustments.`);
    }

    // 2. Convert User Rewards
    console.log('Fetching User Rewards (History)...');
    const { data: userRewards, error: urError } = await supabase.from('user_rewards').select('id, cost');
    if (urError) {
        console.error('Error fetching user_rewards:', urError);
    } else {
        console.log(`Found ${userRewards.length} user_rewards.`);
        let updated = 0;
        for (const ur of userRewards) {
            if (ur.cost && ur.cost > 0) {
                const newCost = Math.floor(ur.cost / 10);
                if (newCost !== ur.cost) {
                    const { error } = await supabase
                        .from('user_rewards')
                        .update({ cost: newCost })
                        .eq('id', ur.id);
                    if (error) console.error(`Failed to update user_reward ${ur.id}:`, error);
                    else updated++;
                }
            }
            if (updated % 10 === 0 && updated > 0) process.stdout.write('.');
        }
        console.log(`\nUpdated ${updated} user rewards history.`);
    }

    // 3. Convert Quests
    console.log('Fetching Quests...');
    const { data: quests, error: qError } = await supabase.from('quests').select('id, points');
    if (qError) {
        console.error('Error fetching quests:', qError);
    } else {
        console.log(`Found ${quests.length} quests.`);
        let updated = 0;
        for (const q of quests) {
            if (q.points > 0) {
                const newPoints = Math.floor(q.points / 10);
                if (newPoints !== q.points) {
                    const { error } = await supabase
                        .from('quests')
                        .update({ points: newPoints })
                        .eq('id', q.id);
                    if (error) console.error(`Failed to update quest ${q.id}:`, error);
                    else updated++;
                }
            }
        }
        console.log(`\nUpdated ${updated} quests.`);
    }

    // 4. Convert Rewards
    console.log('Fetching Rewards (Shop)...');
    const { data: rewards, error: rError } = await supabase.from('rewards').select('id, required_points');
    if (rError) {
        console.error('Error fetching rewards:', rError);
    } else {
        console.log(`Found ${rewards.length} rewards.`);
        let updated = 0;
        for (const r of rewards) {
            if (r.required_points > 0) {
                const newPrice = Math.floor(r.required_points / 10);
                if (newPrice !== r.required_points) {
                    const { error } = await supabase
                        .from('rewards')
                        .update({ required_points: newPrice })
                        .eq('id', r.id);
                    if (error) console.error(`Failed to update reward ${r.id}:`, error);
                    else updated++;
                }
            }
        }
        console.log(`\nUpdated ${updated} rewards.`);
    }

    console.log('Economy conversion complete!');
}

convertEconomy().catch(console.error);
