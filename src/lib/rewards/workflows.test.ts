import { describe, expect, it, vi } from 'vitest'

import { fetchUserEconomy } from './service'
import {
  claimRewardWorkflow,
  createRewardsRepository,
  revealCluesWorkflow,
  rerollAvatarWorkflow,
  rollBackgroundWorkflow,
} from './workflows'

type MockRow = Record<string, unknown>

type MockDatabase = {
  rewards?: MockRow[]
  user_rewards?: MockRow[]
  activities?: MockRow[]
  user_quests?: MockRow[]
  point_adjustments?: MockRow[]
}

function createMockSupabaseClient(db: MockDatabase) {
  const tables: Record<string, MockRow[]> = {
    rewards: [...(db.rewards ?? [])],
    user_rewards: [...(db.user_rewards ?? [])],
    activities: [...(db.activities ?? [])],
    user_quests: [...(db.user_quests ?? [])],
    point_adjustments: [...(db.point_adjustments ?? [])],
  }

  const client = {
    from(tableName: string) {
      let rows = [...(tables[tableName] ?? [])]
      let singleMode = false
      let limitCount: number | null = null

      const chain = {
        select() {
          return chain
        },
        eq(column: string, value: unknown) {
          rows = rows.filter((row) => row[column] === value)
          return chain
        },
        ilike(column: string, pattern: string) {
          const normalizedPattern = pattern.replace(/%/g, '').toLowerCase()
          rows = rows.filter((row) => String(row[column] ?? '').toLowerCase().includes(normalizedPattern))
          return chain
        },
        limit(count: number) {
          limitCount = count
          return chain
        },
        async single() {
          singleMode = true
          const result = limitCount ? rows.slice(0, limitCount) : rows
          return { data: result[0] ?? null, error: null }
        },
        insert(payload: MockRow[]) {
          const insertedRows = payload.map((row, index) => ({
            id: row.id ?? `${tableName}-${tables[tableName].length + index + 1}`,
            ...row,
          }))
          tables[tableName].push(...insertedRows)

          const insertChain = {
            select() {
              return insertChain
            },
            async single() {
              return { data: insertedRows[0] ?? null, error: null }
            },
          }

          return insertChain
        },
        async update(payload: MockRow) {
          const updated = rows.map((row) => ({ ...row, ...payload }))
          const source = tables[tableName]
          source.forEach((row, index) => {
            if (rows.includes(row)) source[index] = updated[rows.indexOf(row)]
          })
          return { data: updated, error: null }
        },
        then(onFulfilled: (value: { data: MockRow[] | MockRow | null; error: null }) => unknown) {
          const resultRows = limitCount ? rows.slice(0, limitCount) : rows
          return Promise.resolve(
            onFulfilled({ data: singleMode ? resultRows[0] ?? null : resultRows, error: null })
          )
        },
      }

      return chain
    },
    async rpc() {
      return { data: null, error: null }
    },
  }

  return { client, tables }
}

describe('rewards workflows with mocked supabase client', () => {
  it('runs claim flow and stores claim when economy is sufficient', async () => {
    const { client, tables } = createMockSupabaseClient({
      rewards: [{ id: 'reward-1', title: 'Voucher', required_points: 20, max_claims: 0, total_claimed: 0, is_active: true, is_system: false, type: 'reveal' }],
      activities: [{ user_id: 'user-1', steps: 500 }],
      user_quests: [{ user_id: 'user-1', status: 'approved', quests: { points: 10 } }],
      point_adjustments: [],
      user_rewards: [],
    })

    const economy = await fetchUserEconomy(client as never, 'user-1')
    const repository = createRewardsRepository(client as never)

    const result = await claimRewardWorkflow({
      repository,
      userId: 'user-1',
      rewardId: 'reward-1',
      availableCoins: economy.availableCoins,
    })

    expect(result.ok).toBe(true)
    expect(tables.user_rewards).toHaveLength(1)
  })

  it('returns already claimed when the insert conflicts after a stale pre-check', async () => {
    const repository = {
      getRewardById: async () => ({
        id: 'reward-1',
        title: 'Voucher',
        description: null,
        image_url: null,
        required_points: 20,
        required_steps: 0,
        max_claims: 0,
        total_claimed: 0,
        is_active: true,
        is_system: false,
        type: 'reveal' as const,
      }),
      getRewardByTitle: async () => null,
      findRewardByTitlePattern: async () => null,
      hasClaimedReward: async () => false,
      createClaim: async () => ({ conflict: true }),
      incrementRewardClaims: async () => undefined,
    }

    const result = await claimRewardWorkflow({
      repository,
      userId: 'user-1',
      rewardId: 'reward-1',
      availableCoins: 999,
    })

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: 'Already claimed',
    })
  })

  it('allows repeatable rewards to skip the already-claimed precheck', async () => {
    const repository = {
      getRewardById: async () => ({
        id: 'reward-repeatable',
        title: 'Background Reroll',
        description: null,
        image_url: null,
        required_points: 20,
        required_steps: 0,
        max_claims: 0,
        total_claimed: 10,
        is_active: true,
        is_system: false,
        type: 'reveal' as const,
        is_repeatable: true,
      }),
      getRewardByTitle: async () => null,
      findRewardByTitlePattern: async () => null,
      hasClaimedReward: async () => true,
      createClaim: async () => ({ conflict: false }),
      incrementRewardClaims: async () => undefined,
    }

    const result = await claimRewardWorkflow({
      repository,
      userId: 'user-1',
      rewardId: 'reward-repeatable',
      availableCoins: 999,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        rewardId: 'reward-repeatable',
      },
    })
  })

  it('blocks avatar reroll when coins are insufficient', async () => {
    const { client } = createMockSupabaseClient({
      rewards: [{ id: 'reward-reroll', title: 'Avatar Reroll', required_points: 100, max_claims: 0, total_claimed: 0, is_active: true, is_system: false, type: 'reveal' }],
      activities: [{ user_id: 'user-1', steps: 50 }],
      user_quests: [],
      point_adjustments: [],
      user_rewards: [],
    })

    const economy = await fetchUserEconomy(client as never, 'user-1')
    const repository = createRewardsRepository(client as never)

    const result = await rerollAvatarWorkflow({
      repository,
      userId: 'user-1',
      availableCoins: economy.availableCoins,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('runs background gacha flow and returns selected background', async () => {
    const { client, tables } = createMockSupabaseClient({
      rewards: [{ id: 'reward-bg', title: 'Background Reroll', required_points: 10, max_claims: 0, total_claimed: 0, is_active: true, is_system: false, type: 'reveal' }],
      activities: [{ user_id: 'user-1', steps: 200 }],
      user_quests: [],
      point_adjustments: [],
      user_rewards: [],
    })

    const economy = await fetchUserEconomy(client as never, 'user-1')
    const repository = createRewardsRepository(client as never)

    const result = await rollBackgroundWorkflow({
      repository,
      userId: 'user-1',
      availableCoins: economy.availableCoins,
      backgrounds: [
        { id: 'default', name: 'Default', gradient: 'x', image: null },
        { id: 'bali', name: 'Bali', gradient: 'y', image: 'img' },
      ],
      random: () => 0,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.background.id).toBe('bali')
    expect(tables.user_rewards).toHaveLength(1)
  })

  it('fails gracefully when a stale reward counter update loses a sold-out race', async () => {
    const voidClaim = vi.fn(async () => undefined)
    const repository = {
      getRewardById: async () => ({
        id: 'reward-1',
        title: 'Voucher',
        description: null,
        image_url: null,
        required_points: 20,
        required_steps: 0,
        max_claims: 1,
        total_claimed: 0,
        is_active: true,
        is_system: false,
        type: 'reveal' as const,
      }),
      getRewardByTitle: async () => null,
      findRewardByTitlePattern: async () => null,
      hasClaimedReward: async () => false,
      createClaim: async () => ({ conflict: false, claimId: 'claim-1' }),
      voidClaim,
      incrementRewardClaims: async () => {
        const error = new Error('reward_sold_out')
        ;(error as Error & { code?: string }).code = '23514'
        throw error
      },
    }

    await expect(
      claimRewardWorkflow({
        repository,
        userId: 'user-1',
        rewardId: 'reward-1',
        availableCoins: 999,
      })
    ).resolves.toEqual({
      ok: false,
      status: 409,
      error: 'Reward sold out',
    })
    expect(voidClaim).toHaveBeenCalledWith('claim-1', 'voided_oversold')
  })

  it('rethrows unexpected limited-reward counter failures without voiding the claim as sold out', async () => {
    const voidClaim = vi.fn(async () => undefined)
    const repository = {
      getRewardById: async () => ({
        id: 'reward-1',
        title: 'Voucher',
        description: null,
        image_url: null,
        required_points: 20,
        required_steps: 0,
        max_claims: 1,
        total_claimed: 0,
        is_active: true,
        is_system: false,
        type: 'reveal' as const,
      }),
      getRewardByTitle: async () => null,
      findRewardByTitlePattern: async () => null,
      hasClaimedReward: async () => false,
      createClaim: async () => ({ conflict: false, claimId: 'claim-1' }),
      voidClaim,
      incrementRewardClaims: async () => {
        throw new Error('connection reset')
      },
    }

    await expect(
      claimRewardWorkflow({
        repository,
        userId: 'user-1',
        rewardId: 'reward-1',
        availableCoins: 999,
      })
    ).rejects.toThrow('connection reset')
    expect(voidClaim).not.toHaveBeenCalled()
  })

  it('allows reveal clues flow even when clue reward record does not exist', async () => {
    const { client, tables } = createMockSupabaseClient({
      rewards: [],
      user_rewards: [],
    })

    const repository = createRewardsRepository(client as never)

    const result = await revealCluesWorkflow({
      repository,
      userId: 'user-1',
      availableCoins: 300,
      price: 200,
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.remainingCoins).toBe(100)
    expect(tables.user_rewards).toHaveLength(0)
  })
})
