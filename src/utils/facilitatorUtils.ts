
import { supabase } from "@/integrations/supabase/client";

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
    console.log('No facilitator data provided, using placeholder');
    return '/placeholder.svg';
  }
  
  try {
    // If a profile_picture is directly provided, use it as highest priority
    if (facilitator.profile_picture) {
      console.log(`Using provided profile_picture: ${facilitator.profile_picture}`);
      
      // Check for and fix double slashes that might appear in URLs
      let profilePicture = facilitator.profile_picture;
      
      // Fix double slashes in the URL path (except after protocol)
      profilePicture = profilePicture.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
        return protocol || '/';
      });
      
      // Handle both bucket naming conventions (facilitator-avatars and facilitators-avatars)
      if (profilePicture.includes('facilitators-avatars') || profilePicture.includes('facilitator-avatars')) {
        console.log(`Using fixed profile picture URL: ${profilePicture}`);
        return profilePicture;
      }
      
      // Ensure it has proper URL formatting
      if (profilePicture.startsWith('http') || profilePicture.startsWith('/')) {
        return profilePicture;
      } else {
        // Add leading slash if missing
        return `/${profilePicture}`;
      }
    }
    
    // Check for custom avatar in the facilitator-avatars bucket if we have a facilitator ID
    if (facilitator.id) {
      console.log(`Checking for custom avatar for facilitator ${facilitator.id}`);
      
      // Try first with "facilitator-avatars" bucket (singular)
      const { data: singularData } = supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (singularData && singularData.publicUrl) {
        // Fix any double slashes in the URL
        const fixedUrl = singularData.publicUrl.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
          return protocol || '/';
        });
        
        console.log(`Found avatar in facilitator-avatars bucket: ${fixedUrl}`);
        
        // Check if the URL exists before returning it
        try {
          const isValid = await validateImageUrl(fixedUrl);
          if (isValid) {
            return fixedUrl;
          }
        } catch (err) {
          console.error('Error validating singular bucket URL:', err);
        }
      }
      
      // Try with "facilitators-avatars" bucket (plural) as fallback
      const { data: pluralData } = supabase.storage
        .from('facilitators-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (pluralData && pluralData.publicUrl) {
        // Fix any double slashes in the URL
        const fixedUrl = pluralData.publicUrl.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
          return protocol || '/';
        });
        
        console.log(`Found avatar in facilitators-avatars bucket: ${fixedUrl}`);
        
        // Check if the URL exists
        try {
          const isValid = await validateImageUrl(fixedUrl);
          if (isValid) {
            return fixedUrl;
          }
        } catch (err) {
          console.error('Error validating plural bucket URL:', err);
        }
      }
    }
    
    // If nothing works, generate an avatar based on title or ID
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    const avatarUrl = `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam&palette=2`;
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
  
  // Skip validation for Supabase URLs - assume they're valid
  if (url.includes('supabase')) return true;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};
