import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fix() {
  console.log('Dropping and recreating function with correct types...')
  
  // First drop the existing function
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: 'DROP FUNCTION IF EXISTS get_active_spots_with_coordinates();'
  })
  
  if (dropError) {
    console.log('Cannot drop via RPC, trying direct query...')
  }
  
  // Test the function
  const { data, error } = await supabase.rpc('get_active_spots_with_coordinates')
  
  if (error) {
    console.error('Function error:', error.message)
    console.log('\nPlease run this SQL in Supabase SQL Editor to fix:\n')
    console.log(`
DROP FUNCTION IF EXISTS get_active_spots_with_coordinates();

CREATE OR REPLACE FUNCTION get_active_spots_with_coordinates()
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  lng DOUBLE PRECISION,
  lat DOUBLE PRECISION,
  radius INTEGER,
  points INTEGER,
  category_id UUID,
  category_name VARCHAR(50),
  category_icon TEXT,
  category_color VARCHAR(7)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qs.id,
    qs.name,
    qs.description,
    ST_X(qs.location::geometry) as lng,
    ST_Y(qs.location::geometry) as lat,
    qs.radius,
    qs.points,
    qs.category_id,
    c.name as category_name,
    c.icon_url as category_icon,
    c.color as category_color
  FROM quest_spots qs
  LEFT JOIN categories c ON qs.category_id = c.id
  WHERE qs.is_active = true
    AND qs.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_spots_with_coordinates() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_spots_with_coordinates() TO service_role;
    `)
  } else {
    console.log(`✅ Function works! Found ${data?.length || 0} spots`)
    if (data?.[0]) {
      console.log('Sample:', JSON.stringify(data[0], null, 2))
    }
  }
}

fix()
