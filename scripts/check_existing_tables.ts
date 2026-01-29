/**
 * Check what tables already exist in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTables() {
  console.log('🔍 Checking existing tables in database...\n');

  // Try to query some existing tables from the WAM25 app
  const existingTables = [
    'profiles',
    'quests',
    'user_quests',
    'rewards',
    'user_rewards',
    'surveys',
    'survey_questions',
    'survey_responses',
    'qr_spots',
    'attendance',
    // City tour tables
    'participants',
    'categories',
    'quest_spots',
    'visits',
    'badges',
    'participant_badges',
    'tour_sessions',
    'settings'
  ];

  for (const table of existingTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: exists (${data?.length || 0} rows in sample)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ${e}`);
    }
  }
}

checkExistingTables().catch(console.error);
