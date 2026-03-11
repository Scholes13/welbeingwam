export type LoginCredentials = {
  username: string
  password: string
}

export function resolveLoginCredentials(formData: FormData, fallback: LoginCredentials): LoginCredentials {
  const username = String(formData.get('username') ?? fallback.username).trim()
  const password = String(formData.get('password') ?? fallback.password)

  return {
    username,
    password,
  }
}
