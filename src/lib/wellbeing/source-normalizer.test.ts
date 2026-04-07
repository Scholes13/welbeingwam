import { describe, expect, it } from 'vitest'
import { normalizeCoverageScore, normalizeCountScore } from './source-normalizer'

describe('normalizeCoverageScore', () => {
  it('clamps ratios into a 0-100 score', () => {
    expect(normalizeCoverageScore(1.2)).toBe(100)
    expect(normalizeCoverageScore(0.45)).toBe(45)
    expect(normalizeCoverageScore(0)).toBe(0)
  })

  it('handles negative values', () => {
    expect(normalizeCoverageScore(-0.5)).toBe(0)
  })
})

describe('normalizeCountScore', () => {
  it('caps action counts at the configured healthy target', () => {
    expect(normalizeCountScore({ count: 12, target: 8 })).toBe(100)
    expect(normalizeCountScore({ count: 2, target: 8 })).toBe(25)
    expect(normalizeCountScore({ count: 8, target: 8 })).toBe(100)
  })

  it('handles zero target safely', () => {
    expect(normalizeCountScore({ count: 5, target: 0 })).toBe(0)
  })

  it('handles zero count', () => {
    expect(normalizeCountScore({ count: 0, target: 10 })).toBe(0)
  })
})
