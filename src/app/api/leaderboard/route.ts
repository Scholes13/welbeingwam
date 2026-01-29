import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getParticipantId } from '@/utils/tour-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get current participant ID from session
        const currentParticipantId = await getParticipantId()

        // Fetch leaderboard data from the view
        const { data: leaderboard, error } = await supabase
            .from('leaderboard_view')
            .select('*')
            .order('rank', { ascending: true })

        if (error) {
            console.error('Leaderboard query error:', error)
            throw error
        }

        // Find current participant's rank if authenticated
        let currentParticipantRank = null
        if (currentParticipantId) {
            const currentEntry = leaderboard?.find(entry => entry.id === currentParticipantId)
            if (currentEntry) {
                currentParticipantRank = {
                    rank: currentEntry.rank,
                    id: currentEntry.id,
                    name: currentEntry.name,
                    total_points: currentEntry.total_points,
                    spots_visited: currentEntry.spots_visited,
                    badge_count: currentEntry.badge_count
                }
            }
        }

        return NextResponse.json({ 
            leaderboard: leaderboard || [],
            currentParticipant: currentParticipantRank
        })
    } catch (error) {
        console.error('Leaderboard API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
