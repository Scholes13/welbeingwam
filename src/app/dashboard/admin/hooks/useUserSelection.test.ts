import { describe, expect, it } from 'vitest'

import { computeNextAllSelection, computeNextSingleSelection } from './useUserSelection'

describe('useUserSelection helpers', () => {
  it('selects all ids when not all are selected', () => {
    const next = computeNextAllSelection(['u1'], ['u1', 'u2'])
    expect(next).toEqual(['u1', 'u2'])
  })

  it('clears selection when all ids are selected', () => {
    const next = computeNextAllSelection(['u1', 'u2'], ['u1', 'u2'])
    expect(next).toEqual([])
  })

  it('toggles a single id in and out of selection', () => {
    expect(computeNextSingleSelection(['u1'], 'u2')).toEqual(['u1', 'u2'])
    expect(computeNextSingleSelection(['u1', 'u2'], 'u2')).toEqual(['u1'])
  })
})
