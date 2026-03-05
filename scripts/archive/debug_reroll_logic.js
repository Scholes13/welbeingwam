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

async function testReroll() {
    try {
        const userId = -1001; // admin_wam ID from previous check
        console.log('Testing Reroll for User:', userId);

        // 1. Fetch User Profile
        const { data: profile, error: pError } = await supabase.from('profiles').select('gender').eq('id', userId).single();
        if (pError) throw new Error('Profile Error: ' + pError.message);
        const gender = profile?.gender || 'male';
        console.log('Gender:', gender);

        // 2. Fetch Reward
        const { data: rerollReward, error: rError } = await supabase.from('rewards').select('*').eq('title', 'Avatar Reroll');
        if (rError) throw new Error('Reward Error: ' + rError.message);

        // Check for duplicates
        if (rerollReward.length > 1) {
            console.warn('WARNING: Multiple "Avatar Reroll" rewards found!', rerollReward.length);
            console.log('Using the first one.');
        }
        if (rerollReward.length === 0) throw new Error('Avatar Reroll reward not found');

        const reward = rerollReward[0];
        const price = reward.required_points;
        console.log('Reward Found:', reward.id, 'Price:', price);

        // 3. Logic for Avatar URL (Copied from API)
        const maleTops = [
            'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides',
            'theCaesar', 'theCaesarAndSidePart', 'dreads', 'dreads01', 'dreads02',
            'frizzle', 'shaggy', 'shaggyMullet', 'hat', 'winterHat1', 'winterHat02',
            'winterHat03', 'winterHat04', 'turban'
        ];
        const femaleTops = [
            'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight01',
            'straight02', 'straightAndStrand', 'hijab', 'bigHair', 'bob',
            'bun', 'curly', 'curvy', 'frida', 'fro', 'froBand'
        ];

        const randomSeed = Math.random().toString(36).substring(7);
        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;

        if (gender === 'male') {
            const randomTop = maleTops[Math.floor(Math.random() * maleTops.length)];
            avatarUrl += `&top=${randomTop}&facialHairProbability=30`;
        } else if (gender === 'female') {
            const randomTop = femaleTops[Math.floor(Math.random() * femaleTops.length)];
            avatarUrl += `&top=${randomTop}&facialHairProbability=0`;
        }

        console.log('Generated Avatar URL:', avatarUrl);

        // 4. Simulate Transaction (Dry Run)
        console.log('Dry Run: Inserting claim for reward', reward.id, 'Cost:', price);

        // 5. Simulate Update
        console.log('Dry Run: Updating profile', userId, 'with', avatarUrl);

        console.log('SUCCESS: Logic appears valid.');

    } catch (e) {
        console.error('DEBUG SCRIPT ERROR:', e);
    }
}

testReroll();
