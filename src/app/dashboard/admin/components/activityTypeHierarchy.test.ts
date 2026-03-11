import { describe, expect, it } from 'vitest'

import {
  formatActivityTypeOptionLabel,
  getChildActivityTypes,
  getTopLevelActivityTypes,
  resolveInitialActivityTypeSelection,
  resolveTypeBadgeLabel,
} from './activityTypeHierarchy'

const sampleTypes = [
  { id: 'p1', name: 'Internal Activity', parent_type_id: null, is_active: true },
  { id: 'p2', name: 'External Activity', parent_type_id: null, is_active: true },
  { id: 'c1', name: 'Badminton', parent_type_id: 'p1', is_active: true },
  { id: 'c2', name: 'Basketball', parent_type_id: 'p1', is_active: true },
]

describe('activityTypeHierarchy helpers', () => {
  it('resolves initial activity type to internal parent and its first child', () => {
    expect(resolveInitialActivityTypeSelection(sampleTypes)).toEqual({
      parentTypeId: 'p1',
      typeId: 'c1',
    })
  })

  it('returns top-level and child type partitions', () => {
    expect(getTopLevelActivityTypes(sampleTypes).map((item) => item.id)).toEqual(['p1', 'p2'])
    expect(getChildActivityTypes(sampleTypes, 'p1').map((item) => item.id)).toEqual(['c1', 'c2'])
  })

  it('builds category/subcategory label from selected type id', () => {
    expect(resolveTypeBadgeLabel('c1', sampleTypes)).toEqual({
      category: 'Internal Activity',
      subcategory: 'Badminton',
    })
    expect(resolveTypeBadgeLabel('p2', sampleTypes)).toEqual({
      category: 'External Activity',
      subcategory: null,
    })
  })

  it('formats filter option labels using hierarchy', () => {
    expect(formatActivityTypeOptionLabel(sampleTypes[2], sampleTypes)).toBe('Internal Activity / Badminton')
    expect(formatActivityTypeOptionLabel(sampleTypes[1], sampleTypes)).toBe('External Activity')
  })
})
