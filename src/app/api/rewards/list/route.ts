import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('strava_athlete_id')?.value

  if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Calculate User Total Steps
    const { data: activities } = await supabase
        .from('activities')
        .select('distance') // using distance based on previous logic? or steps column? 
        // Wait, activities table has 'distance' (meters), do we have 'steps'?
        // Checking schema: 20241230000004_add_steps_column.sql added 'steps'
        .eq('user_id', userId)
    
    // We should use 'steps' column if available, otherwise distance/0.7??
    // Let's assume steps column exists as per recent context, but verifying schema...
    // Actually, I should select * to be safe or verify column. 
    // Wait, activities create API used 'steps'. So it exists.
    
    // Correction: Select 'steps'
    // But supabase types might not know it if not generated? I'll use raw select.
    
    const { data: stepData } = await supabase.from('activities').select('steps').eq('user_id', userId)
    const totalSteps = stepData?.reduce((sum, act) => sum + (act.steps || 0), 0) || 0

    // 2. Calculate User Total Points
    // Need to join user_quests with quests to get points
    const { data: userQuests } = await supabase
        .from('user_quests')
        .select(`
            quest_id,
            quests ( points )
        `)
        .eq('user_id', userId)
        
    const questPoints = userQuests?.reduce((sum, uq: any) => sum + (uq.quests?.points || 0), 0) || 0

    // 2b. Calculate Adjustments
    const { data: adjustments } = await supabase
        .from('point_adjustments')
        .select('points')
        .eq('user_id', userId)

    const totalAdjustments = adjustments?.reduce((sum, adj) => sum + (adj.points || 0), 0) || 0

    // 3. Calculation of Coins
    const totalEarned = totalSteps + questPoints + totalAdjustments

    // Fetch Total Spent (Coins)
    const { data: spentRewards } = await supabase.from('user_rewards').select('cost').eq('user_id', userId)
    const totalSpent = spentRewards?.reduce((sum, ur) => sum + (ur.cost || 0), 0) || 0

    const availableCoins = totalEarned - totalSpent
    // Keep totalPoints as synonym for totalEarned for backward compat if needed, 
    // BUT userStats.totalPoints should probably reflect "Available Coins" or "Lifetime Points"?
    // The previous code had `const totalPoints = questPoints + totalAdjustments`. 
    // That was WRONG based on Leaderboard logic (Steps + Quests + Adj).
    // The previous code line 58: `const totalPoints = questPoints + totalAdjustments` ... missing Steps?
    // Leaderboard says `overall_points = total_steps + quest_points`.
    // So my previous code in `list/route.ts` line 58 was actually under-reporting points (missing steps).
    // But `rewards/claim` checks `totalPoints < required_points`.
    // If I fix `totalPoints` now to include steps, suddenly users have way MORE points.
    // User requested "Overall > Coin". Overall implies Leaderboard score.
    // So "Lifetime Points" = Steps + Quests + Adj.
    // "Coins" = Lifetime - Spent.
    
    // 4. Fetch All Active Rewards
    const { data: rewards } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('required_points', { ascending: true })

    // 5. Fetch User Claims (User's own claims)
    const { data: claims } = await supabase
        .from('user_rewards')
        .select(`
            reward_id,
            user_id
        `)
        .eq('user_id', userId)
    
    const claimedIds = new Set(claims?.map(c => c.reward_id))

    // 4b. Fetch Global Claims for Social Reveal
    const { data: globalClaims, error: claimsError } = await supabase
        .from('user_rewards')
        .select('reward_id, user_id')
        .order('claimed_at', { ascending: false })
    
    if (claimsError) console.error('Claims Fetch Error:', claimsError)

    // Manual Fetch Profiles
    const userIds = Array.from(new Set(globalClaims?.map(c => c.user_id) || []))
    
    let profileMap: Record<string, string> = {}
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', userIds)
        
        profiles?.forEach(p => {
            profileMap[p.id] = p.avatar_url
        })
    }

    // Map reward_id -> array of avatars
    const claimersMap: Record<string, string[]> = {}
    if (globalClaims) {
        globalClaims.forEach((claim: any) => {
            if (!claimersMap[claim.reward_id]) claimersMap[claim.reward_id] = []
            if (claimersMap[claim.reward_id].length < 3) {
                const avatar = profileMap[claim.user_id]
                if (avatar) {
                     claimersMap[claim.reward_id].push(avatar)
                } else {
                     claimersMap[claim.reward_id].push('default')
                }
            }
        })
    }

    // 6. Separate System Rewards vs Listed Rewards
    const listedRewards = rewards?.filter(r => !r.is_system) || []
    const rerollReward = rewards?.find(r => r.title === 'Avatar Reroll')

    // 7. Process Rewards (Mystery Logic)
    const processedRewards = listedRewards.map(reward => {
        const isClaimed = claimedIds.has(reward.id)
        
        // Handle defaults
        const reqPoints = reward.required_points || 0
        const reqSteps = reward.required_steps || 0
        
        // Check Conditions (using Coins for Points check)
        const meetsPoints = availableCoins >= reqPoints
        const meetsSteps = totalSteps >= reqSteps
        
        const isUnlocked = meetsPoints && meetsSteps
        const isSoldOut = (reward.max_claims || 0) > 0 && (reward.total_claimed || 0) >= reward.max_claims
        
        const rewardClaimers = claimersMap[reward.id] || []
        const hasBeenClaimedByAnyone = (reward.total_claimed || 0) > 0 || rewardClaimers.length > 0

        const isRevealed = isUnlocked || isClaimed || hasBeenClaimedByAnyone

        // Mask content if NOT revealed
        if (!isRevealed) {
             return {
                 id: reward.id,
                 title: '???',
                 description: 'Mystery Reward. Complete more quests to reveal!',
                 image_url: null, 
                 required_points: reqPoints,
                 required_steps: reqSteps,
                 status: 'LOCKED',
                 progress: {
                     userPoints: availableCoins, // Show coins
                     userSteps: totalSteps
                 },
                 claimers: []
             }
        }

        return {
            ...reward,
            required_points: reqPoints,
            required_steps: reqSteps,
            status: isClaimed ? 'CLAIMED' : (isSoldOut ? 'SOLD_OUT' : (isUnlocked ? 'AVAILABLE' : 'LOCKED_BUT_REVEALED')), 
            progress: {
                userPoints: availableCoins,
                userSteps: totalSteps
            },
            claimers: rewardClaimers
        }
    })

    return NextResponse.json({ 
        rewards: processedRewards,
        rerollPrice: rerollReward?.required_points || 500,
        userStats: { 
            totalPoints: totalEarned, // Report Lifetime Points
            availableCoins: availableCoins, // New Field
            totalSteps 
        }
    })

  } catch (error) {
    console.error('User Rewards List Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
