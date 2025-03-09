
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar from the facilitators-avatars bucket
 * Falls back to placeholder if no ID is provided
 */
export const getFacilitatorAvatarUrl = (facilitatorId: number | undefined): string => {
  if (!facilitatorId) {
    return '/placeholder.svg';
  }
  
  const { data } = supabase.storage
    .from('facilitators-avatars')
    .getPublicUrl(`${facilitatorId}.jpg`);
  
  console.log('Generated avatar URL:', data.publicUrl);
  return data.publicUrl;
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  console.log('Image load error, using fallback');
  e.currentTarget.src = '/placeholder.svg';
};
