import { describe, expect, it } from 'vitest'

import { buildActivityTypePayload, shouldSubmitActivityTypeByKey } from './activityTypeForm'

describe('activityTypeForm helpers', () => {
  it('returns null when type name is empty after trim', () => {
    expect(buildActivityTypePayload('   ', 'Internal')).toBeNull()
  })

  it('builds payload with trimmed name and optional description', () => {
    expect(buildActivityTypePayload(' Internal Activity ', '  For staff only  ', 'parent-1')).toEqual({
      name: 'Internal Activity',
      description: 'For staff only',
      parentTypeId: 'parent-1',
    })

    expect(buildActivityTypePayload('Main Stage', '   ')).toEqual({
      name: 'Main Stage',
      description: null,
      parentTypeId: null,
    })
  })

  it('submits activity type form only on Enter key', () => {
    expect(shouldSubmitActivityTypeByKey('Enter')).toBe(true)
    expect(shouldSubmitActivityTypeByKey('NumpadEnter')).toBe(true)
    expect(shouldSubmitActivityTypeByKey('Escape')).toBe(false)
    expect(shouldSubmitActivityTypeByKey('a')).toBe(false)
  })
})
