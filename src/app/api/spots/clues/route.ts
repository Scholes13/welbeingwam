import { getAuthUser } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const supabase = createSupabaseAdminClient()

        // Fetch all active spots with clues
        const { data: spots } = await supabase
            .from('qr_spots')
            .select('id, name, clue')
            .eq('is_active', true)
            .not('clue', 'is', null)
            .order('created_at', { ascending: false })

        return NextResponse.json({ 
            clues: spots?.map(s => ({ name: s.name, clue: s.clue })) || []
        })

    } catch (error) {
        console.error('Get clues error:', error)
        return NextResponse.json({ error: 'Failed to get clues' }, { status: 500 })
    }
}
