import { describe, expect, it } from 'vitest'

import { getMissingDefaultTopCategories } from './activityTypeDefaults'

describe('activityTypeDefaults helpers', () => {
  it('returns only missing default top-level categories', () => {
    const types = [
      { id: '1', name: 'Internal Activity', parent_type_id: null },
      { id: '2', name: 'Badminton', parent_type_id: '1' },
    ]

    expect(getMissingDefaultTopCategories(types)).toEqual(['External Activity', 'Community Activity'])
  })
})
