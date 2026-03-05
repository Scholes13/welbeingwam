
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkIntegrity() {
  console.log('--- Rewards ---')
  const { data: rewards } = await supabase.from('rewards').select('id, title')
  const rewardMap = {}
  rewards?.forEach(r => rewardMap[r.id] = r.title)
  console.log(rewardMap)

  console.log('\n--- Claims ---')
  const { data: claims } = await supabase.from('user_rewards').select('user_id, reward_id')
  
  if (claims) {
      claims.forEach((c, i) => {
          const title = rewardMap[c.reward_id] || 'UNKNOWN REWARD'
          console.log(`Claim ${i}: Reward="${title}" (ID: ${c.reward_id}) -> UserID: ${c.user_id}`)
      })
  }
}

checkIntegrity()
