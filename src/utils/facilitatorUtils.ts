
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Gets a facilitator's avatar URL with simplified logic
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
      
      // Check if it's a path to public uploads folder
      if (facilitator.profile_picture.startsWith('/lovable-uploads/')) {
        debugLog('all', `Using direct path from lovable-uploads: ${facilitator.profile_picture}`);
        return facilitator.profile_picture;
      }
    }
    
    // Case 2: If we have an ID, construct the URL to the Supabase storage
    if (facilitator.id) {
      const { data } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (data?.publicUrl) {
        debugLog('all', `Generated avatar URL for facilitator ${facilitator.id}: ${data.publicUrl}`);
        return data.publicUrl;
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
 * A simple check if the URL is for an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Direct paths to public images
  if (url.startsWith('/lovable-uploads/')) return true;
  
  // Supabase storage URLs
  if (url.includes('supabase.co/storage/v1/object/public/facilitator-avatars')) return true;
  
  // Common image extensions
  if (url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null) return true;
  
  // API avatar URLs
  if (url.includes('/api/avatar')) return true;
  
  return false;
};
