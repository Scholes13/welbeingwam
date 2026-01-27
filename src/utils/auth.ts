import { SupabaseClient } from '@supabase/supabase-js';

export type Permission = 
  | '*' 
  | 'manage_users' 
  | 'manage_points' 
  | 'manage_rewards' 
  | 'view_activity'
  | 'manage_admins'
  | 'manage_content';

export async function hasPermission(
  supabase: SupabaseClient, 
  userId: string, 
  requiredPermission: Permission
): Promise<boolean> {
  if (!userId) return false;

  const { data: user, error } = await supabase
    .from('profiles')
    .select('permissions, is_admin')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error checking permissions:', error);
    return false;
  }

  // Legacy support or fallback: if checks pass, good.
  // We strictly check permissions array now.

  const permissions: string[] = user.permissions || [];
  
  if (permissions.includes('*')) return true;
  
  return permissions.includes(requiredPermission);
}

export async function verifyAdminPermission(
    supabase: SupabaseClient,
    userId: string,
    requiredPermission: Permission
): Promise<{ authorized: boolean; errorResponse?: any }> {
    const authorized = await hasPermission(supabase, userId, requiredPermission);
    
    if (!authorized) {
        return { 
            authorized: false, 
            errorResponse: { error: 'Forbidden: Insufficient permissions' } // Plain object, caller wraps in NextResponse or uses status logic
        };
    }

    return { authorized: true };
}
