import { describe, expect, it } from 'vitest'

import { parsePositiveIntegerInput } from './settings'

describe('parsePositiveIntegerInput', () => {
  it('returns parsed positive integers from string inputs', () => {
    expect(parsePositiveIntegerInput('15', 5)).toBe(15)
    expect(parsePositiveIntegerInput('30', 5)).toBe(30)
  })

  it('falls back when the input is empty, invalid, or non-positive', () => {
    expect(parsePositiveIntegerInput('', 15)).toBe(15)
    expect(parsePositiveIntegerInput('abc', 15)).toBe(15)
    expect(parsePositiveIntegerInput('0', 15)).toBe(15)
    expect(parsePositiveIntegerInput('-3', 15)).toBe(15)
  })
})
