import { describe, expect, it } from 'vitest'

import {
  buildWellbeingPath,
  formatAppliedRange,
  formatDimensionLabel,
  isCustomRangeComplete,
} from './utils'

describe('wellbeing utils', () => {
  it('builds a period query for standard windows', () => {
    expect(buildWellbeingPath('/api/admin/wellbeing/overview', {
      period: '30D',
      startDate: '',
      endDate: '',
    })).toBe('/api/admin/wellbeing/overview?period=30D')
  })

  it('blocks custom requests until both dates exist', () => {
    expect(isCustomRangeComplete({
      period: 'Custom',
      startDate: '2026-03-01',
      endDate: '',
    })).toBe(false)

    expect(buildWellbeingPath('/api/admin/wellbeing/overview', {
      period: 'Custom',
      startDate: '2026-03-01',
      endDate: '',
    })).toBeNull()
  })

  it('formats custom ranges and lifetime labels', () => {
    expect(formatAppliedRange({
      appliedPeriod: 'Custom',
      periodStart: '2026-03-01T00:00:00.000Z',
      periodEnd: '2026-03-31T00:00:00.000Z',
      priorPeriodStart: null,
      priorPeriodEnd: null,
      warnings: [],
    })).toContain('2026')

    expect(formatAppliedRange({
      appliedPeriod: 'Lifetime',
      periodStart: null,
      periodEnd: '2026-03-31T00:00:00.000Z',
      priorPeriodStart: null,
      priorPeriodEnd: null,
      warnings: [],
    })).toContain('Lifetime until')
  })

  it('normalizes dimension labels for cards and tables', () => {
    expect(formatDimensionLabel('physical')).toBe('Physical')
    expect(formatDimensionLabel('social_connection')).toBe('Social Connection')
    expect(formatDimensionLabel('unknown')).toBe('Unknown')
  })
})
