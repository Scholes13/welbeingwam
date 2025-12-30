
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password, instagram } = await request.json()
    
    // Get current user from cookie
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Prepare update object
    const updateData: any = {
        updated_at: new Date().toISOString()
    }

    if (password && password.trim() !== '') {
        updateData.password = password
    }

    if (instagram !== undefined) {
        // Strip @ if present and trim
        updateData.instagram_username = instagram.replace('@', '').trim()
    }

    // Update Profile
    const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUserId)

    if (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
