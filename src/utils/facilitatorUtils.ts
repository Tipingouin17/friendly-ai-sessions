
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a URL for a facilitator's avatar
 * Updated priority order:
 * 1. Custom uploaded avatar from facilitator-avatars bucket
 * 2. URL from the facilitator's profile_picture field if available
 * 3. Try demo structure as fallback
 * 4. Default placeholder as final fallback
 */
export const getFacilitatorAvatarUrl = async (facilitator: { 
  id?: number, 
  profile_picture?: string | null,
  title?: string
}): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    console.log('No facilitator data provided, using placeholder');
    return '/placeholder.svg';
  }
  
  console.log(`Attempting to load avatar for facilitator ID: ${facilitator.id}, title: ${facilitator.title}`);
  
  try {
    // PRIORITY 1: Try facilitator-avatars bucket first (for custom uploaded avatars)
    if (facilitator.id) {
      const { data } = supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      console.log(`Trying custom avatar from bucket: ${data.publicUrl}`);
      
      // Validate if the custom avatar exists
      const customAvatarExists = await validateImageUrl(data.publicUrl);
      if (customAvatarExists) {
        console.log(`✅ Custom avatar valid: ${data.publicUrl}`);
        return data.publicUrl;
      } else {
        console.log(`❌ Custom avatar invalid for facilitator ${facilitator.id}`);
      }
    }
    
    // PRIORITY 2: If profile_picture is provided and not null, use it
    if (facilitator.profile_picture && facilitator.profile_picture.trim() !== '') {
      // Check if URL contains 'null' which sometimes happens due to string conversion
      if (facilitator.profile_picture.includes('null')) {
        console.log('❌ Profile picture URL contains null, skipping');
      } else {
        console.log(`Trying profile picture: ${facilitator.profile_picture}`);
        
        // Try to validate if the profile_picture URL is accessible
        const isValid = await validateImageUrl(facilitator.profile_picture);
        if (isValid) {
          console.log(`✅ Profile picture valid: ${facilitator.profile_picture}`);
          return facilitator.profile_picture;
        } else {
          console.log(`❌ Profile picture invalid: ${facilitator.profile_picture}`);
        }
      }
    }
    
    // PRIORITY 3: Try the demo folder structure as a fallback
    if (facilitator.title) {
      const folderName = facilitator.title.replace(/\s+/g, '%20');
      const fileName = folderName.replace(/\s+/g, '_');
      const demoUrl = `https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/demo/Characters/${folderName}/${fileName}.jpg`;
      
      console.log(`Trying demo structure: ${demoUrl}`);
      
      const isDemoValid = await validateImageUrl(demoUrl);
      if (isDemoValid) {
        console.log(`✅ Demo URL valid: ${demoUrl}`);
        return demoUrl;
      } else {
        console.log(`❌ Demo URL invalid: ${demoUrl}`);
      }
    }
    
    // If nothing works, return placeholder
    console.log('⚠️ No valid avatar found, using placeholder');
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
