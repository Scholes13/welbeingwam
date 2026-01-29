/**
 * Manual verification script for check-in flow
 * This script verifies that all key components of the check-in flow are properly implemented
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

interface VerificationResult {
  component: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
}

const results: VerificationResult[] = []

async function verify() {
  console.log('🔍 Verifying Check-in Flow Implementation...\n')

  // 1. Check database schema
  console.log('1️⃣  Checking database schema...')
  
  // Check if check_in_spot function exists
  const { data: functionExists, error: funcError } = await supabase.rpc('check_in_spot', {
    p_participant_id: '00000000-0000-0000-0000-000000000000',
    p_spot_id: '00000000-0000-0000-0000-000000000000',
    p_latitude: 0,
    p_longitude: 0,
    p_photo_url: null
  }).then(
    () => ({ data: true, error: null }),
    (err) => ({ data: false, error: err })
  )

  if (funcError && !funcError.message.includes('SESSION_INACTIVE') && !funcError.message.includes('SPOT_NOT_FOUND')) {
    results.push({
      component: 'Database Function: check_in_spot',
      status: 'FAIL',
      message: `Function not found or has errors: ${funcError.message}`
    })
  } else {
    results.push({
      component: 'Database Function: check_in_spot',
      status: 'PASS',
      message: 'Function exists and is callable'
    })
  }

  // Check if evaluate_badges trigger exists
  const { data: triggers } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .eq('tgname', 'trigger_evaluate_badges')
    .single()

  if (triggers) {
    results.push({
      component: 'Database Trigger: evaluate_badges',
      status: 'PASS',
      message: 'Trigger exists'
    })
  } else {
    results.push({
      component: 'Database Trigger: evaluate_badges',
      status: 'WARNING',
      message: 'Could not verify trigger existence (may require direct DB access)'
    })
  }

  // 2. Check required tables
  console.log('2️⃣  Checking required tables...')
  
  const tables = ['participants', 'quest_spots', 'visits', 'badges', 'participant_badges', 'categories', 'settings']
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    
    if (error) {
      results.push({
        component: `Table: ${table}`,
        status: 'FAIL',
        message: `Table not accessible: ${error.message}`
      })
    } else {
      results.push({
        component: `Table: ${table}`,
        status: 'PASS',
        message: 'Table exists and is accessible'
      })
    }
  }

  // 3. Check settings configuration
  console.log('3️⃣  Checking settings configuration...')
  
  const requiredSettings = [
    'base_checkin_points',
    'photo_bonus_points',
    'category_streak_bonus',
    'speed_demon_bonus',
    'feature_photo_checkin',
    'feature_badges'
  ]
  
  for (const key of requiredSettings) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single()
    
    if (error || !data) {
      results.push({
        component: `Setting: ${key}`,
        status: 'FAIL',
        message: 'Setting not found'
      })
    } else {
      results.push({
        component: `Setting: ${key}`,
        status: 'PASS',
        message: `Value: ${data.value}`
      })
    }
  }

  // 4. Check storage bucket
  console.log('4️⃣  Checking storage configuration...')
  
  const { data: buckets } = await supabase.storage.listBuckets()
  const hasCheckinPhotos = buckets?.some(b => b.name === 'checkin-photos')
  
  if (hasCheckinPhotos) {
    results.push({
      component: 'Storage Bucket: checkin-photos',
      status: 'PASS',
      message: 'Bucket exists'
    })
  } else {
    results.push({
      component: 'Storage Bucket: checkin-photos',
      status: 'WARNING',
      message: 'Bucket not found - photo uploads may fail'
    })
  }

  // 5. Check if there are any active tour sessions
  console.log('5️⃣  Checking tour session configuration...')
  
  const { data: sessions, error: sessionError } = await supabase
    .from('tour_sessions')
    .select('*')
    .eq('is_active', true)
  
  if (sessionError) {
    results.push({
      component: 'Tour Sessions',
      status: 'FAIL',
      message: `Error fetching sessions: ${sessionError.message}`
    })
  } else if (!sessions || sessions.length === 0) {
    results.push({
      component: 'Tour Sessions',
      status: 'WARNING',
      message: 'No active tour session found - check-ins will be rejected'
    })
  } else {
    const now = new Date()
    const activeSession = sessions.find(s => 
      new Date(s.start_time) <= now && new Date(s.end_time) >= now
    )
    
    if (activeSession) {
      results.push({
        component: 'Tour Sessions',
        status: 'PASS',
        message: `Active session: ${activeSession.name}`
      })
    } else {
      results.push({
        component: 'Tour Sessions',
        status: 'WARNING',
        message: 'Session exists but not currently active'
      })
    }
  }

  // 6. Check if there are quest spots
  console.log('6️⃣  Checking quest spots...')
  
  const { data: spots, error: spotsError } = await supabase
    .from('quest_spots')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
  
  if (spotsError) {
    results.push({
      component: 'Quest Spots',
      status: 'FAIL',
      message: `Error fetching spots: ${spotsError.message}`
    })
  } else if (!spots || spots.length === 0) {
    results.push({
      component: 'Quest Spots',
      status: 'WARNING',
      message: 'No active quest spots found'
    })
  } else {
    results.push({
      component: 'Quest Spots',
      status: 'PASS',
      message: `${spots.length} active quest spot(s) found`
    })
  }

  // Print results
  console.log('\n' + '='.repeat(80))
  console.log('📊 VERIFICATION RESULTS')
  console.log('='.repeat(80) + '\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warnings = results.filter(r => r.status === 'WARNING').length

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
    console.log(`${icon} ${result.component}`)
    console.log(`   ${result.message}\n`)
  })

  console.log('='.repeat(80))
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`)
  console.log('='.repeat(80) + '\n')

  if (failed > 0) {
    console.log('❌ Check-in flow has CRITICAL issues that need to be fixed.\n')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('⚠️  Check-in flow is implemented but has some warnings.\n')
    console.log('   These warnings may prevent check-ins from working in production.')
    console.log('   Please review and address them before testing.\n')
  } else {
    console.log('✅ Check-in flow is properly implemented!\n')
    console.log('   All components are in place and configured correctly.')
    console.log('   You can now test the check-in flow manually.\n')
  }
}

verify().catch(console.error)
