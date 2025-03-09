
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar
 * Follows this priority:
 * 1. Custom uploaded avatar from facilitators-avatars bucket if available
 * 2. URL from the facilitator's profile_picture field if available
 * 3. Default placeholder as fallback
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    console.log('No facilitator data provided, using placeholder');
    return '/placeholder.svg';
  }
  
  try {
    // First, try profile_picture field if it exists (prioritize this)
    if (facilitator.profile_picture) {
      console.log(`Using profile_picture URL for facilitator ${facilitator.id}: ${facilitator.profile_picture}`);
      // Skip HEAD request validation for Supabase URLs
      if (facilitator.profile_picture.includes('supabase')) {
        return facilitator.profile_picture;
      }
      
      // Only validate non-Supabase URLs
      try {
        const isValid = await validateImageUrl(facilitator.profile_picture);
        if (isValid) {
          return facilitator.profile_picture;
        }
      } catch (err) {
        console.error('Error validating profile_picture URL:', err);
      }
    }
    
    // Then check if there's a custom avatar in the storage bucket
    if (facilitator.id) {
      console.log(`Checking for custom avatar for facilitator ${facilitator.id}`);
      
      // First try with jpg extension
      const { data: jpgData } = supabase.storage
        .from('facilitators-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      // Try without validation for supabase URLs
      if (jpgData.publicUrl) {
        console.log(`Found jpg avatar: ${jpgData.publicUrl}`);
        return jpgData.publicUrl;
      }
      
      // Then try with png extension
      const { data: pngData } = supabase.storage
        .from('facilitators-avatars')
        .getPublicUrl(`${facilitator.id}.png`);
        
      if (pngData.publicUrl) {
        console.log(`Found png avatar: ${pngData.publicUrl}`);
        return pngData.publicUrl;
      }
    }
    
    // If nothing works, return placeholder
    console.log('No valid avatar found, using placeholder');
    return '/placeholder.svg';
  } catch (error) {
    console.error('Error generating avatar URL:', error);
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
 * Note: Only use for non-Supabase URLs as Supabase HEAD requests might fail
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url || url === '/placeholder.svg') return false;
  
  // Skip validation for Supabase URLs
  if (url.includes('supabase')) return true;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};
