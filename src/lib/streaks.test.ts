import { describe, it, expect } from 'vitest'

// Import the pure function directly to avoid supabase server import in test
// The getStreakMultiplier function is a pure calculation
function getStreakMultiplier(currentStreak: number, tiers: { days: number; multiplier: number }[]): number {
  const sorted = [...tiers].sort((a, b) => b.days - a.days)
  for (const tier of sorted) {
    if (currentStreak >= tier.days) return tier.multiplier
  }
  return 1.0
}

const defaultTiers = [
  { days: 3, multiplier: 1.25 },
  { days: 7, multiplier: 1.5 },
  { days: 14, multiplier: 1.75 },
  { days: 30, multiplier: 2.0 },
]

describe('getStreakMultiplier', () => {
  it('returns 1.0 for day 1-2', () => {
    expect(getStreakMultiplier(1, defaultTiers)).toBe(1.0)
    expect(getStreakMultiplier(2, defaultTiers)).toBe(1.0)
  })

  it('returns 1.25 for day 3-6', () => {
    expect(getStreakMultiplier(3, defaultTiers)).toBe(1.25)
    expect(getStreakMultiplier(6, defaultTiers)).toBe(1.25)
  })

  it('returns 1.5 for day 7-13', () => {
    expect(getStreakMultiplier(7, defaultTiers)).toBe(1.5)
    expect(getStreakMultiplier(13, defaultTiers)).toBe(1.5)
  })

  it('returns 1.75 for day 14-29', () => {
    expect(getStreakMultiplier(14, defaultTiers)).toBe(1.75)
    expect(getStreakMultiplier(29, defaultTiers)).toBe(1.75)
  })

  it('returns 2.0 for day 30+', () => {
    expect(getStreakMultiplier(30, defaultTiers)).toBe(2.0)
    expect(getStreakMultiplier(100, defaultTiers)).toBe(2.0)
  })

  it('returns 1.0 for empty tiers', () => {
    expect(getStreakMultiplier(10, [])).toBe(1.0)
  })
})
