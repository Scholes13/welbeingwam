import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Use Service Role to bypass RLS and see all user data
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 1. Fetch Users
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, instagram_username')

        if (profileError) throw profileError

        // 2. Fetch Activities (Steps)
        const { data: activities, error: activityError } = await supabase
            .from('activities')
            .select('user_id, steps')

        if (activityError) throw activityError

        // 3. Fetch Completed Quests (Points)
        const { data: userQuests, error: questError } = await supabase
            .from('user_quests')
            .select('user_id, quest:quests(points)')
            .eq('status', 'approved')

        if (questError) throw questError

        // 4. Fetch Point Adjustments
        const { data: adjustments, error: adjError } = await supabase
            .from('point_adjustments')
            .select('user_id, points')

        if (adjError) throw adjError

        // 5. Aggregate Data
        const stats: Record<string, any> = {}

        // Initialize stats
        profiles?.forEach(p => {
             // Handle BigInt by converting to string if needed, but JS numbers are usually fine for display unless > 2^53.
             // Supabase JS often returns BigInt as numbers if they fit.
            stats[p.id] = {
                user_id: p.id,
                full_name: p.full_name || 'N/A',
                avatar_url: p.avatar_url,
                instagram_username: p.instagram_username,
                total_steps: 0,
                quest_points: 0,
                overall_points: 0
            }
        })

        // Sum Steps
        activities?.forEach((act: any) => {
            if (stats[act.user_id]) {
                stats[act.user_id].total_steps += (act.steps || 0)
            }
        })

        // Sum Quest Points
        userQuests?.forEach((uq: any) => {
            if (stats[uq.user_id] && uq.quest) {
                stats[uq.user_id].quest_points += (uq.quest.points || 0)
            }
        })

        // Sum Adjustments (Map Reduce)
        const adjustmentsMap: Record<string, number> = {}
        adjustments?.forEach((adj: any) => {
             adjustmentsMap[adj.user_id] = (adjustmentsMap[adj.user_id] || 0) + adj.points
        })

        // Calculate Overall
        Object.values(stats).forEach((entry: any) => {
            const adj = adjustmentsMap[entry.user_id] || 0
            
            // Add manual points to quest_points as requested
            entry.quest_points += adj
            
            entry.overall_points = entry.total_steps + entry.quest_points 
        })

        const leaderboard = Object.values(stats)

        return NextResponse.json({ leaderboard })
    } catch (error) {
        console.error('Leaderboard API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
