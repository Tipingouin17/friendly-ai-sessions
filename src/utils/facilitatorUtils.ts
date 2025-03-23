
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
      
      // If it's already a complete URL, use it directly
      if (facilitator.profile_picture.startsWith('http') || facilitator.profile_picture.startsWith('/')) {
        try {
          // Fix any issues with URLs that might have double slashes
          const cleanUrl = facilitator.profile_picture.replace('//facilitators-avatars/', '/facilitator-avatars/');
          
          const response = await fetch(cleanUrl, { method: 'HEAD' });
          if (response.ok) {
            debugLog('participants', `Using valid profile_picture URL: ${cleanUrl}`);
            return cleanUrl;
          } else {
            debugLog('participants', `profile_picture URL validation failed: ${cleanUrl}`);
          }
        } catch (error) {
          debugLog('participants', `Error validating profile_picture URL: ${error}`);
        }
      }
      
      // If it's a storage path reference, convert it to a public URL
      if (facilitator.profile_picture.includes('facilitator')) {
        try {
          // Extract the bucket name and file path correctly
          const urlParts = facilitator.profile_picture.split('/');
          const bucketIndex = urlParts.findIndex(part => 
            part === 'facilitator-avatars' || part === 'facilitators-avatars'
          );
          
          if (bucketIndex >= 0) {
            const bucketName = 'facilitator-avatars'; // Use the correct bucket name
            const fileName = urlParts.slice(bucketIndex + 1).join('/').replace(/^\/+/, '');
            
            if (fileName) {
              const { data } = await supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
                
              if (data?.publicUrl) {
                try {
                  const response = await fetch(data.publicUrl, { method: 'HEAD' });
                  if (response.ok) {
                    debugLog('participants', `Using storage reference in profile_picture: ${data.publicUrl}`);
                    return data.publicUrl;
                  }
                } catch (error) {
                  debugLog('participants', `Error validating storage URL: ${error}`);
                }
              }
            }
          }
        } catch (error) {
          debugLog('participants', `Error processing profile_picture storage path: ${facilitator.profile_picture}`, error);
        }
      }
    }
    
    // SECOND PRIORITY: Check for custom avatar in the storage bucket by ID
    if (facilitator.id) {
      debugLog('participants', `Checking facilitator-avatars bucket for ID: ${facilitator.id}`);
      
      try {
        // Get the public URL for the facilitator's avatar using their ID
        const { data } = await supabase.storage
          .from('facilitator-avatars')
          .getPublicUrl(`${facilitator.id}.jpg`);
        
        if (data?.publicUrl) {
          debugLog('participants', `Found avatar in facilitator-avatars bucket: ${data.publicUrl}`);
          
          // Add a cache-busting parameter to avoid browser caching issues
          const cacheBustUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
          
          // Try to fetch the image to verify it exists
          try {
            const response = await fetch(cacheBustUrl, { method: 'HEAD' });
            if (response.ok) {
              debugLog('participants', `Avatar URL validated successfully: ${cacheBustUrl}`);
              return cacheBustUrl;
            } else {
              debugLog('participants', `Avatar not found for facilitator ${facilitator.id} (status: ${response.status})`);
            }
          } catch (fetchError) {
            debugLog('participants', `Error fetching avatar: ${fetchError}`);
          }
        }
      } catch (error) {
        debugLog('participants', `Error getting public URL for facilitator ${facilitator.id}:`, error);
      }
    }
    
    // THIRD PRIORITY: Generate an avatar based on title or ID
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
