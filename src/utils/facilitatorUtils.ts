
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Generates a URL for a facilitator's avatar
 * Follows this priority:
 * 1. Custom uploaded avatar from facilitator-avatars bucket if available
 * 2. URL from the facilitator's profile_picture field if available
 * 3. Default placeholder as fallback
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    debugLog('participants', 'No facilitator data provided, returning placeholder');
    return '/placeholder.svg';
  }
  
  try {
    debugLog('participants', `Getting avatar URL for facilitator: ${facilitator.id}`, facilitator);
    
    // If a profile_picture is directly provided and it's a complete URL, use it
    if (facilitator.profile_picture) {
      debugLog('participants', `Facilitator has profile_picture: ${facilitator.profile_picture}`);
      
      // If it's already a complete URL, use it directly
      if (facilitator.profile_picture.startsWith('http') || facilitator.profile_picture.startsWith('/')) {
        return facilitator.profile_picture;
      }
    }
    
    // If we have a facilitator ID, check for custom avatar in the storage bucket
    if (facilitator.id) {
      debugLog('participants', `Checking facilitator-avatars bucket for ID: ${facilitator.id}`);
      
      try {
        // IMPORTANT: Using 'facilitator-avatars' consistently across the application
        const { data } = await supabase.storage
          .from('facilitator-avatars')
          .getPublicUrl(`${facilitator.id}.jpg`);
        
        if (data?.publicUrl) {
          debugLog('participants', `Found avatar in facilitator-avatars bucket: ${data.publicUrl}`);
          // Verify the URL is valid before returning it
          const isValid = await validateImageUrl(data.publicUrl);
          if (isValid) {
            return data.publicUrl;
          } else {
            debugLog('participants', `Avatar URL validation failed for: ${data.publicUrl}`);
          }
        }
      } catch (error) {
        debugLog('participants', `Error getting public URL for facilitator ${facilitator.id}:`, error);
      }
      
      debugLog('participants', `No avatar found in facilitator-avatars bucket for facilitator ${facilitator.id}`);
    }
    
    // Generate an avatar based on title or ID as last resort
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const fallbackUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
    debugLog('participants', `Using generated avatar: ${fallbackUrl}`);
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
  debugLog('participants', `Avatar image error, setting fallback for: ${e.currentTarget.src}`);
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * Validates if an image URL exists and is accessible
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url || url === '/placeholder.svg') return false;
  
  try {
    debugLog('participants', `Validating image URL: ${url}`);
    // Use a timeout to prevent hanging on unresponsive URLs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const isValid = response.ok;
    debugLog('participants', `URL validation result for ${url}: ${isValid}`);
    return isValid;
  } catch (error) {
    debugLog('participants', `URL validation error for ${url}:`, error);
    return false;
  }
};
