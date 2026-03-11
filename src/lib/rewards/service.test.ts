import { describe, expect, it } from 'vitest'

import {
  buildClaimersMap,
  buildDisplayedRewards,
  calculateUserEconomy,
  type RewardRecord,
} from './service'

describe('calculateUserEconomy', () => {
  it('computes points and coins from row sets', () => {
    const economy = calculateUserEconomy({
      stepRows: [{ steps: 123 }],
      userQuestRows: [{ quests: { points: 30 } }, { quests: { points: 20 } }],
      adjustmentRows: [{ points: 7 }],
      spentRows: [{ cost: 12 }],
    })

    expect(economy.totalSteps).toBe(123)
    expect(economy.questPoints).toBe(50)
    expect(economy.adjustmentPoints).toBe(7)
    expect(economy.totalEarned).toBe(69)
    expect(economy.totalSpent).toBe(12)
    expect(economy.coinTransactionTotal).toBe(0)
    expect(economy.availableCoins).toBe(57)
  })

  it('includes coin transactions in available coins', () => {
    const economy = calculateUserEconomy({
      stepRows: [{ steps: 100 }],
      spentRows: [{ cost: 5 }],
      coinTransactionRows: [{ amount: -50 }],
    })

    expect(economy.totalEarned).toBe(10)
    expect(economy.totalSpent).toBe(5)
    expect(economy.coinTransactionTotal).toBe(-50)
    expect(economy.availableCoins).toBe(-45)
  })

  it('handles quest relation payload as array', () => {
    const economy = calculateUserEconomy({
      userQuestRows: [{ quests: [{ points: 5 }, { points: 6 }] }],
    })

    expect(economy.questPoints).toBe(11)
  })
})

describe('buildClaimersMap', () => {
  it('maps reward claimers to max three avatars with fallback', () => {
    const map = buildClaimersMap({
      globalClaims: [
        { reward_id: 'r1', user_id: 'u1' },
        { reward_id: 'r1', user_id: 'u2' },
        { reward_id: 'r1', user_id: 'u3' },
        { reward_id: 'r1', user_id: 'u4' },
      ],
      avatarByUserId: {
        u1: 'a1',
        u2: 'a2',
      },
    })

    expect(map.r1).toEqual(['a1', 'a2', 'default'])
  })
})

describe('buildDisplayedRewards', () => {
  const rewards: RewardRecord[] = [
    {
      id: 'reveal-1',
      title: 'Reveal Reward',
      description: 'Visible',
      image_url: 'img',
      required_points: 100,
      required_steps: 0,
      max_claims: 0,
      total_claimed: 0,
      type: 'reveal',
      is_system: false,
    },
    {
      id: 'progress-1',
      title: 'Progress Reward',
      description: 'Coins based reveal',
      image_url: 'img',
      required_points: 400,
      required_steps: 0,
      max_claims: 0,
      total_claimed: 0,
      type: 'progress',
      is_system: false,
    },
    {
      id: 'mystery-1',
      title: 'Mystery Reward',
      description: 'Mystery',
      image_url: 'img',
      required_points: 50,
      required_steps: 0,
      max_claims: 0,
      total_claimed: 0,
      type: 'mystery',
      is_system: false,
    },
  ]

  it('masks hidden rewards and keeps reveal rewards visible', () => {
    const displayed = buildDisplayedRewards({
      rewards,
      claimedRewardIds: new Set<string>(),
      claimersByRewardId: {},
      availableCoins: 150,
      totalSteps: 100,
    })

    const reveal = displayed.find((reward) => reward.id === 'reveal-1')
    const progress = displayed.find((reward) => reward.id === 'progress-1')
    const mystery = displayed.find((reward) => reward.id === 'mystery-1')

    expect(reveal?.title).toBe('Reveal Reward')
    expect(progress?.title).toBe('???')
    expect(mystery?.title).toBe('???')
  })

  it('keeps repeatable rewards available even after the user has already claimed one', () => {
    const displayed = buildDisplayedRewards({
      rewards: [
        {
          id: 'repeatable-1',
          title: 'Avatar Reroll',
          description: 'Reroll again',
          image_url: null,
          required_points: 20,
          required_steps: 0,
          max_claims: 0,
          total_claimed: 5,
          type: 'reveal',
          is_system: false,
          is_repeatable: true,
        },
      ],
      claimedRewardIds: new Set<string>(['repeatable-1']),
      claimersByRewardId: {},
      availableCoins: 100,
      totalSteps: 0,
    })

    expect(displayed[0]?.status).toBe('AVAILABLE')
  })
})
