
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  console.log('Checking migration status...');

  // 1. Check a Reward (e.g. Avatar Reroll used to be 500?)
  const { data: rewards } = await supabase.from('rewards').select('title, required_points').limit(5);
  console.log('\n--- Rewards (Should be /10) ---');
  console.table(rewards);

  // 2. Check an Adjustment
  const { data: adjustments } = await supabase.from('point_adjustments').select('points, reason').limit(5);
  console.log('\n--- Adjustments (Should be /10) ---');
  console.table(adjustments);

  // 3. Simulate Leaderboard for Top 3 Users
  console.log('\n--- Leaderboard Calculation Check ---');
  
  // Fetch users
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, username').limit(10);
  
  // Fetch activities
  const { data: activities } = await supabase.from('activities').select('user_id, steps');
  
  // Aggregate
  const stats: any = {};
  
  activities?.forEach((act: any) => {
      if (!stats[act.user_id]) stats[act.user_id] = 0;
      stats[act.user_id] += (act.steps || 0);
  });

  console.log('User | Steps | Old Points (1:1) | New Points (1:10)');
  console.log('---|---|---|---');
  
  const sampleUsers = Object.keys(stats).slice(0, 5);
  for (const uid of sampleUsers) {
      const user = profiles?.find(p => p.id === uid);
      if (user) {
          const steps = stats[uid];
          const oldPts = steps;
          const newPts = Math.floor(steps / 10);
          console.log(`${user.full_name} | ${steps} | ${oldPts} | ${newPts}`);
      }
  }
}

checkStatus().catch(console.error);
