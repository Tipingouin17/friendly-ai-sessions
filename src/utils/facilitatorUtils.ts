
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
    return '/placeholder.svg';
  }
  
  try {
    // If a profile_picture is directly provided and it's a complete URL, use it
    if (facilitator.profile_picture) {
      let profilePicture = facilitator.profile_picture;
      
      // If it's already a complete URL or path, use it directly
      if (profilePicture.startsWith('http') || profilePicture.startsWith('/')) {
        // Check for any double slashes in the URL path (except after protocol)
        profilePicture = profilePicture.replace(/(https?:\/\/)|(\/\/+)/g, (match, protocol) => {
          return protocol || '/';
        });
        
        return profilePicture;
      } else {
        // Add leading slash if missing for relative paths
        return `/${profilePicture}`;
      }
    }
    
    // If we have a facilitator ID, check for custom avatar
    if (facilitator.id) {
      // Try with "facilitator-avatars" bucket (singular form)
      const { data: singularData } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      // Check if the URL exists
      if (singularData?.publicUrl) {
        return singularData.publicUrl;
      }
      
      // Try with "facilitators-avatars" bucket (plural form) as fallback
      const { data: pluralData } = await supabase.storage
        .from('facilitators-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (pluralData?.publicUrl) {
        return pluralData.publicUrl;
      }
    }
    
    // If nothing works, generate an avatar based on title or ID
    const nameSeed = facilitator.title || `Facilitator-${facilitator.id || 'Unknown'}`;
    return `/api/avatar?name=${encodeURIComponent(nameSeed)}&variant=beam`;
  } catch (error) {
    console.error('Error generating avatar URL:', error);
    return '/placeholder.svg';
  }
};

/**
 * Handles image loading errors by setting a fallback image
 */
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>): void => {
  e.currentTarget.src = '/placeholder.svg';
};

/**
 * Validates if an image URL exists and is accessible
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  if (!url || url === '/placeholder.svg') return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};
