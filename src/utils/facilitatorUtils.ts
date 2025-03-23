
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Generates a URL for a facilitator's avatar
 * Follows this priority:
 * 1. URL from the facilitator's profile_picture field if available
 * 2. Custom uploaded avatar from facilitator-avatars bucket if available
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
    
    // FIRST PRIORITY: Use profile_picture field if it's available
    if (facilitator.profile_picture) {
      debugLog('participants', `Checking profile_picture field: ${facilitator.profile_picture}`);
      
      // Case 1: If it's a direct URL that points to the correct bucket
      if (facilitator.profile_picture.includes('facilitator-avatars') && 
          !facilitator.profile_picture.includes('facilitators-avatars')) {
        // Fix any double slashes in the URL
        const cleanUrl = facilitator.profile_picture.replace(/([^:]\/)\/+/g, "$1");
        try {
          const response = await fetch(cleanUrl, { method: 'HEAD' });
          if (response.ok) {
            debugLog('participants', `Using valid profile_picture URL: ${cleanUrl}`);
            return cleanUrl;
          }
        } catch (error) {
          debugLog('participants', `Error validating direct URL: ${error}`);
        }
      }
      
      // Case 2: If it's a URL with the wrong bucket name, fix it
      if (facilitator.profile_picture.includes('facilitators-avatars')) {
        const correctedUrl = facilitator.profile_picture.replace(
          'facilitators-avatars', 
          'facilitator-avatars'
        ).replace(/([^:]\/)\/+/g, "$1"); // Also fix any double slashes
        
        try {
          const response = await fetch(correctedUrl, { method: 'HEAD' });
          if (response.ok) {
            debugLog('participants', `Using corrected profile_picture URL: ${correctedUrl}`);
            return correctedUrl;
          }
        } catch (error) {
          debugLog('participants', `Error validating corrected URL: ${error}`);
        }
      }
      
      // Case 3: If it contains a path but isn't a full URL, try to resolve it
      if (!facilitator.profile_picture.startsWith('http') && 
          (facilitator.profile_picture.includes('facilitator') || 
           facilitator.profile_picture.includes('/'))) {
        try {
          // Extract the file name, handling both path formats
          let fileName = '';
          if (facilitator.profile_picture.includes('/')) {
            // It's a path with slashes
            const parts = facilitator.profile_picture.split('/');
            fileName = parts[parts.length - 1];
          } else {
            // It might just be a filename
            fileName = facilitator.profile_picture;
          }
          
          if (fileName) {
            const { data } = await supabase.storage
              .from('facilitator-avatars')
              .getPublicUrl(fileName);
              
            if (data?.publicUrl) {
              try {
                const response = await fetch(data.publicUrl, { method: 'HEAD' });
                if (response.ok) {
                  debugLog('participants', `Resolved file path to URL: ${data.publicUrl}`);
                  return data.publicUrl;
                }
              } catch (error) {
                debugLog('participants', `Error validating resolved URL: ${error}`);
              }
            }
          }
        } catch (error) {
          debugLog('participants', `Error processing profile_picture path: ${error}`);
        }
      }
    }
    
    // SECOND PRIORITY: Check for avatar in storage using facilitator ID
    if (facilitator.id) {
      try {
        const { data } = await supabase.storage
          .from('facilitator-avatars')
          .getPublicUrl(`${facilitator.id}.jpg`);
        
        if (data?.publicUrl) {
          // Add cache busting to prevent browser caching
          const cacheBustUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
          
          try {
            const response = await fetch(cacheBustUrl, { method: 'HEAD' });
            if (response.ok) {
              debugLog('participants', `Found avatar by ID: ${cacheBustUrl}`);
              return cacheBustUrl;
            }
          } catch (error) {
            debugLog('participants', `Error checking ID-based avatar: ${error}`);
          }
        }
      } catch (error) {
        debugLog('participants', `Error getting ID-based public URL: ${error}`);
      }
    }
    
    // THIRD PRIORITY: Fall back to generated avatar
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
 * Returns true if the URL resolves to a valid image
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
    
    // Ensure we return a boolean by using a separate check for file extension
    const hasImageExtension = url.match(/\.(jpg|jpeg|png|gif|svg)$/i) !== null;
    const isValid = response.ok && 
      (response.headers.get('content-type')?.includes('image') || hasImageExtension);
    
    debugLog('participants', `URL validation result for ${url}: ${isValid}`);
    return isValid;
  } catch (error) {
    debugLog('participants', `URL validation error for ${url}:`, error);
    return false;
  }
};
