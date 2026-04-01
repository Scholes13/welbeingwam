
import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password, instagram } = await request.json()
    
    const context = await getAuthProfileContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const currentUserId = context.profileId

    const supabase = createSupabaseAdminClient()

    // Prepare update object
    const updateData: {
        updated_at: string
        instagram_username?: string
    } = {
        updated_at: new Date().toISOString()
    }

    if (password && password.trim() !== '') {
        // Also update password in Supabase Auth
        const authClient = createSupabaseAdminClient()
        const { error: authUpdateError } = await authClient.auth.admin.updateUserById(context.authUser.id, {
            password: password
        })

        if (authUpdateError) {
            console.error('Error updating auth password:', authUpdateError)
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
        }
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
