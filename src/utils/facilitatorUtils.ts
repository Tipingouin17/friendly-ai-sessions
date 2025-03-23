
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Gets a facilitator's avatar URL with simplified and robust fallback logic
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    return '/placeholder.svg';
  }
  
  try {
    // Case 1: If profile_picture exists and appears to be a valid URL, use it directly
    if (facilitator.profile_picture) {
      let url = facilitator.profile_picture;
      
      // Fix incorrect bucket name if present (facilitators-avatars → facilitator-avatars)
      if (url.includes('facilitators-avatars')) {
        url = url.replace('facilitators-avatars', 'facilitator-avatars');
      }
      
      // Clean up any double slashes in the URL (except after protocol)
      url = url.replace(/([^:]\/)\/+/g, "$1");
      
      // Remove any double slashes between bucket and filename
      if (url.includes('//')) {
        url = url.replace('//', '/');
      }
      
      console.log('Using facilitator avatar URL:', url);
      return url;
    }
    
    // Case 2: Try to generate a URL from the facilitator ID
    if (facilitator.id) {
      const { data } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (data?.publicUrl) {
        console.log('Generated public URL for facilitator:', data.publicUrl);
        return data.publicUrl;
      }
    }
    
    // Case 3: Fall back to a generated avatar
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const fallbackUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
    console.log('Using fallback avatar URL:', fallbackUrl);
    return fallbackUrl;
  } catch (error) {
    console.error('Error generating avatar URL:', error);
    return '/placeholder.svg';
  }
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  console.log('Avatar image error, using placeholder');
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * A simple check if the URL is for an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|svg)$/i) !== null || 
         url.includes('/api/avatar') ||
         url.includes('facilitator-avatars');
};
