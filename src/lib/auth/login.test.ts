import { describe, expect, it } from 'vitest'

import { resolveLoginCredentials } from './login'

describe('resolveLoginCredentials', () => {
  it('uses form data values when browser autofill is present', () => {
    const formData = new FormData()
    formData.set('username', 'Pramuji')
    formData.set('password', 'secret123')

    const result = resolveLoginCredentials(formData, {
      username: '',
      password: '',
    })

    expect(result).toEqual({
      username: 'Pramuji',
      password: 'secret123',
    })
  })

  it('falls back to state values when form data fields are missing', () => {
    const formData = new FormData()

    const result = resolveLoginCredentials(formData, {
      username: 'stored-user',
      password: 'stored-pass',
    })

    expect(result).toEqual({
      username: 'stored-user',
      password: 'stored-pass',
    })
  })

  it('trims username but keeps password as entered', () => {
    const formData = new FormData()
    formData.set('username', '  user-one  ')
    formData.set('password', '  pass with spaces  ')

    const result = resolveLoginCredentials(formData, {
      username: '',
      password: '',
    })

    expect(result).toEqual({
      username: 'user-one',
      password: '  pass with spaces  ',
    })
  })
})
