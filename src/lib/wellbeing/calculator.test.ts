import { describe, expect, it } from 'vitest'
import { calculateWellbeingIndex } from './calculator'

describe('calculateWellbeingIndex', () => {
  it('combines quiz, sport, attendance, and other scores using the approved weights', () => {
    const result = calculateWellbeingIndex({
      quizScore: 80,
      sportScore: 60,
      attendanceScore: 50,
      otherScore: 40,
    })

    expect(result).toBe(63)
  })

  it('handles all zeros', () => {
    const result = calculateWellbeingIndex({
      quizScore: 0,
      sportScore: 0,
      attendanceScore: 0,
      otherScore: 0,
    })

    expect(result).toBe(0)
  })

  it('handles perfect scores', () => {
    const result = calculateWellbeingIndex({
      quizScore: 100,
      sportScore: 100,
      attendanceScore: 100,
      otherScore: 100,
    })

    expect(result).toBe(100)
  })
})
