
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihrutobdomnagnwzwncy.supabase.co'
const supabaseServiceKey = 'sb_secret_XD21xo3c9CiF7s8qEGeKcw_WzpywRDt'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listUsers() {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username')
        .limit(10)
    
    if (error) {
        console.error(error)
    } else {
        console.log(users)
    }
}

listUsers()
