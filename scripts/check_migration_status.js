
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatus() {
    console.log('Checking migration status (JS Version)...');

    // 1. Check a Reward
    const { data: rewards } = await supabase.from('rewards').select('title, required_points').limit(5);
    console.log('\n--- Rewards (Should be /10) ---');
    console.table(rewards);

    // 2. Check an Adjustment
    const { data: adjustments } = await supabase.from('point_adjustments').select('points, reason').limit(5);
    console.log('\n--- Adjustments (Should be /10) ---');
    console.table(adjustments);

    // 3. Simulate Leaderboard Logic for Top 5 Users
    console.log('\n--- Leaderboard Calculation Check ---');

    // Fetch users
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, username');

    // Fetch activities (Steps)
    const { data: activities } = await supabase.from('activities').select('user_id, steps');

    // Fetch Quest Points
    const { data: userQuests } = await supabase.from('user_quests').select('user_id, quest:quests(points)').eq('status', 'approved');

    // Fetch Adjustments
    const { data: userAdjustments } = await supabase.from('point_adjustments').select('user_id, points');

    if (!profiles || !activities) {
        console.log('Error fetching data');
        return;
    }

    // Aggregate Stats
    const stats = {};

    // Initialize
    profiles.forEach(p => {
        stats[p.id] = {
            name: p.full_name,
            steps: 0,
            questPts: 0,
            adjPts: 0
        };
    });

    // Sum Steps
    activities.forEach(act => {
        if (stats[act.user_id]) stats[act.user_id].steps += (act.steps || 0);
    });

    // Sum Quests
    userQuests?.forEach(uq => {
        if (stats[uq.user_id] && uq.quest) stats[uq.user_id].questPts += (uq.quest.points || 0);
    });

    // Sum Adjustments
    userAdjustments?.forEach(adj => {
        if (stats[adj.user_id]) stats[adj.user_id].adjPts += (adj.points || 0);
    });

    console.log('User | Steps | Step Pts (1:10) | Quest Pts | Adj Pts | TOTAL (New) | TOTAL (Old 1:1)');
    console.log('--- | --- | --- | --- | --- | --- | ---');

    const sortedUsers = Object.values(stats).sort((a, b) => b.steps - a.steps).slice(0, 5);

    for (const u of sortedUsers) {
        const stepPts = Math.floor(u.steps / 10);
        const totalNew = stepPts + u.questPts + u.adjPts;
        const totalOld = u.steps + (u.questPts * 10) + (u.adjPts * 10); // Approximation of old logic

        console.log(`${u.name.padEnd(20)} | ${u.steps.toString().padEnd(8)} | ${stepPts.toString().padEnd(8)} | ${u.questPts.toString().padEnd(8)} | ${u.adjPts.toString().padEnd(6)} | ${totalNew.toString().padEnd(10)} | ${totalOld}`);
    }
}

checkStatus().catch(console.error);
