
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixAdmin() {
  console.log('Checking admin_wam user...')
  
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'admin_wam')
    .single()

  if (error || !user) {
    console.error('User admin_wam not found!', error)
    return
  }

  console.log('User found raw:', JSON.stringify(user, null, 2))

  /*
  if (user.is_admin !== true) {
      console.log('User is not admin. Updating...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', user.id)
      
      if (updateError) {
          console.error('Failed to update admin status:', updateError)
      } else {
          console.log('Successfully promoted admin_wam to Admin!')
      }
  } else {
      console.log('User is already an Admin.')
  }
  */
}

fixAdmin()
