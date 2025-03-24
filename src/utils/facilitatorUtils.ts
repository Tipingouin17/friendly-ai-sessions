
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";

/**
 * Gets a facilitator's avatar URL with robust normalization and cross-browser compatibility
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    debugLog('all', 'No facilitator data provided, using placeholder avatar');
    return '/placeholder.svg';
  }
  
  try {
    // Case 1: If profile_picture exists and it's a direct path to public uploads, use it
    if (facilitator.profile_picture) {
      debugLog('all', `Checking facilitator profile picture: ${facilitator.profile_picture}`);
      
      // Normalize URLs with double slashes that aren't part of the protocol
      let normalizedUrl = facilitator.profile_picture.replace(/([^:])\/\//g, '$1/');
      
      // Check if it's a path to public uploads folder - common pattern from database
      if (normalizedUrl.startsWith('/lovable-uploads/')) {
        debugLog('all', `Using direct path from lovable-uploads: ${normalizedUrl}`);
        return normalizedUrl;
      }
      
      // Check if it's a full URL to Supabase storage
      if (normalizedUrl.includes('supabase.co/storage/v1/object/public/')) {
        debugLog('all', `Using direct Supabase storage URL: ${normalizedUrl}`);
        // Ensure crossOrigin attribute will be used by adding a marker
        if (isInCrossOriginContext()) {
          // Add a marker that the MessageAvatar component can detect
          normalizedUrl += (normalizedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
        }
        return normalizedUrl;
      }
      
      // Check if it's a valid URL with http/https protocol
      if (normalizedUrl.match(/^https?:\/\//i)) {
        debugLog('all', `Using external image URL: ${normalizedUrl}`);
        // Add crossorigin marker if needed
        if (isInCrossOriginContext()) {
          normalizedUrl += (normalizedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
        }
        return normalizedUrl;
      }
    }
    
    // Case 2: If we have an ID, construct the URL to the Supabase storage
    if (facilitator.id) {
      try {
        const { data } = await supabase.storage
          .from('facilitator-avatars')
          .getPublicUrl(`${facilitator.id}.jpg`);
        
        if (data?.publicUrl) {
          debugLog('all', `Generated avatar URL for facilitator ${facilitator.id}: ${data.publicUrl}`);
          let publicUrl = data.publicUrl;
          
          // Add crossorigin marker if needed
          if (isInCrossOriginContext()) {
            publicUrl += (publicUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
          }
          
          return publicUrl;
        }
      } catch (error) {
        console.error('Error getting public URL from Supabase storage:', error);
      }
    }
    
    // Case 3: Fall back to a generated avatar with the facilitator's title as seed
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const fallbackUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
    debugLog('all', `Using generated avatar for facilitator: ${nameSeed}`);
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
  console.warn('Avatar image failed to load, using placeholder', e.currentTarget.src);
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * A more robust check if the URL is for an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Direct paths to public images
  if (url.startsWith('/lovable-uploads/')) return true;
  
  // Normalize URL before checking
  const normalizedUrl = url.replace(/([^:])\/\//g, '$1/');
  
  // Supabase storage URLs
  if (normalizedUrl.includes('supabase.co/storage/v1/object/public/')) return true;
  
  // Common image extensions
  if (normalizedUrl.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null) return true;
  
  // API avatar URLs
  if (normalizedUrl.includes('/api/avatar')) return true;
  
  // Check for full URLs starting with http/https
  if (normalizedUrl.match(/^https?:\/\/.+/i)) {
    // If it has a query parameter and no file extension, we'll trust it
    if (normalizedUrl.includes('?') || normalizedUrl.includes('.')) {
      return true;
    }
  }
  
  return false;
};
