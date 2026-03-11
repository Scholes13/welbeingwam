import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const context = await getAuthProfileContext()
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = context.profileId

    const { backgroundId } = await request.json()

    if (!backgroundId) {
        return NextResponse.json({ error: 'Background ID required' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ card_background: backgroundId })
            .eq('id', userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Update Background Error:', error)
        return NextResponse.json({ error: 'Failed to update background' }, { status: 500 })
    }
}
