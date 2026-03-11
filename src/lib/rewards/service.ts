import type { SupabaseClient } from '@supabase/supabase-js'

import { calculateAvailableCoins, calculateTotalEarnedPoints, sumNumericField, toSafeNumber } from '../points'

type QuestPayload = { points?: number | null } | { points?: number | null }[] | null

export type StepRow = { steps: number | null }
export type UserQuestPointsRow = { quests: QuestPayload }
export type AdjustmentRow = { points: number | null }
export type SpentRewardRow = { cost: number | null }
export type CoinTransactionRow = { amount: number | null }

export type UserEconomy = {
  totalSteps: number
  questPoints: number
  adjustmentPoints: number
  coinTransactionTotal: number
  totalEarned: number
  totalSpent: number
  availableCoins: number
}

export type RewardType = 'reveal' | 'progress' | 'mystery'

export type RewardRecord = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  required_points: number | null
  required_steps: number | null
  max_claims: number | null
  total_claimed: number | null
  is_active?: boolean | null
  is_system: boolean | null
  type: RewardType | null
  is_repeatable?: boolean | null
}

export type ClaimRow = {
  reward_id: string
  user_id: string | number
  claim_status?: string | null
}

export type RewardDisplayStatus =
  | 'CLAIMED'
  | 'SOLD_OUT'
  | 'AVAILABLE'
  | 'LOCKED'
  | 'LOCKED_BUT_REVEALED'

export type DisplayReward = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  required_points: number
  required_steps: number
  status: RewardDisplayStatus
  type: RewardType
  progress: {
    userPoints: number
    userSteps: number
  }
  claimers: string[]
}

function extractQuestPoints(payload: QuestPayload): number {
  if (!payload) return 0
  if (Array.isArray(payload)) return sumNumericField(payload, (item) => item.points)
  return toSafeNumber(payload.points)
}

function normalizeRewardType(value: RewardType | string | null | undefined): RewardType {
  if (value === 'progress' || value === 'mystery') return value
  return 'reveal'
}

export function sumQuestPoints(rows: UserQuestPointsRow[] | null | undefined): number {
  if (!rows || rows.length === 0) return 0
  return rows.reduce((sum, row) => sum + extractQuestPoints(row.quests), 0)
}

export function calculateUserEconomy(input: {
  stepRows?: StepRow[] | null
  userQuestRows?: UserQuestPointsRow[] | null
  adjustmentRows?: AdjustmentRow[] | null
  spentRows?: SpentRewardRow[] | null
  coinTransactionRows?: CoinTransactionRow[] | null
}): UserEconomy {
  const totalSteps = sumNumericField(input.stepRows, (row) => row.steps)
  const questPoints = sumQuestPoints(input.userQuestRows)
  const adjustmentPoints = sumNumericField(input.adjustmentRows, (row) => row.points)
  const totalEarned = calculateTotalEarnedPoints({ totalSteps, questPoints, adjustmentPoints })
  const totalSpent = sumNumericField(input.spentRows, (row) => row.cost)
  const coinTransactionTotal = sumNumericField(input.coinTransactionRows, (row) => row.amount)
  const availableCoins = calculateAvailableCoins({ totalEarned, totalSpent }) + coinTransactionTotal

  return {
    totalSteps,
    questPoints,
    adjustmentPoints,
    coinTransactionTotal,
    totalEarned,
    totalSpent,
    availableCoins,
  }
}

export async function fetchUserEconomy(supabase: SupabaseClient, userId: string | number): Promise<UserEconomy> {
  const [stepsResult, questsResult, adjustmentsResult, spentResult, coinTransactionsResult] = await Promise.all([
    supabase.from('activities').select('steps').eq('user_id', userId),
    supabase.from('user_quests').select('quests ( points )').eq('user_id', userId).eq('status', 'approved'),
    supabase.from('point_adjustments').select('points').eq('user_id', userId),
    supabase.from('user_rewards').select('cost').eq('user_id', userId).eq('claim_status', 'active'),
    supabase.from('coin_transactions').select('amount').eq('user_id', userId),
  ])

  return calculateUserEconomy({
    stepRows: (stepsResult.data ?? []) as StepRow[],
    userQuestRows: (questsResult.data ?? []) as UserQuestPointsRow[],
    adjustmentRows: (adjustmentsResult.data ?? []) as AdjustmentRow[],
    spentRows: (spentResult.data ?? []) as SpentRewardRow[],
    coinTransactionRows: (coinTransactionsResult.data ?? []) as CoinTransactionRow[],
  })
}

export function buildClaimersMap(input: {
  globalClaims: ClaimRow[]
  avatarByUserId: Record<string, string>
  maxPerReward?: number
}): Record<string, string[]> {
  const maxPerReward = input.maxPerReward ?? 3
  const map: Record<string, string[]> = {}

  input.globalClaims.forEach((claim) => {
    if (!map[claim.reward_id]) map[claim.reward_id] = []
    if (map[claim.reward_id].length >= maxPerReward) return

    map[claim.reward_id].push(input.avatarByUserId[claim.user_id] ?? 'default')
  })

  return map
}

export function buildDisplayedRewards(input: {
  rewards: RewardRecord[]
  claimedRewardIds: Set<string>
  claimersByRewardId: Record<string, string[]>
  availableCoins: number
  totalSteps: number
}): DisplayReward[] {
  const listedRewards = input.rewards.filter((reward) => !reward.is_system)

  return listedRewards.map((reward) => {
    const rewardType = normalizeRewardType(reward.type)
    const requiredPoints = toSafeNumber(reward.required_points)
    const requiredSteps = toSafeNumber(reward.required_steps)
    const totalClaimed = toSafeNumber(reward.total_claimed)
    const maxClaims = toSafeNumber(reward.max_claims)
    const isRepeatable = reward.is_repeatable === true

    const isClaimed = !isRepeatable && input.claimedRewardIds.has(reward.id)
    const rewardClaimers = input.claimersByRewardId[reward.id] ?? []
    const hasBeenClaimedByAnyone = totalClaimed > 0 || rewardClaimers.length > 0

    const meetsPoints = input.availableCoins >= requiredPoints
    const meetsSteps = input.totalSteps >= requiredSteps
    const isUnlocked = meetsPoints && meetsSteps
    const isSoldOut = maxClaims > 0 && totalClaimed >= maxClaims

    let isVisible = true
    if (rewardType === 'progress') {
      isVisible = input.availableCoins >= requiredPoints || isClaimed
    } else if (rewardType === 'mystery') {
      isVisible = hasBeenClaimedByAnyone || isClaimed
    }

    if (!isVisible) {
      return {
        id: reward.id,
        title: '???',
        description:
          rewardType === 'progress'
            ? 'Earn more coins to reveal this reward!'
            : 'Be the first to claim to reveal this mystery reward!',
        image_url: null,
        required_points: requiredPoints,
        required_steps: requiredSteps,
        status: isUnlocked ? 'AVAILABLE' : 'LOCKED',
        type: rewardType,
        progress: {
          userPoints: input.availableCoins,
          userSteps: input.totalSteps,
        },
        claimers: [],
      }
    }

    return {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      image_url: reward.image_url,
      required_points: requiredPoints,
      required_steps: requiredSteps,
      status: isClaimed ? 'CLAIMED' : isSoldOut ? 'SOLD_OUT' : isUnlocked ? 'AVAILABLE' : 'LOCKED_BUT_REVEALED',
      type: rewardType,
      progress: {
        userPoints: input.availableCoins,
        userSteps: input.totalSteps,
      },
      claimers: rewardClaimers,
    }
  })
}
