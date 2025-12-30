
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function getAvatar() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .ilike('username', '%pramuji%')
    .limit(1)

  if (error) console.error(error)
  else console.log('Avatar URL:', data[0]?.avatar_url)
}

getAvatar()
