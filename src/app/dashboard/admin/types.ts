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

export type AdminSportSession = {
  id: string | number
  user_id: string
  name: string | null
  type: string | null
  start_date: string | null
  calories: number | null
  distance: number | null
  activity_points: number | null
  has_calories?: boolean | null
  proof_url: string | null
  review_status: string | null
  review_reason: string | null
  source: string | null
  profile:
    | {
        full_name: string | null
        username: string | null
        avatar_url: string | null
      }
    | null
  [key: string]: unknown
}
