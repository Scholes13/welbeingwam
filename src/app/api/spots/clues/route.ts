import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('strava_athlete_id')?.value

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

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
