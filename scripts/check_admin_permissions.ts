
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from current directory
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdmin() {
  console.log('Checking admin_wam...');
  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, username, permissions, is_admin')
    .eq('username', 'admin_wam')
    .single();

  if (error) {
    console.error('Error fetching admin:', error);
    return;
  }

  console.log('Admin User:', JSON.stringify(user, null, 2));
  
  if (!user.permissions || !user.permissions.includes('*')) {
      console.log('WARNING: Super admin permission missing!');
  } else {
      console.log('SUCCESS: Super admin permission present.');
  }
}

checkAdmin();
