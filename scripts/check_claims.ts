
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihrutobdomnagnwzwncy.supabase.co'
const supabaseKey = 'sb_secret_XD21xo3c9CiF7s8qEGeKcw_WzpywRDt'
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
