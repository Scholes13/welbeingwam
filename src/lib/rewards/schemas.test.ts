import { describe, expect, it } from 'vitest'

import {
  parseAdminCreateRewardInput,
  parseAdminUpdateRewardInput,
  parseClaimRewardInput,
} from './schemas'

describe('rewards request schemas', () => {
  it('accepts valid claim payload', () => {
    const parsed = parseClaimRewardInput({ rewardId: 'reward-1' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.rewardId).toBe('reward-1')
    }
  })

  it('rejects empty reward id', () => {
    const parsed = parseClaimRewardInput({ rewardId: '' })
    expect(parsed.success).toBe(false)
  })

  it('accepts valid admin create payload', () => {
    const parsed = parseAdminCreateRewardInput({
      title: 'Reward',
      description: 'Desc',
      image_url: '',
      required_points: 100,
      required_steps: 1000,
      max_claims: 10,
      type: 'reveal',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects invalid admin create payload', () => {
    const parsed = parseAdminCreateRewardInput({
      title: '',
      description: '',
      required_points: -1,
      required_steps: -1,
      max_claims: -1,
      type: 'invalid',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts valid admin update payload', () => {
    const parsed = parseAdminUpdateRewardInput({
      id: 'reward-1',
      title: 'Reward Updated',
      description: 'Desc',
      image_url: null,
      required_points: '120',
      required_steps: '1000',
      max_claims: '0',
      type: 'progress',
    })

    expect(parsed.success).toBe(true)
  })
})
