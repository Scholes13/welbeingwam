import { describe, expect, it } from 'vitest'
import { resolveDominantDimension } from './dimension-mapper'

describe('resolveDominantDimension', () => {
  it('combines quiz, activity, and attendance dimensions with weighted scoring', () => {
    const result = resolveDominantDimension({
      quizDimensions: { mental: 82, physical: 40 },
      activityDimensions: { physical: 70 },
      attendanceDimensions: { social: 20 },
    })

    expect(result.dimension).toBe('physical')
    expect(result.score).toBe(41)
  })

  it('returns unknown when all inputs are empty', () => {
    const result = resolveDominantDimension({
      quizDimensions: {},
      activityDimensions: {},
      attendanceDimensions: {},
    })

    expect(result.dimension).toBe('unknown')
    expect(result.score).toBe(0)
  })

  it('handles single dimension source', () => {
    const result = resolveDominantDimension({
      quizDimensions: { physical: 90 },
      activityDimensions: {},
      attendanceDimensions: {},
    })

    expect(result.dimension).toBe('physical')
  })
})
