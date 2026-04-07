import { describe, expect, it } from 'vitest'
import { parseWellbeingPeriod } from './period-filter'

describe('parseWellbeingPeriod', () => {
  it('defaults to 30D when no query params are provided', () => {
    const result = parseWellbeingPeriod(new URLSearchParams())
    expect(result.kind).toBe('30D')
    expect(result.start).toBeInstanceOf(Date)
    expect(result.end).toBeInstanceOf(Date)
  })

  it('parses 7D period correctly', () => {
    const result = parseWellbeingPeriod(new URLSearchParams({ period: '7D' }))
    expect(result.kind).toBe('7D')
    expect(result.start).toBeInstanceOf(Date)
  })

  it('parses 90D period correctly', () => {
    const result = parseWellbeingPeriod(new URLSearchParams({ period: '90D' }))
    expect(result.kind).toBe('90D')
  })

  it('builds a custom range when startDate and endDate are valid', () => {
    const result = parseWellbeingPeriod(new URLSearchParams({
      period: 'Custom',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    }))

    expect(result.kind).toBe('Custom')
    expect(result.start?.toISOString()).toContain('2026-03-01')
    expect(result.end.toISOString()).toContain('2026-03-31')
  })

  it('throws on invalid custom range', () => {
    expect(() => parseWellbeingPeriod(new URLSearchParams({ period: 'Custom' }))).toThrow()
  })

  it('handles Lifetime period', () => {
    const result = parseWellbeingPeriod(new URLSearchParams({ period: 'Lifetime' }))
    expect(result.kind).toBe('Lifetime')
    expect(result.start).toBeNull()
  })
})

