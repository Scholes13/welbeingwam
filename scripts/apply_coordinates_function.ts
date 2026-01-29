/**
 * Script to apply the get_active_spots_with_coordinates function to the database
 * Run with: npx tsx scripts/apply_coordinates_function.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Applying get_active_spots_with_coordinates function...')
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260129000010_add_spots_coordinates_function.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  // Execute the SQL
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    // Try direct execution via REST API
    console.log('RPC exec_sql not available, trying alternative method...')
    
    // Split into individual statements and execute
    const statements = sql.split(';').filter(s => s.trim())
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log('Executing statement...')
        // We can't execute raw SQL via Supabase JS client
        // User needs to run this in Supabase SQL Editor
      }
    }
    
    console.log('\n⚠️  Cannot execute raw SQL via Supabase JS client.')
    console.log('Please run the following SQL in your Supabase SQL Editor:\n')
    console.log('---')
    console.log(sql)
    console.log('---')
    return
  }
  
  console.log('✅ Migration applied successfully!')
  
  // Test the function
  console.log('\nTesting the function...')
  const { data, error: testError } = await supabase.rpc('get_active_spots_with_coordinates')
  
  if (testError) {
    console.error('Error testing function:', testError)
  } else {
    console.log(`✅ Function works! Found ${data?.length || 0} spots`)
    if (data && data.length > 0) {
      console.log('Sample spot:', data[0])
    }
  }
}

applyMigration().catch(console.error)
