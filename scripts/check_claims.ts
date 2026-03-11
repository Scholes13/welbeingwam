
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkClaims() {
  console.log('--- Checking User Rewards ---')
  const { data: claims } = await supabase.from('user_rewards').select('user_id, reward_id')
  
  if (claims && claims.length > 0) {
      claims.forEach((c, i) => {
          console.log(`Claim ${i}: user_id=${c.user_id} (${typeof c.user_id})`)
      })

      const userIds = claims.map(c => c.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
      
      console.log('\n--- Checking Profiles ---')
      if (profiles) {
          profiles.forEach((p, i) => {
              console.log(`Profile ${i}: id=${p.id} (${typeof p.id}), avatar=${p.avatar_url ? 'Exists' : 'Null'}`)
          })
      } else {
        console.log('No profiles found for IDs:', userIds)
      }
  } else {
      console.log('No claims found.')
  }
}

checkClaims()
