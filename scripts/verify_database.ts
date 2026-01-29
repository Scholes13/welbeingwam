/**
 * Database Verification Script
 * Verifies that all city tour database tables, functions, and views are properly set up
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('🔍 Verifying City Tour Database Setup...\n');
  
  let allPassed = true;

  // Test 1: Check if PostGIS extension is enabled
  console.log('1️⃣  Checking PostGIS extension...');
  try {
    const { data, error } = await supabase.rpc('postgis_version');
    if (error) {
      console.log('   ❌ PostGIS extension not found or not accessible');
      allPassed = false;
    } else {
      console.log('   ✅ PostGIS extension is enabled');
    }
  } catch (e) {
    console.log('   ⚠️  Could not verify PostGIS (may need direct DB access)');
  }

  // Test 2: Check if all required tables exist
  console.log('\n2️⃣  Checking required tables...');
  const requiredTables = [
    'participants',
    'categories',
    'quest_spots',
    'visits',
    'badges',
    'participant_badges',
    'tour_sessions',
    'settings'
  ];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (error) {
        console.log(`   ❌ Table '${table}' not found or not accessible`);
        allPassed = false;
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (e) {
      console.log(`   ❌ Error checking table '${table}': ${e}`);
      allPassed = false;
    }
  }

  // Test 3: Check if default categories are seeded
  console.log('\n3️⃣  Checking default categories...');
  try {
    const { data, error } = await supabase.from('categories').select('name');
    if (error) {
      console.log('   ❌ Could not fetch categories');
      allPassed = false;
    } else if (!data || data.length === 0) {
      console.log('   ❌ No categories found (seed data missing)');
      allPassed = false;
    } else {
      console.log(`   ✅ Found ${data.length} categories`);
      data.forEach(cat => console.log(`      - ${cat.name}`));
    }
  } catch (e) {
    console.log(`   ❌ Error checking categories: ${e}`);
    allPassed = false;
  }

  // Test 4: Check if default badges are seeded
  console.log('\n4️⃣  Checking default badges...');
  try {
    const { data, error } = await supabase.from('badges').select('name, badge_type');
    if (error) {
      console.log('   ❌ Could not fetch badges');
      allPassed = false;
    } else if (!data || data.length === 0) {
      console.log('   ❌ No badges found (seed data missing)');
      allPassed = false;
    } else {
      console.log(`   ✅ Found ${data.length} badges`);
      const speedDemon = data.find(b => b.badge_type === 'speed_demon');
      const completion = data.find(b => b.badge_type === 'completion');
      const categoryStreaks = data.filter(b => b.badge_type === 'category_streak');
      
      if (speedDemon) console.log(`      ✅ Speed Demon badge exists`);
      else { console.log(`      ❌ Speed Demon badge missing`); allPassed = false; }
      
      if (completion) console.log(`      ✅ Completion badge exists`);
      else { console.log(`      ❌ Completion badge missing`); allPassed = false; }
      
      console.log(`      ✅ ${categoryStreaks.length} category streak badges`);
    }
  } catch (e) {
    console.log(`   ❌ Error checking badges: ${e}`);
    allPassed = false;
  }

  // Test 5: Check if default settings are seeded
  console.log('\n5️⃣  Checking default settings...');
  try {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) {
      console.log('   ❌ Could not fetch settings');
      allPassed = false;
    } else if (!data || data.length === 0) {
      console.log('   ❌ No settings found (seed data missing)');
      allPassed = false;
    } else {
      console.log(`   ✅ Found ${data.length} settings`);
      const requiredSettings = [
        'base_checkin_points',
        'photo_bonus_points',
        'category_streak_bonus',
        'speed_demon_bonus',
        'feature_photo_checkin',
        'feature_badges',
        'feature_leaderboard',
        'feature_category_filter'
      ];
      
      for (const key of requiredSettings) {
        const setting = data.find(s => s.key === key);
        if (setting) {
          console.log(`      ✅ ${key}: ${setting.value}`);
        } else {
          console.log(`      ❌ ${key} missing`);
          allPassed = false;
        }
      }
    }
  } catch (e) {
    console.log(`   ❌ Error checking settings: ${e}`);
    allPassed = false;
  }

  // Test 6: Check if leaderboard_view exists
  console.log('\n6️⃣  Checking leaderboard_view...');
  try {
    const { error } = await supabase.from('leaderboard_view').select('*').limit(0);
    if (error) {
      console.log('   ❌ leaderboard_view not found or not accessible');
      allPassed = false;
    } else {
      console.log('   ✅ leaderboard_view exists');
    }
  } catch (e) {
    console.log(`   ❌ Error checking leaderboard_view: ${e}`);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All database checks passed!');
    console.log('The database schema is correctly set up.');
  } else {
    console.log('❌ Some database checks failed.');
    console.log('Please review the errors above and ensure all migrations have been applied.');
  }
  console.log('='.repeat(50) + '\n');

  process.exit(allPassed ? 0 : 1);
}

verifyDatabase().catch(error => {
  console.error('Fatal error during verification:', error);
  process.exit(1);
});
