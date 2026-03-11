import { describe, expect, it } from 'vitest'

import {
  calculateAvailableCoins,
  calculateTotalEarnedPoints,
  convertActivityPoints,
  convertStepsToPoints,
} from './points'

describe('points conversion', () => {
  it('converts 100 steps to 10 points', () => {
    expect(convertStepsToPoints(100)).toBe(10)
  })

  it('rounds down fractional step buckets', () => {
    expect(convertStepsToPoints(109)).toBe(10)
    expect(convertStepsToPoints(110)).toBe(11)
  })

  it('handles invalid step input as 0', () => {
    expect(convertStepsToPoints(-50)).toBe(0)
    expect(convertStepsToPoints(Number.NaN)).toBe(0)
  })

  it('keeps sport calories as one-to-one activity points', () => {
    expect(convertActivityPoints(120)).toBe(120)
    expect(convertActivityPoints(-50)).toBe(0)
  })
})

describe('coin totals', () => {
  it('adds step points, activity points, quest points, and adjustment points', () => {
    const total = calculateTotalEarnedPoints({
      totalSteps: 100,
      totalActivityPoints: 120,
      questPoints: 45,
      adjustmentPoints: 5,
    })

    expect(total).toBe(180)
  })

  it('subtracts spent coins from total earned', () => {
    expect(calculateAvailableCoins({ totalEarned: 60, totalSpent: 20 })).toBe(40)
  })
})
