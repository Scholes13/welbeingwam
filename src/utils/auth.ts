import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'

export type Permission = 
  | '*' 
  | 'admin'
  | 'manage_users' 
  | 'manage_points' 
  | 'manage_rewards' 
  | 'manage_quests'
  | 'manage_surveys'
  | 'manage_spots'
  | 'manage_activities'
  | 'view_activity'
  | 'manage_admins'
  | 'manage_content';

type AuthIdentity = {
  id: string
  email?: string | null
}

function extractUsernameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const [username] = email.split('@')
  const normalized = username?.trim()
  return normalized ? normalized : null
}

export async function resolveProfileIdFromAuthUser(user: AuthIdentity): Promise<number | null> {
  if (/^-?\d+$/.test(user.id)) {
    const asNumber = Number(user.id)
    if (Number.isFinite(asNumber)) return asNumber
  }

  const username = extractUsernameFromEmail(user.email)
  if (!username) return null

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1)

  if (error) {
    console.error('Error resolving profile by username:', error)
    return null
  }

  const profile = data?.[0] as { id: number } | undefined
  return profile?.id ?? null
}

export async function getAuthProfileContext() {
  const authUser = await getAuthUser()
  if (!authUser) return null

  const profileId = await resolveProfileIdFromAuthUser({
    id: authUser.id,
    email: authUser.email,
  })

  if (profileId === null) return null

  return {
    authUser,
    profileId,
  }
}

/**
 * Get the currently authenticated user from the Supabase session.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Check if a user has a specific permission.
 * Reads from the `profiles.permissions` JSONB array.
 */
export async function hasPermission(
  userId: string | number,
  requiredPermission: Permission
): Promise<boolean> {
  if (!userId) return false

  const adminClient = createSupabaseAdminClient()
  const { data: user, error } = await adminClient
    .from('profiles')
    .select('permissions, is_admin')
    .eq('id', userId)
    .single()

  if (error || !user) {
    console.error('Error checking permissions:', error)
    return false
  }

  const permissions: string[] = user.permissions || []
  
  if (permissions.includes('*')) return true
  
  return permissions.includes(requiredPermission)
}

/**
 * Verify current user has admin permission.
 * Combines getAuthUser() + hasPermission() in one call.
 * Returns userId on success for convenience.
 */
export async function verifyAdminPermission(
  requiredPermission: Permission
): Promise<{ authorized: boolean; userId?: string; errorResponse?: { error: string } }> {
  const context = await getAuthProfileContext()

  if (!context) {
    return { 
      authorized: false, 
      errorResponse: { error: 'Unauthorized' }
    }
  }

  const authorized = await hasPermission(context.profileId, requiredPermission)
  
  if (!authorized) {
    return { 
      authorized: false, 
      errorResponse: { error: 'Forbidden: Insufficient permissions' }
    }
  }

  return { authorized: true, userId: String(context.profileId) }
}
