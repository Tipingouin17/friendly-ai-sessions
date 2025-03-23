
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Gets a facilitator's avatar URL with simplified fallback logic
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    return '/placeholder.svg';
  }
  
  try {
    // Case 1: If profile_picture exists and appears to be a valid URL, use it directly
    if (facilitator.profile_picture) {
      // Apply URL normalization to ensure consistency
      return normalizeFacilitatorAvatarUrl(facilitator.profile_picture);
    }
    
    // Case 2: Try to generate a URL from the facilitator ID
    if (facilitator.id) {
      const { data } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (data?.publicUrl) {
        debugLog('all', `Generated storage URL for facilitator ${facilitator.id}: ${data.publicUrl}`);
        return normalizeFacilitatorAvatarUrl(data.publicUrl);
      }
    }
    
    // Case 3: Fall back to a generated avatar
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const fallbackUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
    debugLog('all', `Using fallback avatar for facilitator: ${fallbackUrl}`);
    return fallbackUrl;
  } catch (error) {
    console.error('Error generating avatar URL:', error);
    return '/placeholder.svg';
  }
};

/**
 * Normalizes a facilitator avatar URL to fix common issues
 */
export const normalizeFacilitatorAvatarUrl = (url: string): string => {
  if (!url) return '/placeholder.svg';
  
  try {
    // Fix incorrect bucket name if present (facilitators-avatars → facilitator-avatars)
    let correctedUrl = url.includes('facilitators-avatars') 
      ? url.replace('facilitators-avatars', 'facilitator-avatars')
      : url;
    
    // Clean up any double slashes in the URL (except after protocol)
    correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, "$1");
    
    // Ensure full URL for relative paths that aren't API routes
    if (correctedUrl.startsWith('/') && !correctedUrl.startsWith('/api/')) {
      const baseUrl = window.location.origin;
      correctedUrl = `${baseUrl}${correctedUrl}`;
    }
    
    return correctedUrl;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url; // Return original URL if normalization fails
  }
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * A simple check if the URL is for an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  return url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null || 
         url.includes('/api/avatar') ||
         url.includes('facilitator-avatars') || 
         url.includes('facilitators-avatars') ||
         url.includes('supabase.co/storage');
};
