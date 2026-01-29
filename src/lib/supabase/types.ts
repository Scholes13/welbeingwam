// Database types for City Tour Map

export interface Participant {
  id: string
  code: string
  name: string
  profile_photo_url: string | null
  total_points: number
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon_url: string | null
  color: string
  sort_order: number
  created_at: string
}

export interface QuestSpot {
  id: string
  name: string
  description: string | null
  location: string // PostGIS geography stored as string
  radius: number
  points: number
  category_id: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  participant_id: string
  spot_id: string
  photo_url: string | null
  points_earned: number
  checked_in_at: string
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  badge_type: 'category_streak' | 'speed_demon' | 'completion'
  category_id: string | null
  bonus_points: number
  created_at: string
}

export interface ParticipantBadge {
  id: string
  participant_id: string
  badge_id: string
  earned_at: string
}

export interface TourSession {
  id: string
  name: string
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export interface Setting {
  key: string
  value: any // JSONB
  updated_at: string
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      participants: {
        Row: Participant
        Insert: Omit<Participant, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Participant, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      quest_spots: {
        Row: QuestSpot
        Insert: Omit<QuestSpot, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<QuestSpot, 'id' | 'created_at'>>
      }
      visits: {
        Row: Visit
        Insert: Omit<Visit, 'id' | 'checked_in_at'> & {
          id?: string
          checked_in_at?: string
        }
        Update: Partial<Omit<Visit, 'id' | 'checked_in_at'>>
      }
      badges: {
        Row: Badge
        Insert: Omit<Badge, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Badge, 'id' | 'created_at'>>
      }
      participant_badges: {
        Row: ParticipantBadge
        Insert: Omit<ParticipantBadge, 'id' | 'earned_at'> & {
          id?: string
          earned_at?: string
        }
        Update: Partial<Omit<ParticipantBadge, 'id' | 'earned_at'>>
      }
      tour_sessions: {
        Row: TourSession
        Insert: Omit<TourSession, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<TourSession, 'id' | 'created_at'>>
      }
      settings: {
        Row: Setting
        Insert: Setting
        Update: Partial<Omit<Setting, 'key'>>
      }
    }
  }
}
