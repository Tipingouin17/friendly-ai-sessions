
import { User } from '@supabase/supabase-js';

export const getUserName = (user: User | null): string => {
  if (!user) return '';
  
  // Try different places where the name might be stored
  const name = 
    user.user_metadata?.name ||
    user.raw_user_meta_data?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User';
    
  return name;
};

export const getUserDisplayName = (user: User | null): string => {
  const name = getUserName(user);
  return name === 'User' && user?.email ? user.email.split('@')[0] : name;
};
