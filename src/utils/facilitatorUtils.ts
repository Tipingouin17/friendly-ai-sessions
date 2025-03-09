
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar
 * Follows this priority:
 * 1. Custom uploaded avatar from facilitators-avatars bucket if available
 * 2. URL from the facilitator's profile_picture field if available
 * 3. Default placeholder as fallback
 */
export const getFacilitatorAvatarUrl = async (facilitator: { 
  id?: number, 
  profile_picture?: string | null,
  title?: string  // Added title to the type
}): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    console.log('No facilitator data provided, using placeholder');
    return '/placeholder.svg';
  }
  
  try {
    // If profile_picture is provided and not null, use it directly
    if (facilitator.profile_picture && facilitator.profile_picture.trim() !== '') {
      // Check if URL contains 'null' which sometimes happens due to string conversion
      if (facilitator.profile_picture.includes('null')) {
        console.log('Profile picture URL contains null, using placeholder');
        return '/placeholder.svg';
      }
      
      console.log(`Trying profile picture: ${facilitator.profile_picture}`);
      
      // Try to validate if the profile_picture URL is accessible
      const isValid = await validateImageUrl(facilitator.profile_picture);
      if (isValid) {
        console.log(`Profile picture valid: ${facilitator.profile_picture}`);
        return facilitator.profile_picture;
      } else {
        console.log(`Profile picture invalid: ${facilitator.profile_picture}`);
      }
    }
    
    // If we get here, the profile_picture was null, empty or invalid
    // Try facilitators-avatars bucket as a backup (for custom uploaded avatars)
    if (facilitator.id) {
      const { data } = supabase.storage
        .from('facilitators-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      console.log(`Trying custom avatar: ${data.publicUrl}`);
      
      // Validate if the custom avatar exists
      const customAvatarExists = await validateImageUrl(data.publicUrl);
      if (customAvatarExists) {
        console.log(`Custom avatar valid: ${data.publicUrl}`);
        return data.publicUrl;
      } else {
        console.log(`Custom avatar invalid for facilitator ${facilitator.id}`);
      }
    }
    
    // Try the demo folder structure as a fallback
    // This is a workaround for existing demo data
    if (facilitator.title) {
      const folderName = facilitator.title.replace(/\s+/g, '%20');
      const fileName = folderName.replace(/\s+/g, '_');
      const demoUrl = `https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/demo/Characters/${folderName}/${fileName}.jpg`;
      
      console.log(`Trying demo structure: ${demoUrl}`);
      
      const isDemoValid = await validateImageUrl(demoUrl);
      if (isDemoValid) {
        console.log(`Demo URL valid: ${demoUrl}`);
        return demoUrl;
      } else {
        console.log(`Demo URL invalid: ${demoUrl}`);
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
  if (!url || url === '/placeholder.svg' || url.includes('null')) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
};
