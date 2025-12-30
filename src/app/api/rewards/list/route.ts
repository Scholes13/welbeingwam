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

    const totalPoints = questPoints + totalAdjustments

    // 3. Fetch All Active Rewards
    const { data: rewards } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('required_points', { ascending: true })

    // 4. Fetch User Claims (User's own claims)
    const { data: claims } = await supabase
        .from('user_rewards')
        .select(`
            reward_id,
            user_id
        `)
        .eq('user_id', userId)
    
    const claimedIds = new Set(claims?.map(c => c.reward_id))

    // 4b. Fetch Global Claims for Social Reveal (Get avatars of claimers)
    const { data: globalClaims, error: claimsError } = await supabase
        .from('user_rewards')
        .select('reward_id, user_id')
        .order('claimed_at', { ascending: false })
    
    if (claimsError) console.error('Claims Fetch Error:', claimsError)

    // Manual Fetch Profiles to ensure we get avatars (avoiding potential foreign key Join issues)
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
             // Limit to 3 avatars per reward
            if (claimersMap[claim.reward_id].length < 3) {
                const avatar = profileMap[claim.user_id]
                // If avatar exists, use it. If not (and profile exists?), use default logic?
                // If profile missing, fallback to 'default'.
                // If profile exists but avatar_url is null? 'default'.
                if (avatar) {
                     claimersMap[claim.reward_id].push(avatar)
                } else {
                     claimersMap[claim.reward_id].push('default')
                }
            }
        })
    }

    // 5. Process Rewards (Mystery Logic)
    const processedRewards = rewards?.map(reward => {
        const isClaimed = claimedIds.has(reward.id)
        
        // Handle defaults
        const reqPoints = reward.required_points || 0
        const reqSteps = reward.required_steps || 0
        
        // Check Conditions
        const meetsPoints = totalPoints >= reqPoints
        const meetsSteps = totalSteps >= reqSteps
        
        const isUnlocked = meetsPoints && meetsSteps
        const isSoldOut = (reward.max_claims || 0) > 0 && (reward.total_claimed || 0) >= reward.max_claims
        
        // Social Reveal: If ANYONE has claimed it, it is revealed.
        // We use total_claimed > 0 as the source of truth, as claimers array might be empty if users have no avatars.
        const rewardClaimers = claimersMap[reward.id] || []
        const hasBeenClaimedByAnyone = (reward.total_claimed || 0) > 0 || rewardClaimers.length > 0

        // Reveal Condition: User Unlocked OR User Claimed OR Anyone Claimed
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
                     userPoints: totalPoints,
                     userSteps: totalSteps
                 },
                 claimers: []
             }
        }

        return {
            ...reward,
            required_points: reqPoints,
            required_steps: reqSteps,
            status: isClaimed ? 'CLAIMED' : (isSoldOut ? 'SOLD_OUT' : (isUnlocked ? 'AVAILABLE' : 'LOCKED_BUT_REVEALED')), // Distinguish locked but visible
            progress: {
                userPoints: totalPoints,
                userSteps: totalSteps
            },
            claimers: rewardClaimers
        }
    })

    return NextResponse.json({ 
        rewards: processedRewards,
        userStats: { totalPoints, totalSteps }
    })

  } catch (error) {
    console.error('User Rewards List Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
