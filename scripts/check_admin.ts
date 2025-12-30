
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('username', 'admin_wam')
    .single()

  if (error) console.error(error)
  else console.log('Super Admin:', data)
}

checkAdmin()
