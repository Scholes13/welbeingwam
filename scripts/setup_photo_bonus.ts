import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupPhotoBonus() {
  console.log('Setting up photo bonus feature...\n')

  // 1. Enable photo_checkin feature
  const { error: featureError } = await supabase
    .from('settings')
    .upsert({
      key: 'features',
      value: {
        gps_checkin: true,
        qr_checkin: true,
        photo_checkin: true,  // Enable photo check-in
        badges: true,
        leaderboard: true,
        rewards: true,
        surveys: true,
        category_filter: true
      }
    }, {
      onConflict: 'key'
    })

  if (featureError) {
    console.error('Error enabling photo feature:', featureError)
  } else {
    console.log('✅ Photo check-in feature enabled')
  }

  // 2. Set photo bonus points
  const { error: pointsError } = await supabase
    .from('settings')
    .upsert({
      key: 'photo_bonus_points',
      value: { points: 25 }  // Bonus 25 points untuk upload foto
    }, {
      onConflict: 'key'
    })

  if (pointsError) {
    console.error('Error setting photo bonus:', pointsError)
  } else {
    console.log('✅ Photo bonus set to 25 points')
  }

  // 3. Check current settings
  const { data: settings } = await supabase
    .from('settings')
    .select('*')

  console.log('\nCurrent settings:')
  settings?.forEach(s => {
    console.log(`- ${s.key}:`, JSON.stringify(s.value, null, 2))
  })

  console.log('\n📸 Photo bonus is now active!')
  console.log('When users check-in and upload a photo, they get:')
  console.log('  - Base points (from quest spot)')
  console.log('  - + 25 bonus points (for photo)')
}

setupPhotoBonus()
