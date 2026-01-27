
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { verifyAdminPermission } from '@/utils/auth'

export async function GET() {
  const cookieStore = await cookies()
  const currentUserId = cookieStore.get('strava_athlete_id')?.value

  if (!currentUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { authorized } = await verifyAdminPermission(supabase, currentUserId, 'manage_admins')

  if (!authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all users who have some permissions or is_admin flag
  // We want to list potential admins or existing admins
  // For simplicity, let's fetch all users with is_admin = true OR permissions != empty
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, permissions, is_admin')
    .or('is_admin.eq.true,permissions.neq.[]')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }

  return NextResponse.json({ admins })
}

export async function POST(request: Request) {
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value
  
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  
    const { authorized } = await verifyAdminPermission(supabase, currentUserId, 'manage_admins')
  
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  
    const { targetUserId, permissions } = await request.json()

    if (!targetUserId || !Array.isArray(permissions)) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Update the user
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
            permissions: permissions,
            // If permissions is not empty, set is_admin to true so checks related to strict is_admin pass if needed, 
            // OR we rely solely on permissions. For backward compatibility, keep is_admin = true if permissions > 0
            is_admin: true 
        })
        .eq('id', targetUserId)

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
