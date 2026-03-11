import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  buildClaimersMap,
  buildDisplayedRewards,
  fetchUserEconomy,
  type ClaimRow,
  type RewardRecord,
} from '@/lib/rewards/service'
import type { RewardsListResponse } from '@/lib/rewards/dto'
import { NextResponse } from 'next/server'

type ProfileAvatarRow = {
  id: string
  avatar_url: string | null
}

export async function GET() {
  const context = await getAuthProfileContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = context.profileId
  const supabase = createSupabaseAdminClient()

  try {
    const economy = await fetchUserEconomy(supabase, userId)

    const { data: rewardsData, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .order('required_points', { ascending: true })

    if (rewardsError) throw rewardsError

    const rewards = (rewardsData ?? []) as RewardRecord[]

    const { data: userClaimsData, error: userClaimsError } = await supabase
      .from('user_rewards')
      .select('reward_id, user_id')
      .eq('user_id', userId)
      .eq('claim_status', 'active')

    if (userClaimsError) throw userClaimsError

    const userClaims = (userClaimsData ?? []) as ClaimRow[]
    const claimedRewardIds = new Set(userClaims.map((claim) => claim.reward_id))

    const { data: globalClaimsData, error: globalClaimsError } = await supabase
      .from('user_rewards')
      .select('reward_id, user_id')
      .eq('claim_status', 'active')
      .order('claimed_at', { ascending: false })

    if (globalClaimsError) throw globalClaimsError

    const globalClaims = (globalClaimsData ?? []) as ClaimRow[]
    const userIds = Array.from(new Set(globalClaims.map((claim) => claim.user_id)))

    const avatarByUserId: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds)

      if (profilesError) throw profilesError

      ;((profilesData ?? []) as ProfileAvatarRow[]).forEach((profile) => {
        if (profile.avatar_url) avatarByUserId[profile.id] = profile.avatar_url
      })
    }

    const claimersByRewardId = buildClaimersMap({
      globalClaims,
      avatarByUserId,
    })

    const displayedRewards = buildDisplayedRewards({
      rewards,
      claimedRewardIds,
      claimersByRewardId,
      availableCoins: economy.availableCoins,
      totalSteps: economy.totalSteps,
    })

    const rerollReward = rewards.find((reward) => reward.title === 'Avatar Reroll')

    const response: RewardsListResponse = {
      rewards: displayedRewards,
      rerollPrice: rerollReward?.required_points ?? 500,
      userStats: {
        totalPoints: economy.totalEarned,
        availableCoins: economy.availableCoins,
        totalSteps: economy.totalSteps,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('User Rewards List Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
