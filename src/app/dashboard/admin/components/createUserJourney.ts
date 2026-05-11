export type CreateUserFormData = {
  username: string
  password: string
  fullName: string
  gender: string
}

export function getEmptyCreateUserFormData(): CreateUserFormData {
  return { username: '', password: '', fullName: '', gender: '' }
}

type ApplyCreateUserSuccessOptions = {
  setFormData: (formData: CreateUserFormData) => void
  setIsModalOpen: (isOpen: boolean) => void
  fetchUsers: () => void
  success: (message: string) => void
}

export function applyCreateUserSuccess({
  setFormData,
  setIsModalOpen,
  fetchUsers,
  success,
}: ApplyCreateUserSuccessOptions) {
  setFormData(getEmptyCreateUserFormData())
  setIsModalOpen(false)
  fetchUsers()
  success('User created successfully')
}
