
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihrutobdomnagnwzwncy.supabase.co'
const supabaseKey = 'sb_secret_XD21xo3c9CiF7s8qEGeKcw_WzpywRDt'
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
