
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
    // First check if there's a custom avatar in the storage bucket
    if (facilitator.id) {
      const { data } = supabase.storage
        .from('facilitators-avatars/')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      // Validate if the custom avatar exists
      const customAvatarExists = await validateImageUrl(data.publicUrl);
      if (customAvatarExists) {
        console.log(`Using custom avatar for facilitator ${facilitator.id}`);
        return data.publicUrl;
      }
    }
    
    // If no custom avatar or it doesn't exist, try the profile_picture field
    if (facilitator.profile_picture) {
      const isValid = await validateImageUrl(facilitator.profile_picture);
      if (isValid) {
        console.log(`Using profile_picture URL for facilitator: ${facilitator.profile_picture}`);
        return facilitator.profile_picture;
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
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url || url === '/placeholder.svg') return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};

