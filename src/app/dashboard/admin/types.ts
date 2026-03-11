export type AdminUser = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  access_code: string | null
  [key: string]: unknown
}

export type AdminReward = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  required_points: number
  required_steps: number
  max_claims: number
  total_claimed: number
  is_active: boolean
  type: string | null
  [key: string]: unknown
}
