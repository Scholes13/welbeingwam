import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const CLUE_REVEAL_PRICE = 200

export async function POST() {
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

        // Calculate available coins (same as reroll API)
        const { data: stepData } = await supabase.from('activities').select('steps').eq('user_id', userId)
        const totalSteps = stepData?.reduce((sum, act) => sum + (act.steps || 0), 0) || 0

        const { data: userQuests } = await supabase
            .from('user_quests')
            .select(`quests ( points )`)
            .eq('user_id', userId)
            .eq('status', 'approved')
        const questPoints = userQuests?.reduce((sum, uq: any) => sum + (uq.quests?.points || 0), 0) || 0

        const { data: adjustments } = await supabase.from('point_adjustments').select('points').eq('user_id', userId)
        const adjustmentPoints = adjustments?.reduce((sum, adj) => sum + (adj.points || 0), 0) || 0

        const totalEarned = totalSteps + questPoints + adjustmentPoints

        const { data: spentRewards } = await supabase.from('user_rewards').select('cost').eq('user_id', userId)
        const totalSpent = spentRewards?.reduce((sum, ur) => sum + (ur.cost || 0), 0) || 0

        const availableCoins = totalEarned - totalSpent

        if (availableCoins < CLUE_REVEAL_PRICE) {
            return NextResponse.json({ 
                error: `Not enough coins. Need ${CLUE_REVEAL_PRICE}, have ${availableCoins}` 
            }, { status: 400 })
        }

        // Get or create a "Reveal Clues" reward for tracking
        let { data: clueReward } = await supabase
            .from('rewards')
            .select('id')
            .ilike('title', '%clue%')
            .limit(1)
            .single()

        // If no clue reward exists, use a placeholder ID
        const rewardId = clueReward?.id || null

        // Record the purchase (deduct coins by adding to user_rewards)
        if (rewardId) {
            await supabase
                .from('user_rewards')
                .insert([{ 
                    user_id: userId, 
                    reward_id: rewardId,
                    cost: CLUE_REVEAL_PRICE
                }])
        }

        return NextResponse.json({ 
            success: true, 
            newBalance: availableCoins - CLUE_REVEAL_PRICE 
        })

    } catch (error) {
        console.error('Reveal clues error:', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
