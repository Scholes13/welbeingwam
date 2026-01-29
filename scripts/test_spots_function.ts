import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  console.log('Testing get_active_spots_with_coordinates...')
  
  const { data, error } = await supabase.rpc('get_active_spots_with_coordinates')
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  
  console.log(`✅ Found ${data?.length || 0} spots`)
  
  if (data && data.length > 0) {
    console.log('\nSample spot:')
    console.log(JSON.stringify(data[0], null, 2))
  }
}

test()
