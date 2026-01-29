import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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

/**
 * Get current participant from session cookie
 * Returns null if not authenticated
 */
export async function getCurrentParticipant(): Promise<Participant | null> {
  try {
    const cookieStore = await cookies()
    const participantId = cookieStore.get('participant_id')?.value

    if (!participantId) {
      return null
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single()

    if (error || !data) {
      return null
    }

    return data as Participant
  } catch {
    return null
  }
}

/**
 * Verify if current user is an admin
 * Returns the participant if admin, null otherwise
 */
export async function verifyAdmin(): Promise<Participant | null> {
  const participant = await getCurrentParticipant()
  
  if (!participant || !participant.is_admin) {
    return null
  }

  return participant
}

/**
 * Get participant ID from cookie (for quick checks)
 */
export async function getParticipantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('participant_id')?.value || null
  } catch {
    return null
  }
}
