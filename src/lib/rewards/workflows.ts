import type { SupabaseClient } from '@supabase/supabase-js'

import { toSafeNumber } from '../points'
import type { RewardRecord } from './service'

type SupabaseLike = Pick<SupabaseClient, 'from' | 'rpc'>

export type RewardsRepository = {
  getRewardById: (rewardId: string) => Promise<RewardRecord | null>
  getRewardByTitle: (title: string) => Promise<RewardRecord | null>
  findRewardByTitlePattern: (pattern: string) => Promise<RewardRecord | null>
  hasClaimedReward: (userId: string | number, rewardId: string) => Promise<boolean>
  createClaim: (input: { userId: string | number; rewardId: string; cost: number }) => Promise<{ conflict: boolean }>
  incrementRewardClaims: (rewardId: string, nextValue: number) => Promise<void>
}

export type WorkflowSuccess<T> = { ok: true; data: T }
export type WorkflowFailure = { ok: false; status: number; error: string }
export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure

export type BackgroundOption = {
  id: string
  name: string
  gradient: string
  image: string | null
}

function notFound(message: string): WorkflowFailure {
  return { ok: false, status: 404, error: message }
}

function forbidden(message: string): WorkflowFailure {
  return { ok: false, status: 403, error: message }
}

function badRequest(message: string): WorkflowFailure {
  return { ok: false, status: 400, error: message }
}

function normalizeReward(value: unknown): RewardRecord | null {
  if (!value || typeof value !== 'object') return null
  return value as RewardRecord
}

export function createRewardsRepository(supabase: SupabaseLike): RewardsRepository {
  return {
    async getRewardById(rewardId) {
      const { data, error } = await supabase.from('rewards').select('*').eq('id', rewardId).single()
      if (error) throw error
      return normalizeReward(data)
    },

    async getRewardByTitle(title) {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('title', title)
        .eq('is_active', true)
        .limit(1)
      if (error) throw error

      const first = Array.isArray(data) ? data[0] : null
      return normalizeReward(first)
    },

    async findRewardByTitlePattern(pattern) {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .ilike('title', pattern)
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return normalizeReward(data)
    },

    async hasClaimedReward(userId, rewardId) {
      const { data, error } = await supabase
        .from('user_rewards')
        .select('id')
        .eq('user_id', userId)
        .eq('reward_id', rewardId)
        .single()

      if (error) return false
      return Boolean(data)
    },

    async createClaim(input) {
      const { error } = await supabase.from('user_rewards').insert([
        {
          user_id: input.userId,
          reward_id: input.rewardId,
          cost: input.cost,
        },
      ])

      if (!error) return { conflict: false }
      if (error.code === '23505') return { conflict: true }
      throw error
    },

    async incrementRewardClaims(rewardId, nextValue) {
      const { error: rpcError } = await supabase.rpc('increment_reward_claims', { reward_id: rewardId })
      if (!rpcError) return

      const { error: updateError } = await supabase
        .from('rewards')
        .update({ total_claimed: nextValue })
        .eq('id', rewardId)

      if (updateError) throw updateError
    },
  }
}

function rewardStatusChecks(input: {
  reward: RewardRecord
  availableCoins: number
}): WorkflowFailure | null {
  const requiredPoints = toSafeNumber(input.reward.required_points)
  const totalClaimed = toSafeNumber(input.reward.total_claimed)
  const maxClaims = toSafeNumber(input.reward.max_claims)

  if (input.reward.is_active === false) {
    return badRequest('Reward is inactive')
  }

  if (input.availableCoins < requiredPoints) {
    return forbidden(`Not enough coins. Need ${requiredPoints}, have ${input.availableCoins}`)
  }

  if (maxClaims > 0 && totalClaimed >= maxClaims) {
    return badRequest('Reward sold out')
  }

  return null
}

export async function claimRewardWorkflow(input: {
  repository: RewardsRepository
  userId: string | number
  rewardId: string
  availableCoins: number
}): Promise<WorkflowResult<{ rewardId: string }>> {
  const reward = await input.repository.getRewardById(input.rewardId)
  if (!reward) return notFound('Reward not found')

  const validationError = rewardStatusChecks({ reward, availableCoins: input.availableCoins })
  if (validationError) return validationError

  const alreadyClaimed = await input.repository.hasClaimedReward(input.userId, input.rewardId)
  if (alreadyClaimed) return badRequest('Already claimed')

  const cost = toSafeNumber(reward.required_points)
  const insertResult = await input.repository.createClaim({
    userId: input.userId,
    rewardId: input.rewardId,
    cost,
  })

  if (insertResult.conflict) return badRequest('Already claimed')

  await input.repository.incrementRewardClaims(input.rewardId, toSafeNumber(reward.total_claimed) + 1)

  return { ok: true, data: { rewardId: input.rewardId } }
}

export async function rerollAvatarWorkflow(input: {
  repository: RewardsRepository
  userId: string | number
  availableCoins: number
}): Promise<WorkflowResult<{ rewardId: string; price: number }>> {
  const reward = await input.repository.getRewardByTitle('Avatar Reroll')
  if (!reward) return { ok: false, status: 500, error: 'Reroll reward not found in DB' }

  const validationError = rewardStatusChecks({ reward, availableCoins: input.availableCoins })
  if (validationError) return validationError

  const price = toSafeNumber(reward.required_points)
  const insertResult = await input.repository.createClaim({
    userId: input.userId,
    rewardId: reward.id,
    cost: price,
  })

  if (insertResult.conflict) return badRequest('Already claimed')

  return {
    ok: true,
    data: {
      rewardId: reward.id,
      price,
    },
  }
}

export async function rollBackgroundWorkflow(input: {
  repository: RewardsRepository
  userId: string | number
  availableCoins: number
  backgrounds: BackgroundOption[]
  random?: () => number
}): Promise<WorkflowResult<{ rewardId: string; price: number; background: BackgroundOption }>> {
  const reward = await input.repository.getRewardByTitle('Background Reroll')
  if (!reward) {
    return {
      ok: false,
      status: 500,
      error: 'Background Reroll reward not found. Please create it in Admin Panel.',
    }
  }

  const validationError = rewardStatusChecks({ reward, availableCoins: input.availableCoins })
  if (validationError) return validationError

  const price = toSafeNumber(reward.required_points)
  const insertResult = await input.repository.createClaim({
    userId: input.userId,
    rewardId: reward.id,
    cost: price,
  })

  if (insertResult.conflict) return badRequest('Already claimed')

  const options = input.backgrounds.filter((background) => background.id !== 'default')
  const random = input.random ?? Math.random
  const index = Math.floor(random() * options.length)
  const background = options[index] ?? input.backgrounds[0]

  return {
    ok: true,
    data: {
      rewardId: reward.id,
      price,
      background,
    },
  }
}

export async function revealCluesWorkflow(input: {
  repository: RewardsRepository
  userId: string | number
  availableCoins: number
  price: number
}): Promise<WorkflowResult<{ remainingCoins: number }>> {
  if (input.availableCoins < input.price) {
    return badRequest(`Not enough coins. Need ${input.price}, have ${input.availableCoins}`)
  }

  const clueReward = await input.repository.findRewardByTitlePattern('%clue%')

  if (clueReward) {
    const insertResult = await input.repository.createClaim({
      userId: input.userId,
      rewardId: clueReward.id,
      cost: input.price,
    })

    if (insertResult.conflict) return badRequest('Already claimed')
  }

  return {
    ok: true,
    data: {
      remainingCoins: input.availableCoins - input.price,
    },
  }
}
