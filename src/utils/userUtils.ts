/**
 * user Utils
 *
 * Utility for the AIfacilitator application.
 */

import { ApiUser } from '@/lib/api';

export const getUserName = (user: ApiApiUser | null): string => {
  if (!user) return '';
  
  // Try different places where the name might be stored
  const name = 
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'User';
    
  return name;
};

export const getUserDisplayName = (user: ApiApiUser | null): string => {
  const name = getUserName(user);
  return name === 'User' && user?.email ? user.email.split('@')[0] : name;
};
