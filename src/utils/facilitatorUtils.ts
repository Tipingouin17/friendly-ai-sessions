
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLogger";

/**
 * Gets a facilitator's avatar URL with improved error handling
 */
export const getFacilitatorAvatarUrl = async (facilitator: { id?: number, profile_picture?: string | null, title?: string }): Promise<string> => {
  // If no facilitator data provided, return placeholder
  if (!facilitator) {
    debugLog('all', 'No facilitator data provided, using placeholder avatar');
    return '/placeholder.svg';
  }
  
  try {
    // Case 1: If profile_picture exists and appears to be a valid URL, use it directly
    if (facilitator.profile_picture) {
      debugLog('all', `Using facilitator profile picture: ${facilitator.profile_picture}`);
      // Apply URL normalization to ensure consistency
      return normalizeFacilitatorAvatarUrl(facilitator.profile_picture);
    }
    
    // Case 2: Try to generate a URL from the facilitator ID
    if (facilitator.id) {
      // First try - storage bucket path with proper naming
      const { data: bucketData } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.jpg`);
      
      if (bucketData?.publicUrl) {
        debugLog('all', `Generated storage URL for facilitator ${facilitator.id}: ${bucketData.publicUrl}`);
        return normalizeFacilitatorAvatarUrl(bucketData.publicUrl);
      }
      
      // Second try - check if there's an avatar with .png extension
      const { data: pngData } = await supabase.storage
        .from('facilitator-avatars')
        .getPublicUrl(`${facilitator.id}.png`);
        
      if (pngData?.publicUrl) {
        debugLog('all', `Generated PNG storage URL for facilitator ${facilitator.id}: ${pngData.publicUrl}`);
        return normalizeFacilitatorAvatarUrl(pngData.publicUrl);
      }
      
      // Direct URL construction - for older setups
      const directUrl = `https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/facilitator-avatars/${facilitator.id}.jpg`;
      debugLog('all', `Using direct URL for facilitator ${facilitator.id}: ${directUrl}`);
      return directUrl;
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
 * Normalizes a facilitator avatar URL to fix common issues
 */
export const normalizeFacilitatorAvatarUrl = (url: string): string => {
  if (!url) return '/placeholder.svg';
  
  try {
    // If URL already contains the Supabase storage path, it's likely correct
    if (url.includes('supabase.co/storage/v1/object/public/facilitator-avatars')) {
      return url;
    }
    
    // Fix incorrect bucket name if present (facilitators-avatars → facilitator-avatars)
    let correctedUrl = url.includes('facilitators-avatars') 
      ? url.replace('facilitators-avatars', 'facilitator-avatars')
      : url;
    
    // Convert any relative URLs that look like partial storage paths
    if (correctedUrl.startsWith('/storage/') || correctedUrl.includes('/object/public/')) {
      correctedUrl = `https://msahrdujupfcotujyluy.supabase.co${correctedUrl.startsWith('/') ? '' : '/'}${correctedUrl}`;
    }
    
    // Check if URL is a relative path but not a complete URL or API path
    if (correctedUrl.startsWith('/') && !correctedUrl.startsWith('/api/')) {
      // For relative paths like /lovable-uploads/..., ensure they have the proper base
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        correctedUrl = `${baseUrl}${correctedUrl}`;
      }
    }
    
    // Clean up any double slashes in the URL (except after protocol)
    correctedUrl = correctedUrl.replace(/([^:]\/)\/+/g, "$1");
    
    debugLog('all', `Normalized facilitator avatar URL: ${correctedUrl}`);
    return correctedUrl;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url; // Return original URL if normalization fails
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
  
  // Check for Supabase storage URLs which are definitely images
  if (url.includes('supabase.co/storage/v1/object/public/facilitator-avatars')) return true;
  
  // Common image extensions
  if (url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) !== null) return true;
  
  // Special cases for our application
  if (url.includes('/api/avatar')) return true;
  if (url.includes('facilitator-avatars')) return true;
  if (url.includes('facilitators-avatars')) return true;
  if (url.includes('supabase.co/storage')) return true;
  if (url.includes('lovable-uploads')) return true;
  
  // Check for image URLs with query parameters
  if (url.match(/\.(jpeg|jpg|gif|png|svg|webp)\?/i) !== null) return true;
  
  return false;
};
