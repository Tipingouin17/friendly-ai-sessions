
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar
 * Follows this priority:
 * 1. Custom uploaded avatar from facilitator-avatars bucket if available
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
    // First check if there's a custom avatar in the facilitator-avatars bucket
    if (facilitator.id) {
      console.log(`Checking for custom avatar for facilitator ${facilitator.id}`);
      
      // Try with jpg extension
      const { data: jpgData } = supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (jpgData && jpgData.publicUrl) {
        console.log(`Found jpg avatar: ${jpgData.publicUrl}`);
        // Check if the URL exists before returning it
        try {
          const isValid = await validateImageUrl(jpgData.publicUrl);
          if (isValid) {
            return jpgData.publicUrl;
          } else {
            console.log(`The jpg URL exists but image validation failed: ${jpgData.publicUrl}`);
          }
        } catch (err) {
          console.error('Error validating jpg URL:', err);
        }
      }
    }
    
    // Then check the profile_picture field from the database
    if (facilitator.profile_picture) {
      console.log(`Using profile_picture URL for facilitator ${facilitator.id}: ${facilitator.profile_picture}`);
      
      // Fix any potential double slashes in the URL that aren't part of the protocol
      const fixedUrl = facilitator.profile_picture.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
        return protocol || '/';
      });
      
      // Skip HEAD request validation for Supabase URLs to avoid CORS issues
      if (fixedUrl.includes('supabase')) {
        console.log(`Using Supabase URL without validation: ${fixedUrl}`);
        return fixedUrl;
      }
      
      // Only validate non-Supabase URLs
      try {
        const isValid = await validateImageUrl(fixedUrl);
        if (isValid) {
          return fixedUrl;
        } else {
          console.log(`Profile picture URL validation failed: ${fixedUrl}`);
        }
      } catch (err) {
        console.error('Error validating profile_picture URL:', err);
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
