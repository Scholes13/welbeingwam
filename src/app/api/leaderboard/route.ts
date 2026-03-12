import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  computeLeaderboardEntries,
  type LeaderboardAdjustment,
  type LeaderboardProfile,
  type LeaderboardQuestRow,
} from '@/lib/gamification'
import { NextRequest, NextResponse } from 'next/server'

import { fetchLeaderboardActivities } from './activities'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const dimension = request.nextUrl.searchParams.get('dimension') || null

        // Use Service Role to bypass RLS and see all user data
        const supabase = createSupabaseAdminClient()

        // 1. Fetch Users
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, instagram_username, username')

        if (profileError) throw profileError

        // 2. Fetch Activities (Steps)
        const activities = await fetchLeaderboardActivities(supabase)

        // 3. Fetch Completed Quests (Points) — include dimension_id
        const { data: userQuests, error: questError } = await supabase
            .from('user_quests')
            .select('user_id, quest:quests(points, dimension_id)')
            .eq('status', 'approved')

        if (questError) throw questError

        // 4. Fetch Point Adjustments — include dimension_id
        const { data: adjustments, error: adjError } = await supabase
            .from('point_adjustments')
            .select('user_id, points, dimension_id')

        if (adjError) throw adjError

        let leaderboard = computeLeaderboardEntries({
            profiles: (profiles ?? []) as LeaderboardProfile[],
            activities,
            userQuests: (userQuests ?? []) as LeaderboardQuestRow[],
            adjustments: (adjustments ?? []) as LeaderboardAdjustment[],
        })

        // Sort by dimension points if a dimension filter is provided
        if (dimension) {
            leaderboard = leaderboard.sort(
                (a, b) => (b.dimension_points[dimension] ?? 0) - (a.dimension_points[dimension] ?? 0)
            )
        } else {
            leaderboard = leaderboard.sort((a, b) => b.overall_points - a.overall_points)
        }

        return NextResponse.json({ leaderboard })
    } catch (error) {
        console.error('Leaderboard API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
