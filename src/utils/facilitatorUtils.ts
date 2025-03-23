
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
    // If a profile_picture is directly provided, use it as highest priority
    if (facilitator.profile_picture) {
      console.log(`Using provided profile_picture: ${facilitator.profile_picture}`);
      
      // Ensure it has proper URL formatting
      if (facilitator.profile_picture.startsWith('http') || facilitator.profile_picture.startsWith('/')) {
        return facilitator.profile_picture;
      } else {
        // Add leading slash if missing
        return `/${facilitator.profile_picture}`;
      }
    }
    
    // Check for custom avatar in the facilitator-avatars bucket if we have a facilitator ID
    if (facilitator.id) {
      console.log(`Checking for custom avatar for facilitator ${facilitator.id}`);
      
      // Try with jpg extension
      const { data: jpgData } = supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (jpgData && jpgData.publicUrl) {
        // Fix any double slashes in the URL
        const fixedUrl = jpgData.publicUrl.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
          return protocol || '/';
        });
        
        console.log(`Found jpg avatar: ${fixedUrl}`);
        // Check if the URL exists before returning it
        try {
          const isValid = await validateImageUrl(fixedUrl);
          if (isValid) {
            return fixedUrl;
          } else {
            console.log(`The jpg URL exists but image validation failed: ${fixedUrl}`);
          }
        } catch (err) {
          console.error('Error validating jpg URL:', err);
        }
      }
    }
    
    // If nothing works, generate an avatar based on title or ID
    const titleOrId = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const avatarUrl = `/api/avatar?name=${encodeURIComponent(titleOrId)}&variant=beam&palette=2`;
    console.log('Using generated avatar URL:', avatarUrl);
    return avatarUrl;
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
