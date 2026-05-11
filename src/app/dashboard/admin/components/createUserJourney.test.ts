import { describe, expect, it, vi } from 'vitest'

import { applyCreateUserSuccess } from './createUserJourney'

describe('createUserJourney helpers', () => {
  it('resets form, closes modal, refreshes users, and shows success feedback', () => {
    const setFormData = vi.fn()
    const setIsModalOpen = vi.fn()
    const fetchUsers = vi.fn()
    const success = vi.fn()

    applyCreateUserSuccess({ setFormData, setIsModalOpen, fetchUsers, success })

    expect(setFormData).toHaveBeenCalledWith({ username: '', password: '', fullName: '', gender: '' })
    expect(setIsModalOpen).toHaveBeenCalledWith(false)
    expect(fetchUsers).toHaveBeenCalledTimes(1)
    expect(success).toHaveBeenCalledWith('User created successfully')
  })
})
