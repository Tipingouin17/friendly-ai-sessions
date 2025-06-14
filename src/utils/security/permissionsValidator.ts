
/**
 * User permissions validation utilities
 */

/**
 * Validate user permissions for sensitive operations
 */
export const validateUserPermissions = async (
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'user' = 'user'
): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (!profile) return false;
    
    // Role hierarchy: admin > moderator > user
    const roleHierarchy = { admin: 3, moderator: 2, user: 1 };
    const userLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];
    
    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Error validating user permissions:', error);
    return false;
  }
};
