
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar from the facilitators-avatars bucket
 * Falls back to placeholder if no ID is provided
 */
export const getFacilitatorAvatarUrl = (facilitatorId: number | undefined): string => {
  if (!facilitatorId) {
    console.log('No facilitator ID provided, using placeholder');
    return '/placeholder.svg';
  }
  
  try {
    const { data } = supabase.storage
      .from('facilitators-avatars')
      .getPublicUrl(`${facilitatorId}.jpg`);
    
    console.log(`Generated avatar URL for facilitator ${facilitatorId}:`, data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error(`Error generating avatar URL for facilitator ${facilitatorId}:`, error);
    return '/placeholder.svg';
  }
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  console.log(`Image load error for ${e.currentTarget.src}, using fallback`);
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * Validates if an image at a URL exists
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};
