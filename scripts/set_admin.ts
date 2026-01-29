import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setAdmin() {
  // Find participant by name
  const { data: participants, error: findError } = await supabase
    .from('participants')
    .select('id, name, code, is_admin')
  
  if (findError) {
    console.error('Error finding participants:', findError)
    return
  }

  console.log('Current participants:')
  participants?.forEach(p => {
    console.log(`- ${p.name} (${p.code}) - Admin: ${p.is_admin}`)
  })

  // Set Pramuji as admin
  const pramuji = participants?.find(p => p.name.toLowerCase().includes('pramuji'))
  
  if (pramuji) {
    const { error: updateError } = await supabase
      .from('participants')
      .update({ is_admin: true })
      .eq('id', pramuji.id)
    
    if (updateError) {
      console.error('Error setting admin:', updateError)
    } else {
      console.log(`\n✅ ${pramuji.name} is now an admin!`)
      console.log(`\nAccess admin panel at: /dashboard/admin`)
    }
  } else {
    console.log('\nPramuji not found. Setting first participant as admin...')
    if (participants && participants.length > 0) {
      const { error: updateError } = await supabase
        .from('participants')
        .update({ is_admin: true })
        .eq('id', participants[0].id)
      
      if (updateError) {
        console.error('Error setting admin:', updateError)
      } else {
        console.log(`\n✅ ${participants[0].name} is now an admin!`)
      }
    }
  }
}

setAdmin()
