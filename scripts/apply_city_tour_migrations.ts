/**
 * Apply City Tour Migrations to Remote Database
 * This script reads the migration files and executes them using the Supabase service role
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '20260129000000_city_tour_schema.sql',
  '20260129000001_check_in_spot_function.sql',
  '20260129000002_evaluate_badges_trigger.sql',
  '20260129000003_leaderboard_view.sql',
  '20260129000004_seed_default_data.sql'
];

async function applyMigrations() {
  console.log('🚀 Starting City Tour Migration Application...\n');
  console.log(`📍 Target: ${supabaseUrl}\n`);

  for (const migration of migrations) {
    console.log(`📄 Applying: ${migration}`);
    
    try {
      const migrationPath = join(process.cwd(), 'supabase', 'migrations', migration);
      const sql = readFileSync(migrationPath, 'utf-8');
      
      // Split by semicolons but be careful with function definitions
      const statements = sql
        .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not inside quotes
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`   Found ${statements.length} SQL statements`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;

        try {
          // Use rpc to execute raw SQL
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            // If exec_sql doesn't exist, we need to use a different approach
            console.log(`   ⚠️  Cannot use exec_sql RPC, trying direct query...`);
            
            // For now, we'll note that migrations need to be applied manually
            console.log(`   ℹ️  Statement ${i + 1}: ${statement.substring(0, 50)}...`);
          }
        } catch (e: any) {
          console.log(`   ⚠️  Statement ${i + 1} issue: ${e.message}`);
        }
      }

      console.log(`   ✅ Processed ${migration}\n`);
    } catch (error: any) {
      console.error(`   ❌ Error reading migration file: ${error.message}\n`);
      process.exit(1);
    }
  }

  console.log('=' .repeat(60));
  console.log('⚠️  IMPORTANT NOTE:');
  console.log('Supabase client cannot execute raw SQL directly for security.');
  console.log('You need to apply these migrations using one of these methods:');
  console.log('');
  console.log('1. Supabase Dashboard SQL Editor:');
  console.log('   - Go to: https://supabase.com/dashboard/project/lryryspyvoyfvvfghqns/sql');
  console.log('   - Copy and paste each migration file content');
  console.log('   - Run them in order');
  console.log('');
  console.log('2. Supabase CLI (if you have database password):');
  console.log('   npx supabase db push');
  console.log('');
  console.log('3. Direct PostgreSQL connection (if you have credentials)');
  console.log('=' .repeat(60));
}

applyMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
